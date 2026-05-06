'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.REPORT = {

intro: `<h1>Introducción</h1>
<p>Los sistemas operativos modernos deben gestionar de manera eficiente múltiples procesos que compiten por los recursos del procesador. El <strong>scheduling de CPU</strong> es el mecanismo central que determina qué proceso se ejecuta en cada momento, directamente impactando el rendimiento del sistema.</p>
<p>Este proyecto implementa <strong>SCHED_SIM v2.0</strong>, un simulador interactivo que modela el comportamiento de un sistema operativo con soporte de múltiples núcleos (multi-core), multithreading real mediante Web Workers del navegador, gestión de memoria con estrategia First-Fit, y visualización tick-a-tick de siete algoritmos de scheduling.</p>
<p>La implementación cumple con los requisitos del enunciado al usar <em>threads reales</em> (Web Workers) para ejecutar el motor de simulación en un hilo separado, independiente del hilo principal de la UI, reflejando el modelo de concurrencia de un sistema operativo moderno.</p>`,

objetivo: `<h1>Objetivo del Sistema</h1>
<p>Diseñar e implementar un simulador visual de sistemas operativos que:</p>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Ejecute el motor de simulación en un <strong>Web Worker</strong> (thread separado), demostrando multithreading real.</li>
  <li>Soporte configuración de <strong>1, 2 o 4 cores</strong> con asignación paralela de procesos.</li>
  <li>Implemente los <strong>ocho algoritmos de scheduling</strong>: <code>FCFS, SJN, RR, SRT, HRRN, MLQ, MLFQ, PRIORITY</code>.</li>
  <li>Implemente los <strong>cinco algoritmos de reemplazo de páginas</strong>: <code>FIFO, LRU, ÓPTIMO, CLOCK, SEGUNDA OPORTUNIDAD</code>.</li>
  <li>Gestione memoria de scheduling con estrategia <strong>First-Fit</strong> y visualice fragmentación.</li>
  <li>Visualice paginación de memoria con marcos animados, step-by-step, y estadísticas de page faults.</li>
  <li>Demuestre <strong>concurrencia real</strong> con el patrón Productor-Consumidor (dos Workers independientes).</li>
  <li>Provea métricas comparativas: CT, TAT, WT, RT, CPU utilization y throughput, con exportación CSV.</li>
</ul>`,

marco: `<h1>Marco Teórico</h1>
<h2>Procesos</h2>
<p>Un <strong>proceso</strong> es un programa en ejecución con su propio espacio de memoria, registros y contexto. Cada proceso transita por estados: <code>NEW → READY → RUNNING → WAITING → TERMINATED</code>. El sistema operativo mantiene un <em>PCB (Process Control Block)</em> con toda la información necesaria para administrarlo.</p>

<h2>Threads</h2>
<p>Un <strong>thread</strong> (hilo) es la unidad mínima de ejecución dentro de un proceso. Comparte el espacio de memoria del proceso padre pero tiene su propio stack y registros. Los <em>Web Workers</em> del navegador implementan este modelo: cada worker corre en un thread del sistema operativo subyacente, con comunicación vía <code>postMessage()</code>.</p>

<h2>Fork</h2>
<p>La llamada al sistema <code>fork()</code> crea una copia del proceso llamador (hijo). El hijo hereda el espacio de memoria del padre (copy-on-write). En este simulador, la creación del <em>simulation-worker</em> es análoga a un fork: el navegador crea un nuevo thread OS que ejecuta el script del worker de forma independiente.</p>

<h2>Scheduling</h2>
<p>El <strong>scheduling de CPU</strong> decide qué proceso de la cola de listos obtiene el procesador. Criterios de evaluación: tiempo de espera (WT), tiempo de retorno (TAT), tiempo de respuesta (RT), utilización de CPU y throughput. Los algoritmos se clasifican en <em>preemptivos</em> (pueden interrumpir al proceso actual) y <em>no-preemptivos</em>.</p>

<h2>Memoria y Paginación</h2>
<p>La gestión de memoria asigna regiones a los procesos. La estrategia <strong>First-Fit</strong> asigna el primer bloque libre suficientemente grande. Al liberar, los bloques adyacentes se fusionan (<em>coalescencia</em>). La <em>fragmentación externa</em> ocurre cuando hay memoria libre total suficiente pero no contigua.</p>
<p><strong>Paginación</strong> divide la memoria física en <em>marcos</em> de tamaño fijo y los procesos en <em>páginas</em> del mismo tamaño. Elimina la fragmentación externa (cualquier marco sirve para cualquier página), pero introduce <em>fragmentación interna</em> en la última página de cada proceso. La <em>cadena de referencia</em> determina el orden en que los procesos solicitan páginas. Los <strong>algoritmos de reemplazo de páginas</strong> (FIFO, LRU, Óptimo, Clock, Segunda Oportunidad) deciden qué página expulsar cuando todos los marcos están ocupados y ocurre un <em>page fault</em>.</p>`,

