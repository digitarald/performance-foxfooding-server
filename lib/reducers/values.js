const { valueCounts } = require('../iterators/reducers');

const reduce = (key, meta) => {
  return valueCounts(key);
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  console.log(result);
  return Array.from(result.entries())
    .map(([key, count]) => {
      return `${key}: ${(count * 100).toFixed(2)}%`;
    })
    .join(', ');
};

module.exports = {
  reduce,
  pretty,
};
