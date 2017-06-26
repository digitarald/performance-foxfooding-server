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
  return [...mapped]
    .map(([id, result]) => {
      return { id: id, value: result.get(key) };
    })
    .filter(entry => defaultThreshold(entry.value))
    .sort((a, b) => b.value - a.value)
    .map(({ id }) => [id, mapped.get(id)]);
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
