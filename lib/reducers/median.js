const { valueQuantile } = require('../iterators/reducers');

const reduce = (key, { percentile = 0.5 }) => {
  return valueQuantile(key, percentile);
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  return [result.toFixed(2), meta.unit];
};

const defaultThreshold = value => value > 0;

const sort = (mapped, key, meta) => {
  const threshold = meta.threshold || defaultThreshold;
  return Array.from(mapped)
    .map(([id, result]) => [result.get(key), id])
    .filter(([value]) => defaultThreshold(value))
    .sort(([a], [b]) => b - a)
    .map(([_, id]) => [id, mapped.get(id)]);
};

const prettyOne = (key, meta) => {
  const unit = meta.unitOne || 'ms';
  return profile => [profile.get(key).toFixed(2), unit];
};

module.exports = {
  reduce,
  pretty,
  sort,
  prettyOne,
};
