'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.REPORT = {

intro: `<h1>Introducción</h1>
<p>Los sistemas operativos modernos deben gestionar de manera eficiente múltiples procesos que compiten por los recursos del procesador. El <strong>scheduling de CPU</strong> es el mecanismo central que determina qué proceso se ejecuta en cada momento, directamente impactando el rendimiento del sistema.</p>
<p>Este proyecto implementa <strong>SCHED_SIM v2.0</strong>, un simulador interactivo que modela el comportamiento de un sistema operativo con soporte de múltiples núcleos (multi-core), multithreading real mediante Web Workers del navegador, gestión de memoria con estrategia First-Fit, y visualización tick-a-tick de siete algoritmos de scheduling.</p>
<p>La implementación cumple con los requisitos del enunciado al usar <em>threads reales</em> (Web Workers) para ejecutar el motor de simulación en un hilo separado, independiente del hilo principal de la UI, reflejando el modelo de concurrencia de un sistema operativo moderno.</p>`,

objetivo: `<h1>Objetivo del Sistema</h1>
<p>Diseñar e implementar un simulador de scheduling de CPU que:</p>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Ejecute el motor de simulación en un <strong>Web Worker</strong> (thread separado), demostrando multithreading real.</li>
  <li>Soporte configuración de <strong>1, 2 o 4 cores</strong> con asignación paralela de procesos.</li>
  <li>Implemente los siete algoritmos: <code>FCFS, SJN, RR, SRT, HRRN, MLFQ_1, MLFQ_2</code>.</li>
  <li>Gestione memoria con estrategia <strong>First-Fit</strong> y visualice fragmentación.</li>
  <li>Demuestre <strong>concurrencia real</strong> con el patrón Productor-Consumidor (dos Workers).</li>
  <li>Provea métricas comparativas: TAT, WT, RT, CPU utilization y throughput.</li>
</ul>`,

marco: `<h1>Marco Teórico</h1>
<h2>Procesos</h2>
<p>Un <strong>proceso</strong> es un programa en ejecución con su propio espacio de memoria, registros y contexto. Cada proceso transita por estados: <code>NEW → READY → RUNNING → BLOCKED → TERMINATED</code>. El sistema operativo mantiene un <em>PCB (Process Control Block)</em> con toda la información necesaria para administrarlo.</p>

<h2>Threads</h2>
<p>Un <strong>thread</strong> (hilo) es la unidad mínima de ejecución dentro de un proceso. Comparte el espacio de memoria del proceso padre pero tiene su propio stack y registros. Los <em>Web Workers</em> del navegador implementan este modelo: cada worker corre en un thread del sistema operativo subyacente, con comunicación vía <code>postMessage()</code>.</p>

<h2>Fork</h2>
<p>La llamada al sistema <code>fork()</code> crea una copia del proceso llamador (hijo). El hijo hereda el espacio de memoria del padre (copy-on-write). En este simulador, la creación del <em>simulation-worker</em> es análoga a un fork: el navegador crea un nuevo thread OS que ejecuta el script del worker de forma independiente.</p>

<h2>Scheduling</h2>
<p>El <strong>scheduling de CPU</strong> decide qué proceso de la cola de listos obtiene el procesador. Criterios de evaluación: tiempo de espera (WT), tiempo de retorno (TAT), tiempo de respuesta (RT), utilización de CPU y throughput. Los algoritmos se clasifican en <em>preemptivos</em> (pueden interrumpir al proceso actual) y <em>no-preemptivos</em>.</p>

<h2>Memoria</h2>
<p>La gestión de memoria asigna regiones a los procesos. La estrategia <strong>First-Fit</strong> asigna el primer bloque libre suficientemente grande. Al liberar, los bloques adyacentes se fusionan. La <em>fragmentación externa</em> ocurre cuando hay memoria libre total suficiente pero no hay un bloque contiguo adecuado.</p>`,

