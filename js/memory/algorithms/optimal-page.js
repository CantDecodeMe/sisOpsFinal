'use strict';
var OPTIMAL_PAGE = (function () {
  function run(refString, numFrames) {
    var frames = new Array(numFrames).fill(null);
    var steps  = [];
    var faults = 0;

    refString.forEach(function (page, tick) {
      var hit     = frames.indexOf(page) !== -1;
      var evicted = null;
      var loaded  = null;

      if (!hit) {
        faults++;
        loaded = page;
        var freeSlot = frames.indexOf(null);
        if (freeSlot !== -1) {
          frames[freeSlot] = page;
        } else {
          // Find the page that will be used farthest in the future
          var future   = refString.slice(tick + 1);
          var farthest = -1;
          var victimSlot = 0;
          for (var i = 0; i < frames.length; i++) {
            var nextUse = future.indexOf(frames[i]);
            if (nextUse === -1) { victimSlot = i; break; } // never used again → evict immediately
            if (nextUse > farthest) { farthest = nextUse; victimSlot = i; }
          }
          evicted            = frames[victimSlot];
          frames[victimSlot] = page;
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