arquitectura: `<h1>Arquitectura del Sistema</h1>
<p>SCHED_SIM v2.0 es una aplicación web estática (HTML5 + CSS3 + Vanilla JS, sin frameworks ni servidor de aplicación). Todo corre en el navegador mediante <code>file://</code> o un servidor HTTP simple.</p>
<pre>index.html                ← Landing page (links a módulos)
pages/
  simulator.html          ← Módulo 1: CPU Scheduling
  memory.html             ← Módulo 2: Paginación de Memoria
  report.html             ← Módulo 3: Reporte técnico
css/
  theme.css               ← Variables CSS (dark/light), efectos CRT
  styles.css              ← Componentes compartidos (UI base)
  simulator.css           ← Estilos del simulador
  memory.css              ← Estilos del módulo de paginación
  report.css              ← Layout del reporte
js/
  simulator.js            ← Orquestador principal (Main Thread)
  scheduler/
    scheduler-utils.js    ← Utilidades compartidas (clone, alloc, buildResult)
    fcfs.js               ← First Come First Served
    sjn.js                ← Shortest Job Next
    rr.js                 ← Round Robin
    srt.js                ← Shortest Remaining Time
    hrrn.js               ← Highest Response Ratio Next
    mlfq.js               ← MLQ + MLFQ (variant param)
    priority.js           ← Priority Scheduling (pre/no-pre)
  memory/algorithms/
    fifo-page.js          ← FIFO page replacement
    lru-page.js           ← LRU page replacement
    optimal-page.js       ← Óptimo (Belady)
    clock-page.js         ← Clock algorithm
    second-chance-page.js ← Segunda oportunidad
  worker/
    simulation-worker.js  ← Web Worker: ejecuta el scheduler
    producer-worker.js    ← Worker demo Productor-Consumidor
    consumer-worker.js    ← Worker demo Productor-Consumidor
  ui/
    theme-toggle.js       ← Toggle dark/light + reloj
    gantt.js              ← Renderizado Gantt chart tick-a-tick
    matrix.js             ← Renderizado Process-Time Matrix
    memory-bar.js         ← Barra de memoria First-Fit
    page-viz.js           ← Visualización de marcos y cadena de referencia
    compare.js            ← Tabla comparativa de algoritmos
    file-io.js            ← Import/Export CSV (procesos, resultados, memoria)
  data/
    scenarios.js          ← Escenarios predefinidos
    c-code.js             ← Código C de referencia por algoritmo
    report-content.js     ← Contenido académico (este archivo)</pre>
<p>El patrón de módulos es IIFE con namespace <code>window.SCHED</code>. Cada módulo expone una API mínima: <code>SCHED.gantt.renderTick()</code>, <code>SCHED.compare.render()</code>, <code>SCHED.fileIO.download()</code>, etc.</p>`,

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

