const glob = require('glob');
const { basename } = require('path');
const files = glob.sync('./!(index).js', { cwd: __dirname });

const metrics = files.reduce(
  (map, file) => map.set(basename(file, '.js'), require(file)),
  new Map()
);

const names = Array.from(metrics.keys());

const applyMetrics = profiles => {
  // TODO: Run this async to collect mapping data per profile, then
  // provide results to reducer
  return names.reduce((results, metricName) => {
    const { variations } = metrics.get(metricName);
    if (variations) {
      for (const [variationName, args] of variations) {
        results.set(`${metricName}:${variationName}`, applyMetric(profiles, metricName, args));
      }
    } else {
      results.set(metricName, applyMetric(profiles, metricName));
    }
    return results;
  }, new Map());
};

const applyMetric = (profiles, metricName, mapOpts = {}, reduceOpts = {}) => {
  const metric = metrics.get(metricName);
  const mapped = profiles.map(metric.map(mapOpts));
  return metric.reduce(reduceOpts)(mapped);
};

module.exports = {
  metrics,
  applyMetric,
  applyMetrics,
};
