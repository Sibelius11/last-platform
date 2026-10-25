/* Path stats. Never shown to players.
   Sends nothing until GoatCounter is configured (set GOATCOUNTER_URL once the domain exists).
   Event names follow the project brief:
   start · end-exit · end-track · end-edge · end-bridge-jump · end-platform-end · end-passenger · end-unlisted · end-stayed
   saw-glimpse · saw-row-3 · on-bridge-window · saw-open-train · boarded-open · left-open-early · on-track
   missed-passenger-read · missed-passenger-unread · fps-under-15 · fps-15-30 · fps-over-30 · egg-<name>
   The first run on a device is tagged separately, and each ending carries a rough time band. */
(function () {
  'use strict';
  var GOATCOUNTER_URL = ''; // e.g. 'https://<code>.goatcounter.com/count'
  var startedAt = Date.now();
  var firstRun = true;
  try {
    firstRun = !localStorage.getItem('lp-played');
    localStorage.setItem('lp-played', '1');
  } catch (e) {}

  function band() {
    var min = (Date.now() - startedAt) / 60000;
    return min < 1 ? 'under-1m' : min <= 5 ? '1-5m' : 'over-5m';
  }

  function send(path) {
    if (!GOATCOUNTER_URL) { if (location.hostname === 'localhost') console.debug('[stats]', path); return; }
    var url = GOATCOUNTER_URL + '?p=' + encodeURIComponent('/event/' + path) + '&e=true&rnd=' + Math.random();
    try { navigator.sendBeacon ? navigator.sendBeacon(url) : fetch(url, { mode: 'no-cors', keepalive: true }); } catch (e) {}
  }

  window.LPStats = {
    event: function (name) { send(name + (firstRun ? '/first' : '/replay')); },
    ending: function (name) { send('end-' + name + '/' + band() + (firstRun ? '/first' : '/replay')); }
  };
})();