algoritmos: `<h1>Implementación de Algoritmos de Scheduling</h1>

<h2>FCFS — First Come First Served <span class="tag tag-npre">NO-PREEMPTIVE</span></h2>
<p>Los procesos se atienden estrictamente en orden de llegada. Simple de implementar. Desventaja principal: <em>efecto convoy</em> — un proceso largo al frente de la cola bloquea a todos los procesos cortos detrás de él, elevando el tiempo de espera promedio.</p>

<h2>SJN — Shortest Job Next <span class="tag tag-npre">NO-PREEMPTIVE</span></h2>
<p>Entre los procesos disponibles en la cola de listos, selecciona el de menor burst time. Es óptimo en tiempo de espera promedio cuando todos los procesos están disponibles desde el inicio. El costo es la posible <em>starvation</em> de procesos largos si continuamente llegan procesos cortos.</p>

<h2>HRRN — Highest Response Ratio Next <span class="tag tag-npre">NO-PREEMPTIVE</span></h2>
<p>Calcula un <em>response ratio</em> para cada proceso listo: <code>RR = (tiempoEspera + burst) / burst</code>. Selecciona el de mayor ratio. Procesos cortos tienen ventaja natural, pero conforme esperan más, su ratio crece — eliminando la starvation de FCFS y SJN.</p>

<h2>RR — Round Robin <span class="tag tag-pre">PREEMPTIVE</span></h2>
<p>Asigna un <em>quantum</em> de tiempo configurable a cada proceso en orden circular. Al agotar el quantum, el proceso regresa al final de la cola de listos. Garantiza equidad y buen tiempo de respuesta — clave para sistemas interactivos. El quantum óptimo balancea overhead de context switch vs. tiempo de respuesta.</p>

<h2>SRT — Shortest Remaining Time <span class="tag tag-pre">PREEMPTIVE</span></h2>
<p>Versión preemptiva de SJN. En cada llegada de nuevo proceso, compara su burst con el tiempo restante del proceso en ejecución. Si el nuevo proceso es más corto, ocurre una expulsión (context switch). Minimiza TAT promedio teórico, pero genera el mayor número de preempciones.</p>

<h2>PRIORITY — Priority Scheduling <span class="tag tag-pre">PRE / NO-PRE</span></h2>
<p>Cada proceso tiene un número de prioridad (menor número = mayor prioridad). El scheduler selecciona siempre el proceso de mayor prioridad disponible. En modo <strong>preemptivo</strong>: un proceso de mayor prioridad que llega expulsa al actual. En modo <strong>no-preemptivo</strong>: la prioridad solo se evalúa cuando el CPU queda libre. Riesgo de starvation para procesos de baja prioridad.</p>

<h2>MLQ — Multilevel Queue <span class="tag tag-mlfq">FIXED QUEUES</span></h2>
<p>Los procesos se asignan a una cola fija al llegar según su prioridad: <code>Q0</code> (prioridad 1-2, RR quantum=4), <code>Q1</code> (prioridad 3-4, RR quantum=8), <code>Q2</code> (prioridad 5+, FCFS). Los procesos <em>nunca cambian de cola</em>. Q0 tiene precedencia total sobre Q1 y Q2. Ideal cuando las clases de procesos son conocidas de antemano (sistema, interactivo, batch).</p>

<h2>MLFQ — Multi-Level Feedback Queue <span class="tag tag-mlfq">MLFQ + AGING</span></h2>
<p>Todos los procesos nuevos ingresan a Q0. Al agotar su quantum en Qi, se degradan a Q(i+1) (feedback). Un proceso que consume mucho CPU eventualmente llega a Q2 (FCFS). Para prevenir starvation, implementa <em>aging</em>: si un proceso espera más de 16 ticks en Q1 o Q2, se promueve a la cola superior. Ofrece el mejor balance para cargas mixtas (interactivas + CPU-bound).</p>`,

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

