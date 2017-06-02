const { histogram } = require('d3');
const { parse } = require('url');
const { consoleMap } = require('../iterators/logs');

const findBefore = (markers, callback) => {
  return (reference, idx) => {
    return markers.slice(0, markers.indexOf(reference)).reverse().find(callback);
  };
};

const findAfter = (markers, callback) => {
  return reference => {
    return markers.slice(markers.indexOf(reference) + 1).find(callback);
  };
};

const splitMap = callback => {
  return (entry, idx) => [entry, callback(entry, idx)];
};

module.exports = {
  map: () => {
    return ({ threads }) => {
      const compositor = threads.find(thread => thread.friendly === 'compositor');
      return threads.filter(thread => thread.friendly === 'content').reduce((markers, thread) => {
        return markers.concat(
          thread.merged
            .filter(entry => entry.name && entry.name.startsWith('Non-blank paint'))
            .map(entry => entry.name.match(/(\d+)ms.*URL\s(.*?),\s/))
            .filter(match => match)
            .map(match => ({ time: parseInt(match[1], 10), url: match[2] }))
        );
      }, []);
    };
  },

  reduce: () => {
    return results => {
      const runs = results.reduce((all, run) => {
        return all.concat(run);
      }, []);
      return runs.reduce((hosts, entry) => {
        const host = parse(entry.url).hostname;
        hosts[host] = hosts[host] || [];
        hosts[host].push(entry.time);
        return hosts;
      }, {});
    };
  },
};
