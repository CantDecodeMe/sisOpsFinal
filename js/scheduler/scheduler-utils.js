'use strict';
var SCHED_UTILS = (function () {
  var COLORS = [
    '#00ff41','#ffb700','#00ccff','#ff3131','#cc00ff',
    '#ff8800','#00ffcc','#ff0088','#88ff00','#0088ff'
  ];

  function cloneProcesses(processes) {
    return processes.map(function (p, i) {
      return {
        pid:       p.pid,
        at:        Number(p.arrival),
        bt:        Number(p.burst),
        mem:       Number(p.mem) || 0,
        priority:  Number(p.priority) || 1,
        remaining: Number(p.burst),
        state:     'new',
        ct:        null,
        color:     COLORS[i % COLORS.length]
      };
    });
  }

  function allocFirstFit(memBlocks, proc) {
    for (var i = 0; i < memBlocks.length; i++) {
      var b = memBlocks[i];
      if (b.free && b.size >= proc.mem) {
        if (b.size === proc.mem) {
          b.free = false; b.pid = proc.pid; b.color = proc.color;
        } else {
          var rest = { free: true, start: b.start + proc.mem, size: b.size - proc.mem, pid: null, color: null };
          b.free = false; b.size = proc.mem; b.pid = proc.pid; b.color = proc.color;
          memBlocks.splice(i + 1, 0, rest);
        }
        return true;
      }
    }
    return false;
  }

  function freeMemBlock(memBlocks, pid) {
    for (var i = 0; i < memBlocks.length; i++) {
      if (memBlocks[i].pid === pid) {
        memBlocks[i].free = true; memBlocks[i].pid = null; memBlocks[i].color = null;
        if (i + 1 < memBlocks.length && memBlocks[i + 1].free) {
          memBlocks[i].size += memBlocks[i + 1].size;
          memBlocks.splice(i + 1, 1);
        }
        if (i > 0 && memBlocks[i - 1].free) {
          memBlocks[i - 1].size += memBlocks[i].size;
          memBlocks.splice(i, 1);
        }
        return;
      }
    }
  }

  function calcFragmentation(memBlocks) {
    var totalFree = 0, maxFree = 0;
    memBlocks.forEach(function (b) {
      if (b.free) { totalFree += b.size; if (b.size > maxFree) maxFree = b.size; }
    });
    if (totalFree === 0) return 0;
    return Math.round((1 - maxFree / totalFree) * 100);
  }

  function buildTickState(time, coreSlots, readyQueue, memBlocks) {
    return {
      tick: time,
      cores: coreSlots.map(function (s) {
        return s ? { pid: s.pid, remaining: s.remaining, color: s.color } : null;
      }),
      queue: readyQueue.map(function (p) {
        return { pid: p.pid, remaining: p.remaining, color: p.color };
      }),
      memory: memBlocks.map(function (b) {
        return { free: b.free, pid: b.pid || null, start: b.start, size: b.size, color: b.color || null };
      })
    };
  }

  function calcMetrics(procs, firstRun) {
    var metrics = procs.map(function (p) {
      var tat = (p.ct || 0) - p.at;
      var wt  = tat - p.bt;
      var rt  = firstRun[p.pid] !== undefined ? firstRun[p.pid] - p.at : 0;
      return { pid: p.pid, at: p.at, bt: p.bt, ct: p.ct, tat: tat, wt: Math.max(0, wt), rt: Math.max(0, rt), color: p.color };
    });
    var n = metrics.length || 1;
    return {
      perProcess: metrics,
      avgTAT: metrics.reduce(function (s, m) { return s + m.tat; }, 0) / n,
      avgWT:  metrics.reduce(function (s, m) { return s + m.wt;  }, 0) / n,
      avgRT:  metrics.reduce(function (s, m) { return s + m.rt;  }, 0) / n
    };
  }

  function buildFinalResult(ticks, procs, firstRun, numCores) {
    var done = procs.filter(function (p) { return p.ct !== null; });
    var mr = calcMetrics(done, firstRun);
    var totalBusy = ticks.reduce(function (s, t) {
      return s + t.cores.filter(function (c) { return c !== null; }).length;
    }, 0);
    var cpuUtil = ticks.length > 0 ? Math.min(100, (totalBusy / (ticks.length * numCores)) * 100) : 0;
    return {
      ticks: ticks,
      metrics: mr.perProcess,
      summary: {
        avgTAT: mr.avgTAT, avgWT: mr.avgWT, avgRT: mr.avgRT,
        cpuUtil: cpuUtil,
        throughput: done.length / (ticks.length || 1)
      }
    };
  }

  return {
    COLORS: COLORS,
    cloneProcesses: cloneProcesses,
    allocFirstFit: allocFirstFit,
    freeMemBlock: freeMemBlock,
    calcFragmentation: calcFragmentation,
    buildTickState: buildTickState,
    calcMetrics: calcMetrics,
    buildFinalResult: buildFinalResult
  };
})();
