/**
 * Unit tests for the ZenStore storage layer.
 * Covers CRUD, schema versioning, quota handling, import/export, and
 * the "unknown collection" safety guard.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetStorage } from '../helpers/reset.js';

const S = window.ZenStore;

beforeEach(() => { resetStorage(); });

describe('ZenStore — collection registry', () => {
  it('exposes a non-empty COLLECTIONS array', () => {
    expect(Array.isArray(S.COLLECTIONS)).toBe(true);
    expect(S.COLLECTIONS.length).toBeGreaterThan(20);
  });

  it('includes employees, payroll, attendance, auditLog', () => {
    ['employees', 'payroll', 'attendance', 'auditLog'].forEach((c) => {
      expect(S.COLLECTIONS).toContain(c);
    });
  });
});

describe('ZenStore — CRUD', () => {
  it('getCollection returns [] for an empty collection', () => {
    expect(S.getCollection('employees')).toEqual([]);
  });

  it('insert adds a record and getById retrieves it', () => {
    const emp = { id: 'EMP-0001', name: 'اختبار', basicSalary: 5000 };
    S.insert('employees', emp);
    expect(S.getById('employees', 'EMP-0001')).toEqual(emp);
    expect(S.count('employees')).toBe(1);
  });

  it('update patches an existing record and sets updatedAt', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'أصلي', basicSalary: 5000 });
    const updated = S.update('employees', 'EMP-0001', { basicSalary: 6000 });
    expect(updated.basicSalary).toBe(6000);
    expect(updated.name).toBe('أصلي'); // unchanged field preserved
    expect(updated.updatedAt).toBeTruthy();
  });

  it('update returns null for a missing id', () => {
    expect(S.update('employees', 'NOPE', { x: 1 })).toBeNull();
  });

  it('remove deletes a record and returns true', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'X' });
    expect(S.remove('employees', 'EMP-0001')).toBe(true);
    expect(S.getById('employees', 'EMP-0001')).toBeNull();
  });

  it('remove returns false when the id does not exist', () => {
    expect(S.remove('employees', 'MISSING')).toBe(false);
  });

  it('findBy filters records by predicate', () => {
    S.insert('employees', { id: 'A', dep: 'hr' });
    S.insert('employees', { id: 'B', dep: 'it' });
    S.insert('employees', { id: 'C', dep: 'hr' });
    const hr = S.findBy('employees', (e) => e.dep === 'hr');
    expect(hr.length).toBe(2);
    expect(hr.map((e) => e.id).sort()).toEqual(['A', 'C']);
  });
});

describe('ZenStore — safety guards', () => {
  it('throws on unknown collection name', () => {
    expect(() => S.getCollection('nonexistent')).toThrow(/Unknown collection/);
    expect(() => S.setCollection('nonexistent', [])).toThrow(/Unknown collection/);
    expect(() => S.insert('nonexistent', {})).toThrow(/Unknown collection/);
  });

  it('getCollection returns [] when localStorage contains invalid JSON', () => {
    window.localStorage.setItem('agrimasters:col:employees', '{not json');
    expect(S.getCollection('employees')).toEqual([]);
  });

  it('getCollection returns [] when localStorage contains a non-array', () => {
    window.localStorage.setItem('agrimasters:col:employees', '{"oops":true}');
    expect(S.getCollection('employees')).toEqual([]);
  });

  it('setCollection surfaces a toast on QuotaExceededError', () => {
    // jsdom's localStorage.setItem is a prototype method, so use
    // vi.spyOn (which patches the prototype) rather than reassigning.
    const quotaErr = new Error('quota');
    quotaErr.name = 'QuotaExceededError';
    quotaErr.code = 22;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaErr; });
    const toastSpy = vi.spyOn(window.ZenUI, 'toast').mockImplementation(() => {});
    expect(S.setCollection('employees', [{ id: 'X' }])).toBe(false);
    expect(toastSpy).toHaveBeenCalled();
    toastSpy.mockRestore();
    spy.mockRestore();
  });
});

describe('ZenStore — settings', () => {
  it('settings is loaded with defaults', () => {
    expect(S.settings).toBeTruthy();
    expect(S.settings.currency).toBe('EGP');
    expect(S.settings.language).toBe('ar');
    expect(S.settings.taxBrackets).toBeInstanceOf(Array);
    expect(S.settings.taxBrackets.length).toBeGreaterThan(0);
  });

  it('saveSettings persists to localStorage', () => {
    S.settings.companyName = 'شركة جديدة';
    expect(S.saveSettings()).toBe(true);
    const raw = JSON.parse(window.localStorage.getItem('agrimasters:settings'));
    expect(raw.companyName).toBe('شركة جديدة');
  });
});

describe('ZenStore — export / import', () => {
  it('exportAll returns an object with schemaVersion and all collections', () => {
    S.insert('employees', { id: 'E1', name: 'A' });
    S.insert('payroll', { id: 'P1', net: 1000 });
    const data = S.exportAll();
    expect(data.schemaVersion).toBe(S.SCHEMA_VERSION);
    expect(data.employees.length).toBe(1);
    expect(data.payroll.length).toBe(1);
    expect(data.settings).toBeTruthy();
  });

  it('importAll with mode=replace overwrites existing data', () => {
    S.insert('employees', { id: 'OLD', name: 'old' });
    const backup = {
      schemaVersion: S.SCHEMA_VERSION,
      settings: S.settings,
      meta: { initialized: true },
      employees: [{ id: 'NEW', name: 'new' }],
    };
    S.importAll(backup, 'replace');
    expect(S.getCollection('employees').length).toBe(1);
    expect(S.getById('employees', 'NEW')).toBeTruthy();
    expect(S.getById('employees', 'OLD')).toBeNull();
  });

  it('importAll with mode=merge keeps existing records and adds new ones', () => {
    S.insert('employees', { id: 'OLD', name: 'old' });
    const backup = {
      schemaVersion: S.SCHEMA_VERSION,
      settings: S.settings,
      meta: { initialized: true },
      employees: [{ id: 'NEW', name: 'new' }],
    };
    S.importAll(backup, 'merge');
    expect(S.getCollection('employees').length).toBe(2);
    expect(S.getById('employees', 'OLD')).toBeTruthy();
    expect(S.getById('employees', 'NEW')).toBeTruthy();
  });

  it('importAll rejects an unsupported schema version', () => {
    expect(() => S.importAll({ schemaVersion: 999 }, 'replace')).toThrow(/Unsupported backup version/);
  });

  it('importAll rejects invalid input', () => {
    expect(() => S.importAll(null, 'replace')).toThrow(/Invalid backup file/);
    expect(() => S.importAll('not an object', 'replace')).toThrow(/Invalid backup file/);
  });
});

describe('ZenStore — clearAllDemo', () => {
  it('removes only records where isDemo=true', () => {
    S.insert('employees', { id: 'REAL', name: 'real', isDemo: false });
    S.insert('employees', { id: 'DEMO', name: 'demo', isDemo: true });
    S.clearAllDemo();
    const remaining = S.getCollection('employees');
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('REAL');
  });
});

describe('ZenStore — storageInfo', () => {
  it('returns a shape with collection counts and total bytes', () => {
    S.insert('employees', { id: 'E1', name: 'A' });
    const info = S.storageInfo();
    expect(info).toHaveProperty('collections');
    expect(info).toHaveProperty('totalBytes');
    expect(info).toHaveProperty('approxMB');
    expect(typeof info.totalBytes).toBe('number');
    const emp = info.collections.find((c) => c.name === 'employees');
    expect(emp.count).toBe(1);
  });
});
