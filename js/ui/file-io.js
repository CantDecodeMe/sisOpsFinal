'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.fileIO = (function () {

  function download(filename, csvString) {
    var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  function toCSV(headers, rows) {
    var lines = [headers.join(',')];
    rows.forEach(function (row) {
      lines.push(row.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        return s.indexOf(',') !== -1 || s.indexOf('"') !== -1 ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
    });
    return lines.join('\r\n');
  }

  // Parsea CSV de procesos. Acepta con o sin encabezado.
  // Formato: PID,Arrival,Burst,Priority,Mem,Pages  (columnas en cualquier orden si hay header)
  function parseProcCSV(text) {
    var lines = text.trim().split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    if (lines.length === 0) return null;

    var procs   = [];
    var headers = null;
    var pidIdx = 0, atIdx = 1, btIdx = 2, priIdx = 3, memIdx = 4, pagesIdx = 5;

    // Detect header: first column of first line is not a number
    var firstCols = lines[0].split(',');
    if (isNaN(Number(firstCols[0].trim()))) {
      headers = firstCols.map(function (h) { return h.trim().toLowerCase(); });
      pidIdx   = Math.max(0, headers.findIndex(function (h) { return h === 'pid'; }));
      atIdx    = Math.max(0, headers.findIndex(function (h) { return h === 'arrival' || h === 'at'; }));
      btIdx    = Math.max(0, headers.findIndex(function (h) { return h === 'burst' || h === 'bt'; }));
      priIdx   = headers.findIndex(function (h) { return h === 'priority' || h === 'pri'; });
      memIdx   = headers.findIndex(function (h) { return h === 'mem' || h === 'memory'; });
      pagesIdx = headers.findIndex(function (h) { return h === 'pages' || h === 'pgs'; });
      if (priIdx   === -1) priIdx   = 3;
      if (memIdx   === -1) memIdx   = 4;
      if (pagesIdx === -1) pagesIdx = 5;
      lines = lines.slice(1);
    }

    lines.forEach(function (line, i) {
      var cols = line.split(',').map(function (c) { return c.trim(); });
      if (cols.length < 2) return;
      var rawPid = cols[pidIdx] || '';
      var pid    = /^\d+$/.test(rawPid) ? 'P' + rawPid : rawPid || ('P' + (i + 1));
      procs.push({
        pid:      pid,
        arrival:  Number(cols[atIdx])    || 0,
        burst:    Math.max(1, Number(cols[btIdx])    || 1),
        priority: Number(cols[priIdx])   || 1,
        mem:      Number(cols[memIdx])   || 32,
        pages:    Math.max(1, Number(cols[pagesIdx]) || 4)
      });
    });

    return procs.length > 0 ? procs : null;
  }

  // Parsea cadena de referencia para módulo de memoria.
  // Acepta: "Memoria=64\nPageSize=4\nFrames=3\n1 2 3 4..." o solo "1 2 3 4..."
  function parseMemText(text) {
    var lines    = text.trim().split(/\r?\n/);
    var frames   = null;
    var memSize  = null;
    var pageSize = null;
    var refLine  = '';

    lines.forEach(function (line) {
      var kvFrames   = line.match(/^frames?\s*=\s*(\d+)/i);
      var kvMem      = line.match(/^memoria\s*=\s*(\d+)/i);
      var kvPageSize = line.match(/^pagesize\s*=\s*(\d+)/i);
      if (kvFrames)        { frames   = parseInt(kvFrames[1]);   }
      else if (kvMem)      { memSize  = parseInt(kvMem[1]);      }
      else if (kvPageSize) { pageSize = parseInt(kvPageSize[1]); }
      else if (/[\d\s,]+/.test(line.trim())) { refLine += ' ' + line.trim(); }
    });

    var refString = refLine.trim().split(/[\s,]+/).map(Number).filter(function (n) { return !isNaN(n) && n >= 0; });
    if (refString.length === 0) return null;
    return { frames: frames, memSize: memSize, pageSize: pageSize, refString: refString };
  }

  // Abre un file picker y devuelve el contenido via callback
  function openFilePicker(accept, callback) {
    var input = document.createElement('input');
    input.type   = 'file';
    input.accept = accept || '.txt,.csv';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) { document.body.removeChild(input); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        document.body.removeChild(input);
        callback(e.target.result);
      };
      reader.readAsText(file);
    });
    input.click();
  }

  return { download: download, toCSV: toCSV, parseProcCSV: parseProcCSV, parseMemText: parseMemText, openFilePicker: openFilePicker };
})();
