const fetch = require('node-fetch');

const uniqueKeys = key => {
  return (keys, entry) => {
    if (!keys.includes(entry[key])) {
      keys.push(entry[key]);
    }
    return keys;
  };
};

const mapDataToSchema = schema => {
  const keys = Object.keys(schema);
  return data => {
    return keys.reduce((reduced, key, idx) => {
      if (data[idx] == null) {
        return reduced;
      } else if (typeof data[idx] === 'object') {
        Object.assign(reduced, data[idx]);
      } else {
        reduced[key] = data[idx];
      }
      return reduced;
    }, {});
  };
};

const mapStrings = (strings, key = 'name') => {
  return data => {
    if (data[key]) {
      data[key] = strings[data[key]];
    }
    return data;
  };
};

const mergeIntervals = () => {
  const started = new Map();
  return data => {
    if (data.interval === 'start') {
      data.startTime = data.time;
      delete data.interval;
      delete data.time;
      started.set(data.name, data);
    } else if (data.interval === 'end') {
      const replacement = started.get(data.name);
      if (replacement) {
        started.delete(data.name);
        replacement.endTime = data.time;
      }
      return false;
    } else if (data.time && data.startTime) {
      delete data.interval;
    } else if (data.time && !data.startTime) {
      data.startTime = data.time;
      data.endTime = data.time;
    }
    return true;
  };
};

const categories = {
  // js::ProfileEntry::Category::OTHER
  '16': 'other',
  // js::ProfileEntry::Category::CSS
  '32': 'css',
  // js::ProfileEntry::Category::JS
  '64': 'js',
  // js::ProfileEntry::Category::GC
  '128': 'gc',
  // js::ProfileEntry::Category::CC
  '256': 'cc',
  // js::ProfileEntry::Category::NETWORK
  '512': 'network',
  // js::ProfileEntry::Category::GRAPHICS
  '1024': 'graphics',
  // js::ProfileEntry::Category::STORAGE
  '2048': 'storage',
  // js::ProfileEntry::Category::EVENTS
  '4096': 'events',
};

const resolveStacks = thread => {
  if (thread.friendly === 'compositor') {
    return [];
  }
  const frames = thread.frameTable.data
    .map(mapDataToSchema(thread.frameTable.schema))
    .map(mapStrings(thread.stringTable, 'location'))
    .map(mapStrings(categories, 'category'))
    .map(mapStrings(thread.stringTable, 'implementation'));
  const stacks = thread.stackTable.data
    .map(mapDataToSchema(thread.stackTable.schema))
    .map(entry => {
      entry.frame = frames[entry.frame];
      return entry;
    });
  return thread.samples.data
    .map(mapDataToSchema(thread.samples.schema))
    .map(entry => {
      let stackId = entry.stack;
      do {
        const stack = stacks[stackId];
        if (stack.frame && stack.frame.category) {
          entry.stack = stack.frame.location;
          entry.category = stack.frame.category;
          if (stack.frame.category === 'js' || stack.frame.implementation) {
            entry.implementation = stack.frame.implementation || 'interpreter';
          }
          return entry;
        }
        if (stack.prefix) {
          stackId = stack.prefix;
        }
      } while (stackId);
      return entry;
    })
    .reduce((reduced, entry) => {
      const last = reduced[reduced.length - 1];
      if (!last || last.stack !== entry.stack) {
        if (last) {
          last.endTime = entry.time;
        }
        entry.startTime = entry.time;
        delete entry.time;
        entry.endTime = entry.startTime + 1;
        entry.type = 'stack';
        reduced.push(entry);
      }
      return reduced;
    }, [])
    .map(entry => {
      entry.name = entry.stack;
      delete entry.stack;
      return entry;
    })
    .reduce((reduced, entry) => {
      const last = reduced[reduced.length - 1];
      if (
        last &&
        last.responsiveness &&
        last.responsiveness > entry.responsiveness
      ) {
        reduced.push({
          name: 'hang',
          type: 'annotation',
          startTime: last.startTime - last.responsiveness,
          endTime: entry.startTime - entry.responsiveness,
        });
      }
      reduced.push(entry);
      return reduced;
    }, [])
    .filter(entry => !entry.name.startsWith('Startup::XRE'))
    .map(entry => {
      delete entry.responsiveness;
      return entry;
    });
};

