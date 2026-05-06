'use strict';
/* PRIORITY — Priority Scheduling (Preemptive y Non-Preemptive)
   Prioridad: número más bajo = más alta prioridad (1 = máxima).
   config.preemptive = true  → expulsa al proceso actual si llega uno de mayor prioridad
   config.preemptive = false → solo asigna CPU cuando queda libre
*/
var PRIORITY = (function () {
  function run(processes, config) {
    var numCores   = config.cores || 1;
    var totalMem   = config.memory || 512;
    var preemptive = config.preemptive !== false; // default true
    var procs      = SCHED_UTILS.cloneProcesses(processes);
    procs.sort(function (a, b) { return a.at - b.at; });

    var memBlocks  = [{ free: true, start: 0, size: totalMem, pid: null, color: null }];
    var readyQueue = [];
    var coreSlots  = new Array(numCores).fill(null);
    var done       = [];
    var ticks      = [];
    var firstRun   = {};
    var time       = 0;
    var maxTime    = procs.reduce(function (s, p) { return s + p.bt; }, 0) + procs.length + 10;

    function pickHighest(queue) {
      var best = 0;
      for (var i = 1; i < queue.length; i++) {
        if (queue[i].priority < queue[best].priority) best = i;
      }
      return queue.splice(best, 1)[0];
    }

    while (done.length < procs.length && time < maxTime) {
      // Arrivals
      procs.forEach(function (p) {
        if (p.at === time && p.state === 'new') {
          p.state = 'ready';
          readyQueue.push(p);
          SCHED_UTILS.allocFirstFit(memBlocks, p);
        }
      });

      if (preemptive) {
        // Preemptive: for each core, check if a higher-priority process is waiting
        for (var c = 0; c < numCores; c++) {
          if (coreSlots[c] !== null && readyQueue.length > 0) {
            var best = readyQueue.reduce(function (b, p) { return p.priority < b.priority ? p : b; }, readyQueue[0]);
            if (best.priority < coreSlots[c].priority) {
              // Preempt
              coreSlots[c].state = 'ready';
              readyQueue.push(coreSlots[c]);
              readyQueue.splice(readyQueue.indexOf(best), 1);
              if (firstRun[best.pid] === undefined) firstRun[best.pid] = time;
              best.state = 'running';
              coreSlots[c] = best;
            }
          }
          if (coreSlots[c] === null && readyQueue.length > 0) {
            var next = pickHighest(readyQueue);
            next.state = 'running';
            if (firstRun[next.pid] === undefined) firstRun[next.pid] = time;
            coreSlots[c] = next;
          }
        }
      } else {
        // Non-preemptive: only assign to free cores
        for (var c = 0; c < numCores; c++) {
          if (coreSlots[c] === null && readyQueue.length > 0) {
            var next = pickHighest(readyQueue);
            next.state = 'running';
            if (firstRun[next.pid] === undefined) firstRun[next.pid] = time;
            coreSlots[c] = next;
          }
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
