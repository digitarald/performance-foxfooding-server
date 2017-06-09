const { countBy } = require('../iterators/reducers');

module.exports = {
  reduce: (key, meta) => {
    return countBy(result => result.get(key) > 0);
  },

  print: result => {
    return `${result.toFixed(2)}% affected`;
  },
};