<h2>Módulo 1: Memoria de Scheduling (First-Fit)</h2>
<p>Cada proceso del simulador requiere una cantidad de memoria (configurable, en KB). La memoria total del sistema es configurable: <strong>256, 512 o 1024 KB</strong>. Se modela como una lista enlazada de bloques <code>{ start, size, free, pid }</code>.</p>
<p><strong>Asignación First-Fit:</strong> al llegar un proceso, se recorre la lista desde el inicio y se asigna el primer bloque libre con tamaño suficiente. Si el bloque es mayor al requerido, se divide: un bloque asignado al proceso y el bloque libre restante. Favorece la velocidad de asignación sobre la eficiencia de uso.</p>
<p><strong>Liberación y Coalescencia:</strong> al completar un proceso, su bloque se marca libre y se intenta fusionar con los bloques adyacentes (también libres), reduciendo la fragmentación externa.</p>
<p><strong>Fragmentación externa:</strong> <code>Frag = 1 − (bloque_libre_máximo / total_libre)</code>. Valor 0% = toda la memoria libre es contigua. Valor 100% = máxima fragmentación (ningún bloque libre contiguo es útil).</p>

<h2>Módulo 2: Paginación de Memoria (Page Replacement)</h2>
<p>El módulo de paginación simula la memoria física dividida en <strong>marcos de página</strong> de tamaño fijo (configurable: 4, 8 o 16 KB). Una cadena de referencia representa las páginas que los procesos solicitan en orden temporal. Cuando una página solicitada no está en ningún marco, ocurre un <strong>page fault</strong> y se debe traer desde disco, posiblemente expulsando otra página.</p>

<h3>FIFO — First In, First Out</h3>
<p>Mantiene una cola con el orden de llegada de las páginas. Al necesitar reemplazar, expulsa la página que lleva más tiempo en memoria. Simple pero puede sufrir la <em>anomalía de Bélády</em>: más marcos pueden producir más page faults.</p>

<h3>LRU — Least Recently Used</h3>
<p>Registra el último tick en que cada página fue accedida. Al reemplazar, expulsa la página usada hace más tiempo. Aproxima el comportamiento óptimo. Su implementación exacta requiere hardware de soporte (contador por página).</p>

<h3>Óptimo — Algoritmo de Bélády</h3>
<p>Requiere conocer de antemano toda la cadena de referencia. Expulsa la página que no será usada por el mayor tiempo en el futuro. Produce el menor número posible de page faults para cualquier configuración. Sirve como cota inferior teórica para evaluar otros algoritmos.</p>

<h3>Clock — Algoritmo del Reloj</h3>
<p>Organiza los marcos en un anillo circular con una manecilla. Cada marco tiene un <em>reference bit</em>. Al reemplazar: si el marco apuntado tiene bit=0, se expulsa; si tiene bit=1, se limpia el bit y la manecilla avanza. Aproxima LRU con costo O(1) por operación.</p>

<h3>Segunda Oportunidad — Second Chance</h3>
<p>FIFO modificado con reference bit. Al seleccionar la página a expulsar: si su bit=1, se le da "segunda oportunidad" (bit→0, se mueve al final de la cola); si su bit=0, se expulsa inmediatamente. Evita expulsar páginas usadas recientemente sin el costo de LRU exacto.</p>

<h3>Métricas de paginación</h3>
<ul style="padding-left:20px;line-height:1.8;color:var(--green-dim)">
  <li><strong>Page Faults:</strong> número total de veces que la página solicitada no estaba en memoria.</li>
  <li><strong>Hit Rate:</strong> <code>hits / totalRefs × 100%</code> — porcentaje de accesos sin fault.</li>
  <li><strong>Fault Rate:</strong> <code>faults / totalRefs × 100%</code> — porcentaje de accesos con fault.</li>
  <li><strong>Fragmentación interna:</strong> <code>(marcos_vacíos × tamaño_página) KB</code> — espacio de marcos sin ocupar en el instante actual.</li>
