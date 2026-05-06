'use strict';
/* memory-bar.js — Renderiza la barra de memoria */
window.SCHED = window.SCHED || {};
window.SCHED.memoryBar = (function () {
  var barEl, usedEl, fragEl, totalEl;

  function init() {
    barEl   = document.getElementById('memory-bar');
    usedEl  = document.getElementById('mem-used');
    fragEl  = document.getElementById('mem-frag');
    totalEl = document.getElementById('mem-total');
  }

  function reset(totalKB) {
    if (!barEl) init();
    if (totalEl) totalEl.textContent = totalKB || 512;
    if (usedEl)  usedEl.textContent  = '0';
    if (fragEl)  fragEl.textContent  = '0';
    if (barEl)   barEl.innerHTML = '<div class="memory-block free" style="width:100%">FREE ' + (totalKB || 512) + ' KB</div>';
  }

  function render(memoryBlocks, totalKB) {
    if (!barEl) init();
    if (!memoryBlocks || memoryBlocks.length === 0) { reset(totalKB); return; }

    var used = memoryBlocks.filter(function (b) { return !b.free; })
                           .reduce(function (s, b) { return s + b.size; }, 0);
    var frag = SCHED_UTILS ? SCHED_UTILS.calcFragmentation(memoryBlocks) : 0;

    if (usedEl)  usedEl.textContent  = used;
    if (fragEl)  fragEl.textContent  = frag;
    if (totalEl) totalEl.textContent = totalKB;

    var html = '';
    memoryBlocks.forEach(function (b) {
      var pct = ((b.size / totalKB) * 100).toFixed(2) + '%';
      if (b.free) {
        html += '<div class="memory-block free" style="width:' + pct + '" title="FREE ' + b.size + ' KB">FREE ' + b.size + ' KB</div>';
      } else {
        html += '<div class="memory-block" style="width:' + pct + ';background:' + b.color + ';color:#000;font-size:9px" title="' + b.pid + ' ' + b.size + ' KB">' + b.pid + '</div>';
      }
    });
    barEl.innerHTML = html;
  }

  return { init: init, reset: reset, render: render };
})();
