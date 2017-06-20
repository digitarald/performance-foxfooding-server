const blacklist = ['GCMajor'];
const stackable = ['DOMEvent', 'UserTiming'];
const epsilon = 0.01;

const stackIntervals = (module.exports.stackIntervals = () => {
  return (stacked, entry) => {
    if (entry.startTime) {
      const duration = entry.endTime - entry.startTime;
      const parent = stacked
        .filter(current => {
          const currentDuration = current.startTime
            ? current.endTime - current.startTime
            : 0;
          return (
            current.startTime &&
            currentDuration > duration &&
            current.startTime <= entry.startTime &&
            current.endTime > entry.startTime + epsilon
          );
        })
        .pop();
      if (parent) {
        if (
          !stackable.includes(parent.type) &&
          !stackable.includes(parent.name) &&
          parent.type === entry.type &&
          parent.name === entry.name
        ) {
          console.error(
            `Should not have matching type/name ${entry.type}/${entry.name}`,
            parent,
            entry
          );
        }
        parent.depth = parent.depth || 0;
        entry.depth = parent.depth + 1;
        stacked.splice(stacked.indexOf(parent) + 1, 0, entry);
        return stacked;
      }
    }
    // if (!blacklist.includes(entry.type)) {
    stacked.push(entry);
    // }
    return stacked;
  };
});

const consoleMap = (module.exports.consoleMap = (key = null) => {
  return entry => {
    console.log(key ? entry[key] : entry);
    return entry;
  };
});

const logBreakdown = (module.exports.logBreakdown = () => {
  return breakdown => {
    console.log(
      Array.from(breakdown)
        .filter(([key, count]) => count > 0)
        .sort(([_a, a], [_b, b]) => b - a)
        .map(([key, count]) => `${key}: ${count.toFixed(1)}`)
        .join('\t')
    );
  };
});

const logState = (module.exports.logState = msg => {
  return (entry, idx) => {
    if (!idx) {
      console.log(msg);
    }
    return entry;
  };
});

const printMarkers = (module.exports.printMarkers = () => {
  return input => {
    const markers = (input.merged ? input.merged : input).sort(
      (a, b) => a.startTime - b.startTime
    );
    if (!markers.length) {
      return input;
    }
    const now = markers[0].startTime;
    markers
      .reduce(stackIntervals(), [])
      .map(
        entry =>
          `${(entry.startTime - now).toFixed(2)}\t${'  '.repeat(
            entry.depth || 0
          )}[${(entry.implementation || entry.category || 'stack')
            .toLowerCase()}] ${entry.name == 'DOMEvent'
            ? entry.type
            : entry.type == 'UserTiming'
              ? entry.entryType
              : entry.name} (${entry.endTime
            ? (entry.endTime - entry.startTime).toFixed(2)
            : ''})`
      )
      .map(consoleMap());
    return input;
  };
});
