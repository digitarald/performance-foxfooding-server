const { quantile, median } = require('simple-statistics');
const { addResult } = require('../iterators/metrics');

const addResultsByThread = (results, profile, include) => {
  const durations = profile.threads
    .filter(thread => thread.friendly === include)
    .reduce((markers, thread) => {
      return markers.concat(
        thread.merged
          .filter(entry => entry.name === 'hang')
          .map(entry => entry.endTime - entry.startTime)
      );
    }, []);
  addResult(
    results,
    `jank-${include}-moderate`,
    durations.filter(duration => duration > 250).length
  );
  addResult(
    results,
    `jank-${include}-bad`,
    durations.filter(duration => duration > 2500).length
  );
  addResult(
    results,
    `jank-${include}-99th`,
    durations.length ? quantile(durations, 0.99) : 0
  );
};

module.exports = {
  getMetrics: () => {
    return {
      'jank-main-moderate': {
        name: 'Main Jank over 250ms',
        unit: '%',
        reducer: 'affected',
      },
      'jank-content-moderate': {
        name: 'Content Jank over 250ms',
        unit: '%',
        reducer: 'affected',
      },
      'jank-main-bad': {
        name: 'Main Jank over 2.5s',
        unit: '%',
        reducer: 'affected',
      },
      'jank-content-bad': {
        name: 'Content Jank over 2.5s',
        unit: '%',
        reducer: 'affected',
      },
      'jank-main-99th': {
        name: 'Main, 99th percentile',
        unit: 'ms',
        reducer: 'median',
      },
      'jank-content-99th': {
        name: 'Content, 99th percentile',
        unit: 'ms',
        reducer: 'median',
      },
    };
  },

  map: (results, profile) => {
    addResultsByThread(results, profile, 'main');
    addResultsByThread(results, profile, 'content');
  },
};
