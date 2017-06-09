const { quantile, median } = require('simple-statistics');
const { addResult } = require('../iterators/metrics');
const { valueQuantile, countBy } = require('../iterators/reducers');

const whitelist = [
  'GCSlice',
  'js::Nursery::collect',
  'nsCycleCollector::collectSlice',
  'nsCycleCollector::forgetSkippable',
];

const addResultsByThread = (results, profile, include) => {
  const durations = profile.threads
    .filter(thread => thread.friendly === include)
    .reduce((markers, thread) => {
      return markers.concat(
        thread.merged
          .filter(entry => whitelist.includes(entry.name))
          .map(entry => entry.endTime - entry.startTime)
      );
    }, []);
  addResult(results, `gc-${include}-moderate`, durations.filter(duration => duration > 250).length);
  addResult(results, `gc-${include}-bad`, durations.filter(duration => duration > 2500).length);
  addResult(results, `gc-${include}-99th`, durations.length ? quantile(durations, 0.99) : 0);
};

module.exports = {
  getMetrics: () => {
    return {
      'gc-main-moderate': {
        name: 'Moderate Main GC (250ms)',
        unit: '%',
        reducer: 'affected',
      },
      'gc-content-moderate': {
        name: 'Moderate Content GC (250ms)',
        unit: '%',
        reducer: 'affected',
      },
      'gc-main-bad': {
        name: 'Bad Main GC (2.5s)',
        unit: '%',
        reducer: 'affected',
      },
      'gc-content-bad': {
        name: 'Bad Content GC (2.5s)',
        unit: '%',
        reducer: 'affected',
      },
      'gc-main-99th': {
        name: 'Main GC, 99th percentile',
        unit: 'ms',
        reducer: 'median',
      },
      'gc-content-99th': {
        name: 'Content GC, 99th percentile',
        unit: 'ms',
        reducer: 'median',
      },
    };
  },

  map: (results, profile) => {
    addResultsByThread(results, profile, 'main');
    addResultsByThread(results, profile, 'content');
  },

  reduce: (results, mapped) => {
    ['gc-main-moderate', 'gc-content-moderate', 'gc-main-bad', 'gc-content-bad'].forEach(key => {
      results.set(key, countBy(result => result.get(key) > 0)(mapped));
    });
    results.set('gc-main-99th', valueQuantile('gc-main-99th')(mapped));
    results.set('gc-content-99th', valueQuantile('gc-content-99th')(mapped));
  },
};
