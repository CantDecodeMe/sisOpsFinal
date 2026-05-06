'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.compare = (function () {

  var ALGO_LABELS = {
    fcfs:     'FCFS',
    sjn:      'SJN',
    rr:       'RR',
    srt:      'SRT',
    hrrn:     'HRRN',
    mlq:      'MLQ',
    mlfq:     'MLFQ',
    priority: 'PRIORITY'
  };

  function bar(value, max, color) {
    var pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="min-width:52px;text-align:right">' + value.toFixed(2) + '</span>' +
      '<div style="flex:1;height:14px;background:var(--surface2);border:1px solid var(--border)">' +
        '<div style="width:' + pct.toFixed(1) + '%;height:100%;background:' + color + ';transition:width 0.4s"></div>' +
      '</div>' +
    '</div>';
  }

  function render(container, algos, results) {
    // Find max values for scaling bars
    var maxWT   = 0, maxTAT = 0, maxRT = 0;
    algos.forEach(function (a) {
      var r = results[a];
      if (!r) return;
      if (r.avgWT  > maxWT)  maxWT  = r.avgWT;
      if (r.avgTAT > maxTAT) maxTAT = r.avgTAT;
      if (r.avgRT  > maxRT)  maxRT  = r.avgRT;
    });

    // Find best (lowest wait) for highlighting
    var bestWT = null, bestAlgo = null;
    algos.forEach(function (a) {
      var r = results[a];
      if (!r) return;
      if (bestWT === null || r.avgWT < bestWT) { bestWT = r.avgWT; bestAlgo = a; }
    });

    var html = '<table class="rtable" style="min-width:700px"><thead><tr>' +
      '<th>ALGORITMO</th>' +
      '<th>AVG WAIT</th>' +
      '<th>AVG TAT</th>' +
      '<th>AVG RESP</th>' +
      '<th>CPU UTIL %</th>' +
      '</tr></thead><tbody>';

    algos.forEach(function (a) {
      var r = results[a];
      if (!r) { html += '<tr><td>' + (ALGO_LABELS[a] || a) + '</td><td colspan="4" style="color:var(--red)">ERROR</td></tr>'; return; }
      var isBest = (a === bestAlgo);
      var rowStyle = isBest ? 'background:var(--green-xs)' : '';
      html += '<tr style="' + rowStyle + '">' +
        '<td><span style="color:' + (isBest ? 'var(--green)' : 'var(--green-dim)') + ';font-weight:' + (isBest ? 'bold' : 'normal') + '">' +
          (isBest ? '★ ' : '') + (ALGO_LABELS[a] || a) + '</span></td>' +
        '<td>' + bar(r.avgWT,  maxWT,  isBest ? '#00ff41' : '#ffb700') + '</td>' +
        '<td>' + bar(r.avgTAT, maxTAT, '#00ccff') + '</td>' +
        '<td>' + bar(r.avgRT,  maxRT,  '#cc00ff') + '</td>' +
        '<td style="text-align:center">' +
          '<span class="' + (r.cpuUtil >= 90 ? 'td-hl' : r.cpuUtil >= 70 ? 'td-amber' : 'td-red') + '">' +
          r.cpuUtil.toFixed(1) + '%</span>' +
        '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    html += renderChart(algos, results, bestAlgo);
    html += '<div style="padding:10px 16px;font-size:14px;color:var(--green-dim);border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
      '<span>★ = menor tiempo de espera promedio &nbsp;|&nbsp; Barras escaladas al máximo del grupo</span>' +
      '<button class="btn btn-add" style="font-size:13px;padding:3px 10px" id="btn-export-compare">[ ↓ EXPORTAR COMPARACIÓN ]</button>' +
      '</div>';

    container.innerHTML = html;

    document.getElementById('btn-export-compare').addEventListener('click', function () {
      exportComparison(algos, results);
    });
  }

  // Renderiza un bar chart SVG con AVG WAIT, AVG TAT, AVG RESP por algoritmo
  function renderChart(algos, results, bestAlgo) {
    var valid = algos.filter(function (a) { return results[a]; });
    if (valid.length === 0) return '';

    var W      = 760, H = 280;
    var pad    = { top: 30, right: 16, bottom: 56, left: 44 };
    var plotW  = W - pad.left - pad.right;
    var plotH  = H - pad.top - pad.bottom;
    var groupW = plotW / valid.length;
    var barW   = (groupW - 8) / 3;

    var maxVal = 0;
    valid.forEach(function (a) {
      var r = results[a];
      if (r.avgWT  > maxVal) maxVal = r.avgWT;
      if (r.avgTAT > maxVal) maxVal = r.avgTAT;
      if (r.avgRT  > maxVal) maxVal = r.avgRT;
    });
    if (maxVal === 0) maxVal = 1;
    // Round up to nice tick
    var tickStep = Math.ceil(maxVal / 5);
    var yMax     = tickStep * 5;

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:' + W + 'px;height:auto;display:block;margin:18px auto 6px" xmlns="http://www.w3.org/2000/svg">';

    // Grid + Y axis ticks
    for (var t = 0; t <= 5; t++) {
      var y    = pad.top + plotH - (t / 5) * plotH;
      var lbl  = (t * tickStep).toFixed(0);
      svg += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (pad.left + plotW) + '" y2="' + y +
             '" stroke="var(--border)" stroke-dasharray="2,3" stroke-width="1"/>';
      svg += '<text x="' + (pad.left - 6) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--green-dim)" font-size="11" font-family="monospace">' + lbl + '</text>';
    }

    // Y axis title
    svg += '<text x="' + (pad.left - 32) + '" y="' + (pad.top + plotH / 2) + '" text-anchor="middle" fill="var(--green-dim)" font-size="10" font-family="VT323, monospace" letter-spacing="2" transform="rotate(-90 ' + (pad.left - 32) + ' ' + (pad.top + plotH / 2) + ')">TICKS</text>';

    // Title
    svg += '<text x="' + (W / 2) + '" y="18" text-anchor="middle" fill="var(--green)" font-size="13" font-family="VT323, monospace" letter-spacing="3">COMPARACIÓN — AVG WAIT / TAT / RESP POR ALGORITMO</text>';

    // Bars
    valid.forEach(function (a, idx) {
      var r       = results[a];
      var groupX  = pad.left + idx * groupW + 4;
      var isBest  = (a === bestAlgo);
      var metrics = [
        { val: r.avgWT,  color: isBest ? '#00ff41' : '#ffb700', label: 'WT'  },
        { val: r.avgTAT, color: '#00ccff',                       label: 'TAT' },
        { val: r.avgRT,  color: '#cc00ff',                       label: 'RT'  }
      ];

      metrics.forEach(function (m, j) {
        var h = (m.val / yMax) * plotH;
        var x = groupX + j * (barW + 2);
        var y = pad.top + plotH - h;
        svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" fill="' + m.color + '" opacity="0.85"><title>' + m.label + ': ' + m.val.toFixed(2) + '</title></rect>';
        if (h > 16) {
          svg += '<text x="' + (x + barW / 2) + '" y="' + (y + 12) + '" text-anchor="middle" fill="#000" font-size="9" font-family="monospace" font-weight="bold">' + m.val.toFixed(1) + '</text>';
        }
      });

      // X axis label
      var xCenter = groupX + (groupW - 8) / 2;
      svg += '<text x="' + xCenter + '" y="' + (pad.top + plotH + 18) + '" text-anchor="middle" fill="' + (isBest ? 'var(--green)' : 'var(--green-dim)') + '" font-size="11" font-family="VT323, monospace" letter-spacing="2"' + (isBest ? ' font-weight="bold"' : '') + '>' + (isBest ? '★ ' : '') + (ALGO_LABELS[a] || a) + '</text>';
    });

    // Axis lines
    svg += '<line x1="' + pad.left + '" y1="' + (pad.top + plotH) + '" x2="' + (pad.left + plotW) + '" y2="' + (pad.top + plotH) + '" stroke="var(--green-dim)" stroke-width="1.5"/>';
    svg += '<line x1="' + pad.left + '" y1="' + pad.top + '" x2="' + pad.left + '" y2="' + (pad.top + plotH) + '" stroke="var(--green-dim)" stroke-width="1.5"/>';

    // Legend
    var lgY = H - 20;
    var lgItems = [
      { color: '#ffb700', label: 'AVG WAIT'     },
      { color: '#00ccff', label: 'AVG TAT'      },
      { color: '#cc00ff', label: 'AVG RESPONSE' }
    ];
    var lgX = pad.left;
    lgItems.forEach(function (l) {
      svg += '<rect x="' + lgX + '" y="' + (lgY - 8) + '" width="12" height="12" fill="' + l.color + '"/>';
      svg += '<text x="' + (lgX + 18) + '" y="' + (lgY + 2) + '" fill="var(--green-dim)" font-size="11" font-family="VT323, monospace" letter-spacing="1">' + l.label + '</text>';
      lgX += 130;
    });

    svg += '</svg>';
    return '<div style="background:var(--surface);border-top:1px solid var(--border);padding:8px 16px">' + svg + '</div>';
  }

  function exportComparison(algos, results) {
    var headers = ['Algoritmo', 'AvgWaitTime', 'AvgTAT', 'AvgResponseTime', 'CPUUtil%'];
    var rows    = algos.map(function (a) {
      var r = results[a];
      if (!r) return [ALGO_LABELS[a] || a, 'ERROR', '', '', ''];
      return [
        ALGO_LABELS[a] || a,
        r.avgWT.toFixed(2),
        r.avgTAT.toFixed(2),
        r.avgRT.toFixed(2),
        r.cpuUtil.toFixed(1)
      ];
    });
    window.SCHED.fileIO.download('comparacion-algoritmos.csv', window.SCHED.fileIO.toCSV(headers, rows));
  }

  return { render: render, exportComparison: exportComparison };
})();
