const gc = require('./gc');
const jank = require('./jank');
const meta = require('./meta');
const tabswitch = require('./tabswitch');
const layout = require('./layout');
const pageload = require('./pageload');

module.exports = new Map(
  Object.entries({
    gc,
    jank,
    meta,
    tabswitch,
    layout,
    // pageload,
  })
);
