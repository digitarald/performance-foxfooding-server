const { quantile, median } = require('simple-statistics');
const { addResult } = require('../iterators/metrics');
const {
  sliceMarkerInterval,
  breakdownMap,
  breakdownMarkers,
  findActiveThread,
} = require('../iterators/reducers');

const addResultsByThread = (results, profile, markerName, threadName) => {
  const durations = profile.threads
    .filter(thread => thread.friendly === threadName)
    .reduce((markers, thread) => {
      return markers.concat(
        thread.merged
          .filter(entry => entry.name === markerName)
          .map(entry => entry.endTime - entry.startTime)
      );
    }, []);
  const label = `layout-${markerName.toLowerCase()}-${threadName}`;
  addResult(
    results,
    `${label}-moderate`,
    durations.filter(duration => duration > 30).length
  );
  addResult(
    results,
    `${label}-bad`,
    durations.filter(duration => duration > 100).length
  );
};

module.exports = {
  getMetrics: () => {
    return ['Styles', 'Reflow'].reduce((metrics, task) => {
      for (const thread of ['Main', 'Content']) {
        metrics[
          `layout-${task.toLowerCase()}-${thread.toLowerCase()}-moderate`
        ] = {
          name: `${thread} ${task} over 30ms`,
          unit: '%',
          reducer: 'affected',
        };
        metrics[`layout-${task.toLowerCase()}-${thread.toLowerCase()}-bad`] = {
          name: `${thread} ${task} over 100ms`,
          unit: '%',
          reducer: 'affected',
        };
      }
      return metrics;
    }, {});
  },

  map: (results, profile) => {
    addResultsByThread(results, profile, 'Styles', 'main');
    addResultsByThread(results, profile, 'Styles', 'content');
    addResultsByThread(results, profile, 'Reflow', 'main');
    addResultsByThread(results, profile, 'Reflow', 'content');
  },
};
