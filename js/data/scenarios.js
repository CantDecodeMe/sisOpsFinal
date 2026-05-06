'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.SCENARIOS = {
  single_core: {
    label: 'SINGLE CORE — Carga baja',
    desc:  '3 procesos · 1 core · burst cortos',
    cores: 1, memory: 256, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 8,  mem: 64 },
      { pid: 'P2', arrival: 2, burst: 4,  mem: 32 },
      { pid: 'P3', arrival: 4, burst: 6,  mem: 48 }
    ]
  },
  high_concurrency: {
    label: 'HIGH CONCURRENCY — Alta carga',
    desc:  '8 procesos · 4 cores · ráfagas mixtas',
    cores: 4, memory: 512, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 10, mem: 64  },
      { pid: 'P2', arrival: 0, burst: 5,  mem: 32  },
      { pid: 'P3', arrival: 1, burst: 8,  mem: 48  },
      { pid: 'P4', arrival: 1, burst: 3,  mem: 24  },
      { pid: 'P5', arrival: 2, burst: 12, mem: 80  },
      { pid: 'P6', arrival: 3, burst: 6,  mem: 40  },
      { pid: 'P7', arrival: 4, burst: 4,  mem: 32  },
      { pid: 'P8', arrival: 5, burst: 9,  mem: 56  }
    ]
  },
  mixed_burst: {
    label: 'MIXED BURST — Ilustra HRRN vs FCFS',
    desc:  '5 procesos · 2 cores · bursts muy variados',
    cores: 2, memory: 512, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 20, mem: 64 },
      { pid: 'P2', arrival: 1, burst: 2,  mem: 16 },
      { pid: 'P3', arrival: 2, burst: 15, mem: 48 },
      { pid: 'P4', arrival: 3, burst: 1,  mem: 8  },
      { pid: 'P5', arrival: 4, burst: 10, mem: 32 }
    ]
  },
  memory_pressure: {
    label: 'MEMORY PRESSURE — Fragmentación',
    desc:  '6 procesos · 2 cores · alta demanda de memoria',
    cores: 2, memory: 256, quantum: 4,
    processes: [
      { pid: 'P1', arrival: 0, burst: 6,  mem: 80  },
      { pid: 'P2', arrival: 0, burst: 4,  mem: 60  },
      { pid: 'P3', arrival: 2, burst: 8,  mem: 70  },
      { pid: 'P4', arrival: 4, burst: 5,  mem: 30  },
      { pid: 'P5', arrival: 6, burst: 7,  mem: 50  },
      { pid: 'P6', arrival: 8, burst: 3,  mem: 40  }
    ]
  }
};
