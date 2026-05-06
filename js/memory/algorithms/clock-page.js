'use strict';
var CLOCK_PAGE = (function () {
  function run(refString, numFrames) {
    var frames  = new Array(numFrames).fill(null);
    var refBits = new Array(numFrames).fill(0);
    var hand    = 0;
    var steps   = [];
    var faults  = 0;

    refString.forEach(function (page) {
      var slot = frames.indexOf(page);
      var hit  = slot !== -1;
      var evicted = null;
      var loaded  = null;

      if (hit) {
        refBits[slot] = 1; // set reference bit on hit
      } else {
        faults++;
        loaded = page;
        // Advance clock hand until reference bit = 0
        while (refBits[hand] === 1) {
          refBits[hand] = 0;
          hand = (hand + 1) % numFrames;
        }
        evicted      = frames[hand];
        frames[hand] = page;
        refBits[hand] = 1;
        hand = (hand + 1) % numFrames;
      }

      steps.push({
        ref:     page,
        frames:  frames.slice(),
        refBits: refBits.slice(),
        hand:    hand,
        fault:   !hit,
        evicted: evicted,
        loaded:  loaded
      });
    });

    return { steps: steps, faults: faults, hits: refString.length - faults };
  }
  return { run: run };
})();