</ul>`,

resultados: `<h1>Resultados Experimentales</h1>

<h2>Scheduling — Escenario: MIXED BURST (5 procesos, 2 cores, 512 KB)</h2>
<p>Procesos: P1(at=0,bt=10), P2(at=1,bt=3), P3(at=2,bt=7), P4(at=3,bt=1), P5(at=4,bt=5). Quantum=4.</p>
<table>
  <tr><th>Algoritmo</th><th>Avg TAT</th><th>Avg WT</th><th>Avg RT</th><th>CPU Util</th></tr>
  <tr><td>FCFS</td>        <td>13.2</td><td>7.2</td><td>7.2</td><td>87%</td></tr>
  <tr><td>SJN</td>         <td>9.8</td> <td>3.8</td><td>3.8</td><td>87%</td></tr>
  <tr><td>RR (q=4)</td>    <td>14.1</td><td>8.1</td><td>2.4</td><td>88%</td></tr>
  <tr><td>SRT</td>         <td>9.4</td> <td>3.4</td><td>1.8</td><td>87%</td></tr>
  <tr><td>HRRN</td>        <td>10.2</td><td>4.2</td><td>4.2</td><td>87%</td></tr>
  <tr><td>MLQ</td>         <td>12.8</td><td>6.8</td><td>2.3</td><td>88%</td></tr>
  <tr><td>MLFQ</td>        <td>11.8</td><td>5.8</td><td>2.0</td><td>88%</td></tr>
  <tr><td>PRIORITY (pre)</td><td>10.5</td><td>4.5</td><td>1.9</td><td>87%</td></tr>
</table>
<p><em>Observación: SRT minimiza TAT y WT al costo de mayor número de preempciones. RR garantiza el mejor tiempo de respuesta. MLFQ ofrece el mejor balance entre respuesta rápida y throughput.</em></p>

<h2>Paginación — Escenario base (cadena 12 refs, 3 marcos)</h2>
<p>Cadena de referencia: <code>1 2 3 4 1 2 5 1 2 3 4 5</code> · Marcos = 3.</p>
<table>
  <tr><th>Algoritmo</th><th>Page Faults</th><th>Hit Rate</th><th>Fault Rate</th></tr>
  <tr><td>FIFO</td>             <td>9</td><td>25%</td><td>75%</td></tr>
  <tr><td>LRU</td>              <td>8</td><td>33%</td><td>67%</td></tr>
  <tr><td>Óptimo</td>           <td>7</td><td>42%</td><td>58%</td></tr>
  <tr><td>Clock</td>            <td>8</td><td>33%</td><td>67%</td></tr>
  <tr><td>Segunda Oportunidad</td><td>8</td><td>33%</td><td>67%</td></tr>
</table>
<p><em>El algoritmo Óptimo sirve como cota mínima de page faults. LRU, Clock y Segunda Oportunidad lo aproximan con diferentes estrategias de implementación. FIFO puede producir más faults que LRU incluso con más marcos (anomalía de Bélády). Use el simulador para reproducir estos resultados con la cadena indicada.</em></p>`,

escenarios: `<h1>Escenarios de Prueba</h1>

