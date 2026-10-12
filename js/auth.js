/* ============================================================
   ZenHR — Manager/HR Access Gate (local-only, not real security)
   ============================================================ */
window.ZenAuth = (function () {
  'use strict';

  const SESSION_KEY = 'zenhr:session';
  const SESSION_TTL = 1000 * 60 * 60 * 8; // 8 hours

  function login(password) {
    const pwd = (window.ZenStore && ZenStore.settings && ZenStore.settings.accessPassword) || 'admin';
    if (password === pwd) {
      const session = { ts: Date.now(), user: 'admin', name: 'أمير أنور', nameEn: 'Amir Anwar' };
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
      const s = JSON.parse(raw);
      if (!s || !s.ts) return false;
      if (Date.now() - s.ts > SESSION_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      return true;
    } catch (e) { return false; }
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
