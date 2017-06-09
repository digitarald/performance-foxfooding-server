const { valueQuantile } = require('../iterators/reducers');

const reduce = (key, { percentile = 0.5 }) => {
  return valueQuantile(key, percentile);
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  return `${result.toFixed(2)} ${meta.unit || ''}`;
};

module.exports = {
  reduce,
  pretty,
};
