'use strict';
window.SCHED = window.SCHED || {};
/* C_CODE: código C de referencia para cada algoritmo (HTML con syntax highlighting) */
window.SCHED.C_CODE = {
  fcfs: `<span class="cm">/* FCFS — First Come First Served */</span>
<span class="ty">typedef</span> <span class="kw">struct</span> {
    <span class="ty">int</span> pid, arrival, burst, completion, tat, wt;
} Process;

<span class="ty">void</span> <span class="fn">fcfs</span>(Process procs[], <span class="ty">int</span> n) {
    <span class="cm">/* Ordenar por tiempo de llegada */</span>
    <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n - <span class="nr">1</span>; i++)
        <span class="kw">for</span> (<span class="ty">int</span> j = <span class="nr">0</span>; j < n - i - <span class="nr">1</span>; j++)
            <span class="kw">if</span> (procs[j].arrival > procs[j+<span class="nr">1</span>].arrival) {
                Process tmp = procs[j]; procs[j] = procs[j+<span class="nr">1</span>]; procs[j+<span class="nr">1</span>] = tmp;
            }
    <span class="ty">int</span> time = <span class="nr">0</span>;
    <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++) {
        <span class="kw">if</span> (time < procs[i].arrival) time = procs[i].arrival;
        procs[i].completion = time + procs[i].burst;
        procs[i].tat = procs[i].completion - procs[i].arrival;
        procs[i].wt  = procs[i].tat - procs[i].burst;
        time = procs[i].completion;
    }
}`,

  sjn: `<span class="cm">/* SJN — Shortest Job Next (non-preemptive) */</span>
<span class="ty">void</span> <span class="fn">sjn</span>(Process procs[], <span class="ty">int</span> n) {
    <span class="ty">int</span> completed = <span class="nr">0</span>, time = <span class="nr">0</span>;
    <span class="ty">int</span> done[<span class="nr">64</span>] = {<span class="nr">0</span>};
    <span class="kw">while</span> (completed < n) {
        <span class="ty">int</span> sel = -<span class="nr">1</span>, minBurst = <span class="nr">99999</span>;
        <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++) {
            <span class="kw">if</span> (!done[i] && procs[i].arrival <= time && procs[i].burst < minBurst) {
                minBurst = procs[i].burst; sel = i;
            }
        }
        <span class="kw">if</span> (sel == -<span class="nr">1</span>) { time++; <span class="kw">continue</span>; }
        procs[sel].completion = time + procs[sel].burst;
        procs[sel].tat = procs[sel].completion - procs[sel].arrival;
        procs[sel].wt  = procs[sel].tat - procs[sel].burst;
        time = procs[sel].completion;
        done[sel] = <span class="nr">1</span>; completed++;
    }
}`,

  rr: `<span class="cm">/* RR — Round Robin */</span>
<span class="ty">void</span> <span class="fn">round_robin</span>(Process procs[], <span class="ty">int</span> n, <span class="ty">int</span> quantum) {
    <span class="ty">int</span> remaining[<span class="nr">64</span>], queue[<span class="nr">256</span>], front = <span class="nr">0</span>, back = <span class="nr">0</span>, time = <span class="nr">0</span>;
    <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++) remaining[i] = procs[i].burst;
    queue[back++] = <span class="nr">0</span>; <span class="cm">/* primer proceso */</span>
    <span class="kw">while</span> (front != back) {
        <span class="ty">int</span> idx = queue[front++ % <span class="nr">256</span>];
        <span class="ty">int</span> run = (remaining[idx] > quantum) ? quantum : remaining[idx];
        remaining[idx] -= run; time += run;
        <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++)
            <span class="kw">if</span> (i != idx && procs[i].arrival <= time && remaining[i] > <span class="nr">0</span>)
                queue[back++ % <span class="nr">256</span>] = i; <span class="cm">/* arrivals during slice */</span>
        <span class="kw">if</span> (remaining[idx] > <span class="nr">0</span>)
            queue[back++ % <span class="nr">256</span>] = idx;
        <span class="kw">else</span> {
            procs[idx].completion = time;
            procs[idx].tat = time - procs[idx].arrival;
            procs[idx].wt  = procs[idx].tat - procs[idx].burst;
        }
    }
}`,

  srt: `<span class="cm">/* SRT — Shortest Remaining Time (preemptive) */</span>
<span class="ty">void</span> <span class="fn">srt</span>(Process procs[], <span class="ty">int</span> n) {
    <span class="ty">int</span> remaining[<span class="nr">64</span>], completed = <span class="nr">0</span>, time = <span class="nr">0</span>, prev = -<span class="nr">1</span>;
    <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++) remaining[i] = procs[i].burst;
    <span class="kw">while</span> (completed < n) {
        <span class="ty">int</span> sel = -<span class="nr">1</span>, minR = <span class="nr">99999</span>;
        <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++)
            <span class="kw">if</span> (procs[i].arrival <= time && remaining[i] > <span class="nr">0</span> && remaining[i] < minR) {
                minR = remaining[i]; sel = i;
            }
        <span class="kw">if</span> (sel == -<span class="nr">1</span>) { time++; <span class="kw">continue</span>; }
        remaining[sel]--;  time++;
        <span class="kw">if</span> (remaining[sel] == <span class="nr">0</span>) {
            procs[sel].completion = time;
            procs[sel].tat = time - procs[sel].arrival;
            procs[sel].wt  = procs[sel].tat - procs[sel].burst;
            completed++;
        }
    }
}`,

  hrrn: `<span class="cm">/* HRRN — Highest Response Ratio Next */</span>
<span class="ty">float</span> <span class="fn">response_ratio</span>(<span class="ty">int</span> wait, <span class="ty">int</span> burst) {
    <span class="kw">return</span> (wait + burst) / (<span class="ty">float</span>)burst;
}
<span class="ty">void</span> <span class="fn">hrrn</span>(Process procs[], <span class="ty">int</span> n) {
    <span class="ty">int</span> completed = <span class="nr">0</span>, time = <span class="nr">0</span>;
    <span class="ty">int</span> done[<span class="nr">64</span>] = {<span class="nr">0</span>};
    <span class="kw">while</span> (completed < n) {
        <span class="ty">int</span>   sel = -<span class="nr">1</span>;
        <span class="ty">float</span> maxRR = -<span class="nr">1</span>;
        <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++) {
            <span class="kw">if</span> (!done[i] && procs[i].arrival <= time) {
                <span class="ty">int</span>   w  = time - procs[i].arrival;
                <span class="ty">float</span> rr = <span class="fn">response_ratio</span>(w, procs[i].burst);
                <span class="kw">if</span> (rr > maxRR) { maxRR = rr; sel = i; }
            }
        }
        <span class="kw">if</span> (sel == -<span class="nr">1</span>) { time++; <span class="kw">continue</span>; }
        procs[sel].completion = time + procs[sel].burst;
        procs[sel].tat = procs[sel].completion - procs[sel].arrival;
        procs[sel].wt  = procs[sel].tat - procs[sel].burst;
        time = procs[sel].completion;
        done[sel] = <span class="nr">1</span>; completed++;
    }
}`,

  mlq: `<span class="cm">/* MLQ — Multilevel Queue (colas fijas por prioridad) */</span>
<span class="ty">#define</span> LEVELS   <span class="nr">3</span>
<span class="ty">int</span> quantums[LEVELS] = {<span class="nr">4</span>, <span class="nr">8</span>, <span class="nr">0</span>}; <span class="cm">/* Q0:RR q=4, Q1:RR q=8, Q2:FCFS */</span>

<span class="ty">int</span> <span class="fn">assign_queue</span>(Process *p) {
    <span class="kw">if</span> (p->priority <= <span class="nr">2</span>) <span class="kw">return</span> <span class="nr">0</span>;
    <span class="kw">if</span> (p->priority <= <span class="nr">4</span>) <span class="kw">return</span> <span class="nr">1</span>;
    <span class="kw">return</span> <span class="nr">2</span>;
}

<span class="ty">void</span> <span class="fn">mlq</span>(Process procs[], <span class="ty">int</span> n) {
    Queue queues[LEVELS];
    <span class="ty">int</span>   qlevel[<span class="nr">64</span>]; <span class="cm">/* cola fija, no cambia */</span>
    <span class="ty">int</span>   qused [<span class="nr">64</span>] = {<span class="nr">0</span>};
    <span class="ty">int</span> time = <span class="nr">0</span>, completed = <span class="nr">0</span>;
    <span class="kw">while</span> (completed < n) {
        <span class="kw">for</span> (<span class="ty">int</span> i = <span class="nr">0</span>; i < n; i++) {
            <span class="kw">if</span> (procs[i].at == time) {
                qlevel[i] = <span class="fn">assign_queue</span>(&procs[i]); <span class="cm">/* asignación fija */</span>
                <span class="fn">enqueue</span>(queues[qlevel[i]], &procs[i]);
            }
        }
        Process *p = <span class="fn">dequeue_highest</span>(queues, LEVELS);
        <span class="kw">if</span> (!p) { time++; <span class="kw">continue</span>; }
        <span class="ty">int</span> lv  = qlevel[p->pid];
        <span class="ty">int</span> run = (quantums[lv] > <span class="nr">0</span>) ? <span class="fn">min</span>(quantums[lv] - qused[p->pid], p->remaining) : p->remaining;
        p->remaining -= run; time += run; qused[p->pid] += run;
        <span class="kw">if</span> (p->remaining == <span class="nr">0</span>) { <span class="fn">finish</span>(p, time); completed++; qused[p->pid] = <span class="nr">0</span>; }
        <span class="kw">else if</span> (quantums[lv] > <span class="nr">0</span> && qused[p->pid] >= quantums[lv]) {
            qused[p->pid] = <span class="nr">0</span>;
            <span class="fn">enqueue</span>(queues[lv], p); <span class="cm">/* vuelve a su misma cola */</span>
        } <span class="kw">else</span> { <span class="fn">enqueue</span>(queues[lv], p); }
    }
}`,

  mlfq: `<span class="cm">/* MLFQ — Multi-Level Feedback Queue (degradación) */</span>
<span class="ty">#define</span> LEVELS   <span class="nr">3</span>
<span class="ty">int</span> quantums[LEVELS] = {<span class="nr">4</span>, <span class="nr">8</span>, <span class="nr">0</span>}; <span class="cm">/* 0 = FCFS */</span>

<span class="ty">void</span> <span class="fn">mlfq</span>(Process procs[], <span class="ty">int</span> n) {
    Queue queues[LEVELS];   <span class="cm">/* una cola por nivel */</span>
    <span class="ty">int</span>   qlevel[<span class="nr">64</span>] = {<span class="nr">0</span>}; <span class="cm">/* nivel actual de cada proceso */</span>
    <span class="ty">int</span>   qused [<span class="nr">64</span>] = {<span class="nr">0</span>}; <span class="cm">/* ticks usados en nivel actual */</span>
    <span class="ty">int</span> time = <span class="nr">0</span>, completed = <span class="nr">0</span>;
    <span class="kw">while</span> (completed < n) {
        <span class="fn">check_arrivals</span>(procs, n, time, queues[<span class="nr">0</span>]); <span class="cm">/* nuevos → Q0 */</span>
        Process *p = <span class="fn">dequeue_highest</span>(queues, LEVELS);
        <span class="kw">if</span> (!p) { time++; <span class="kw">continue</span>; }
        <span class="ty">int</span> lv = qlevel[p->pid];
        <span class="ty">int</span> run = (quantums[lv] > <span class="nr">0</span>) ? <span class="fn">min</span>(quantums[lv], p->remaining) : p->remaining;
        p->remaining -= run; time += run; qused[p->pid] += run;
        <span class="kw">if</span> (p->remaining == <span class="nr">0</span>) { <span class="fn">finish</span>(p, time); completed++; }
        <span class="kw">else if</span> (quantums[lv] > <span class="nr">0</span> && qused[p->pid] >= quantums[lv]) {
            qlevel[p->pid] = <span class="fn">min</span>(lv + <span class="nr">1</span>, LEVELS - <span class="nr">1</span>); <span class="cm">/* degradar */</span>
            qused[p->pid] = <span class="nr">0</span>;
            <span class="fn">enqueue</span>(queues[qlevel[p->pid]], p);
        } <span class="kw">else</span> { <span class="fn">enqueue</span>(queues[lv], p); }
    }
}`,

  mlfq: `<span class="cm">/* MLFQ — Multi-Level Feedback Queue con aging (anti-starvation) */</span>
<span class="ty">#define</span> AGING_THRESHOLD <span class="nr">16</span> <span class="cm">/* ticks de espera antes de promover */</span>

<span class="ty">void</span> <span class="fn">mlfq_aging</span>(Process procs[], <span class="ty">int</span> n) {
    Queue queues[LEVELS];
    <span class="ty">int</span> qlevel[<span class="nr">64</span>] = {<span class="nr">0</span>}, qwait[<span class="nr">64</span>] = {<span class="nr">0</span>};
    <span class="ty">int</span> time = <span class="nr">0</span>, completed = <span class="nr">0</span>;
    <span class="kw">while</span> (completed < n) {
        <span class="fn">check_arrivals</span>(procs, n, time, queues[<span class="nr">0</span>]);
        <span class="cm">/* Aging: promover procesos que esperan demasiado */</span>
        <span class="kw">for</span> (<span class="ty">int</span> lv = <span class="nr">1</span>; lv < LEVELS; lv++) {
            <span class="kw">for each</span> p <span class="kw">in</span> queues[lv] {
                qwait[p->pid]++;
                <span class="kw">if</span> (qwait[p->pid] >= AGING_THRESHOLD) {
                    qlevel[p->pid] = lv - <span class="nr">1</span>;  <span class="cm">/* promover */</span>
                    qwait[p->pid] = <span class="nr">0</span>;
                    <span class="fn">move_to_queue</span>(p, queues[lv], queues[lv-<span class="nr">1</span>]);
                }
            }
        }
        Process *p = <span class="fn">dequeue_highest</span>(queues, LEVELS);
        <span class="kw">if</span> (!p) { time++; <span class="kw">continue</span>; }
        <span class="fn">execute_quantum</span>(p, quantums[qlevel[p->pid]], time, queues);
        <span class="kw">if</span> (p->remaining == <span class="nr">0</span>) { <span class="fn">finish</span>(p, time); completed++; }
    }
}`
};
