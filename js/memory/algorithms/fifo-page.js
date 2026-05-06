'use strict';
var FIFO_PAGE = (function () {
  function run(refString, numFrames) {
    var frames = new Array(numFrames).fill(null);
    var queue  = []; // orden de llegada
    var steps  = [];
    var faults = 0;

    refString.forEach(function (page) {
      var hit     = frames.indexOf(page) !== -1;
      var evicted = null;
      var loaded  = null;

      if (!hit) {
        faults++;
        loaded = page;
        var freeSlot = frames.indexOf(null);
        if (freeSlot !== -1) {
          frames[freeSlot] = page;
          queue.push(freeSlot);
        } else {
          var victim = queue.shift();
          evicted    = frames[victim];
          frames[victim] = page;
          queue.push(victim);
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
