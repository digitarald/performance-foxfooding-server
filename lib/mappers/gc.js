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
  addResult(
    results,
    `gc-${include}-moderate`,
    durations.filter(duration => duration > 250).length
  );
  addResult(
    results,
    `gc-${include}-bad`,
    durations.filter(duration => duration > 2500).length
  );
  addResult(
    results,
    `gc-${include}-99th`,
    durations.length ? quantile(durations, 0.99) : 0
  );
};

module.exports = {
  getMetrics: () => {
    const affected = {
      unit: '%',
      reducer: 'affected',
    };
    const median = {
      unit: 'ms',
      reducer: 'median',
    };
    return {
      'gc-main-moderate': Object.assign(
        {
          name: 'Main GC over 250ms',
        },
        affected
      ),
      'gc-content-moderate': Object.assign(
        {
          name: 'Content GC over 250ms',
        },
        affected
      ),
      'gc-main-bad': Object.assign(
        {
          name: 'Main GC over 2.5s',
        },
        affected
      ),
      'gc-content-bad': Object.assign(
        {
          name: 'Content GC over 2.5s',
        },
        affected
      ),
      'gc-main-99th': Object.assign(
        {
          name: 'Main GC over 99th percentile',
        },
        median
      ),
      'gc-content-99th': Object.assign(
        {
          name: 'Content GC over 99th percentile',
        },
        median
      ),
    };
  },

  map: (results, profile) => {
    addResultsByThread(results, profile, 'main');
    addResultsByThread(results, profile, 'content');
  },

  reduce: (results, mapped) => {
    [
      'gc-main-moderate',
      'gc-content-moderate',
      'gc-main-bad',
      'gc-content-bad',
    ].forEach(key => {
      results.set(key, countBy(result => result.get(key) > 0)(mapped));
    });
    results.set('gc-main-99th', valueQuantile('gc-main-99th')(mapped));
    results.set('gc-content-99th', valueQuantile('gc-content-99th')(mapped));
  },
};
