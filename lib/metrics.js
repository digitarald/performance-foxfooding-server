const mappers = require('./mappers');

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

// const reduce = (reducer, mapped) => {
//   const results = new Map();
//   for (const mapper of mappers.values()) {
//     mapper.map(results, profile);
//   }
//   return results;
// };

module.exports = {
  meta,
  mapAll,
};
