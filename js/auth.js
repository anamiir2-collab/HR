/* ============================================================
   ZenHR — Manager/HR Access Gate (local-only, not real security)
   ============================================================ */
window.ZenAuth = (function () {
  'use strict';

  const SESSION_KEY = 'agrimasters:session';
  const SESSION_TTL = 1000 * 60 * 60 * 8; // 8 hours

  function login(password) {
    const pwd = (window.ZenStore && ZenStore.settings && ZenStore.settings.accessPassword) || 'admin';
    if (password === pwd) {
      const session = { ts: Date.now(), user: 'admin', name: 'مدير الموارد البشرية', nameEn: 'HR Manager', role: 'admin' };
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isAuthed() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;

      const session = JSON.parse(raw);
      const timestamp = session && Number(session.ts);
      if (!session || !Number.isFinite(timestamp) || timestamp <= 0) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }

      const age = Date.now() - timestamp;
      if (age < 0 || age >= SESSION_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      return true;
    } catch (e) {
      // If session storage is unavailable or the saved value is invalid,
      // fail closed and show the access gate.
      return false;
    }
  }

  function currentUser() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  return { login, logout, isAuthed, currentUser };
})();
