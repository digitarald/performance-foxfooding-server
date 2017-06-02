const { histogram } = require('d3-array');

module.exports = {
  map: ({ include = ['main'] }) => {
    return ({ threads }) => {
      return threads
        .filter(thread => include.includes(thread.friendly))
        .reduce((markers, thread) => {
          return markers.concat(
            thread.merged
              .filter(entry => entry.name === 'hang')
              .map(entry => entry.endTime - entry.startTime)
          );
        }, []);
    };
  },

  reduce: () => {
    return results => {
      const frames = results.reduce((all, frames) => {
        return all.concat(frames);
      }, []);
      const hist = histogram(frames).domain([16, 200]);
      const bins = hist(frames);
      return bins.map(bin => [`${bin.x0}-${bin.x1}`, bin.length]);
    };
  },

  variations: new Map([['main', { include: ['main'] }], ['content', { include: ['content'] }]]),
};
