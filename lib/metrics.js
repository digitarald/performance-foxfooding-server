const mappers = require('./mappers');
const reducers = require('./reducers');

const meta = Array.from(mappers.entries()).reduce((fields, [key, metric]) => {
  return new Map([...fields, ...Object.entries(metric.getMetrics())]);
}, new Map());

const mapAll = profile => {
  const results = new Map();
  for (const mapper of mappers.values()) {
    mapper.map(results, profile);
  }
  return results;
};

const reduceAll = mapped => {
  const results = new Map();
  for (const [key, metric] of meta.entries()) {
    results.set(key, reducers.get(metric.reducer).pretty(mapped, key, metric));
  }
  return results;
};

module.exports = {
  meta,
  mapAll,
  reduceAll,
};
