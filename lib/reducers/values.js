const { valueCounts } = require('../iterators/reducers');

module.exports = {
  reduce: (key, meta) => {
    return valueCounts(key);
  },

  print: (result, meta) => {
    return Array.from(result.entries())
      .map(([key, count]) => {
        return `${key}: ${(count * 100).toFixed(2)}%`;
      })
      .join(', ');
  },
};
