/**
 * Vitest setup — loads the AGRIMASTERS HR source files into jsdom in the
 * exact order used by index.html. After this runs, every test has access
 * to the real `window.ZenUtils`, `window.ZenStore`, `window.ZenUI`,
 * `window.ZenAudit`, `window.ZenI18n`, etc. globals.
 *
 * This file is loaded once per worker via vitest's `setupFiles` config.
 * It does NOT export anything — test-specific helpers live in
 * `js/tests/helpers/reset.js`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Read a source file as text.
function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf-8');
}

// Execute a source file in the jsdom window context so its IIFE attaches
// to `window` exactly as it would in a browser.
function load(path) {
  const code = src(path);
  // eslint-disable-next-line no-eval
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'console', code);
  fn(window, window.document, window.localStorage, window.navigator, console);
}

// Load sources in dependency order (matches index.html script tags).
load('js/utils.js');
load('js/i18n.js');
load('js/storage.js');
load('js/services/rest-days.js');
load('js/auth.js');
load('js/ui.js');
load('js/router.js');
load('js/services/audit.js');
load('js/services/export.js');
load('js/services/rounding.js');
load('js/services/finance-rules.js');
load('js/services/backup.js');
load('js/services/xlsx-import.js');

// Expose globals to test files via globalThis.
globalThis.ZenUtils = window.ZenUtils;
globalThis.ZenStore = window.ZenStore;
globalThis.ZenUI = window.ZenUI;
globalThis.ZenI18n = window.ZenI18n;
globalThis.ZenAudit = window.ZenAudit;
globalThis.ZenAuth = window.ZenAuth;
globalThis.ZenRouter = window.ZenRouter;
globalThis.ZenExport = window.ZenExport;

// Stub window.alert / confirm so tests don't hang on native dialogs.
window.alert = vi.fn();
window.confirm = vi.fn(() => true);
window.print = vi.fn();

// Stub URL.createObjectURL for export tests.
URL.createObjectURL = vi.fn(() => 'blob:mock');
URL.revokeObjectURL = vi.fn();

// Provide the DOM roots that index.html normally provides.
function ensureRoot(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
}
['modal-root', 'toast-root', 'page-content', 'page-title', 'breadcrumb-title',
 'nav-list', 'sidebar', 'scrim', 'app', 'gate-view', 'notif-drawer', 'notif-scrim',
 'notif-list', 'notif-dot', 'notif-button', 'app-version', 'global-search',
 'company-name', 'company-avatar', 'user-name', 'user-avatar', 'top-avatar',
 'welcome-title', 'welcome-subtitle', 'welcome-actions', 'today-date',
 'lang-button', 'emp-search'].forEach(ensureRoot);
