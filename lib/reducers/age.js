const { median } = require('simple-statistics');

const reduce = key => {
  const now = Date.now();
  return collection => {
    const ages = [];
    for (const result of collection.values()) {
      if (result.has(key)) {
        ages.push(now - new Date(result.get(key)).getTime());
      }
    }
    return median(ages);
  };
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  return result ? [(result / 1000 / 60 / 60 / 24).toFixed(2), 'days'] : 'n/a';
};

module.exports = {
  reduce,
  pretty,
};
