'use strict';
/* matrix.js — Renderiza la Process-Time Matrix completa */
window.SCHED = window.SCHED || {};
window.SCHED.matrix = (function () {
  var wrapEl, tooltip;

  function init() {
    wrapEl  = document.getElementById('matrix-view');
    tooltip = document.getElementById('tooltip');
  }

  function reset() {
    if (!wrapEl) init();
    wrapEl.innerHTML = '<div class="matrix-header">PROCESS-TIME MATRIX</div>' +
      '<div class="placeholder">Disponible tras ejecutar simulación.</div>';
  }

  /* Build a map: pid → array of state per tick ('run'|'wait'|'pre') */
  function buildStateMap(ticks, pids) {
    var map = {};
    pids.forEach(function (p) { map[p.pid] = []; });

    ticks.forEach(function (t) {
      var runningNow = {};
      (t.cores || []).forEach(function (slot) { if (slot) runningNow[slot.pid] = true; });
      pids.forEach(function (p) {
        if (runningNow[p.pid])  map[p.pid].push('run');
        else                    map[p.pid].push('wait');
      });
    });

    // Mark ticks before arrival as 'pre', and after completion as 'done'
    pids.forEach(function (entry) {
      var p = entry;
      var lastRun = -1;
      map[p.pid].forEach(function (s, i) { if (s === 'run') lastRun = i; });
      map[p.pid] = map[p.pid].map(function (s, i) {
        if (i < p.at) return 'pre';
        if (lastRun >= 0 && i > lastRun && s !== 'run') return 'done';
        return s;
      });
    });
    return map;
  }

  function render(ticks, processes) {
    if (!wrapEl) init();

    var pids = processes; // array of { pid, color, at }

    // Limit display to first 80 ticks to keep table manageable
    var displayTicks = ticks.slice(0, 80);
    var stateMap = buildStateMap(displayTicks, pids);

    var html = '<div class="matrix-header">PROCESS-TIME MATRIX</div>';
    html += '<div class="matrix-legend">';
    html += '<div class="legend-item"><div class="legend-box" style="background:var(--green);border-color:var(--green)"></div>RUNNING</div>';
    html += '<div class="legend-item"><div class="legend-box mx-wait" style="border-color:var(--border)"></div>WAITING</div>';
    html += '<div class="legend-item"><div class="legend-box mx-done" style="border-color:var(--border)"></div>DONE</div>';
    html += '<div class="legend-item"><div class="legend-box mx-pre" style="border-color:var(--border)"></div>NOT ARRIVED</div>';
    html += '</div>';

    html += '<div class="matrix-scroll"><table class="matrix-table"><thead><tr>';
    html += '<th class="pid-th">PID</th>';
    displayTicks.forEach(function (t) {
      var major = t.tick % 5 === 0;
      html += '<th class="time-th' + (major ? ' tick-major' : '') + '">' + (major ? t.tick : '') + '</th>';
    });
    html += '</tr></thead><tbody>';

    pids.forEach(function (entry) {
      var pid   = entry.pid;
      var color = entry.color;
      html += '<tr>';
      html += '<td class="pid-cell"><div class="pid-cell-inner">';
      html += '<div class="pid-swatch" style="background:' + color + ';border-color:' + color + '"></div>';
      html += pid + '</div></td>';

      stateMap[pid].forEach(function (state, i) {
        var major = displayTicks[i].tick % 5 === 0;
        var cls   = 'mx-cell' + (major ? ' tick-major-cell' : '');
        var inner = '';
        if (state === 'run') {
          cls += ' mx-run';
          inner = '<div class="mx-inner" style="--proc-color:' + color + ';background:' + color + '"></div>';
        } else if (state === 'wait') {
          cls += ' mx-wait';
          inner = '<div class="mx-inner">·</div>';
        } else if (state === 'done') {
          cls += ' mx-done';
          inner = '<div class="mx-inner">✓</div>';
        } else {
          cls += ' mx-pre';
          inner = '<div class="mx-inner"></div>';
        }
        html += '<td class="' + cls + '">' + inner + '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    wrapEl.innerHTML = html;
  }

  return { init: init, reset: reset, render: render };
})();
