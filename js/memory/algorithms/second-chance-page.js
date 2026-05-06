'use strict';
var SECOND_CHANCE_PAGE = (function () {
  function run(refString, numFrames) {
    // Each entry: { page, refBit }
    var queue   = [];
    var frames  = new Array(numFrames).fill(null);
    var steps   = [];
    var faults  = 0;

    refString.forEach(function (page) {
      var idx  = frames.indexOf(page);
      var hit  = idx !== -1;
      var evicted = null;
      var loaded  = null;

      if (hit) {
        queue[idx].refBit = 1;
      } else {
        faults++;
        loaded = page;
        var freeSlot = frames.indexOf(null);
        if (freeSlot !== -1) {
          frames[freeSlot]   = page;
          queue[freeSlot]    = { page: page, refBit: 0 };
        } else {
          // FIFO + second chance: cycle through queue
          var victim = null;
          while (victim === null) {
            var candidate = queue.shift();
            if (candidate.refBit === 0) {
              victim = candidate.page;
            } else {
              candidate.refBit = 0;
              queue.push(candidate);
            }
          }
          var victimSlot = frames.indexOf(victim);
          evicted              = victim;
          frames[victimSlot]   = page;
          queue.splice(victimSlot, 0, { page: page, refBit: 0 });
          // Re-sync queue order: push new entry at end (simplification)
          queue = frames.map(function (f, i) {
            var existing = queue.find(function (q) { return q.page === f; });
            return existing || { page: f, refBit: 0 };
          });
        }
      }

      steps.push({
        ref:     page,
        frames:  frames.slice(),
        fault:   !hit,
        evicted: evicted,
        loaded:  loaded
      });
    });

    return { steps: steps, faults: faults, hits: refString.length - faults };
  }
  return { run: run };
})();
