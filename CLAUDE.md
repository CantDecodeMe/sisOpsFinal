# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SCHED_SIM v2.0** — A browser-based CPU scheduling simulator built for a final Operating Systems project at UDEM (Universidad de Monterrey). It is a pure static web app: no build step, no package manager, no server. Open `index.html` directly in a browser via `file://`.

The simulator demonstrates multithreading, concurrency, multi-core simulation, and memory management through JavaScript Web Workers (representing threads/forks). The assignment requires that processes be executed as actual threads/forks — not just visualized logically — using parallelism via Web Workers, SharedArrayBuffer, or similar mechanisms.

## Running the Project

No build tools. Open directly:
```
xdg-open index.html        # Linux
open index.html            # macOS
```

Or serve locally to avoid `file://` restrictions (needed for SharedArrayBuffer/COOP headers):
```
python3 -m http.server 8080
# then open http://localhost:8080
```

## Architecture

```
index.html              — Landing page, links to two modules
pages/
  simulator.html        — CPU scheduling simulator (main module)
  report.html           — Technical report with sidebar navigation
css/
  theme.css             — CSS variables (dark/light), CRT effects, fonts, animations
  styles.css            — Shared layout components (titlebar, tabs, buttons, tables, panels)
  simulator.css         — Simulator-specific styles (Gantt, matrix, memory bar, state diagram)
  report.css            — Report layout (sidebar + content)
js/
  ui/
    theme-toggle.js     — Dark/light toggle with localStorage persistence; also drives the clock
                          Exposes window.SCHED.themeToggle
```

The HTML comments (`<!-- Fase N -->`) mark planned implementation phases. Much of the simulator logic (scheduling engines, Gantt rendering, memory management, concurrency demos, C code panel) is scaffolded in HTML but not yet wired to JS.

## Theming System

- Dark mode is default; light mode is applied via `data-theme="light"` on `<html>`.
- All colors, glows, and effects are CSS custom properties in `theme.css` (`:root` and `:root[data-theme="light"]`).
- CRT scanlines and cursor effects are pure CSS; flicker animation disables itself in light mode.
- Theme preference is persisted in `localStorage` under key `sched_sim_theme`.
- The global namespace is `window.SCHED` — attach all JS modules there.

## Simulator Requirements (from instructions.txt)

The graded criteria require:
- **Processes run as Web Workers** (threads) or via SharedArrayBuffer, not just logical simulation
- **Real or simulated parallelism** across configurable cores (1, 2, or 4)
- **Scheduling algorithms**: FCFS, SJN, RR (quantum-configurable), SRT, HRRN, MLFQ\_1, MLFQ\_2
- **Memory simulation**: configurable total (256/512/1024 KB), fragmentation display
- **Concurrency demo**: producer-consumer or similar pattern visible in the UI
- **Metrics**: waiting time, turnaround time, response time, CPU utilization per process

## Report Module

`pages/report.html` uses a sidebar with `data-section` attributes. Sections map to `id="sec-<section>"` elements in `#report-content`. Content is injected from `js/data/report-content.js` (not yet created). The sidebar JS is inline in `report.html`.

Required report sections (all must be completed): Introducción, Objetivo, Marco teórico (Procesos/Threads/Fork/Scheduling/Memoria), Arquitectura, Diseño concurrente, Simulación de cores, Implementación de algoritmos, Manejo de concurrencia, Modelo de memoria, Resultados experimentales, Escenarios de prueba, Análisis comparativo, Conclusiones, Trabajo futuro, Referencias APA, Código de honor.
