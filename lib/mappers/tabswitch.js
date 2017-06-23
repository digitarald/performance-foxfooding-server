const { addResult } = require('../iterators/metrics');
const { printMarkers, logBreakdown } = require('../iterators/logs');
const {
  sliceMarkerInterval,
  breakdownMap,
  breakdownMarkers,
  findActiveThread,
} = require('../iterators/reducers');

const durationsBetweenMarkers = (markers, startMatch, endMatch) => {
  const pairs = [];
  for (const start of markers) {
    if (start.name.includes(':Start')) {
      const finish = markers.find(
        check => check.name.includes(':Finish') && check.time > start.time
      );
      if (!finish) {
        break;
      }
      pairs.push({ start, finish });
    }
  }
  return pairs.map(({ start, finish }) => finish.time - start.time);
};

// const markerBreakdown = (pairs) => {
//   pairs.forEach(({ start, finish }) => {
//     const duration = finish.time - start.time;
//     if (duration < 150) {
//       return;
//     }
//     const active = findActiveThread(start.time, 'pageshow')(profile.threads);
//     if (!active) {
//       return;
//     }
//
//     // console.log(duration.toFixed(1));
//     const log = logBreakdown();
//
//     // const mainBreakdown = new Map(breakdownMap);
//     // breakdownMarkers(mainBreakdown)(
//     //   printMarkers()(sliceMarkerInterval(start.time, finish.time)(main.merged))
//     // );
//     // log(mainBreakdown);
//
//     const contentBreakdown = new Map(breakdownMap);
//     breakdownMarkers(contentBreakdown)(
//       printMarkers()(
//         sliceMarkerInterval(start.time, finish.time)(active.thread.merged)
//       )
//     );
//     log(contentBreakdown);
//   });
// }

module.exports = {
  getMetrics: () => {
    const affected = {
      unit: '%',
      reducer: 'affected',
    };
    return {
      'tabswitch-moderate': Object.assign(
        {
          name: 'Switch over 150ms',
        },
        affected
      ),
      'tabswitch-bad': Object.assign(
        {
          name: 'Switch over 500ms',
        },
        affected
      ),
      'tabswitch-spinner-moderate': Object.assign(
        {
          name: 'Spinner over 150ms',
        },
        affected
      ),
      'tabswitch-spinner-bad': Object.assign(
        {
          name: 'Spinner over 500ms',
        },
        affected
      ),
    };
  },

  map: (results, profile) => {
    const main = profile.threads.find(thread => thread.friendly === 'main');
    const markers = main.merged;
    const tabswitches = markers.filter(
      entry => entry.name && entry.name.startsWith('AsyncTabSwitch')
    );
    const switchDurations = durationsBetweenMarkers(
      tabswitches,
      ':Start',
      ':Finish'
    );
    const spinnerDurations = durationsBetweenMarkers(
      tabswitches,
      ':SpinnerShown',
      ':SpinnerHidden'
    );

    addResult(
      results,
      `tabswitch-moderate`,
      switchDurations.filter(duration => duration > 150).length
    );
    addResult(
      results,
      `tabswitch-bad`,
      switchDurations.filter(duration => duration > 500).length
    );
    addResult(
      results,
      `tabswitch-spinner-moderate`,
      spinnerDurations.filter(duration => duration > 150).length
    );
    addResult(
      results,
      `tabswitch-spinner-bad`,
      spinnerDurations.filter(duration => duration > 500).length
    );
  },
};