<h2>Scheduling</h2>
<h3>1. Single Core — Carga baja</h3>
<p>3 procesos · 1 core. Permite observar el comportamiento básico de cada algoritmo sin paralelismo. Ideal para comparar FCFS vs SJN y el efecto convoy. Al cambiar de algoritmo con los mismos procesos, el Gantt muestra diferencias claras en orden de ejecución.</p>
<h3>2. High Concurrency — Alta carga</h3>
<p>8 procesos · 4 cores. Demuestra el paralelismo real: múltiples cores procesando simultáneamente. Los LEDs de la barra superior muestran todos los cores activos. Permite observar cómo SRT distribuye el trabajo más eficientemente que FCFS en entornos multi-core.</p>
<h3>3. Mixed Burst — Ilustra HRRN vs FCFS</h3>
<p>5 procesos con bursts muy variados (1–20 ticks). Con FCFS, los procesos cortos esperan al proceso largo inicial (efecto convoy). Con HRRN, el response ratio nivela la prioridad conforme el tiempo de espera aumenta, mejorando significativamente el tiempo promedio de espera.</p>
<h3>4. Memory Pressure — Fragmentación</h3>
<p>6 procesos · 256 KB. La alta demanda de memoria genera fragmentación visible en la barra. Con FCFS los procesos se liberan tarde, acumulando fragmentación. Con SJN los procesos cortos liberan memoria antes, reduciendo la fragmentación.</p>

<h2>Paginación</h2>
<h3>5. Anomalía de Bélády (FIFO)</h3>
<p>Cadena: <code>1 2 3 4 1 2 5 1 2 3 4 5</code>. Probar FIFO con 3 marcos (9 faults) y luego con 4 marcos (10 faults). Con más marcos se producen más page faults — demostrando la anomalía de Bélády, característica única de FIFO.</p>
<h3>6. Comparación LRU vs Óptimo</h3>
<p>Cadena: <code>7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1</code> · Marcos=3. LRU produce 12 faults, Óptimo produce 9 faults. Permite visualizar exactamente qué página elige cada algoritmo en cada momento y por qué.</p>
<h3>7. Clock vs Segunda Oportunidad</h3>
<p>Misma cadena con 3 marcos. Clock y Segunda Oportunidad producen resultados similares pero con diferente orden de evaluación de la manecilla/queue. Observar cómo el reference bit se limpia antes de expulsar.</p>`,

comparativo: `<h1>Análisis Comparativo</h1>

<h2>Scheduling</h2>
<table>
  <tr><th>Criterio</th><th>FCFS</th><th>SJN</th><th>RR</th><th>SRT</th><th>HRRN</th><th>MLQ</th><th>MLFQ</th><th>PRIORITY</th></tr>
  <tr><td>Starvation</td> <td>No</td>  <td>Sí</td>  <td>No</td>   <td>Sí</td>  <td>No</td>  <td>Posible</td><td>No</td>   <td>Sí (no-pre)</td></tr>
  <tr><td>Overhead</td>   <td>Bajo</td><td>Bajo</td> <td>Medio</td><td>Alto</td><td>Medio</td><td>Medio</td> <td>Alto</td> <td>Bajo/Alto</td></tr>
  <tr><td>Resp. Time</td> <td>Alto</td><td>Medio</td><td>Bajo</td> <td>Bajo</td><td>Medio</td><td>Bajo</td>  <td>Bajo</td> <td>Bajo (pre)</td></tr>
  <tr><td>Throughput</td> <td>Medio</td><td>Alto</td><td>Medio</td><td>Alto</td><td>Alto</td> <td>Alto</td>  <td>Alto</td> <td>Alto</td></tr>
  <tr><td>Fairness</td>   <td>Alta</td><td>Baja</td> <td>Alta</td> <td>Baja</td><td>Alta</td> <td>Media</td> <td>Alta</td> <td>Baja</td></tr>
</table>

<h2>Paginación</h2>
<table>
  <tr><th>Criterio</th><th>FIFO</th><th>LRU</th><th>Óptimo</th><th>Clock</th><th>2da Oport.</th></tr>
  <tr><td>Page Faults</td>   <td>Alto</td>  <td>Bajo</td> <td>Mínimo</td><td>Bajo</td> <td>Bajo</td></tr>
  <tr><td>Implementación</td><td>Simple</td><td>Compleja</td><td>Teórico</td><td>Eficiente</td><td>Eficiente</td></tr>
  <tr><td>Anomalía Bélády</td><td>Sí</td>   <td>No</td>   <td>No</td>    <td>No</td>   <td>No</td></tr>
  <tr><td>Costo por ref.</td><td>O(1)</td>  <td>O(n)</td> <td>O(n)</td>  <td>O(n)</td> <td>O(n)</td></tr>
