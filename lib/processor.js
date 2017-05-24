const consoleMap = (key = null) => {
  return (entry) => {
    console.log(key ? entry[key] : entry);
    return entry;
  };
};

const logState = (msg) => {
  return (entry, idx) => {
    if (!idx) {
      console.log(msg);
    }
    return entry;
  }
};

const uniqueKeys = key => {
  return (keys, entry) => {
    if (!keys.includes(entry[key])) {
      keys.push(entry[key]);
    }
    return keys;
  };
};

const stackIntervals = () => {
  return (stacked, entry) => {
    if (entry.startTime) {
      const parent = stacked
        .filter(current => {
          return current.startTime &&
            current.startTime <= entry.startTime &&
            current.endTime > entry.startTime;
        })
        .pop();
      if (parent) {
        parent.depth = parent.depth || 0;
        entry.depth = parent.depth + 1;
        stacked.splice(stacked.indexOf(parent) + 1, 0, entry);
        return stacked;
      }
    }
    stacked.push(entry);
    return stacked;
  };
};

const mapDataToSchema = schema => {
  const keys = Object.keys(schema);
  return data => {
    return keys.reduce(
      (reduced, key, idx) => {
        if (data[idx] == null) {
          return reduced;
        } else if (typeof data[idx] === 'object') {
          Object.assign(reduced, data[idx]);
        } else {
          reduced[key] = data[idx];
        }
        return reduced;
      }, {}
    );
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
    }
    return true;
  };
};

const resolveStacks = (thread) => {
  if (thread.friendly === 'compositor') { // not tested
    return [];
  }
  const frames = thread.frameTable.data
    .map(mapDataToSchema(thread.frameTable.schema))
    .map(mapStrings(thread.stringTable, 'location'));
  const stacks = thread.stackTable.data
    .map(mapDataToSchema(thread.stackTable.schema))
    .map(entry => {
      entry.frame = frames[entry.frame].location;
      return entry;
    });
  return thread.samples.data
    .map(mapDataToSchema(thread.samples.schema))
    .map(entry => {
      let stackId = entry.stack;
      do {
        const stack = stacks[stackId];
        if (stack.frame) {
          entry.stack = stack.frame;
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
        reduced.push(entry);
      }
      return reduced;
    }, [])
    .map((entry) => {
      entry.name = entry.stack;
      delete entry.stack;
      return entry;
    })
    .reduce((reduced, entry) => {
      const last = reduced[reduced.length - 1];
      if (last && last.responsiveness && last.responsiveness > entry.responsiveness) {
        reduced.push({
          name: 'frame',
          startTime: last.startTime - last.responsiveness,
          endTime: entry.startTime - entry.responsiveness
        });
      }
      reduced.push(entry);
      return reduced;
    }, [])
    .filter(entry => !entry.name.startsWith('Startup::XRE'))
    .map((entry) => {
      delete entry.responsiveness;
      return entry;
    });
}

const cleanThreads = () => {
  return (thread) => {
    thread.friendly = thread.processType == 'tab'
      ? 'content'
      : thread.name == 'GeckoMain' ? 'main' : 'compositor';
    thread.stringTable = thread.stringTable.map(
      entry => entry.startsWith('0x') ? null : entry
    );
    if (thread.friendly === 'content' && thread.markers.data.length < 10) {
      return false;
    }
    return true;
  };
}

const mergeMarkersAndStacks = () => {
  return (thread) => {
    thread.merged = thread.markers.data
      .map(mapDataToSchema(thread.markers.schema))
      .map(mapStrings(thread.stringTable))
      .filter(mergeIntervals())
      .concat(resolveStacks(thread))
      .sort((a, b) => (a.startTime || a.time) < (b.startTime || b.time));
    return thread;
  };
}

module.exports.transform = (profile) => {
  profile.threads = profile.processes
    .reduce(((merged, entry) => merged.concat(entry.threads)), profile.threads)
    .filter(cleanThreads())
    .map(mergeMarkersAndStacks());
  delete profile.processes;
  return profile;
}

module.exports.printMarkers = () => {
  return (thread) => {
    thread.merged
    .reduce(stackIntervals(), [])
    .map(
      entry =>
      `${
        (entry.startTime || entry.time).toFixed(2)
      }\t${
        '  '.repeat(entry.depth || 0)
      }${
        entry.name == 'DOMEvent' ? entry.type : entry.name
      } (${
        entry.endTime ? (entry.endTime - entry.startTime).toFixed(2) : ''
      })`
    )
    .map(consoleMap());
    return thread;
  }
};

// console.log(threads[0]);
