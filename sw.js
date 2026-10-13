// AGRIMASTERS HR Service Worker
const CACHE_NAME = "agrimasters-hr-v2.0.0";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/utils.js",
  "./js/i18n.js",
  "./js/storage.js",
  "./js/auth.js",
  "./js/ui.js",
  "./js/router.js",
  "./js/demo-data.js",
  "./js/services/audit.js",
  "./js/services/export.js",
  "./js/services/backup.js",
  "./js/services/xlsx-import.js",
  "./js/modules/dashboard.js",
  "./js/modules/employees.js",
  "./js/modules/departments.js",
  "./js/modules/attendance.js",
  "./js/modules/fingerprint.js",
  "./js/modules/leaves.js",
  "./js/modules/shifts.js",
  "./js/modules/payroll.js",
  "./js/modules/rewards.js",
  "./js/modules/allowances.js",
  "./js/modules/penalties.js",
  "./js/modules/deductions.js",
  "./js/modules/insurance.js",
  "./js/modules/loans.js",
  "./js/modules/contracts.js",
  "./js/modules/documents.js",
  "./js/modules/disciplinary.js",
  "./js/modules/offboarding.js",
  "./js/modules/performance.js",
  "./js/modules/recruitment.js",
  "./js/modules/reports.js",
  "./js/modules/audit.js",
  "./js/modules/settings.js",
  "./js/app.js",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Skip cross-origin (e.g. SheetJS CDN) — let the network handle it
  if (url.origin !== location.origin) return;

  // Network-first for HTML, cache-first for static assets
  if (req.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
  } else {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }).catch(() => cached)
      )
    );
  }
});
