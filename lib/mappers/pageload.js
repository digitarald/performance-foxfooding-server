const { histogram } = require('d3');
const { parse } = require('url');
const { addResult } = require('../iterators/metrics');

const findBefore = (markers, callback) => {
  return (reference, idx) => {
    return markers
      .slice(0, markers.indexOf(reference))
      .reverse()
      .find(callback);
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
  getMetrics: () => {
    return {
      'pageload-urls': {
        name: 'Page Loads',
        reducer: 'list',
      },
    };
  },

  map: (results, profile) => {
    const domains = profile.threads
      .filter(thread => thread.friendly === 'content')
      .reduce((markers, thread) => {
        return markers.concat(
          thread.merged
            .filter(
              entry => entry.name && entry.name.startsWith('Non-blank paint')
            )
            .map(entry => entry.name.match(/(\d+)ms.*URL\s(.*?),\s/))
            .filter(match => match)
            .map(match => match[2]) // time: parseInt(match[1], 10)
            .map(url => url.split('/').splice(0, 3).join('/'))
        );
      }, []);
    addResult(results, 'pageload-urls', domains);
  },
};
