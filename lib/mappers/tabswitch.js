const { addResult } = require('../iterators/metrics');
const { printMarkers, logBreakdown } = require('../iterators/logs');
const {
  sliceMarkerInterval,
  breakdownMap,
  breakdownMarkers,
  findActiveThread,
} = require('../iterators/reducers');

module.exports = {
  getMetrics: () => {
    return {
      'tabswitch-moderate': {
        name: 'Moderate Tabswitch Delay 150ms',
        unit: '%',
        reducer: 'affected',
      },
    };
  },

  map: (results, profile) => {
    const main = profile.threads.find(thread => thread.friendly === 'main');
    const markers = main.merged;
    const tabswitches = markers.filter(
      entry => entry.name && entry.name.startsWith('AsyncTabSwitch')
    );
    const pairs = [];
    for (const start of tabswitches) {
      if (start.name.includes(':Start')) {
        const finish = tabswitches.find(
          check => check.name.includes(':Finish') && check.time > start.time
        );
        if (!finish) {
          break;
        }
        pairs.push({ start, finish });
      }
    }
    const durations = pairs.map(
      ({ start, finish }) => finish.time - start.time
    );
    pairs.forEach(({ start, finish }) => {
      const duration = finish.time - start.time;
      if (duration < 150) {
        return;
      }
      const active = findActiveThread(start.time, 'pageshow')(profile.threads);
      if (!active) {
        return;
      }

      // console.log(duration.toFixed(1));
      const log = logBreakdown();

      // const mainBreakdown = new Map(breakdownMap);
      // breakdownMarkers(mainBreakdown)(
      //   printMarkers()(sliceMarkerInterval(start.time, finish.time)(main.merged))
      // );
      // log(mainBreakdown);

      const contentBreakdown = new Map(breakdownMap);
      breakdownMarkers(contentBreakdown)(
        printMarkers()(
          sliceMarkerInterval(start.time, finish.time)(active.thread.merged)
        )
      );
      log(contentBreakdown);
    });
    addResult(
      results,
      `tabswitch-moderate`,
      durations.filter(duration => duration > 150).length
    );
  },
};
