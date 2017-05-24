const { histogram } = require('d3-array');
const { parse } = require('url');

module.exports = {

  map: () => {
    return ({ threads }) => {
      const compositor = threads
        .find((thread) => thread.friendly === 'compositor');
      const vsyncs = compositor.merged
          .filter((marker) => marker.name === 'VsyncTimestamp');

      return threads
        .filter((thread) => thread.friendly === 'content')
        .reduce((markers, thread) => {
          return markers.concat(
            thread.merged
              .filter((entry) => entry.name && entry.name.startsWith('Non-blank paint'))
              .map((entry) => entry.name.match(/(\d+)ms.*URL\s(.*?),\s/))
              .filter(match => match)
              .map(match => ({ time: parseInt(match[1], 10), url: match[2] }))
          );
        }, [])
    };
  },

  reduce: () => {
    return (results) => {
      return results
        .reduce(((all, mapped) => all.concat(mapped)), [])
        .reduce((hosts, entry) => {
          const host = parse(entry.url).hostname;
          hosts[host] = hosts[host] || [];
          hosts[host].push(entry.time);
          return hosts;
        }, {});
    };
  }

};
