'use strict';
/* MLQ  — Multilevel Queue (fixed queues, no movement between queues)
   MLFQ — Multi-Level Feedback Queue
   variant='mlq':  processes assigned to fixed queue by priority, never move
   variant='mlfq': basic degradation (processes move to lower queue on quantum expiry)
   variant='mlfq2': degradation + aging/anti-starvation (legacy key, same as mlfq)
*/
var MLFQ = (function () {
  var QUEUE_QUANTUMS = [4, 8, 0]; // Q0, Q1, Q2 (0 = FCFS)
  var AGING_THRESHOLD = 16;

  // MLQ: assign process to fixed queue based on priority (never changes)
  function mlqAssignQueue(p) {
    if ((p.priority || 1) <= 2) return 0; // high priority  → Q0 (RR q=4)
    if ((p.priority || 1) <= 4) return 1; // medium priority → Q1 (RR q=8)
    return 2;                              // low priority    → Q2 (FCFS)
  }

  function run(processes, config) {
    var numCores = config.cores   || 1;
    var totalMem = config.memory  || 512;
    var variant  = config.variant || 'mlfq';
    var procs = SCHED_UTILS.cloneProcesses(processes);

    var memBlocks  = [{ free: true, start: 0, size: totalMem, pid: null, color: null }];
    var queues     = [[], [], []];
    var coreSlots  = new Array(numCores).fill(null);
    var coreQLevel = new Array(numCores).fill(0);
    var coreQLUsed = new Array(numCores).fill(0);
    var procQLevel = {};
    var procWait   = {};
    var done       = [];
    var ticks      = [];
    var firstRun   = {};
    var time       = 0;
    var maxTime    = procs.reduce(function (s, p) { return s + p.bt; }, 0) * 4 + 30;

    var isMlq = (variant === 'mlq');

    while (done.length < procs.length && time < maxTime) {
      // New arrivals
      procs.forEach(function (p) {
        if (p.at === time && p.state === 'new') {
          p.state = 'ready';
          var ql = isMlq ? mlqAssignQueue(p) : 0; // MLQ: fixed by priority; MLFQ: always Q0
          procQLevel[p.pid] = ql;
          procWait[p.pid]   = 0;
          queues[ql].push(p);
          SCHED_UTILS.allocFirstFit(memBlocks, p);
        }
      });

      // Aging (MLFQ only): promote processes waiting too long in Q1/Q2
      if (variant === 'mlfq2' || variant === 'mlfq') {
        for (var ql = 1; ql < 3; ql++) {
          queues[ql].forEach(function (p) {
            procWait[p.pid] = (procWait[p.pid] || 0) + 1;
            if (procWait[p.pid] >= AGING_THRESHOLD) {
              procWait[p.pid] = 0;
              procQLevel[p.pid] = ql - 1;
            }
          });
          var promoted = queues[ql].filter(function (p) { return procQLevel[p.pid] < ql; });
          queues[ql]   = queues[ql].filter(function (p) { return procQLevel[p.pid] === ql; });
          promoted.forEach(function (p) { queues[ql - 1].push(p); });
        }
      }

      // Inter-queue preemption: a higher-priority queue (lower index) takes precedence
      // over a running process from a lower-priority queue.
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null) {
          var runningQL = coreQLevel[c];
          for (var hq = 0; hq < runningQL; hq++) {
            if (queues[hq].length > 0) {
              var preempted = coreSlots[c];
              preempted.state = 'ready';
              // MLQ keeps process in its fixed queue; MLFQ keeps it at current level
              queues[runningQL].push(preempted);
              coreSlots[c]  = null;
              coreQLUsed[c] = 0;
              break;
            }
          }
        }
      }

      // Quantum expired
      for (var c = 0; c < numCores; c++) {
        if (coreSlots[c] !== null) {
          var q    = coreQLevel[c];
          var qmax = QUEUE_QUANTUMS[q];
          if (qmax > 0 && coreQLUsed[c] >= qmax) {
            var p = coreSlots[c];
            // MLQ: return to same fixed queue; MLFQ: degrade to lower queue
            var newLevel = isMlq ? procQLevel[p.pid] : Math.min(q + 1, 2);
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

      var displayQueue = queues[0].concat(queues[1]).concat(queues[2]);
      ticks.push(SCHED_UTILS.buildTickState(time, coreSlots, displayQueue, memBlocks));

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
