/* ============================================================
   ZenHR — Storage Layer (localStorage with versioning)
   ============================================================ */
window.ZenStore = (function () {
  'use strict';

  const SCHEMA_VERSION = 2;
  const PREFIX = 'zenhr:';
  const SETTINGS_KEY = PREFIX + 'settings';
  const META_KEY = PREFIX + 'meta';

  // Collections registry
  const COLLECTIONS = [
    'employees', 'departments', 'shifts', 'attendance', 'leaves',
    'payroll', 'allowances', 'rewards', 'penalties', 'deductions',
    'insurance', 'loans', 'contracts', 'performance', 'vacancies',
    'candidates'
  ];

  const DEFAULT_SETTINGS = {
    schemaVersion: SCHEMA_VERSION,
    companyName: 'شركة زين للتقنية',
    companyNameEn: 'ZenTech Company',
    currency: 'EGP',
    language: 'ar',
    defaultShift: 'Morning',
    workingDays: [0, 1, 2, 3, 4], // Sun-Thu
    workStartTime: '09:00',
    workEndTime: '17:00',
    graceMinutes: 15,
    breakMinutes: 60,
    overtimeRate: 1.5,
    monthlyWorkingHours: 192,
    leaveAnnualBalance: 21,
    leaveSickBalance: 30,
    insuranceEmployeeRate: 11,   // demo placeholder
    insuranceEmployerRate: 18,   // demo placeholder
    taxBrackets: [
      { upTo: 30000, rate: 0 },
      { upTo: 45000, rate: 0.10 },
      { upTo: 60000, rate: 0.15 },
      { upTo: 200000, rate: 0.20 },
      { upTo: 400000, rate: 0.225 },
      { upTo: Infinity, rate: 0.25 },
    ],
    accessPassword: 'admin',
    notificationsEnabled: true,
    demoInitialized: false,
    lastBackup: null,
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

  init();

  return {
    SCHEMA_VERSION,
    COLLECTIONS,
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
