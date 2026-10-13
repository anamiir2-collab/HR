/* ============================================================
   ZenHR — Storage Layer (localStorage with versioning)
   ============================================================ */
window.ZenStore = (function () {
  'use strict';

  const SCHEMA_VERSION = 3;
  const PREFIX = 'agrimasters:';
  const LEGACY_PREFIX = 'zenhr:';
  const SETTINGS_KEY = PREFIX + 'settings';
  const META_KEY = PREFIX + 'meta';

  // Collections registry — extended for AGRIMASTERS HR
  const COLLECTIONS = [
    // Core HR
    'employees', 'departments', 'shifts', 'shiftPlans', 'assignmentOrders', 'attendance', 'leaves',
    'payroll', 'allowances', 'rewards', 'penalties', 'deductions',
    'insurance', 'loans', 'contracts', 'performance', 'vacancies',
    'candidates',
    // AGRIMASTERS HR v2 new modules
    'fingerprints',         // raw fingerprint punches (import staging)
    'fingerprintImports',   // import history / batches
    'disciplinary',         // disciplinary actions & investigations
    'offboarding',          // resignations, terminations, exit interviews
    'documents',            // employee document management (IDs, certs, etc.)
    'auditLog',             // audit trail entries
    'notifications',        // persistent notification center
    'attendanceCorrections',// attendance correction requests
    // Organization structure
    'branches', 'sections', 'jobTitles', 'jobGrades',
    'costCenters', 'workLocations', 'employmentCategories',
    // Training
    'trainingCourses', 'trainingEnrollments',
  ];

  const DEFAULT_SETTINGS = {
    schemaVersion: SCHEMA_VERSION,
    companyName: 'أجريماسترز',
    companyNameEn: 'AGRIMASTERS',
    currency: 'EGP',
    language: 'ar',
    defaultShift: 'Morning',
    workingDays: [0, 1, 2, 3, 4], // Sun-Thu
    workStartTime: '08:00',
    workEndTime: '17:00',
    graceMinutes: 15,
    breakMinutes: 60,
    overtimeRate: 1.5,
    monthlyWorkingHours: 208,
    leaveAnnualBalance: 21,
    leaveSickBalance: 30,
    insuranceEmployeeRate: 11,   // configurable placeholder — verify with accountant
    insuranceEmployerRate: 18,   // configurable placeholder — verify with accountant
    insuranceSocialCap: 12400,   // configurable placeholder — verify with accountant
    taxBrackets: [
      { upTo: 30000, rate: 0 },
      { upTo: 45000, rate: 0.10 },
      { upTo: 60000, rate: 0.15 },
      { upTo: 200000, rate: 0.20 },
      { upTo: 400000, rate: 0.225 },
      { upTo: Infinity, rate: 0.25 },
    ],
    taxPersonalExemption: 9000, // configurable — verify with accountant
    accessPassword: 'admin',
    notificationsEnabled: true,
    demoInitialized: false,
    lastBackup: null,
    // Audit trail toggle
    auditEnabled: true,
    // Fingerprint device adapter (informational only — no real connectivity claimed)
    fingerprintDevice: { vendor: '', model: '', adapter: 'csv', lastConnected: null },
    // Financial rounding (OFF by default; enabled items round to the nearest 5 EGP)
    financialRounding: {
      enabled: false,
      increment: 5,
      scope: 'individual',        // 'individual' | 'total' | 'both'
      deductionsPolicy: 'down',   // 'down' | 'up' | 'none' (legacy policy; item rounding uses nearest-five)
      applyTo: {
        basicSalary: true,
        allowances: true,
        bonuses: true,
        incentives: true,
        overtime: true,
        otherEarnings: true,
        deductions: true,
        penalties: true,
        advances: true,
        insurance: false,
      },
    },
  };

  let settings = null;
  let meta = null;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
      } else {
        settings = Object.assign({}, DEFAULT_SETTINGS);
      }
    } catch (e) {
      settings = Object.assign({}, DEFAULT_SETTINGS);
    }
    return settings;
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      meta = raw ? JSON.parse(raw) : { initialized: false, createdAt: new Date().toISOString() };
    } catch (e) {
      meta = { initialized: false, createdAt: new Date().toISOString() };
    }
    return meta;
  }

  function saveMeta() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      console.error('Failed to save meta:', e);
    }
  }

  function colKey(name) { return PREFIX + 'col:' + name; }

  function getCollection(name) {
    if (!COLLECTIONS.includes(name)) throw new Error('Unknown collection: ' + name);
    try {
      const raw = localStorage.getItem(colKey(name));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read collection', name, e);
      return [];
    }
  }

  function setCollection(name, items) {
    if (!COLLECTIONS.includes(name)) throw new Error('Unknown collection: ' + name);
    try {
      localStorage.setItem(colKey(name), JSON.stringify(items));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('Storage quota exceeded');
        if (window.ZenUI) ZenUI.toast('تعذّر الحفظ: مساحة التخزين ممتلئة', 'error');
      } else {
        console.error('Failed to save collection', name, e);
      }
      return false;
    }
  }

  function insert(name, item) {
    const items = getCollection(name);
    items.push(item);
    setCollection(name, items);
    return item;
  }

  function update(name, id, patch) {
    const items = getCollection(name);
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    items[idx] = Object.assign({}, items[idx], patch, { updatedAt: new Date().toISOString() });
    setCollection(name, items);
    return items[idx];
  }

  function remove(name, id) {
    const items = getCollection(name);
    const filtered = items.filter((x) => x.id !== id);
    setCollection(name, filtered);
    return filtered.length !== items.length;
  }

  function getById(name, id) {
    return getCollection(name).find((x) => x.id === id) || null;
  }

  function findBy(name, predicate) {
    return getCollection(name).filter(predicate);
  }

  function count(name) {
    return getCollection(name).length;
  }

  function clearCollection(name) {
    localStorage.removeItem(colKey(name));
  }

  function clearAllDemo() {
    COLLECTIONS.forEach((c) => {
      const items = getCollection(c);
      const filtered = items.filter((x) => !x.isDemo);
      setCollection(c, filtered);
    });
    settings.demoInitialized = false;
    saveSettings();
  }

  function clearAll() {
    COLLECTIONS.forEach((c) => localStorage.removeItem(colKey(c)));
    settings.demoInitialized = false;
    saveSettings();
  }

  function exportAll() {
    const data = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), settings: settings, meta: meta };
    COLLECTIONS.forEach((c) => { data[c] = getCollection(c); });
    return data;
  }

  function importAll(data, mode) {
    // mode: 'replace' | 'merge'
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
    if (data.schemaVersion > SCHEMA_VERSION) {
      throw new Error('Unsupported backup version: ' + data.schemaVersion);
    }
    mode = mode || 'replace';
    if (mode === 'replace') {
      COLLECTIONS.forEach((c) => {
        const incoming = Array.isArray(data[c]) ? data[c] : [];
        setCollection(c, incoming);
      });
      if (data.settings) {
        settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
        saveSettings();
      }
    } else {
      // merge: keep existing user records, add demo records from backup if missing
      COLLECTIONS.forEach((c) => {
        const existing = getCollection(c);
        const incoming = Array.isArray(data[c]) ? data[c] : [];
        const ids = new Set(existing.map((x) => x.id));
        incoming.forEach((item) => { if (!ids.has(item.id)) existing.push(item); });
        setCollection(c, existing);
      });
    }
    return true;
  }

  function storageInfo() {
    let total = 0;
    COLLECTIONS.forEach((c) => {
      const raw = localStorage.getItem(colKey(c));
      if (raw) total += raw.length;
    });
    return {
      collections: COLLECTIONS.map((c) => ({ name: c, count: count(c) })),
      totalBytes: total,
      approxMB: (total / (1024 * 1024)).toFixed(2),
      quota: navigator.storage && navigator.storage.estimate ? 'supported' : 'unknown',
    };
  }

  function init() {
    // Migrate legacy zenhr: data to agrimasters: prefix (one-time, idempotent)
    migrateLegacyPrefix();
    loadSettings();
    loadMeta();
    // Migration: if schema version differs, ensure no breakage
    if (settings.schemaVersion !== SCHEMA_VERSION) {
      // Light-touch migration: just bump version
      settings.schemaVersion = SCHEMA_VERSION;
      saveSettings();
    }
    if (!meta.initialized) {
      meta.initialized = true;
      meta.createdAt = meta.createdAt || new Date().toISOString();
      saveMeta();
    }
  }

  function migrateLegacyPrefix() {
    try {
      const legacySettings = localStorage.getItem(LEGACY_PREFIX + 'settings');
      const newSettings = localStorage.getItem(SETTINGS_KEY);
      if (legacySettings && !newSettings) {
        // Copy settings
        localStorage.setItem(SETTINGS_KEY, legacySettings);
        // Copy meta
        const legacyMeta = localStorage.getItem(LEGACY_PREFIX + 'meta');
        if (legacyMeta) localStorage.setItem(META_KEY, legacyMeta);
        // Copy all known collections (legacy list)
        const legacyCollections = [
          'employees', 'departments', 'shifts', 'attendance', 'leaves',
          'payroll', 'allowances', 'rewards', 'penalties', 'deductions',
          'insurance', 'loans', 'contracts', 'performance', 'vacancies', 'candidates'
        ];
        legacyCollections.forEach((c) => {
          const raw = localStorage.getItem(LEGACY_PREFIX + 'col:' + c);
          if (raw) localStorage.setItem(PREFIX + 'col:' + c, raw);
        });
        // Migrate language key
        const legacyLang = localStorage.getItem('zenhr:lang');
        if (legacyLang) localStorage.setItem('agrimasters:lang', legacyLang);
        console.info('[AGRIMASTERS HR] Migrated legacy zenhr: data to agrimasters: prefix.');
      }
    } catch (e) {
      console.warn('[AGRIMASTERS HR] Legacy migration skipped:', e);
    }
  }

  init();

  return {
    SCHEMA_VERSION,
    COLLECTIONS,
    PREFIX,
    settings,
    meta,
    saveSettings,
    getCollection,
    setCollection,
    insert,
    update,
    remove,
    getById,
    findBy,
    count,
    clearCollection,
    clearAllDemo,
    clearAll,
    exportAll,
    importAll,
    storageInfo,
  };
})();
