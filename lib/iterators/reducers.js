const { quantile } = require('simple-statistics');

const findActiveThread = (startTime, markerName = 'Rasterize') => {
  return threads => {
    return threads
      .filter(thread => thread.friendly === 'content')
      .map(thread => {
        return {
          thread,
          needle: thread.merged.find(
            marker => marker.name === markerName && marker.startTime > startTime
          ),
        };
      })
      .filter(({ needle }) => needle)
      .sort((a, b) => a.needle.startTime - b.needle.startTime)
      .map(({ thread }) => thread)[0];
  };
};

const sliceMarkerInterval = (startTime, endTime) => {
  return markers => {
    const indexStart = markers.indexOf(
      markers.find(marker => marker.startTime - 5 > startTime)
    );
    const indexFinish = markers.indexOf(
      markers.find(marker => marker.startTime + 5 > endTime)
    );
    if (indexFinish - indexStart < 1) {
      return [];
    }
    return markers.slice(indexStart, indexFinish);
  };
};

const breakdownRules = new Map([
  [
    'paint',
    new Map([['name', new Set(['DisplayList', 'LayerBuilding', 'Rasterize'])]]),
  ],
  [
    'style',
    new Map([
      [
        'name',
        new Set(['nsStyle', 'ElementRestyler', 'Styles', 'Flush Style']),
      ],
    ]),
  ],
  ['layout', new Map([['name', new Set(['DoReflow', 'Flush Layout'])]])],
  ['js', new Map([['name', new Set(['js::RunScript', 'DOMEvent', 'Script'])]])],
  ['gc', new Map([['name', new Set(['GCSlice'])]])],
  // ['paint', new Map([['category', new Set(['Paint'])]])],
  ['ipc', new Map([['category', new Set(['IPC'])]])],
]);
const breakdownMap = new Map([['misc', 0.0]]);
for (const rule of breakdownRules.keys()) {
  breakdownMap.set(rule, 0.0);
}

const breakdownMarkers = breakdown => {
  return markers => {
    let endMarker = 0;
    markers.forEach(marker => {
      if (!marker.endTime) {
        //  || marker.startTime < endMarker
        return;
      }
      for (const [rule, keys] of breakdownRules) {
        for (const [key, matches] of keys) {
          if (!marker[key]) {
            return;
          }
          for (const match of matches) {
            if (marker[key].includes(match)) {
              endMarker = marker.endTime;
              breakdown.set(
                rule,
                breakdown.get(rule) + marker.endTime - marker.startTime
              );
              return;
            }
          }
        }
      }
    });
  };
};

const countBy = callback => {
  return collection => {
    const sum = collection.size;
    let count = 0;
    for (const value of collection.values()) {
      if (callback(value)) {
        count += 1;
      }
    }
    return count / sum;
  };
};

const valueQuantile = (field, p = 0.5) => {
  return collection => {
    let values = [];
    for (const result of collection.values()) {
      const value = result.get(field);
      if (value) {
        values.push(value);
      }
    }
    return quantile(values, p);
  };
};

const valuesFlatten = field => {
  return collection => {
    let flattened = [];
    for (const values of collection.values()) {
      if (values && values.length) {
        flattened.push.apply(flattened, values);
      }
    }
    return flattened;
  };
};

const valueCounts = field => {
  return collection => {
    const sum = collection.size;
    const counts = new Map();
    for (const needle of collection.values()) {
      const value = needle.get(field);
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    for (const [key, count] of counts) {
      counts.set(key, count / sum);
    }
    return counts;
  };
};

module.exports = {
  findActiveThread,
  sliceMarkerInterval,
  breakdownMap,
  breakdownMarkers,
  countBy,
  valueQuantile,
  valuesFlatten,
  valueCounts,
};
