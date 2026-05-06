'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.pageViz = (function () {

  var PAGE_COLORS = [
    '#00ff41','#ffb700','#00ccff','#ff3131','#cc00ff',
    '#ff8800','#00ffcc','#ff0088','#88ff00','#0088ff',
    '#ff4444','#44ffaa','#ffdd00','#aa00ff','#00aaff'
  ];

  function colorFor(page) {
    if (page === null) return null;
    return PAGE_COLORS[page % PAGE_COLORS.length];
  }

  function renderFrames(containerId, step, numFrames) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '';
    for (var i = 0; i < numFrames; i++) {
      var pg  = step.frames[i];
      var col = colorFor(pg);
      var isNew = step.fault && pg === step.ref && step.frames[i] !== null;
      html +=
        '<div class="page-frame' + (isNew ? ' page-frame-new' : '') + '" ' +
        'style="border-color:' + (col || 'var(--border2)') + ';' +
        'background:' + (col ? col + '22' : 'var(--surface2)') + '">' +
        '<div class="pf-label">F' + i + '</div>' +
        '<div class="pf-page" style="color:' + (col || 'var(--green-dk)') + '">' +
          (pg !== null ? 'P' + pg : '—') +
        '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  function renderRefString(containerId, refString, currentIdx) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '';
    refString.forEach(function (pg, i) {
      var active  = i === currentIdx;
      var past    = i < currentIdx;
      var col     = colorFor(pg);
      html +=
        '<div class="ref-cell ' +
          (active ? 'ref-active' : past ? 'ref-past' : '') + '" ' +
        'style="border-color:' + (active ? col : past ? col + '88' : 'var(--border)') + ';' +
        'color:' + (active ? col : past ? 'var(--green-dim)' : 'var(--green-dk)') + '">' +
        'P' + pg +
        '</div>';
    });
    el.innerHTML = html;
    // Scroll active cell into view
    var activeEl = el.querySelector('.ref-active');
    if (activeEl) activeEl.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }

  function renderStepTable(containerId, steps, currentIdx, numFrames) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var header = '<tr><th>REF</th>';
    for (var f = 0; f < numFrames; f++) header += '<th>F' + f + '</th>';
    header += '<th>FAULT</th><th>EVICTED</th></tr>';

    var rows = '';
    steps.forEach(function (s, i) {
      var active = i === currentIdx;
      rows += '<tr' + (active ? ' class="avg-row"' : '') + '>';
      rows += '<td style="color:' + colorFor(s.ref) + '">P' + s.ref + '</td>';
      for (var f = 0; f < numFrames; f++) {
        var pg  = s.frames[f];
        var col = colorFor(pg);
        rows += '<td style="color:' + (col || 'var(--green-dk)') + '">' + (pg !== null ? 'P' + pg : '—') + '</td>';
      }
      rows += '<td>' + (s.fault ? '<span style="color:var(--red);font-weight:bold">FAULT</span>' : '<span style="color:var(--green-dim)">hit</span>') + '</td>';
      rows += '<td>' + (s.evicted !== null && s.evicted !== undefined ? '<span style="color:var(--amber)">P' + s.evicted + '</span>' : '—') + '</td>';
      rows += '</tr>';
    });

    el.innerHTML = '<table class="rtable" style="min-width:400px"><thead>' + header + '</thead><tbody>' + rows + '</tbody></table>';

    // Scroll active row into view
    var activeRow = el.querySelector('tr.avg-row');
    if (activeRow) activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function renderStats(containerId, result, currentIdx, numFrames, pageSize) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var total  = currentIdx + 1;
    var faults = 0;
    for (var i = 0; i <= currentIdx; i++) { if (result.steps[i].fault) faults++; }
    var hits      = total - faults;
    var faultRate = total > 0 ? ((faults / total) * 100).toFixed(1) : '0.0';
    var hitRate   = total > 0 ? ((hits   / total) * 100).toFixed(1) : '0.0';

    var fragHtml = '';
    if (numFrames && pageSize) {
      var loaded  = result.steps[currentIdx].frames.filter(function (f) { return f !== null; }).length;
      var fragKB  = (numFrames - loaded) * pageSize;
      fragHtml =
        '<div class="stat-box"><div class="stat-lbl">FRAG. INTERNA</div>' +
        '<div class="stat-val" style="font-size:24px;color:var(--amber)">' + fragKB + '</div>' +
        '<div class="stat-unit">KB libres</div></div>';
    }

    el.innerHTML =
      '<div class="stat-box"><div class="stat-lbl">TOTAL REFS</div><div class="stat-val" style="font-size:28px">' + total + '</div></div>' +
      '<div class="stat-box"><div class="stat-lbl">PAGE FAULTS</div><div class="stat-val" style="font-size:28px;color:var(--red);text-shadow:0 0 8px #ff313188">' + faults + '</div></div>' +
      '<div class="stat-box"><div class="stat-lbl">HIT RATE</div><div class="stat-val" style="font-size:28px">' + hitRate + '</div><div class="stat-unit">%</div></div>' +
      '<div class="stat-box"><div class="stat-lbl">FAULT RATE</div><div class="stat-val" style="font-size:28px;color:var(--amber)">' + faultRate + '</div><div class="stat-unit">%</div></div>' +
      fragHtml;
  }

  return { renderFrames: renderFrames, renderRefString: renderRefString, renderStepTable: renderStepTable, renderStats: renderStats };
})();
