/**
 * Test helper: wipe localStorage + DOM roots and re-init ZenStore defaults.
 *
 * The full DEFAULT_SETTINGS mirror js/storage.js so tests that read
 * settings.taxBrackets / shiftRules / etc. see a complete object.
 */
import { beforeEach } from 'vitest';

const FULL_DEFAULTS = {
  schemaVersion: 3,
  companyName: 'أجريماسترز',
  companyNameEn: 'AGRIMASTERS',
  currency: 'EGP',
  language: 'ar',
  defaultShift: 'Morning',
  payrollCycle: { startDay: 26, endDay: 25 },
  shiftRules: { dayCount: 3, nightCount: 3, offCount: 3, weeklyRestDays: [5], requireAssignmentOnRestDay: true },
  workingDays: [0, 1, 2, 3, 4],
  workStartTime: '08:00',
  workEndTime: '17:00',
  graceMinutes: 15,
  breakMinutes: 60,
  overtimeRate: 1.5,
  monthlyWorkingHours: 208,
  leaveAnnualBalance: 21,
  leaveSickBalance: 30,
  insuranceEmployeeRate: 11,
  insuranceEmployerRate: 18,
  insuranceSocialCap: 12400,
  taxBrackets: [
    { upTo: 30000, rate: 0 },
    { upTo: 45000, rate: 0.10 },
    { upTo: 60000, rate: 0.15 },
    { upTo: 200000, rate: 0.20 },
    { upTo: 400000, rate: 0.225 },
    { upTo: Infinity, rate: 0.25 },
  ],
  taxPersonalExemption: 9000,
  accessPassword: 'admin',
  notificationsEnabled: true,
  demoInitialized: false,
  lastBackup: null,
  auditEnabled: true,
  fingerprintDevice: { vendor: '', model: '', adapter: 'csv', lastConnected: null },
  financialRounding: { enabled: false, increment: 5, scope: 'individual', deductionsPolicy: 'down', applyTo: {} },
};

export function resetStorage() {
  window.localStorage.clear();
  if (window.ZenStore) {
    window.localStorage.setItem('agrimasters:settings', JSON.stringify(FULL_DEFAULTS));
    window.localStorage.setItem('agrimasters:meta', JSON.stringify({ initialized: true, createdAt: new Date().toISOString() }));
    Object.keys(window.ZenStore.settings).forEach((k) => { delete window.ZenStore.settings[k]; });
    Object.assign(window.ZenStore.settings, FULL_DEFAULTS);
  }
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
  const toastRoot = document.getElementById('toast-root');
  if (toastRoot) toastRoot.innerHTML = '';
  const pageContent = document.getElementById('page-content');
  if (pageContent) pageContent.innerHTML = '';
}

/** Default beforeEach for any test file that touches storage or the DOM. */
export function autoReset() {
  beforeEach(() => { resetStorage(); });
}
