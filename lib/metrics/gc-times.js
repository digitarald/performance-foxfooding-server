const d3 = require('d3');
const { printMarkers, consoleMap } = require('../iterators/logs');

const whitelist = [
  'GCSlice',
  // 'js::Nursery::collect',
  // 'nsCycleCollector::collectSlice',
  // 'nsCycleCollector::forgetSkippable',
];

module.exports = {
  map: ({ include = ['main'] }) => {
    return ({ threads }) => {
      return threads
        .filter(thread => include.includes(thread.friendly))
        .reduce((markers, thread) => {
          return markers.concat(
            thread.merged
              .filter(entry => whitelist.includes(entry.name))
              .map(entry => {
                return {
                  start: entry.startTime,
                  end: entry.endTime,
                };
              })
              .map(entry => entry.end - entry.start)
          );
        }, []);
    };
  },

  reduce: () => {
    return results => {
      const runs = results.reduce((all, run) => {
        return all.concat(run);
      }, []);
      const hist = d3.histogram(runs).domain([1, 160]).thresholds(10);
      const bins = hist(runs);
      // const max = Math.max.apply(Math, bins.map(bin => bin.length));
      return bins.map(bin => [`${bin.x0}-${bin.x1}`, bin.length]);
    };
  },

  variations: new Map([['main', { include: ['main'] }], ['content', { include: ['content'] }]]),
};
