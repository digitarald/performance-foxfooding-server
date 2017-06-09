const replacer = (key, value) => {
  if (value && typeof value === 'object' && value.size && value[Symbol.iterator]) {
    const obj = {};
    for (let [k, v] of value) {
      obj[k] = v;
    }
    return obj;
  }
  return value;
};

const reviver = (key, value) => {
  if (value != null && typeof value === 'object') {
    return new Map(Object.entries(value));
  }
  return value;
};

module.exports = {
  stringify: results => {
    return JSON.stringify(results, replacer);
  },

  parse: buffer => {
    return JSON.parse(buffer, reviver);
  },
  replacer,
  reviver,
};
