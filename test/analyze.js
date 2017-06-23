const { readFileSync } = require('fs');
const { relative } = require('path');
const { ungzip } = require('pako');
const glob = require('glob');
const { transform } = require('../lib/iterators/transform');
const { printMarkers } = require('../lib/iterators/logs');
const { mapAll, reduceAll } = require('../lib/metrics');

const loadSample = file => {
  return transform(
    JSON.parse(ungzip(readFileSync(file, 'binary'), { to: 'string' }))
  );
};

const samples = `${__dirname}/../samples`;

const analyze = () => {
  console.log('Mapping');
  const results = glob.sync(`${samples}/*/*`).reduce((mapped, file) => {
    return mapped.set(relative(samples, file), mapAll(loadSample(file)));
  }, new Map());
  console.log('Reducing');
  const reduced = reduceAll(results);
  console.log(reduced);
};

analyze();
