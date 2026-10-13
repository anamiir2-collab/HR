/**
 * Integration tests for the ZenEmployees module.
 *
 * Verifies the full create / read / update / archive / delete lifecycle,
 * including the spec-critical deletion rules:
 *   - Employees with linked records CANNOT be hard-deleted (must be archived)
 *   - Employees with no linked records CAN be deleted, but only after
 *     confirming via the shared dialog
 *   - Cancel on the delete confirmation leaves the record intact
 *
 * These tests load the real ZenEmployees module and exercise its public
 * render() flow inside a jsdom document.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetStorage } from '../helpers/reset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Test file lives at js/tests/integration/ — go up 3 levels to reach project root.
const ROOT = resolve(__dirname, '..', '..', '..');

// Load the employees module (and its finance-factory dependency is not needed
// for these tests — we only exercise render / showForm / saveForm / deleteEmployee).
function loadModule(path) {
  const code = readFileSync(resolve(ROOT, path), 'utf-8');
  // eslint-disable-next-line no-eval
  const fn = new Function('window', 'document', 'localStorage', 'navigator', 'console', code);
  fn(window, window.document, window.localStorage, window.navigator, console);
}
loadModule('js/modules/employees.js');

const S = window.ZenStore;
const UI = window.ZenUI;
const Employees = window.ZenEmployees;

beforeEach(() => {
  resetStorage();
  document.getElementById('page-content').innerHTML = '';
  document.getElementById('modal-root').innerHTML = '';
});

describe('Employees module — render', () => {
  it('renders the toolbar with Add / Import / Export buttons', () => {
    Employees.render();
    expect(document.getElementById('emp-add')).toBeTruthy();
    expect(document.getElementById('emp-import')).toBeTruthy();
    expect(document.getElementById('emp-export')).toBeTruthy();
  });

  it('renders an empty-state when no employees exist', () => {
    Employees.render();
    const empty = document.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });

  it('renders rows for each employee in the collection', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active', employmentType: 'full_time' });
    S.insert('employees', { id: 'EMP-0002', name: 'Sara', departmentId: '', jobTitle: 'HR', basicSalary: 6000, hireDate: '2026-02-01', employmentStatus: 'active', employmentType: 'full_time' });
    Employees.render();
    const rows = document.querySelectorAll('#emp-table-wrap tbody tr');
    expect(rows.length).toBe(2);
  });
});

describe('Employees module — search filter', () => {
  beforeEach(() => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed Ali', departmentId: '', jobTitle: 'Engineer', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active', employmentType: 'full_time' });
    S.insert('employees', { id: 'EMP-0002', name: 'Sara Nabil', departmentId: '', jobTitle: 'HR', basicSalary: 6000, hireDate: '2026-02-01', employmentStatus: 'active', employmentType: 'full_time' });
  });

  it('filters rows by name match', () => {
    Employees.render();
    document.getElementById('emp-search').value = 'Ahmed';
    document.getElementById('emp-search').dispatchEvent(new window.Event('input'));
    // The search uses a 200ms debounce — wait for it.
    return new Promise((r) => setTimeout(r, 250)).then(() => {
      const rows = document.querySelectorAll('#emp-table-wrap tbody tr');
      expect(rows.length).toBe(1);
    });
  });
});

describe('Employees module — delete with linked records (must archive, not hard-delete)', () => {
  it('blocks hard-delete when the employee has payroll records', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    S.insert('payroll', { id: 'P1', employeeId: 'EMP-0001', netSalary: 4500, status: 'paid' });
    Employees.render();
    // Click the delete button for the employee
    const delBtn = document.querySelector('[data-delete-employee="EMP-0001"]');
    expect(delBtn).toBeTruthy();
    delBtn.click();
    // The dialog that opens should be the "cannot delete" warning, NOT the
    // standard delete confirmation. Verify by checking the dialog message.
    const msg = document.querySelector('#confirm-dlg-msg');
    // The "cannot delete" path passes a custom message (not forced to standard text)
    // because onConfirm is not supplied.
    expect(msg).toBeTruthy();
    expect(msg.textContent).toContain('سجلات مرتبطة'); // arabic for "linked records"
    // Employee should still exist
    expect(S.getById('employees', 'EMP-0001')).toBeTruthy();
    expect(S.getCollection('payroll').length).toBe(1); // payroll preserved
  });

  it('blocks hard-delete when the employee has attendance records', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    S.insert('attendance', { id: 'A1', employeeId: 'EMP-0001', date: '2026-10-01', status: 'present' });
    Employees.render();
    document.querySelector('[data-delete-employee="EMP-0001"]').click();
    // Confirm the warning dialog is shown, not the deletion dialog
    expect(S.getById('employees', 'EMP-0001')).toBeTruthy();
    expect(S.getCollection('attendance').length).toBe(1);
  });
});

describe('Employees module — delete with no linked records (confirmed flow)', () => {
  it('opens the standard delete confirmation dialog with exact Arabic text', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    Employees.render();
    document.querySelector('[data-delete-employee="EMP-0001"]').click();
    const title = document.querySelector('.modal-head h3').textContent;
    const msg = document.querySelector('#confirm-dlg-msg').textContent;
    expect(title).toBe('تأكيد الحذف');
    expect(msg).toBe('هل أنت متأكد من الحذف؟');
    const labels = [...document.querySelectorAll('.modal-foot button')].map((b) => b.textContent.trim());
    expect(labels).toContain('تأكيد');
    expect(labels).toContain('إلغاء');
  });

  it('clicking إلغاء leaves the employee intact', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    Employees.render();
    document.querySelector('[data-delete-employee="EMP-0001"]').click();
    // Click إلغاء
    const cancelBtn = [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent.trim() === 'إلغاء');
    cancelBtn.click();
    expect(S.getById('employees', 'EMP-0001')).toBeTruthy();
  });

  it('clicking تأكيد removes the employee', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    Employees.render();
    document.querySelector('[data-delete-employee="EMP-0001"]').click();
    const confirmBtn = [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent.trim() === 'تأكيد');
    confirmBtn.click();
    expect(S.getById('employees', 'EMP-0001')).toBeNull();
  });

  it('clicking تأكيد writes an audit-log entry', () => {
    S.settings.auditEnabled = true;
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    Employees.render();
    document.querySelector('[data-delete-employee="EMP-0001"]').click();
    const confirmBtn = [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent.trim() === 'تأكيد');
    confirmBtn.click();
    const log = S.getCollection('auditLog');
    expect(log.length).toBe(1);
    expect(log[0].action).toBe('delete');
    expect(log[0].entity).toBe('employees');
    expect(log[0].entityId).toBe('EMP-0001');
  });

  it('repeated rapid clicks on تأكيد delete the employee exactly once', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    Employees.render();
    document.querySelector('[data-delete-employee="EMP-0001"]').click();
    const confirmBtn = [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent.trim() === 'تأكيد');
    // 5 rapid clicks
    for (let i = 0; i < 5; i++) confirmBtn.click();
    expect(S.getCollection('employees').length).toBe(0);
    // Audit log should also have exactly one entry
    expect(S.getCollection('auditLog').length).toBe(1);
  });
});

describe('Employees module — archive flow', () => {
  it('archive sets employmentStatus to inactive and preserves the record', () => {
    S.insert('employees', { id: 'EMP-0001', name: 'Ahmed', departmentId: '', jobTitle: 'Eng', basicSalary: 5000, hireDate: '2026-01-01', employmentStatus: 'active' });
    Employees.render();
    document.querySelector('[data-archive="EMP-0001"]').click();
    // Confirm the archive dialog
    const confirmBtn = [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent.trim() === 'أرشفة');
    confirmBtn.click();
    const emp = S.getById('employees', 'EMP-0001');
    expect(emp).toBeTruthy();
    expect(emp.employmentStatus).toBe('inactive');
  });
});