const cleanThreads = () => {
  return thread => {
    if (thread.processType === 'gpu' && thread.name === 'GeckoMain') {
      return false;
    }
    // console.log(Object.keys(thread.frameTable.schema));
    // const types = thread.markers.data.reduce((names, entry) => {
    //   return names.add(entry[0]);
    // }, new Set()).size;
    // if (thread.processType == 'tab' && types <= 1) {
    //   return false;
    // }
    thread.friendly =
      thread.processType == 'tab'
        ? 'content'
        : thread.name == 'GeckoMain' ? 'main' : 'compositor';
    thread.stringTable = thread.stringTable.map(
      entry => (entry.startsWith('0x') ? null : entry)
    );
    return true;
  };
};

const mergeMarkersAndStacks = () => {
  return thread => {
    thread.merged = thread.markers.data
      .map(mapDataToSchema(thread.markers.schema))
      .map(mapStrings(thread.stringTable))
      .filter(mergeIntervals())
      .concat(resolveStacks(thread));
    thread.merged.sort(
      (a, b) => (a.startTime || a.time) - (b.startTime || b.time)
    );
    return thread;
  };
};

const symbolicateProcess = async profile => {
  const modules = profile.libs.map(lib => {
    return {
      name: lib.debugName,
      systemName: lib.name,
      id: lib.breakpadId,
      start: lib.start,
      end: lib.end,
    };
  });
  const addressMap = new Map();
  profile.threads.forEach(thread => {
    thread.stringTable.forEach(entry => {
      if (!entry.startsWith('0x')) {
        return;
      }
      const address = parseInt(entry.split(/\s/)[0], 16);
      const matched = entry.match(/([^\s]+)\)/);
      const module = modules.find(needle => {
        return (
          (matched && needle.systemName === matched[1]) ||
          (needle.start <= address && needle.end > address)
        );
      });
      if (!module) {
        return;
      }
      if (!addressMap.has(entry)) {
        addressMap.set(entry, [
          modules.indexOf(module),
          entry.includes(' ') ? address : address - module.start,
        ]);
      }
    });
  });
  // console.log('addressMap', addressMap.size);
  const args = {
    version: 4,
    stacks: [[...addressMap.values()]],
    memoryMap: modules.map(({ name, id }) => [name, id]),
  };
  let funcs = null;
  try {
    const symbols = await (await fetch('http://symbolapi.mozilla.org/', {
      method: 'POST',
      body: JSON.stringify(args),
    })).json();
    funcs = symbols.symbolicatedStacks[0];
  } catch (err) {
    console.error('[transform]', 'Snappy failed', err);
    return null;
  }
  const resolved = new Map(
    [...addressMap.keys()].map((address, idx) => [address, funcs[idx]])
  );
  profile.threads.forEach(thread => {
    thread.stringTable = thread.stringTable.map(
      entry => (resolved.has(entry) ? resolved.get(entry) : entry)
    );
  });
  return profile;
};

module.exports.symbolicate = async profile => {
  await Promise.all([
    symbolicateProcess(profile),
    ...profile.processes.map(entry => symbolicateProcess(entry)),
  ]);
  profile.meta.symbolicated = new Date().toJSON();
  return profile;
};

module.exports.transform = profile => {
  profile.threads = profile.processes
    .reduce((merged, entry) => merged.concat(entry.threads), profile.threads)
    .filter(cleanThreads())
    .map(mergeMarkersAndStacks());
  // drop details for smaller cache
  profile.threads.forEach(thread => {
    delete thread.frameTable;
    delete thread.stackTable;
    delete thread.stringTable;
    delete thread.samples;
    delete thread.markers;
  });
  delete profile.processes;
  delete profile.libs;
  const meta = {
    date: new Date(profile.meta.startTime).toISOString().slice(0, 10),
    architecture: profile.meta.abi.startsWith('x86_64') ? '64bit' : '32bit',
    version: parseInt(profile.meta.misc.match(/^rv:(\d+)/)[1], 10),
    os: profile.meta.platform,
    os_version: profile.meta.oscpu.match(/(\d+(?:\.\d+))/)[1],
  };
  profile.meta = meta;
  return profile;
};

// console.log(threads[0]);
