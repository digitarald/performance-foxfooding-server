const { valueQuantile } = require('../iterators/reducers');

module.exports = {
  reduce: (key, { percentile = 0.5 }) => {
    return valueQuantile(key, percentile);
  },

  print: (result, meta) => {
    return `${result.toFixed(2)} ${meta.unit || ''}`;
  },
};
