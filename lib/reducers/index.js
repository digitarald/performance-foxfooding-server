const affected = require('./affected');
const median = require('./median');
const values = require('./values');
const age = require('./age');
const list = require('./list');

module.exports = new Map(
  Object.entries({
    affected,
    median,
    values,
    age,
    list,
  })
);
