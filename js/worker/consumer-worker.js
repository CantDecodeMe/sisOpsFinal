'use strict';
/* consumer-worker.js — Consume items del demo productor-consumidor */
var running  = false;
var interval = null;

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type === 'start') {
    running = true;
    clearInterval(interval);
    interval = setInterval(function () {
      if (!running) { clearInterval(interval); return; }
      self.postMessage({ type: 'consume-request' });
    }, msg.rate || 1100);
  }
  if (msg.type === 'stop')  { running = false; clearInterval(interval); }
  if (msg.type === 'reset') { running = false; clearInterval(interval); }
};
