const { countBy } = require('../iterators/reducers');

const reduce = (key, meta) => {
  return countBy(result => result.get(key) > 0);
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  return `${result.toFixed(2)}% affected`;
};

module.exports = {
  reduce,
  pretty,
};
