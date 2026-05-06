'use strict';
/* producer-worker.js — Genera items para el demo productor-consumidor */
var running  = false;
var itemId   = 0;
var interval = null;

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type === 'start') {
    running = true;
    itemId  = 0;
    clearInterval(interval);
    interval = setInterval(function () {
      if (!running) { clearInterval(interval); return; }
      self.postMessage({ type: 'produced', item: { id: ++itemId, ts: Date.now() } });
    }, msg.rate || 700);
  }
  if (msg.type === 'stop')  { running = false; clearInterval(interval); }
  if (msg.type === 'reset') { running = false; clearInterval(interval); itemId = 0; }
};
