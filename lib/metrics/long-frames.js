const { histogram } = require('d3-array');

module.exports = {

  map: (filter = ['main']) => {
    return ({ threads }) => {
      return threads
        .filter((thread) => filter.includes(thread.friendly))
        .reduce((markers, thread) => {
          return markers.concat(
            thread.merged
              .filter((entry) => entry.name === 'frame')
              .map((entry) => entry.endTime - entry.startTime)
          );
        }, [])
    };
  },

  reduce: () => {
    return (results) => {
      const frames = results.reduce(((all, frames) => all.concat(frames)), []);
      const hist = histogram(frames)
        .domain([16, 200]);
      const bins = hist(frames);
      return (
        bins
          .map((bin) => `${bin.x0}-${bin.x1}: ${bin.length}`)
          .join('\n')
      );
    };
  }

};
