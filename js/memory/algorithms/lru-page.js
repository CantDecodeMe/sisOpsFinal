'use strict';
var LRU_PAGE = (function () {
  function run(refString, numFrames) {
    var frames    = new Array(numFrames).fill(null);
    var lastUsed  = {}; // page → last tick index
    var steps     = [];
    var faults    = 0;

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
          // Find LRU: frame with the oldest lastUsed
          var lruSlot = 0;
          var lruTick = Infinity;
          for (var i = 0; i < frames.length; i++) {
            var t = lastUsed[frames[i]] !== undefined ? lastUsed[frames[i]] : -1;
            if (t < lruTick) { lruTick = t; lruSlot = i; }
          }
          evicted        = frames[lruSlot];
          frames[lruSlot] = page;
        }
      }

      lastUsed[page] = tick;

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
