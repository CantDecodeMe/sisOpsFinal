'use strict';
/* SRT — Shortest Remaining Time (preemptive SJN) */
var SRT = (function () {
  function run(processes, config) {
    var numCores = config.cores  || 1;
    var totalMem = config.memory || 512;
    var procs = SCHED_UTILS.cloneProcesses(processes);

    var memBlocks  = [{ free: true, start: 0, size: totalMem, pid: null, color: null }];
    var readyQueue = [];
    var coreSlots  = new Array(numCores).fill(null);
    var done       = [];
    var ticks      = [];
    var firstRun   = {};
    var time       = 0;
    var maxTime    = procs.reduce(function (s, p) { return s + p.bt; }, 0) + procs.length + 10;

    while (done.length < procs.length && time < maxTime) {
      // New arrivals
      procs.forEach(function (p) {
        if (p.at === time && p.state === 'new') {
          p.state = 'ready';
          readyQueue.push(p);
          SCHED_UTILS.allocFirstFit(memBlocks, p);
        }
      });

      // SRT preemption: if any running process has higher remaining than a ready one, swap
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null && readyQueue.length > 0) {
          var shortest = readyQueue.reduce(function (best, p) {
            return p.remaining < best.remaining ? p : best;
          }, readyQueue[0]);
          if (shortest.remaining < coreSlots[c].remaining) {
            // Preempt
            var preempted = coreSlots[c];
            preempted.state = 'ready';
            readyQueue.push(preempted);
            readyQueue.splice(readyQueue.indexOf(shortest), 1);
            shortest.state = 'running';
            if (firstRun[shortest.pid] === undefined) firstRun[shortest.pid] = time;
            coreSlots[c] = shortest;
          }
        }
      }

      // Assign to idle cores (pick shortest remaining)
      readyQueue.sort(function (a, b) { return a.remaining - b.remaining; });
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] === null && readyQueue.length > 0) {
          var next = readyQueue.shift();
          next.state = 'running';
          if (firstRun[next.pid] === undefined) firstRun[next.pid] = time;
          coreSlots[c] = next;
        }
      }

      ticks.push(SCHED_UTILS.buildTickState(time, coreSlots, readyQueue, memBlocks));

      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null) {
          coreSlots[c].remaining--;
          if (coreSlots[c].remaining <= 0) {
            var p = coreSlots[c];
            p.ct = time + 1; p.state = 'done';
            SCHED_UTILS.freeMemBlock(memBlocks, p.pid);
            done.push(p); coreSlots[c] = null;
          }
        }
      }
      time++;
    }
    return SCHED_UTILS.buildFinalResult(ticks, procs, firstRun, numCores);
  }
  return { run: run };
})();
