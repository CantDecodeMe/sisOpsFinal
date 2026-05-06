'use strict';
/* MLFQ — Multi-Level Feedback Queue
   variant='mlfq1': basic degradation only
   variant='mlfq2': degradation + aging (anti-starvation)
*/
var MLFQ = (function () {
  var QUEUE_QUANTUMS = [4, 8, 0]; // Q0, Q1, Q2 (0 = FCFS)
  var AGING_THRESHOLD = 16;       // ticks waiting in lower queue before promotion

  function run(processes, config) {
    var numCores = config.cores   || 1;
    var totalMem = config.memory  || 512;
    var variant  = config.variant || 'mlfq1';
    var procs = SCHED_UTILS.cloneProcesses(processes);

    var memBlocks  = [{ free: true, start: 0, size: totalMem, pid: null, color: null }];
    // 3 queues
    var queues     = [[], [], []];
    var coreSlots  = new Array(numCores).fill(null);
    var coreQLevel = new Array(numCores).fill(0); // queue level of process on this core
    var coreQLUsed = new Array(numCores).fill(0); // ticks used at current level
    var procQLevel = {}; // pid → queue level
    var procWait   = {}; // pid → ticks waiting in current level (for aging)
    var done       = [];
    var ticks      = [];
    var firstRun   = {};
    var time       = 0;
    var maxTime    = procs.reduce(function (s, p) { return s + p.bt; }, 0) * 4 + 30;

    while (done.length < procs.length && time < maxTime) {
      // New arrivals → Q0
      procs.forEach(function (p) {
        if (p.at === time && p.state === 'new') {
          p.state = 'ready';
          procQLevel[p.pid] = 0;
          procWait[p.pid]   = 0;
          queues[0].push(p);
          SCHED_UTILS.allocFirstFit(memBlocks, p);
        }
      });

      // Aging (MLFQ_2): promote processes waiting too long in Q1/Q2
      if (variant === 'mlfq2') {
        for (var ql = 1; ql < 3; ql++) {
          queues[ql].forEach(function (p) {
            procWait[p.pid] = (procWait[p.pid] || 0) + 1;
            if (procWait[p.pid] >= AGING_THRESHOLD) {
              procWait[p.pid] = 0;
              procQLevel[p.pid] = ql - 1;
            }
          });
          // Move promoted processes up
          var promoted = queues[ql].filter(function (p) { return procQLevel[p.pid] < ql; });
          queues[ql] = queues[ql].filter(function (p) { return procQLevel[p.pid] === ql; });
          promoted.forEach(function (p) { queues[ql - 1].push(p); });
        }
      }

      // Preempt: quantum expired → move to lower queue
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null) {
          var q = coreQLevel[c];
          var qmax = QUEUE_QUANTUMS[q];
          if (qmax > 0 && coreQLUsed[c] >= qmax) {
            var p = coreSlots[c];
            var newLevel = Math.min(q + 1, 2);
            procQLevel[p.pid] = newLevel;
            procWait[p.pid]   = 0;
            p.state = 'ready';
            queues[newLevel].push(p);
            coreSlots[c]  = null;
            coreQLUsed[c] = 0;
          }
        }
      }

      // Assign to idle cores (highest priority queue first)
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] === null) {
          var next = null, nextQL = 0;
          for (var ql = 0; ql < 3; ql++) {
            if (queues[ql].length > 0) { next = queues[ql].shift(); nextQL = ql; break; }
          }
          if (next) {
            next.state = 'running';
            if (firstRun[next.pid] === undefined) firstRun[next.pid] = time;
            coreSlots[c]  = next;
            coreQLevel[c] = nextQL;
            coreQLUsed[c] = 0;
          }
        }
      }

      // Build snapshot (pass merged queue for display)
      var displayQueue = queues[0].concat(queues[1]).concat(queues[2]);
      ticks.push(SCHED_UTILS.buildTickState(time, coreSlots, displayQueue, memBlocks));

      // Execute 1 tick
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null) {
          coreSlots[c].remaining--;
          coreQLUsed[c]++;
          if (coreSlots[c].remaining <= 0) {
            var p = coreSlots[c];
            p.ct = time + 1; p.state = 'done';
            SCHED_UTILS.freeMemBlock(memBlocks, p.pid);
            done.push(p); coreSlots[c] = null; coreQLUsed[c] = 0;
          }
        }
      }
      time++;
    }
    return SCHED_UTILS.buildFinalResult(ticks, procs, firstRun, numCores);
  }
  return { run: run };
})();
