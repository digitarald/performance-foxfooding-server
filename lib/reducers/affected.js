const { countBy } = require('../iterators/reducers');

const reduce = (key, meta) => {
  return countBy(result => result.get(key) > 0);
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
