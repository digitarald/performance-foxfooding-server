const { readFileSync } = require('fs');
const { relative } = require('path');
const { ungzip, gzip } = require('pako');
const glob = require('glob');
const { transform, symbolicate } = require('../lib/iterators/transform');
const { printMarkers } = require('../lib/iterators/logs');
const { mapAll, reduceAll } = require('../lib/metrics');

const loadSample = async file => {
  const raw = JSON.parse(
    ungzip(readFileSync(file, 'binary'), { to: 'string' })
  );
  const profile = await symbolicate(raw);
  return transform(profile);
};

const samples = `${__dirname}/../samples-extra`;

const analyze = async () => {
  console.log('Mapping');
  const results = new Map();
  for (const file of glob.sync(`${samples}/*/*`)) {
    console.log(file);
    const profile = await loadSample(file);
    results.set(relative(samples, file), mapAll(profile));
  }
  console.log('Reducing');
  const reduced = reduceAll(results);
  console.log(reduced);
};

analyze();
