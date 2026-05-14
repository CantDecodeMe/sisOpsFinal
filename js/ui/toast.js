'use strict';
window.SCHED = window.SCHED || {};
window.SCHED.toast = (function () {
  var MAX = 4;

  function show(msg, type) {
    var c = document.getElementById('toast-container');
    if (!c) { console.warn('[toast]', type, msg); return; }
    var items = c.querySelectorAll('.toast-item');
    if (items.length >= MAX) items[0].remove();

    var el = document.createElement('div');
    el.className = 'toast-item toast-' + (type || 'info');
    el.innerHTML = '<span class="toast-msg">' + msg + '</span>' +
      '<button class="toast-close" onclick="this.parentElement.remove()">×</button>';
    c.appendChild(el);

    setTimeout(function () {
      el.classList.add('toast-fade');
      setTimeout(function () { if (el.parentElement) el.remove(); }, 400);
    }, 4000);
  }

  return { show: show };
})();
