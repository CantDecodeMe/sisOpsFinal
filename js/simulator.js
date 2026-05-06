'use strict';
/* simulator.js — Orquestador principal del simulador */
(function () {
  // ── Estado global ──────────────────────────────────────────────────────
  var processes  = [];   // { pid, arrival, burst, mem }
  var pidCounter = 0;
  var activeAlgo = 'fcfs';
  var simResult  = null; // resultado completo de la simulación
  var tickIndex  = 0;    // tick actualmente mostrado
  var playTimer  = null; // setInterval de la animación
  var worker     = null; // Web Worker activo

  // ── Descripciones de algoritmos ───────────────────────────────────────
  var ALGO_INFO = {
    fcfs:  { name: 'FCFS — First Come First Served',   tag: 'NO-PREEMPTIVE', tagCls: 'tag-npre', desc: 'Ejecuta procesos en orden de llegada. Simple pero puede causar efecto convoy en procesos cortos.' },
    sjn:   { name: 'SJN — Shortest Job Next',          tag: 'NO-PREEMPTIVE', tagCls: 'tag-npre', desc: 'Selecciona el proceso con menor burst entre los disponibles. Óptimo en tiempo de espera promedio.' },
    rr:    { name: 'RR — Round Robin',                 tag: 'PREEMPTIVE',    tagCls: 'tag-pre',  desc: 'Asigna un quantum de tiempo a cada proceso en orden circular. Equitativo, buen tiempo de respuesta.' },
    srt:   { name: 'SRT — Shortest Remaining Time',    tag: 'PREEMPTIVE',    tagCls: 'tag-pre',  desc: 'Versión preemptiva de SJN: expulsa al proceso actual si llega uno con menor tiempo restante.' },
    hrrn:  { name: 'HRRN — Highest Response Ratio Next', tag: 'NO-PREEMPTIVE', tagCls: 'tag-npre', desc: 'Prioridad = (espera + burst) / burst. Evita starvation ponderando la espera acumulada.' },
    mlfq1: { name: 'MLFQ_1 — Multi-Level Feedback Queue', tag: 'MLFQ',       tagCls: 'tag-mlfq', desc: '3 colas (Q0:q=4, Q1:q=8, Q2:FCFS). Procesos se degradan al agotar su quantum.' },
    mlfq2: { name: 'MLFQ_2 — MLFQ con Aging',         tag: 'MLFQ',          tagCls: 'tag-mlfq', desc: 'MLFQ_1 + aging: procesos en colas inferiores se promueven tras esperar demasiado. Anti-starvation.' }
  };

  // ── Paleta de colores (sincronizada con scheduler-utils) ───────────────
  var COLORS = ['#00ff41','#ffb700','#00ccff','#ff3131','#cc00ff','#ff8800','#00ffcc','#ff0088','#88ff00','#0088ff'];

  // ── Inicialización ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadDefaultProcesses();
    renderProcTable();
    updateAlgoExplain();
    updateCoreLeds();
    updateCCodePanel();
    wireControls();
    wireQuantumVisibility();
    window.SCHED.gantt.reset();
    window.SCHED.matrix.reset();
    window.SCHED.memoryBar.reset(getConfig().memory);
  });

  function loadDefaultProcesses() {
    processes = [
      { pid: 'P1', arrival: 0, burst: 8,  mem: 64  },
      { pid: 'P2', arrival: 2, burst: 4,  mem: 32  },
      { pid: 'P3', arrival: 4, burst: 6,  mem: 48  }
    ];
    pidCounter = 3;
  }

  // ── Config ─────────────────────────────────────────────────────────────
  function getConfig() {
    return {
      cores:   parseInt(document.getElementById('cfg-cores').value)   || 1,
      memory:  parseInt(document.getElementById('cfg-memory').value)  || 512,
      quantum: parseInt(document.getElementById('cfg-quantum').value) || 4
    };
  }

  function getSpeed() {
    return parseInt(document.getElementById('speed-select').value) || 2;
  }

  function wireQuantumVisibility() {
    var row = document.getElementById('cfg-quantum-row');
    function update() {
      row.style.display = (activeAlgo === 'rr' || activeAlgo === 'mlfq1' || activeAlgo === 'mlfq2') ? '' : 'none';
    }
    update();
    document.getElementById('algo-tabs').addEventListener('click', update);
  }

  // ── Process Table ──────────────────────────────────────────────────────
  function renderProcTable() {
    var tbody = document.getElementById('proc-tbody');
    tbody.innerHTML = '';
    processes.forEach(function (p, i) {
      var color = COLORS[i % COLORS.length];
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="pid-chip" style="color:' + color + ';border-color:' + color + '">' + p.pid + '</span></td>' +
        '<td><input class="term-input" type="number" value="' + p.arrival + '" min="0" data-pid="' + p.pid + '" data-field="arrival" style="width:56px"></td>' +
        '<td><input class="term-input" type="number" value="' + p.burst + '" min="1" data-pid="' + p.pid + '" data-field="burst" style="width:56px"></td>' +
        '<td><input class="term-input" type="number" value="' + p.mem + '" min="0" data-pid="' + p.pid + '" data-field="mem" style="width:64px"></td>' +
        '<td><button class="btn btn-del" data-del="' + p.pid + '" type="button">[ × ]</button></td>';
      tbody.appendChild(tr);
    });
    document.getElementById('proc-count').innerHTML = 'PROCS: ' + processes.length + ' <span class="blink">█</span>';

    tbody.addEventListener('change', function (e) {
      var el = e.target;
      if (!el.dataset.pid) return;
      var proc = processes.find(function (p) { return p.pid === el.dataset.pid; });
      if (proc) proc[el.dataset.field] = Math.max(0, parseInt(el.value) || 0);
    });

    tbody.addEventListener('click', function (e) {
      var pid = e.target.dataset.del;
      if (!pid) return;
      processes = processes.filter(function (p) { return p.pid !== pid; });
      renderProcTable();
    });
  }

  function addProcess() {
    pidCounter++;
    processes.push({ pid: 'P' + pidCounter, arrival: 0, burst: 4, mem: 32 });
    renderProcTable();
  }

  // ── Scenario Loader ────────────────────────────────────────────────────
  function showScenarioPicker() {
    var existing = document.getElementById('scenario-picker');
    if (existing) { existing.remove(); return; }

    var picker = document.createElement('div');
    picker.id = 'scenario-picker';
    picker.style.cssText = 'position:absolute;z-index:200;background:var(--bg);border:1px solid var(--green);padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;min-width:320px';

    Object.keys(window.SCHED.SCENARIOS).forEach(function (key) {
      var sc = window.SCHED.SCENARIOS[key];
      var btn = document.createElement('button');
      btn.className = 'btn btn-add';
      btn.style.cssText = 'font-size:10px;padding:8px;text-align:left;line-height:1.5';
      btn.innerHTML = '<strong>' + sc.label + '</strong><br>' + sc.desc;
      btn.addEventListener('click', function () {
        loadScenario(key);
        picker.remove();
      });
      picker.appendChild(btn);
    });

    var addBtn = document.getElementById('btn-load-scenario');
    addBtn.parentElement.appendChild(picker);
    // Close on outside click
    setTimeout(function () {
      document.addEventListener('click', function closePicker(e) {
        if (!picker.contains(e.target) && e.target !== addBtn) {
          picker.remove();
          document.removeEventListener('click', closePicker);
        }
      });
    }, 0);
  }

  function loadScenario(key) {
    var sc = window.SCHED.SCENARIOS[key];
    if (!sc) return;
    processes = sc.processes.map(function (p) { return Object.assign({}, p); });
    pidCounter = processes.length;
    document.getElementById('cfg-cores').value   = sc.cores;
    document.getElementById('cfg-memory').value  = sc.memory;
    document.getElementById('cfg-quantum').value = sc.quantum;
    renderProcTable();
    resetSim();
  }

  // ── Tabs / Algo ────────────────────────────────────────────────────────
  function wireControls() {
    document.getElementById('btn-add-proc').addEventListener('click', addProcess);
    document.getElementById('btn-load-scenario').addEventListener('click', showScenarioPicker);
    document.getElementById('btn-play').addEventListener('click', playSim);
    document.getElementById('btn-pause').addEventListener('click', pauseSim);
    document.getElementById('btn-step').addEventListener('click', stepSim);
    document.getElementById('btn-reset').addEventListener('click', resetSim);

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeAlgo = btn.dataset.algo;
        updateAlgoExplain();
        updateCCodePanel();
      });
    });

    document.getElementById('cfg-cores').addEventListener('change', updateCoreLeds);

    // View toggle: GANTT / MATRIX / BOTH
    document.querySelectorAll('.vtoggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.vtoggle-btn').forEach(function (b) { b.classList.remove('vactive'); });
        btn.classList.add('vactive');
        var view    = btn.dataset.view;
        var ganttEl = document.getElementById('gantt-view');
        var matEl   = document.getElementById('matrix-view');
        if (view === 'gantt')  { ganttEl.style.display = ''; matEl.style.display = 'none'; }
        if (view === 'matrix') { ganttEl.style.display = 'none'; matEl.style.display = ''; }
        if (view === 'both')   { ganttEl.style.display = ''; matEl.style.display = ''; }
      });
    });
  }

  function updateAlgoExplain() {
    var info = ALGO_INFO[activeAlgo] || {};
    var el = document.getElementById('algo-explain');
    el.innerHTML = '<strong>' + (info.name || activeAlgo.toUpperCase()) + '</strong> ' +
      '<span class="tag ' + (info.tagCls || '') + '">' + (info.tag || '') + '</span><br>' +
      (info.desc || '');
  }

  function updateCCodePanel() {
    var el = document.getElementById('c-code-panel');
    if (!el || !window.SCHED.C_CODE) return;
    el.innerHTML = window.SCHED.C_CODE[activeAlgo] || '// No disponible para este algoritmo.';
  }

  // ── Core LEDs ──────────────────────────────────────────────────────────
  function updateCoreLeds(activePids) {
    var cores     = parseInt(document.getElementById('cfg-cores').value) || 1;
    var ledsEl    = document.getElementById('core-leds');
    var activeSet = new Set();
    if (activePids) activePids.forEach(function (p) { if (p) activeSet.add(true); });

    var html = '<span>CORES:</span>';
    for (var i = 0; i < cores; i++) {
      var active = activePids && activePids[i] !== null && activePids[i] !== undefined;
      html += '<div class="core-led' + (active ? ' active' : '') + '" title="CORE ' + (i + 1) + '"></div>';
    }
    ledsEl.innerHTML = html;
  }

  function updateCoreLedsFromTick(tick) {
    var cores    = parseInt(document.getElementById('cfg-cores').value) || 1;
    var ledsEl   = document.getElementById('core-leds');
    var coreArr  = (tick && tick.cores) ? tick.cores : [];
    var html = '<span>CORES:</span>';
    for (var i = 0; i < cores; i++) {
      var active = coreArr[i] !== null && coreArr[i] !== undefined;
      html += '<div class="core-led' + (active ? ' active' : '') + '" title="CORE ' + (i + 1) + (coreArr[i] ? ': ' + coreArr[i].pid : '') + '"></div>';
    }
    ledsEl.innerHTML = html;
  }

  // ── Queue / State display ──────────────────────────────────────────────
  function updateQueueDisplay(tick) {
    var qEl = document.getElementById('queue-display');
    var rEl = document.getElementById('running-display');
    if (!qEl || !rEl) return;

    var colorMap = {};
    processes.forEach(function (p, i) { colorMap[p.pid] = COLORS[i % COLORS.length]; });

    var runningSlots = (tick.cores || []).filter(function (s) { return s !== null; });
    if (runningSlots.length === 0) {
      rEl.innerHTML = '<span style="font-size:10px;color:var(--green-dk);letter-spacing:1px">IDLE</span>';
    } else {
      rEl.innerHTML = runningSlots.map(function (s) {
        var c = s.color || colorMap[s.pid] || '#00ff41';
        return '<div style="padding:3px 10px;border:1px solid ' + c + ';background:' + c +
          ';color:#000;font-size:10px;letter-spacing:1px">' + s.pid +
          ' <span style="font-size:8px">rem:' + s.remaining + '</span></div>';
      }).join('');
    }

    var queue = tick.queue || [];
    if (queue.length === 0) {
      qEl.innerHTML = '<span style="font-size:10px;color:var(--green-dk);letter-spacing:1px">EMPTY</span>';
    } else {
      qEl.innerHTML = queue.map(function (s) {
        var c = s.color || colorMap[s.pid] || '#00ff41';
        return '<div style="padding:3px 10px;border:1px solid ' + c + ';color:' + c +
          ';font-size:10px;letter-spacing:1px">' + s.pid +
          ' <span style="font-size:8px">rem:' + s.remaining + '</span></div>';
      }).join('');
    }
  }

  function resetQueueDisplay() {
    var qEl = document.getElementById('queue-display');
    var rEl = document.getElementById('running-display');
    var dash = '<span style="font-size:10px;color:var(--green-dk)">—</span>';
    if (qEl) qEl.innerHTML = dash;
    if (rEl) rEl.innerHTML = dash;
  }

  function updateStateDiagram(tick, isDone) {
    var hasRunning = (tick.cores || []).some(function (s) { return s !== null; });
    var hasReady   = (tick.queue || []).length > 0;
    document.querySelectorAll('.state-node').forEach(function (n) {
      var state = n.dataset.state || n.textContent.trim().toLowerCase();
      n.classList.remove('active');
      if (state === 'running'    && hasRunning) n.classList.add('active');
      if (state === 'ready'      && hasReady)   n.classList.add('active');
      if (state === 'terminated' && isDone)     n.classList.add('active');
    });
  }

  // ── Simulation Control ─────────────────────────────────────────────────
  function runSimulation(callback) {
    if (processes.length === 0) { alert('Agrega al menos un proceso.'); return; }
    var cfg = getConfig();

    // Sync inputs before running
    var tbody = document.getElementById('proc-tbody');
    tbody.querySelectorAll('input[data-field]').forEach(function (inp) {
      var proc = processes.find(function (p) { return p.pid === inp.dataset.pid; });
      if (proc) proc[inp.dataset.field] = Math.max(0, parseInt(inp.value) || 0);
    });

    if (worker) { worker.terminate(); worker = null; }
    worker = new Worker('../js/worker/simulation-worker.js');

    worker.onmessage = function (e) {
      var msg = e.data;
      if (msg.type === 'complete') { simResult = msg.result; if (callback) callback(); }
      if (msg.type === 'error')    { console.error('Worker error:', msg.message); }
    };

    worker.postMessage({
      type:      'run',
      algorithm: activeAlgo,
      processes: processes,
      cores:     cfg.cores,
      memory:    cfg.memory,
      quantum:   cfg.quantum
    });
  }

  function playSim() {
    clearInterval(playTimer);
    if (simResult && tickIndex < simResult.ticks.length) {
      if (getSpeed() === 0) {
        // INSTANT resume: render remaining ticks at once
        for (var i = tickIndex; i < simResult.ticks.length; i++) {
          var allPids = processes.map(function (p, i2) { return { pid: p.pid, color: COLORS[i2 % COLORS.length], at: p.arrival }; });
          window.SCHED.gantt.renderTick(simResult.ticks[i], allPids);
        }
        tickIndex = simResult.ticks.length;
        var last = simResult.ticks[simResult.ticks.length - 1];
        if (last) {
          document.getElementById('tick-val').textContent = last.tick;
          updateCoreLedsFromTick(last);
          if (last.memory) window.SCHED.memoryBar.render(last.memory, getConfig().memory);
          updateQueueDisplay(last);
          updateStateDiagram(last, true);
        }
        renderResults();
        return;
      }
      startAnimation();
      return;
    }
    // Fresh run
    resetVisuals();
    runSimulation(function () {
      var speed = getSpeed();
      if (speed === 0) {
        renderAllTicks();
        renderResults();
      } else {
        startAnimation();
      }
    });
  }

  function startAnimation() {
    clearInterval(playTimer);
    var speed = getSpeed();
    if (speed === 0) {
      renderAllTicks();
      renderResults();
      return;
    }
    var delay = Math.round(1000 / (speed * 4));
    playTimer = setInterval(function () {
      if (!simResult || tickIndex >= simResult.ticks.length) {
        clearInterval(playTimer);
        renderResults();
        return;
      }
      var tick    = simResult.ticks[tickIndex];
      var allPids = processes.map(function (p, i) { return { pid: p.pid, color: COLORS[i % COLORS.length], at: p.arrival }; });
      window.SCHED.gantt.renderTick(tick, allPids);
      document.getElementById('tick-val').textContent = tick.tick;
      updateCoreLedsFromTick(tick);
      if (tick.memory) window.SCHED.memoryBar.render(tick.memory, getConfig().memory);
      updateQueueDisplay(tick);
      updateStateDiagram(tick, false);
      tickIndex++;
    }, delay);
  }

  function renderAllTicks() {
    if (!simResult) return;
    var allPids = processes.map(function (p, i) { return { pid: p.pid, color: COLORS[i % COLORS.length], at: p.arrival }; });
    simResult.ticks.forEach(function (tick) {
      window.SCHED.gantt.renderTick(tick, allPids);
    });
    var lastTick = simResult.ticks[simResult.ticks.length - 1];
    if (lastTick) {
      document.getElementById('tick-val').textContent = lastTick.tick;
      updateCoreLedsFromTick(lastTick);
      if (lastTick.memory) window.SCHED.memoryBar.render(lastTick.memory, getConfig().memory);
      updateQueueDisplay(lastTick);
      updateStateDiagram(lastTick, true);
    }
    tickIndex = simResult.ticks.length;
  }

  function pauseSim() {
    clearInterval(playTimer);
    playTimer = null;
  }

  function stepSim() {
    clearInterval(playTimer);
    playTimer = null;
    if (!simResult) {
      runSimulation(function () { doStep(); });
      return;
    }
    doStep();
  }

  function doStep() {
    if (!simResult || tickIndex >= simResult.ticks.length) { renderResults(); return; }
    var tick    = simResult.ticks[tickIndex];
    var allPids = processes.map(function (p, i) { return { pid: p.pid, color: COLORS[i % COLORS.length], at: p.arrival }; });
    window.SCHED.gantt.renderTick(tick, allPids);
    document.getElementById('tick-val').textContent = tick.tick;
    updateCoreLedsFromTick(tick);
    if (tick.memory) window.SCHED.memoryBar.render(tick.memory, getConfig().memory);
    tickIndex++;
    var isDone = tickIndex >= simResult.ticks.length;
    updateQueueDisplay(tick);
    updateStateDiagram(tick, isDone);
    if (isDone) renderResults();
  }

  function resetSim() {
    clearInterval(playTimer); playTimer = null;
    if (worker) { worker.terminate(); worker = null; }
    simResult  = null;
    tickIndex  = 0;
    resetVisuals();
  }

  function resetVisuals() {
    window.SCHED.gantt.reset();
    window.SCHED.matrix.reset();
    window.SCHED.memoryBar.reset(getConfig().memory);
    document.getElementById('tick-val').textContent = '0';
    updateCoreLeds();
    resetQueueDisplay();
    document.querySelectorAll('.state-node').forEach(function (n) { n.classList.remove('active'); });
    document.getElementById('results-wrap').innerHTML =
      '<div class="results-header">PROCESS METRICS TABLE</div>' +
      '<div class="placeholder" style="padding:20px 16px">Sin resultados aún.</div>';
  }

  // ── Results Table ──────────────────────────────────────────────────────
  function renderResults() {
    if (!simResult) return;

    var allPids = processes.map(function (p, i) { return { pid: p.pid, color: COLORS[i % COLORS.length], at: p.arrival }; });
    window.SCHED.matrix.render(simResult.ticks, allPids);

    // Final state: show TERMINATED and empty queue/running
    var lastTick = simResult.ticks[simResult.ticks.length - 1];
    if (lastTick) updateStateDiagram(lastTick, true);

    var metrics = simResult.metrics;
    var summary = simResult.summary;
    if (!metrics || metrics.length === 0) return;

    var html = '<div class="results-header">PROCESS METRICS TABLE</div>';
    html += '<table class="rtable"><thead><tr>';
    ['PID','ARRIVAL','BURST','COMPLETION','TAT','WAIT','RESPONSE'].forEach(function (h) {
      html += '<th>' + h + '</th>';
    });
    html += '</tr></thead><tbody>';

    metrics.forEach(function (m) {
      html += '<tr>' +
        '<td><span class="pid-chip" style="color:' + m.color + ';border-color:' + m.color + '">' + m.pid + '</span></td>' +
        '<td>' + m.at + '</td>' +
        '<td>' + m.bt + '</td>' +
        '<td class="td-hl">' + (m.ct || '-') + '</td>' +
        '<td class="td-hl">' + m.tat + '</td>' +
        '<td class="' + (m.wt > 10 ? 'td-amber' : '') + '">' + m.wt + '</td>' +
        '<td>' + m.rt + '</td>' +
        '</tr>';
    });

    // Average row
    html += '<tr class="avg-row">' +
      '<td colspan="3">AVG</td>' +
      '<td>—</td>' +
      '<td>' + summary.avgTAT.toFixed(2) + '</td>' +
      '<td>' + summary.avgWT.toFixed(2)  + '</td>' +
      '<td>' + summary.avgRT.toFixed(2)  + '</td>' +
      '</tr></tbody></table>';

    // Summary stats
    html += '<div class="stats-row" style="margin-top:1px">' +
      statBox('CPU UTIL',    summary.cpuUtil.toFixed(1),    '%') +
      statBox('THROUGHPUT',  summary.throughput.toFixed(3), 'p/t') +
      statBox('AVG TAT',     summary.avgTAT.toFixed(2),     'ticks') +
      statBox('AVG WAIT',    summary.avgWT.toFixed(2),      'ticks') +
      '</div>';

    document.getElementById('results-wrap').innerHTML = html;
  }

  function statBox(lbl, val, unit) {
    return '<div class="stat-box"><div class="stat-lbl">' + lbl + '</div>' +
      '<div class="stat-val">' + val + '</div>' +
      '<div class="stat-unit">' + unit + '</div></div>';
  }

  // ── Concurrency Demo: Productor-Consumidor ─────────────────────────────
  var producer = null, consumer = null;
  var buffer   = [], bufferMax = 5, produced = 0, consumed = 0;

  function initConcurrencyDemo() {
    var panel = document.getElementById('concurrency-panel');
    panel.innerHTML =
      '<div style="padding:12px 0;font-size:11px">' +
      '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
        '<div class="pc-node" id="pc-prod" style="border:1px solid var(--green);padding:8px 14px;letter-spacing:1px">PRODUCTOR<br><span style="font-size:10px;color:var(--green-dim)">WORKER [W1]</span></div>' +
        '<div style="font-size:18px;color:var(--green)">→</div>' +
        '<div id="pc-buffer" style="border:1px solid var(--green-dim);padding:8px 12px;min-width:120px">' +
          '<div style="font-size:9px;letter-spacing:2px;color:var(--green-dim);margin-bottom:6px">BUFFER (0/' + bufferMax + ')</div>' +
          '<div id="pc-slots" style="display:flex;gap:4px">' + emptySlots(bufferMax) + '</div>' +
        '</div>' +
        '<div style="font-size:18px;color:var(--green)">→</div>' +
        '<div class="pc-node" id="pc-cons" style="border:1px solid var(--green);padding:8px 14px;letter-spacing:1px">CONSUMIDOR<br><span style="font-size:10px;color:var(--green-dim)">WORKER [W2]</span></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        '<button class="btn btn-run" id="btn-pc-start" type="button">[ ▶ START ]</button>' +
        '<button class="btn btn-add" id="btn-pc-stop"  type="button">[ ❚❚ STOP ]</button>' +
        '<button class="btn btn-del" id="btn-pc-reset" type="button">[ ↻ RESET ]</button>' +
      '</div>' +
      '<div id="pc-stats" style="font-size:10px;color:var(--green-dim);letter-spacing:1px">' +
        'PRODUCIDOS: 0 &nbsp;|&nbsp; CONSUMIDOS: 0 &nbsp;|&nbsp; EN BUFFER: 0/' + bufferMax +
      '</div>' +
      '<div id="pc-log" style="margin-top:8px;height:80px;overflow-y:auto;background:var(--black);border:1px solid var(--border);padding:6px;font-size:10px;color:var(--green-dim)"></div>' +
      '</div>';

    document.getElementById('btn-pc-start').addEventListener('click', startPCDemo);
    document.getElementById('btn-pc-stop').addEventListener('click',  stopPCDemo);
    document.getElementById('btn-pc-reset').addEventListener('click', resetPCDemo);
  }

  function emptySlots(n) {
    var h = '';
    for (var i = 0; i < n; i++) h += '<div style="width:16px;height:16px;border:1px solid var(--border);background:var(--surface2)"></div>';
    return h;
  }

  function updatePCBuffer() {
    var slotsEl = document.getElementById('pc-slots');
    var bufLabel = document.querySelector('#pc-buffer div');
    if (!slotsEl) return;
    if (bufLabel) bufLabel.textContent = 'BUFFER (' + buffer.length + '/' + bufferMax + ')';
    var h = '';
    for (var i = 0; i < bufferMax; i++) {
      if (i < buffer.length) h += '<div style="width:16px;height:16px;background:var(--green);border:1px solid var(--green)"></div>';
      else h += '<div style="width:16px;height:16px;border:1px solid var(--border);background:var(--surface2)"></div>';
    }
    slotsEl.innerHTML = h;
    var stats = document.getElementById('pc-stats');
    if (stats) stats.innerHTML = 'PRODUCIDOS: ' + produced + ' &nbsp;|&nbsp; CONSUMIDOS: ' + consumed + ' &nbsp;|&nbsp; EN BUFFER: ' + buffer.length + '/' + bufferMax;
  }

  function pcLog(msg) {
    var log = document.getElementById('pc-log');
    if (!log) return;
    var line = document.createElement('div');
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function startPCDemo() {
    if (producer) { producer.terminate(); }
    if (consumer) { consumer.terminate(); }
    producer = new Worker('../js/worker/producer-worker.js');
    consumer = new Worker('../js/worker/consumer-worker.js');

    producer.onmessage = function (e) {
      if (e.data.type === 'produced') {
        if (buffer.length < bufferMax) {
          buffer.push(e.data.item);
          produced++;
          pcLog('PROD → item #' + e.data.item.id + ' added to buffer');
          updatePCBuffer();
          // Tell consumer there's something to consume
          consumer.postMessage({ type: 'item-available' });
        } else {
          pcLog('PROD → buffer FULL, item #' + e.data.item.id + ' dropped');
        }
      }
    };

    consumer.onmessage = function (e) {
      if (e.data.type === 'consume-request') {
        if (buffer.length > 0) {
          var item = buffer.shift();
          consumed++;
          pcLog('CONS ← item #' + item.id + ' consumed');
          updatePCBuffer();
        }
      }
    };

    producer.postMessage({ type: 'start', rate: 700  });
    consumer.postMessage({ type: 'start', rate: 1100 });
    pcLog('Demo iniciado — Productor(700ms) · Consumidor(1100ms)');
  }

  function stopPCDemo() {
    if (producer) producer.postMessage({ type: 'stop' });
    if (consumer) consumer.postMessage({ type: 'stop' });
    pcLog('Demo pausado');
  }

  function resetPCDemo() {
    stopPCDemo();
    if (producer) { producer.terminate(); producer = null; }
    if (consumer) { consumer.terminate(); consumer = null; }
    buffer = []; produced = 0; consumed = 0;
    updatePCBuffer();
    var log = document.getElementById('pc-log');
    if (log) log.innerHTML = '';
    pcLog('Demo reiniciado');
  }

  // Init concurrency panel once DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initConcurrencyDemo, 0);
  });
})();
