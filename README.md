# SCHED_SIM v2.0

Simulador interactivo de scheduling de CPU para el proyecto final de Sistemas Operativos — UDEM.

## Descripción

Implementa multithreading real mediante **Web Workers**, simulación de múltiples cores, gestión de memoria con estrategia First-Fit y siete algoritmos de scheduling con visualización tick-a-tick.

## Ejecución

Los Web Workers requieren un servidor HTTP (no funciona desde `file://`):

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080` en el navegador.

## Algoritmos implementados

| Algoritmo | Tipo | Descripción |
|-----------|------|-------------|
| FCFS | No-preemptivo | First Come First Served |
| SJN | No-preemptivo | Shortest Job Next |
| RR | Preemptivo | Round Robin (quantum configurable) |
| SRT | Preemptivo | Shortest Remaining Time |
| HRRN | No-preemptivo | Highest Response Ratio Next |
| MLFQ_1 | MLFQ | 3 colas con degradación (Q0:q=4, Q1:q=8, Q2:FCFS) |
| MLFQ_2 | MLFQ | MLFQ_1 + aging anti-starvation |

## Arquitectura de threads

```
Main Thread (simulator.js)
  ├─► simulation-worker.js   ← Web Worker, ejecuta el algoritmo completo
  ├─► producer-worker.js     ← Demo concurrencia: produce items cada ~700ms
  └─► consumer-worker.js     ← Demo concurrencia: consume items cada ~1100ms
```

## Estructura del proyecto

```
index.html              ← Landing page
pages/
  simulator.html        ← Módulo simulador
  report.html           ← Reporte técnico
css/
  theme.css             ← Variables CSS, efectos CRT, animaciones
  styles.css            ← Componentes reutilizables
  simulator.css         ← Estilos del simulador
  report.css            ← Layout del reporte
js/
  simulator.js          ← Orquestador principal (Main Thread)
  scheduler/
    scheduler-utils.js  ← Utilidades compartidas (memoria, métricas)
    fcfs.js
    sjn.js
    rr.js
    srt.js
    hrrn.js
    mlfq.js
  worker/
    simulation-worker.js
    producer-worker.js
    consumer-worker.js
  ui/
    theme-toggle.js
    gantt.js
    matrix.js
    memory-bar.js
  data/
    scenarios.js        ← 4 escenarios predefinidos
    c-code.js           ← Código C de referencia por algoritmo
    report-content.js   ← Contenido del reporte técnico
```

## Funcionalidades

- **Multi-core**: 1, 2 o 4 cores configurables con LEDs en tiempo real
- **Memoria**: 256, 512 o 1024 KB con First-Fit, coalescencia y visualización de fragmentación
- **Gantt chart** tick-a-tick con tooltips por proceso
- **Process-Time Matrix** con estados RUN / WAIT / DONE / NOT ARRIVED
- **Cola de listos**: visualización en tiempo real de procesos ejecutando y en espera
- **Diagrama de estados**: READY → RUNNING → TERMINATED animado por tick
- **Métricas**: TAT, WT, RT, CPU utilization, throughput por proceso y promedio
- **Escenarios**: Single Core, High Concurrency, Mixed Burst, Memory Pressure
- **Demo Productor-Consumidor**: dos Workers independientes con buffer compartido (max 5 items)
- **Código C**: implementación de referencia en C para cada algoritmo con syntax highlighting
- **Reporte técnico**: 16 secciones con marco teórico, arquitectura, resultados y análisis comparativo
- **Tema dark/light**: persistido en localStorage

## Stack

HTML5 · CSS3 · JavaScript (vanilla) · Web Workers API — sin frameworks, sin build tools.
