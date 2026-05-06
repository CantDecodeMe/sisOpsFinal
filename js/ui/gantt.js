'use strict';
/* gantt.js — Renderiza el Gantt chart tick a tick */
window.SCHED = window.SCHED || {};
window.SCHED.gantt = (function () {
  var chartEl, rulerEl;
  var rows    = {}; // pid → { rowEl, blocksEl }
  var tickW   = 18; // px por tick
  var tooltip = null;

  function init() {
    chartEl = document.getElementById('gantt-chart');
    rulerEl = document.getElementById('time-ruler');
    tooltip = document.getElementById('tooltip');
  }

  function reset() {
    if (!chartEl) init();
    chartEl.innerHTML = '<div class="placeholder">Sin datos. Presiona PLAY para iniciar.</div>';
    rulerEl.innerHTML = '';
    rows = {};
  }

  function ensureRow(pid, color) {
    if (rows[pid]) return rows[pid];
    // Remove placeholder if present
    var ph = chartEl.querySelector('.placeholder');
    if (ph) ph.remove();

    var row = document.createElement('div');
    row.className = 'gantt-row';

    var lbl = document.createElement('div');
    lbl.className = 'gantt-lbl';
    lbl.textContent = pid;

    var blocks = document.createElement('div');
    blocks.className = 'gantt-blocks';

    row.appendChild(lbl);
    row.appendChild(blocks);
    chartEl.appendChild(row);
    rows[pid] = { rowEl: row, blocksEl: blocks };
    return rows[pid];
  }

  function renderTick(tickState, allPids) {
    if (!chartEl) init();
    var tick = tickState.tick;

    // Ensure a row exists for every known process
    allPids.forEach(function (entry) {
      ensureRow(entry.pid, entry.color);
    });

    // Build set of running pids this tick
    var runningPids = {};
    (tickState.cores || []).forEach(function (slot) {
      if (slot) runningPids[slot.pid] = slot.color;
    });

    // Add block to each row
    Object.keys(rows).forEach(function (pid) {
      var r = rows[pid];
      var block = document.createElement('div');
      block.style.width = tickW + 'px';
      block.style.flexShrink = '0';

      if (runningPids[pid]) {
        block.className = 'gantt-block';
        block.style.setProperty('--proc-color', runningPids[pid]);
        block.style.background = runningPids[pid];
        block.style.color = '#000';
        block.textContent = pid.length <= 3 ? pid : '';
        (function (p, t, color) {
          block.addEventListener('mouseenter', function (e) { showTooltip(e, p, t, 'RUN', color); });
          block.addEventListener('mouseleave', hideTooltip);
        })(pid, tick, runningPids[pid]);
      } else {
        block.className = 'gantt-block idle-block';
        (function (p, t) {
          block.addEventListener('mouseenter', function (e) { showTooltip(e, p, t, 'IDLE', null); });
          block.addEventListener('mouseleave', hideTooltip);
        })(pid, tick);
      }

      r.blocksEl.appendChild(block);
    });

    // Update time ruler
    var tickMark = document.createElement('span');
    tickMark.className = 'time-tick';
    tickMark.style.width = tickW + 'px';
    tickMark.style.flexShrink = '0';
    if (tick % 5 === 0) tickMark.textContent = tick;
    rulerEl.appendChild(tickMark);
  }

  function showTooltip(e, pid, tick, state, color) {
    if (!tooltip) return;
    tooltip.innerHTML =
      '<strong>' + pid + '</strong><br>' +
      'TICK: ' + tick + '<br>' +
      'STATE: <span style="color:' + (color || 'var(--green-dim)') + '">' + state + '</span>';
    tooltip.style.opacity = '1';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 10) + 'px';
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.opacity = '0';
  }

  return { init: init, reset: reset, renderTick: renderTick };
})();
