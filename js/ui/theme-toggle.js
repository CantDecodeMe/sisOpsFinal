/* ============================================================
   theme-toggle.js
   Switch dark/light con persistencia en localStorage.
   Expone: window.SCHED.themeToggle.init()
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'sched_sim_theme';
  const root = document.documentElement;

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function getCurrent() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function toggle() {
    const next = getCurrent() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    updateButtonLabel();
  }

  function updateButtonLabel() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const cur = getCurrent();
    btn.textContent = cur === 'dark' ? '[ ◐ LIGHT ]' : '[ ◑ DARK ]';
    btn.title = `Cambiar a modo ${cur === 'dark' ? 'claro' : 'oscuro'}`;
  }

  function init() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    applyTheme(stored === 'light' ? 'light' : 'dark');

    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', toggle);
      updateButtonLabel();
    }
  }

  // Cursor tracker (solo afecta al cursor custom en dark mode)
  document.addEventListener('mousemove', (e) => {
    document.body.style.setProperty('--cx', e.clientX + 'px');
    document.body.style.setProperty('--cy', e.clientY + 'px');
  });

  // Reloj de la titlebar (si existe el elemento)
  function updateClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const now = new Date();
    el.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join(':');
  }
  setInterval(updateClock, 1000);

  // Auto-init cuando DOM está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); updateClock(); });
  } else {
    init(); updateClock();
  }

  window.SCHED = window.SCHED || {};
  window.SCHED.themeToggle = { init, toggle, applyTheme, getCurrent };
})();
