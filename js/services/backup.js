/* ============================================================
   ZenHR — Backup & Restore Service
   ============================================================ */
window.ZenBackup = (function () {
  'use strict';

  const U = window.ZenUtils;
  const S = window.ZenStore;

  function create() {
    const data = S.exportAll();
    data.exportedAt = new Date().toISOString();
    data.appVersion = '1.0.0';
    const filename = 'zenhr-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    U.download(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
    S.settings.lastBackup = new Date().toISOString();
    S.saveSettings();
    return filename;
  }

  function restore(file, mode) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('No file provided')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          validate(data);
          S.importAll(data, mode);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function validate(data) {
    if (!data || typeof data !== 'object') throw new Error('ملف غير صالح: ليس JSON صحيح');
    if (!data.schemaVersion) throw new Error('ملف غير صالح: لا يوجد إصدار schema');
    if (data.schemaVersion > S.SCHEMA_VERSION) {
      throw new Error('إصدار الملف (' + data.schemaVersion + ') أحدث من المدعوم (' + S.SCHEMA_VERSION + ')');
    }
    // Light validation: ensure no missing critical fields in employee records
    if (Array.isArray(data.employees)) {
      data.employees.forEach((emp, i) => {
        if (!emp.id) throw new Error('موظف رقم ' + (i + 1) + ' لا يحتوي على ID');
        if (!emp.name) throw new Error('الموظف ' + emp.id + ' لا يحتوي على اسم');
      });
    }
    return true;
  }

  function stats() {
    return S.storageInfo();
  }

  return { create, restore, validate, stats };
})();
