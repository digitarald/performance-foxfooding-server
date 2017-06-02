const fs = require('fs');
const { ungzip } = require('pako');
const glob = require('glob');
const { transform } = require('../lib/iterators/transform');
const { printMarkers } = require('../lib/iterators/logs');
const { applyMetrics } = require('../lib/metrics');

const loadSample = sample => {
  const binary = fs.readFileSync(sample, 'binary');
  const json = JSON.parse(ungzip(binary, { to: 'string' }));
  const transformed = transform(json);
  return transformed;
};

const analyze = () => {
  const profiles = glob.sync(`${__dirname}/../samples/*/*`).map(loadSample);

  console.log(applyMetrics(profiles));
};

analyze();
