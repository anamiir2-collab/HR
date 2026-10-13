/* AGRIMASTERS HR — Monthly flexible rest-day balance */
window.ZenRestDays = (function () {
  'use strict';
  const S = window.ZenStore;
  function monthOf(value) { return String(value || '').slice(0, 7); }
  function quota(employee) {
    const raw = employee && employee.monthlyRestQuota;
    return raw === undefined || raw === null || raw === '' ? 4 : Math.max(0, Math.floor(Number(raw) || 0));
  }
  function dates(employeeId, month, excludeId) {
    const seen = new Set();
    S.findBy('attendance', r => r.employeeId === employeeId && r.status === 'rest' && monthOf(r.date) === month && r.id !== excludeId)
      .forEach(r => { if (r.date) seen.add(r.date); });
    return seen;
  }
  function used(employeeId, month, excludeId) { return dates(employeeId, month, excludeId).size; }
  function remaining(employeeId, month, excludeId) {
    const emp = S.getById('employees', employeeId);
    return Math.max(0, quota(emp) - used(employeeId, month, excludeId));
  }
  function isRestDate(employeeId, date) {
    return S.findBy('attendance', r => r.employeeId === employeeId && r.status === 'rest' && r.date === date).length > 0;
  }
  return { monthOf, quota, used, remaining, isRestDate };
})();