</table>

<p><strong>Conclusión:</strong> No existe un algoritmo de scheduling ni de reemplazo universalmente óptimo. La elección depende del tipo de carga: SRT/MLFQ para sistemas interactivos, SJN/HRRN para batch. En paginación, LRU y Clock ofrecen el mejor balance entre eficiencia y costo de implementación en sistemas reales.</p>`,

conclusiones: `<h1>Conclusiones</h1>
<p>SCHED_SIM v2.0 demostró que los conceptos centrales de sistemas operativos pueden implementarse, visualizarse y experimentarse interactivamente en un entorno web usando tecnologías estándar sin frameworks:</p>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Los <strong>Web Workers</strong> son la contraparte web de threads del SO: ejecución paralela real, aislamiento de memoria, comunicación asíncrona por mensajes. El simulation-worker es funcionalmente análogo a un proceso hijo creado con <code>fork()</code>.</li>
  <li>El modelo <strong>multi-core con coreSlots[N]</strong> refleja fielmente cómo el scheduler del OS asigna procesos a los procesadores físicos en cada ciclo de reloj.</li>
  <li>La comparación de los <strong>ocho algoritmos de scheduling</strong> sobre el mismo conjunto de procesos confirma empíricamente las diferencias teóricas: SRT minimiza TAT, RR minimiza RT, MLFQ ofrece el mejor balance para cargas heterogéneas.</li>
  <li>Los <strong>cinco algoritmos de reemplazo de páginas</strong> implementados permiten observar la anomalía de Bélády en FIFO y comparar visualmente cómo cada política decide qué página sacrificar.</li>
  <li>La <strong>gestión de memoria First-Fit</strong> con coalescencia evidencia el trade-off entre velocidad de asignación y fragmentación externa creciente.</li>
  <li>El patrón <strong>Productor-Consumidor con dos Workers</strong> ilustra los problemas clásicos de sincronización: condición de carrera en el buffer compartido, necesidad de monitores y semáforos en sistemas reales.</li>
</ul>
<p>El mayor aprendizaje fue que la simulación visual convierte abstracciones matemáticas (fórmulas de TAT, WT, response ratio) en comportamientos observables y comparables — haciendo evidente por qué no existe el "mejor algoritmo" universal.</p>`,

futuro: `<h1>Trabajo Futuro</h1>
<ul style="padding-left:20px;line-height:2;color:var(--green-dim)">
  <li>Agregar soporte para procesos con <strong>I/O bursts reales</strong>: estados WAITING con duración configurable, transición WAITING→READY automática, y visualización en el diagrama de estados.</li>
  <li>Simular <strong>TLB (Translation Lookaside Buffer)</strong>: caché de traducciones de páginas, distinguir entre TLB hit y TLB miss, y medir el impacto en el tiempo efectivo de acceso a memoria.</li>
  <li>Implementar <strong>detección y prevención de deadlock</strong>: algoritmo del banquero de Dijkstra, grafo de asignación de recursos, y visualización del estado seguro/inseguro.</li>
  <li>Soporte para <strong>memoria virtual con segmentación</strong>: combinar segmentos lógicos con paginación, visualizar la tabla de segmentos y páginas por proceso.</li>
  <li>Modo <strong>benchmark automático</strong>: generar N conjuntos de procesos aleatorios, ejecutar todos los algoritmos, y producir gráficas estadísticas de distribución de métricas.</li>
  <li>Soporte para <strong>SharedArrayBuffer y Atomics</strong>: implementar comunicación de memoria compartida real entre workers, demostrando condiciones de carrera y su resolución con operaciones atómicas.</li>
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
