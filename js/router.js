/* ============================================================
   ZenHR — Hash-based Router & Navigation
   ============================================================ */
window.ZenRouter = (function () {
  'use strict';

  const routes = {};
  let current = null;

  function register(name, handler) {
    routes[name] = handler;
  }

  function go(name, params) {
    if (params && Object.keys(params).length) {
      const qs = new URLSearchParams(params).toString();
      window.location.hash = '#/' + name + '?' + qs;
    } else {
      window.location.hash = '#/' + name;
    }
  }

  function parse() {
    const h = window.location.hash.slice(1) || '/dashboard';
    const clean = h.startsWith('/') ? h.slice(1) : h;
    const [path, query] = clean.split('?');
    const params = {};
    if (query) {
      new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
    }
    return { name: path || 'dashboard', params };
  }

  function render() {
    const { name, params } = parse();
    if (!routes[name]) {
      // fallback to dashboard
      routes['dashboard'] && routes['dashboard'](params);
      return;
    }
    current = name;
    routes[name](params);

    // Update active nav
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === name);
    });

    // Update breadcrumb & title
    const titleEl = document.getElementById('page-title');
    const bcEl = document.getElementById('breadcrumb-title');
    const tkey = name;
    const label = (window.ZenI18n && ZenI18n.t(tkey, tkey)) || tkey;
    if (titleEl) titleEl.textContent = label;
    if (bcEl) bcEl.textContent = label;

    // close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('scrim')?.classList.remove('visible');

    // Scroll content to top
    document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    window.addEventListener('hashchange', render);
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    } else {
      render();
    }
  }

  function start() {
    init();
  }

  return { register, go, parse, render, start, get current() { return current; } };
})();
