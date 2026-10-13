/**
 * Unit tests for ZenI18n — translation, language switching, RTL/LTR.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStorage } from '../helpers/reset.js';

const I18n = window.ZenI18n;

beforeEach(() => { resetStorage(); });

describe('ZenI18n — defaults', () => {
  it('defaults to Arabic', () => {
    expect(I18n.lang).toBe('ar');
  });

  it('sets documentElement.lang and dir to match', () => {
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });
});

describe('ZenI18n.t — translation lookup', () => {
  it('returns the Arabic string when lang=ar', () => {
    I18n.setLang('ar');
    expect(I18n.t('dashboard')).toBe('لوحة التحكم');
    expect(I18n.t('employees')).toBe('الموظفون');
    expect(I18n.t('common.save')).toBe('حفظ');
    expect(I18n.t('common.cancel')).toBe('إلغاء');
  });

  it('returns the English string when lang=en', () => {
    I18n.setLang('en');
    expect(I18n.t('dashboard')).toBe('Dashboard');
    expect(I18n.t('employees')).toBe('Employees');
    expect(I18n.t('common.save')).toBe('Save');
    expect(I18n.t('common.cancel')).toBe('Cancel');
  });

  it('falls back to the supplied fallback for unknown keys', () => {
    expect(I18n.t('unknown.key', 'Fallback')).toBe('Fallback');
  });

  it('returns the key itself when no fallback is supplied', () => {
    expect(I18n.t('unknown.key')).toBe('unknown.key');
  });

  it('never returns a raw key like "dashboard.welcome_ar" for known keys', () => {
    // This guards against the spec's anti-pattern of leaking i18n keys to users.
    I18n.setLang('ar');
    const known = ['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'settings', 'common.save', 'common.cancel'];
    known.forEach((k) => {
      const out = I18n.t(k);
      expect(out).not.toBe(k);
      expect(out.length).toBeGreaterThan(0);
    });
  });
});

describe('ZenI18n.setLang — switching', () => {
  it('toggles between ar and en', () => {
    I18n.setLang('ar');
    expect(I18n.lang).toBe('ar');
    I18n.setLang('en');
    expect(I18n.lang).toBe('en');
    I18n.toggle();
    expect(I18n.lang).toBe('ar');
    I18n.toggle();
    expect(I18n.lang).toBe('en');
  });

  it('persists the choice to localStorage', () => {
    I18n.setLang('en');
    expect(window.localStorage.getItem('agrimasters:lang')).toBe('en');
    I18n.setLang('ar');
    expect(window.localStorage.getItem('agrimasters:lang')).toBe('ar');
  });

  it('updates documentElement lang and dir on switch', () => {
    I18n.setLang('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    I18n.setLang('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('ignores invalid language codes', () => {
    I18n.setLang('ar');
    I18n.setLang('fr'); // ignored
    expect(I18n.lang).toBe('ar');
  });
});

describe('ZenI18n.apply — DOM data-i18n attributes', () => {
  it('replaces text content of [data-i18n] elements', () => {
    document.body.innerHTML = '<div id="x"><span data-i18n="common.save">placeholder</span></div>';
    I18n.setLang('ar');
    I18n.apply(document.getElementById('x'));
    expect(document.querySelector('[data-i18n="common.save"]').textContent).toBe('حفظ');
    I18n.setLang('en');
    I18n.apply(document.getElementById('x'));
    expect(document.querySelector('[data-i18n="common.save"]').textContent).toBe('Save');
  });

  it('applies to document when no root is given', () => {
    document.body.innerHTML = '<span data-i18n="dashboard">x</span>';
    I18n.setLang('ar');
    I18n.apply();
    expect(document.querySelector('[data-i18n="dashboard"]').textContent).toBe('لوحة التحكم');
  });
});
