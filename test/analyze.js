const fs = require('fs');
const { ungzip } = require('pako');
const glob  = require('glob');
const { transform, printMarkers } = require('../lib/processor');
const pageLoads = require('../lib/metrics/page-loads');
const gcTimes = require('../lib/metrics/gc-times');
const longFrames = require('../lib/metrics/long-frames');

const loadSample = (sample) => {
  const binary = fs.readFileSync(sample, 'binary');
  const json = JSON.parse(ungzip(binary, { to: 'string' }));
  const transformed = transform(json);
  return transformed;
};

const analyze = () => {
  const profiles = glob.sync(`${__dirname}/../samples/*/*`)
    .map(loadSample);


  console.log('\nLong Frames: Main');
  console.log(
    longFrames.reduce()(
      profiles.map(longFrames.map('main'))
    )
  );

  console.log('\nLong Frames: Content');
  console.log(
    longFrames.reduce()(
      profiles.map(longFrames.map('content'))
    )
  );

  console.log('\nPage Loads');
  console.log(
    pageLoads.reduce()(
      profiles.map(pageLoads.map())
    )
  );

  // console.log('\nGC Times: Content');
  // console.log(
  //   gcTimes.reduce()(
  //     profiles.map(gcTimes.map('main'))
  //   )
  // );

  // profiles[1].threads
  //   .filter(thread => thread.friendly === 'content')
  //   .map(printMarkers());
}

analyze();
