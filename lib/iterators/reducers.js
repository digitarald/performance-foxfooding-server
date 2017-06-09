const { quantile } = require('simple-statistics');

const countBy = callback => {
  return collection => {
    const sum = collection.size;
    let count = 0;
    for (const value of collection.values()) {
      if (callback(value)) {
        count += 1;
      }
    }
    return count / sum;
  };
};

const valueQuantile = (field, p = 0.5) => {
  return collection => {
    let values = [];
    for (const result of collection.values()) {
      const value = result.get(field);
      if (value) {
        values.push(value);
      }
    }
    return quantile(values, p);
  };
};

const valuesFlatten = field => {
  return collection => {
    let flattened = [];
    for (const values of collection.values()) {
      if (values && values.length) {
        flattened.push.apply(flattened, values);
      }
    }
    return flattened;
  };
};

const valueCounts = field => {
  return collection => {
    const sum = collection.size;
    const counts = new Map();
    for (const needle of collection.values()) {
      const value = needle.get(field);
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    for (const [key, count] of counts) {
      counts.set(key, count / sum);
    }
    return counts;
  };
};

module.exports = {
  countBy,
  valueQuantile,
  valuesFlatten,
  valueCounts,
};