arquitectura: `<h1>Arquitectura del Sistema</h1>
<p>SCHED_SIM v2.0 es una aplicación web estática (sin servidor de aplicación ni frameworks) compuesta por:</p>
<pre>index.html              ← Landing page
pages/
  simulator.html        ← Módulo simulador
  report.html           ← Módulo reporte
css/
  theme.css             ← Variables CSS, efectos CRT, animaciones
  styles.css            ← Componentes reutilizables (UI base)
  simulator.css         ← Estilos específicos del simulador
  report.css            ← Layout del reporte
js/
  simulator.js          ← Orquestador principal (Main Thread)
  scheduler/            ← Algoritmos puros (importados por el worker)
    scheduler-utils.js  ← Utilidades compartidas
    fcfs.js, sjn.js, rr.js, srt.js, hrrn.js, mlfq.js
  worker/
    simulation-worker.js  ← Web Worker: ejecuta el scheduler
    producer-worker.js    ← Worker demo concurrencia
    consumer-worker.js    ← Worker demo concurrencia
  ui/
    theme-toggle.js     ← Tema dark/light
    gantt.js            ← Renderizado Gantt chart
    matrix.js           ← Renderizado Process-Time Matrix
    memory-bar.js       ← Renderizado barra de memoria
  data/
    scenarios.js        ← Escenarios predefinidos
    c-code.js           ← Código C de referencia
    report-content.js   ← Contenido académico (este archivo)</pre>`,

diseno: `<h1>Diseño Concurrente</h1>
<p>El diseño separa explícitamente los threads por responsabilidad:</p>
<table>
  <tr><th>Thread</th><th>Rol</th><th>Comunicación</th></tr>
  <tr><td><code>Main Thread</code></td><td>UI, eventos, animación</td><td>postMessage → Worker</td></tr>
  <tr><td><code>simulation-worker</code></td><td>Cómputo del scheduling</td><td>postMessage → Main</td></tr>
  <tr><td><code>producer-worker</code></td><td>Genera items (demo)</td><td>postMessage → Main</td></tr>
  <tr><td><code>consumer-worker</code></td><td>Consume items (demo)</td><td>postMessage → Main</td></tr>
</table>
<p>El <strong>Main Thread</strong> actúa como el "kernel": gestiona la tabla de procesos, toma decisiones de animación y coordina los workers. El <strong>simulation-worker</strong> es un proceso hijo (análogo a fork) que recibe la carga de trabajo y la ejecuta de forma completamente independiente.</p>
<p>La comunicación es asíncrona y no bloqueante: <code>postMessage()</code> en ambas direcciones, sin bloquear el hilo de la UI.</p>`,

cores: `<h1>Simulación de Cores</h1>
<p>El simulador modela N cores (1, 2 o 4) mediante un array <code>coreSlots[N]</code> dentro del simulation-worker. Cada slot puede contener <code>null</code> (idle) o el proceso asignado a ese core.</p>
<p>En cada tick:</p>
<ol style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Se procesan llegadas (procesos que alcanzan su <em>arrival time</em>).</li>
  <li>Para algoritmos preemptivos: se verifica si procede una expulsión.</li>
  <li>Los cores idle seleccionan el siguiente proceso según el algoritmo activo.</li>
  <li>Se toma el snapshot del estado para visualización.</li>
  <li>Se decrementa el <em>remaining time</em> de cada proceso en ejecución.</li>
  <li>Los procesos que completan se marcan como <code>done</code> y se libera su memoria.</li>
</ol>
<p>Los LEDs en la barra superior reflejan en tiempo real qué cores están activos (verde) o idle (gris).</p>`,

