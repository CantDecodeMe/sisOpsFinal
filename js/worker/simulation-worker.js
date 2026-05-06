'use strict';
/* simulation-worker.js
   Web Worker que ejecuta el algoritmo de scheduling en un thread separado.
   Recibe: { type:'run', algorithm, processes, cores, memory, quantum }
   Devuelve: { type:'complete', result } con todos los ticks y métricas.
   El main thread controla la velocidad de animación (tick a tick).
*/
importScripts(
  '../scheduler/scheduler-utils.js',
  '../scheduler/fcfs.js',
  '../scheduler/sjn.js',
  '../scheduler/rr.js',
  '../scheduler/srt.js',
  '../scheduler/hrrn.js',
  '../scheduler/mlfq.js',
  '../scheduler/priority.js'
);

var ALGO_MAP = {
  fcfs:     function (p, c) { return FCFS.run(p, c); },
  sjn:      function (p, c) { return SJN.run(p, c); },
  rr:       function (p, c) { return RR.run(p, c); },
  srt:      function (p, c) { return SRT.run(p, c); },
  hrrn:     function (p, c) { return HRRN.run(p, c); },
  mlq:      function (p, c) { return MLFQ.run(p, Object.assign({}, c, { variant: 'mlq'  })); },
  mlfq:     function (p, c) { return MLFQ.run(p, Object.assign({}, c, { variant: 'mlfq' })); },
  priority: function (p, c) { return PRIORITY.run(p, c); }
};

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type !== 'run') return;

  var algo = (msg.algorithm || 'fcfs').toLowerCase();
  var fn   = ALGO_MAP[algo];
  if (!fn) {
    self.postMessage({ type: 'error', message: 'Unknown algorithm: ' + algo });
    return;
  }

  var config = {
    cores:      Number(msg.cores)   || 1,
    memory:     Number(msg.memory)  || 512,
    quantum:    Number(msg.quantum) || 4,
    preemptive: msg.preemptive !== false
  };

  try {
    var result = fn(msg.processes, config);
    self.postMessage({ type: 'complete', result: result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
