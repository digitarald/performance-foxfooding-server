const affected = require('./affected');
const median = require('./median');
const values = require('./values');

module.exports = new Map(
  Object.entries({
    affected,
    median,
    values,
  })
);
