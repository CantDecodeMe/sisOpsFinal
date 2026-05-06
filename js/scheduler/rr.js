'use strict';
/* RR — Round Robin (preemptive, quantum configurable) */
var RR = (function () {
  function run(processes, config) {
    var numCores = config.cores   || 1;
    var totalMem = config.memory  || 512;
    var quantum  = config.quantum || 4;
    var procs = SCHED_UTILS.cloneProcesses(processes);
    procs.sort(function (a, b) { return a.at - b.at; });

    var memBlocks   = [{ free: true, start: 0, size: totalMem, pid: null, color: null }];
    var readyQueue  = [];
    var coreSlots   = new Array(numCores).fill(null);
    var quantumLeft = new Array(numCores).fill(0);
    var done        = [];
    var ticks       = [];
    var firstRun    = {};
    var time        = 0;
    var maxTime     = procs.reduce(function (s, p) { return s + p.bt; }, 0) * 3 + 20;

    while (done.length < procs.length && time < maxTime) {
      // New arrivals — add to back of queue
      procs.forEach(function (p) {
        if (p.at === time && p.state === 'new') {
          p.state = 'ready';
          readyQueue.push(p);
          SCHED_UTILS.allocFirstFit(memBlocks, p);
        }
      });

      // Preempt: move expired-quantum processes back to queue
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null && quantumLeft[c] <= 0) {
          var p = coreSlots[c];
          // Check new arrivals at this tick haven't caused an earlier queue position
          p.state = 'ready';
          readyQueue.push(p);
          coreSlots[c] = null;
        }
      }

      // Assign to idle cores
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] === null && readyQueue.length > 0) {
          var next = readyQueue.shift();
          next.state = 'running';
          if (firstRun[next.pid] === undefined) firstRun[next.pid] = time;
          coreSlots[c] = next;
          quantumLeft[c] = quantum;
        }
      }

      ticks.push(SCHED_UTILS.buildTickState(time, coreSlots, readyQueue, memBlocks));

      // Execute 1 tick
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null) {
          coreSlots[c].remaining--;
          quantumLeft[c]--;
          if (coreSlots[c].remaining <= 0) {
            var p = coreSlots[c];
            p.ct = time + 1; p.state = 'done';
            SCHED_UTILS.freeMemBlock(memBlocks, p.pid);
            done.push(p); coreSlots[c] = null; quantumLeft[c] = 0;
          }
        }
      }
      time++;
    }
    return SCHED_UTILS.buildFinalResult(ticks, procs, firstRun, numCores);
  }
  return { run: run };
})();