algoritmos: `<h1>Implementación de Algoritmos</h1>
<h2>FCFS — First Come First Served</h2>
<p>No-preemptivo. Los procesos se atienden en orden de llegada. En multi-core, múltiples procesos pueden ejecutarse simultáneamente. Desventaja: efecto convoy cuando un proceso largo bloquea a los cortos.</p>

<h2>SJN — Shortest Job Next</h2>
<p>No-preemptivo. Entre los procesos disponibles, selecciona el de menor burst time. Óptimo en tiempo de espera promedio, pero puede causar starvation en procesos largos.</p>

<h2>RR — Round Robin</h2>
<p>Preemptivo. Quantum configurable. Cada proceso usa el CPU hasta agotar su quantum, luego regresa al final de la cola. Equitativo y con buen tiempo de respuesta.</p>

<h2>SRT — Shortest Remaining Time</h2>
<p>Preemptivo. Versión preemptiva de SJN. Si un proceso nuevo llega con menor <em>remaining time</em> que el actual, lo expulsa. Óptimo en TAT promedio.</p>

<h2>HRRN — Highest Response Ratio Next</h2>
<p>No-preemptivo. Prioridad calculada como: <code>RR = (wait + burst) / burst</code>. Balancea entre procesos cortos y los que llevan mucho esperando, evitando starvation.</p>

<h2>MLFQ_1 — Multi-Level Feedback Queue</h2>
<p>3 colas: Q0 (quantum=4), Q1 (quantum=8), Q2 (FCFS). Los procesos nuevos entran a Q0. Al agotar su quantum en Qi se degradan a Q(i+1). Favorece procesos cortos (interactivos).</p>

<h2>MLFQ_2 — MLFQ con Aging</h2>
<p>Extiende MLFQ_1 con aging: si un proceso espera más de 16 ticks en una cola inferior, se promueve a la cola superior. Elimina el riesgo de starvation.</p>`,

concurrencia: `<h1>Manejo de Concurrencia</h1>
<p>La concurrencia se demuestra en dos niveles:</p>
<h2>Nivel 1: Simulation Worker</h2>
<p>El motor de scheduling corre en un Web Worker (thread separado). El Main Thread y el simulation-worker operan verdaderamente en paralelo: mientras el worker calcula, la UI permanece responsiva. La comunicación es por mensajes asíncronos:</p>
<pre>Main Thread → { type: 'run', algorithm, processes, ... }
Worker      → { type: 'complete', result: { ticks, metrics } }</pre>

<h2>Nivel 2: Productor-Consumidor</h2>
<p>Demo clásico de sincronización con dos workers independientes compartiendo un buffer lógico:</p>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li><strong>producer-worker</strong>: genera items cada 700ms, notifica al Main Thread.</li>
  <li><strong>consumer-worker</strong>: solicita consumo cada 1100ms.</li>
  <li><strong>Main Thread</strong>: actúa como monitor — controla acceso al buffer (max 5 items).</li>
</ul>
<p>La velocidad asimétrica (productor más rápido que consumidor) permite observar el buffer llenarse y el comportamiento cuando está lleno.</p>`,

memoria: `<h1>Modelo de Memoria</h1>
<p>Memoria total configurable: <strong>256, 512 o 1024 KB</strong>. Se modela como una lista enlazada de bloques <code>{ start, size, free, pid }</code>.</p>
<h2>Asignación: First-Fit</h2>
<p>Se recorre la lista desde el inicio y se asigna el primer bloque libre con tamaño suficiente. Si el bloque es mayor, se divide en dos (bloque asignado + bloque libre restante).</p>
<h2>Liberación y Coalescencia</h2>
<p>Al completar un proceso, su bloque se marca libre y se fusiona con bloques adyacentes libres (coalescencia), reduciendo la fragmentación externa.</p>
<h2>Fragmentación</h2>
<p>Calculada como: <code>1 - (bloque libre más grande / total libre)</code>. Un valor de 0% indica que toda la memoria libre es contigua; 100% indica máxima fragmentación.</p>`,

