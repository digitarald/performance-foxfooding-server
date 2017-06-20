const gc = require('./gc');
const jank = require('./jank');
const meta = require('./meta');
const tabswitch = require('./tabswitch');

module.exports = new Map(
  Object.entries({
    gc,
    jank,
    meta,
    tabswitch,
  })
);
