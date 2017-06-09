const gc = require('./gc');
const jank = require('./jank');
const meta = require('./meta');

module.exports = new Map(
  Object.entries({
    gc,
    jank,
    meta,
  })
);
