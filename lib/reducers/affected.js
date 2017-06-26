const { countBy } = require('../iterators/reducers');

const reduce = (key, meta) => {
  return countBy(result => result.get(key) > 0);
};

const defaultThreshold = value => value > 0;

const sort = (mapped, key, meta) => {
  const threshold = meta.threshold || defaultThreshold;
  return [...mapped]
    .map(([id, result]) => [result.get(key), id])
    .filter(([value]) => defaultThreshold(value))
    .sort(([a], [b]) => b - a)
    .map(([_, id]) => [id, mapped.get(id)]);
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  return [`${result.toFixed(2)}%`, 'affected'];
};

const prettyOne = (key, meta) => {
  const unit = meta.unitOne || null;
  return profile => [profile.get(key), unit];
};

module.exports = {
  reduce,
  pretty,
  sort,
  prettyOne,
};
