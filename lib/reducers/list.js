const { valueQuantile } = require('../iterators/reducers');

const reduce = key => {
  return mapped => {
    const values = new Map();
    let sum = 0;
    for (const result of mapped.values()) {
      for (const value of result.get(key)) {
        values.set(value, (values.get(value) || 0) + 1);
        sum += 1;
      }
    }
    for (const [key, count] of values) {
      values.set(key, count / sum);
    }
    return values;
  };
};

const pretty = (mapped, key, meta) => {
  const result = reduce(key, meta)(mapped);
  console.log(result);
  const sorted = [...result].sort(([_a, a], [_b, b]) => a - b);
  return sorted.slice(0, 5).map(([domain]) => domain).join(', ');
};

const defaultThreshold = value => value > 0;

const prettyOne = (key, meta) => {
  const unit = meta.unitOne || 'ms';
  return profile => [profile.get(key).toFixed(2), unit];
};

module.exports = {
  reduce,
  pretty,
  prettyOne,
};
