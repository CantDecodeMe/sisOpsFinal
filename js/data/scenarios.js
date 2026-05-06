'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.SCENARIOS = {
  single_core: {
    label: 'SINGLE CORE — Carga baja',
    desc:  '3 procesos · 1 core · burst cortos',
    cores: 1, memory: 256, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 8, mem: 64, priority: 2, pages: 8 },
      { pid: 'P2', arrival: 2, burst: 4, mem: 32, priority: 1, pages: 4 },
      { pid: 'P3', arrival: 4, burst: 6, mem: 48, priority: 3, pages: 6 }
    ]
  },
  high_concurrency: {
    label: 'HIGH CONCURRENCY — Alta carga',
    desc:  '8 procesos · 4 cores · ráfagas mixtas, 3 niveles de prioridad',
    cores: 4, memory: 512, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 10, mem: 64, priority: 1, pages: 8  },
      { pid: 'P2', arrival: 0, burst: 5,  mem: 32, priority: 2, pages: 4  },
      { pid: 'P3', arrival: 1, burst: 8,  mem: 48, priority: 3, pages: 6  },
      { pid: 'P4', arrival: 1, burst: 3,  mem: 24, priority: 4, pages: 3  },
      { pid: 'P5', arrival: 2, burst: 12, mem: 80, priority: 5, pages: 10 },
      { pid: 'P6', arrival: 3, burst: 6,  mem: 40, priority: 2, pages: 5  },
      { pid: 'P7', arrival: 4, burst: 4,  mem: 32, priority: 4, pages: 4  },
      { pid: 'P8', arrival: 5, burst: 9,  mem: 56, priority: 5, pages: 7  }
    ]
  },
  mixed_burst: {
    label: 'MIXED BURST — Ilustra HRRN vs FCFS',
    desc:  '5 procesos · 2 cores · bursts muy variados',
    cores: 2, memory: 512, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 20, mem: 64, priority: 3, pages: 8 },
      { pid: 'P2', arrival: 1, burst: 2,  mem: 16, priority: 1, pages: 2 },
      { pid: 'P3', arrival: 2, burst: 15, mem: 48, priority: 4, pages: 6 },
      { pid: 'P4', arrival: 3, burst: 1,  mem: 8,  priority: 1, pages: 1 },
      { pid: 'P5', arrival: 4, burst: 10, mem: 32, priority: 2, pages: 4 }
    ]
  },
  memory_pressure: {
    label: 'MEMORY PRESSURE — Fragmentación',
    desc:  '6 procesos · 2 cores · alta demanda de memoria',
    cores: 2, memory: 256, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 6, mem: 80, priority: 2, pages: 10 },
      { pid: 'P2', arrival: 0, burst: 4, mem: 60, priority: 3, pages: 8  },
      { pid: 'P3', arrival: 2, burst: 8, mem: 70, priority: 1, pages: 9  },
      { pid: 'P4', arrival: 4, burst: 5, mem: 30, priority: 4, pages: 4  },
      { pid: 'P5', arrival: 6, burst: 7, mem: 50, priority: 5, pages: 6  },
      { pid: 'P6', arrival: 8, burst: 3, mem: 40, priority: 2, pages: 5  }
    ]
  }
};
