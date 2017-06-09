const { addResult } = require('../iterators/metrics');

module.exports = {
  getMetrics: () => {
    return {
      os: {
        name: 'OS/Version',
        unit: '%',
        reducer: 'values',
      },
      architecture: {
        name: 'Architecture',
        unit: '%',
        reducer: 'values',
      },
      version: {
        name: 'Browser Version',
        unit: '%',
        reducer: 'values',
      },
    };
  },

  map: (results, profile) => {
    addResult(results, 'os', `${profile.meta.os}/${profile.meta.os_version}`);
    addResult(results, 'architecture', profile.meta.architecture);
    addResult(results, 'version', profile.meta.version);
  },
};