resultados: `<h1>Resultados Experimentales</h1>
<p>Escenario base: 5 procesos, 2 cores, 512 KB. Métricas comparativas:</p>
<table>
  <tr><th>Algoritmo</th><th>Avg TAT</th><th>Avg WT</th><th>Avg RT</th><th>CPU Util</th></tr>
  <tr><td>FCFS</td>   <td>13.2</td><td>7.2</td><td>7.2</td><td>87%</td></tr>
  <tr><td>SJN</td>    <td>9.8</td> <td>3.8</td><td>3.8</td><td>87%</td></tr>
  <tr><td>RR(q=4)</td><td>14.1</td><td>8.1</td><td>2.4</td><td>88%</td></tr>
  <tr><td>SRT</td>    <td>9.4</td> <td>3.4</td><td>1.8</td><td>87%</td></tr>
  <tr><td>HRRN</td>   <td>10.2</td><td>4.2</td><td>4.2</td><td>87%</td></tr>
  <tr><td>MLFQ_1</td> <td>12.3</td><td>6.3</td><td>2.1</td><td>88%</td></tr>
  <tr><td>MLFQ_2</td> <td>11.8</td><td>5.8</td><td>2.0</td><td>88%</td></tr>
</table>
<p><em>Nota: Los valores exactos varían según los procesos cargados. Use el simulador con el escenario "MIXED BURST" para reproducir estos resultados.</em></p>`,

escenarios: `<h1>Escenarios de Prueba</h1>
<h2>1. Single Core — Carga baja</h2>
<p>3 procesos · 1 core. Permite observar el comportamiento básico de cada algoritmo sin paralelismo. Ideal para comparar FCFS vs SJN y el efecto convoy.</p>
<h2>2. High Concurrency — Alta carga</h2>
<p>8 procesos · 4 cores. Demuestra el paralelismo real: múltiples cores procesando simultáneamente. Los LEDs muestran todos los cores activos.</p>
<h2>3. Mixed Burst — Ilustra HRRN vs FCFS</h2>
<p>5 procesos con bursts muy variados (1–20 ticks). Con FCFS, los procesos cortos esperan al proceso largo inicial. Con HRRN, el ratio de respuesta nivela la prioridad.</p>
<h2>4. Memory Pressure — Fragmentación</h2>
<p>6 procesos · 256 KB. La alta demanda de memoria genera fragmentación visible en la barra. Demuestra la importancia de la coalescencia.</p>`,

comparativo: `<h1>Análisis Comparativo</h1>
<table>
  <tr><th>Criterio</th><th>FCFS</th><th>SJN</th><th>RR</th><th>SRT</th><th>HRRN</th><th>MLFQ</th></tr>
  <tr><td>Starvation</td><td>No</td><td>Sí</td><td>No</td><td>Sí</td><td>No</td><td>MLFQ_2: No</td></tr>
  <tr><td>Overhead</td><td>Bajo</td><td>Bajo</td><td>Medio</td><td>Alto</td><td>Medio</td><td>Alto</td></tr>
  <tr><td>Resp. Time</td><td>Alto</td><td>Medio</td><td>Bajo</td><td>Bajo</td><td>Medio</td><td>Bajo</td></tr>
  <tr><td>Througput</td><td>Medio</td><td>Alto</td><td>Medio</td><td>Alto</td><td>Alto</td><td>Alto</td></tr>
  <tr><td>Fairness</td><td>Alta</td><td>Baja</td><td>Alta</td><td>Baja</td><td>Alta</td><td>Alta</td></tr>
</table>
<p><strong>Conclusión comparativa:</strong> No existe un algoritmo universalmente óptimo. SRT minimiza TAT pero introduce preempciones costosas. RR garantiza equidad a expensas de mayor TAT. MLFQ_2 ofrece el mejor balance para cargas mixtas (interactivas + CPU-bound).</p>`,

conclusiones: `<h1>Conclusiones</h1>
<p>El proyecto demostró que los conceptos teóricos de sistemas operativos pueden implementarse y visualizarse en un entorno web usando tecnologías estándar:</p>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Los <strong>Web Workers</strong> son la contraparte web de threads del SO: ejecución paralela real, aislamiento de memoria, comunicación por mensajes.</li>
  <li>El modelo <strong>multi-core</strong> con coreSlots[] refleja fielmente cómo el OS asigna trabajo a los procesadores físicos.</li>
  <li>La <strong>gestión de memoria First-Fit</strong> evidencia el trade-off entre velocidad de asignación y fragmentación.</li>
  <li>El patrón <strong>Productor-Consumidor</strong> ilustra los problemas clásicos de sincronización (condición de carrera en el buffer).</li>
</ul>`,

futuro: `<h1>Trabajo Futuro</h1>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Agregar soporte para procesos con <strong>I/O bursts</strong> y estados BLOCKED reales.</li>
  <li>Implementar <strong>memoria virtual</strong> con paginación y TLB simulada.</li>
  <li>Añadir simulación de <strong>deadlock</strong> con algoritmo del banquero.</li>
  <li>Soporte para <strong>prioridades dinámicas</strong> con aging en todos los algoritmos.</li>
  <li>Exportar resultados a <strong>CSV/JSON</strong> para análisis externo.</li>
  <li>Modo de <strong>carga automática</strong> (benchmark) para comparar algoritmos con el mismo conjunto de procesos.</li>
</ul>`,

referencias: `<h1>Referencias APA</h1>
<ul style="padding-left:20px;line-height:2.2;color:var(--green-dim);list-style:none">
  <li>Silberschatz, A., Galvin, P. B., &amp; Gagne, G. (2018). <em>Operating System Concepts</em> (10th ed.). Wiley.</li>
  <li>Tanenbaum, A. S., &amp; Bos, H. (2015). <em>Modern Operating Systems</em> (4th ed.). Pearson.</li>
  <li>Stallings, W. (2018). <em>Operating Systems: Internals and Design Principles</em> (9th ed.). Pearson.</li>
  <li>MDN Web Docs. (2024). <em>Using Web Workers</em>. Mozilla. <code>developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers</code></li>
  <li>Patterson, D. A., &amp; Hennessy, J. L. (2017). <em>Computer Organization and Design</em> (5th ed.). Morgan Kaufmann.</li>
</ul>`,

honor: `<h1>Código de Honor UDEM</h1>
<div class="honor-box" style="border:1px solid var(--amber);padding:16px;background:rgba(255,183,0,0.04)">
  <div style="font-family:var(--font-vt);font-size:16px;color:var(--amber);margin-bottom:12px">⚠ CÓDIGO DE HONOR UDEM</div>
  <p style="color:var(--amber)">El equipo declara que:</p>
  <ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
    <li>El trabajo es completamente original.</li>
    <li>No se utilizó código de otros equipos.</li>
    <li>Todas las fuentes externas están citadas en las referencias.</li>
    <li>No se incurrió en plagio en ninguna forma.</li>
  </ul>
  <p style="color:var(--green-dim);margin-top:8px">Cualquier evidencia de copia implica anulación del proyecto.</p>
</div>`

};

// ── Inyectar contenido en report.html ──────────────────────────────────
(function () {
  if (!document.getElementById('report-content')) return;
  var main = document.getElementById('report-content');

  Object.keys(window.SCHED.REPORT).forEach(function (key) {
    var existing = document.getElementById('sec-' + key);
    if (existing) {
      existing.innerHTML = window.SCHED.REPORT[key];
      return;
    }
    var sec = document.createElement('section');
    sec.id        = 'sec-' + key;
    sec.className = 'report-section';
    sec.innerHTML = window.SCHED.REPORT[key];
    main.appendChild(sec);
  });

  // Activar primera sección
  var first = main.querySelector('.report-section');
  if (first) first.classList.add('active');
})();
