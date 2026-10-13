/* ============================================================
   ZenHR — Attendance Module
   ============================================================ */
window.ZenAttendance = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', depFilter: '', statusFilter: '', dateFrom: '', dateTo: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const employees = S.getCollection('employees');
    const departments = S.getCollection('departments');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="att-search" placeholder="${lang === 'ar' ? 'ابحث بالاسم أو الرقم...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field"><input type="date" id="att-from" value="${state.dateFrom}"></label>
        <label class="field"><input type="date" id="att-to" value="${state.dateTo}"></label>
        <label class="field">
          <select id="att-dep-filter">
            <option value="">${lang === 'ar' ? 'كل الأقسام' : 'All departments'}</option>
            ${departments.map((d) => `<option value="${d.id}" ${state.depFilter === d.id ? 'selected' : ''}>${U.esc(lang === 'ar' ? d.name : d.nameEn)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="att-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${['present', 'late', 'absent', 'excused', 'remote', 'rest'].map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${s === 'rest' ? (lang === 'ar' ? 'راحة شهرية' : 'Monthly rest') : ZenI18n.t('status.' + s)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="att-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="att-add">${lang === 'ar' ? 'تسجيل حضور' : 'Add Record'}</button>
        </div>
      </div>
      <div id="att-summary" class="stat-grid mb-16"></div>
      <div id="att-table-wrap"></div>
      <div id="att-pagination"></div>
    `;

    document.getElementById('att-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('att-from').onchange = (e) => { state.dateFrom = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('att-to').onchange = (e) => { state.dateTo = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('att-dep-filter').onchange = (e) => { state.depFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('att-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('att-add').onclick = () => showForm();
    document.getElementById('att-export').onclick = () => exportData();

    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection('attendance');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (state.dateFrom) rows = rows.filter((a) => a.date >= state.dateFrom);
    if (state.dateTo) rows = rows.filter((a) => a.date <= state.dateTo);
    if (state.statusFilter) rows = rows.filter((a) => a.status === state.statusFilter);
    if (state.depFilter) rows = rows.filter((a) => { const e = empMap[a.employeeId]; return e && e.departmentId === state.depFilter; });
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((a) => {
        const e = empMap[a.employeeId];
        if (!e) return false;
        return e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('att-table-wrap');
    const pageWrap = document.getElementById('att-pagination');
    const summary = document.getElementById('att-summary');
    if (!wrap) return;

    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const present = filtered.filter((a) => a.status === 'present').length;
      const late = filtered.filter((a) => a.status === 'late').length;
      const absent = filtered.filter((a) => a.status === 'absent').length;
      const remote = filtered.filter((a) => a.status === 'remote').length;
      const overtime = filtered.reduce((s, a) => s + (a.overtimeMinutes || 0), 0);
      summary.innerHTML = `
        ${miniStat('✓', 'success', ZenI18n.t('status.present'), present)}
        ${miniStat('◷', 'warning', ZenI18n.t('status.late'), late)}
        ${miniStat('✕', 'danger', ZenI18n.t('status.absent'), absent)}
        ${miniStat('☁', 'info', ZenI18n.t('status.remote'), remote)}
        ${miniStat('+', 'brand', lang === 'ar' ? 'ساعات إضافية' : 'Overtime (h)', Math.round(overtime / 60))}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (a) => { const e = empMap[a.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), a.employeeId) : U.esc(a.employeeId); } },
        { label: ZenI18n.t('common.date'), render: (a) => U.date(a.date) },
        { label: lang === 'ar' ? 'دخول' : 'Check In', render: (a) => a.checkIn || '—' },
        { label: lang === 'ar' ? 'خروج' : 'Check Out', render: (a) => a.checkOut || '—' },
        { label: lang === 'ar' ? 'ساعات العمل' : 'Work Hrs', render: (a) => a.workMinutes ? (a.workMinutes / 60).toFixed(1) : '—' },
        { label: lang === 'ar' ? 'إضافي' : 'Overtime', render: (a) => a.overtimeMinutes ? a.overtimeMinutes + 'm' : '—' },
        { label: lang === 'ar' ? 'تأخير' : 'Late', render: (a) => a.lateMinutes ? a.lateMinutes + 'm' : '—' },
        { label: ZenI18n.t('common.status'), render: (a) => a.status === 'rest' ? '<span class="badge success">' + (lang === 'ar' ? 'راحة شهرية' : 'Monthly rest') + '</span>' : UI.statusBadge(a.status) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (a) => `<div class="row-actions">
          <button class="btn sm ghost" data-edit="${a.id}">✎</button>
          <button class="btn sm ghost" data-del="${a.id}">🗑</button>
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value">${U.num(value)}</div></div>`;
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('attendance', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    const body = `
      <form id="att-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name + ' (' + e.jobTitle + ')' }))] })}
        ${UI.formField({ label: ZenI18n.t('common.date'), name: 'date', type: 'date', value: rec?.date || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'وقت الدخول' : 'Check In', name: 'checkIn', type: 'time', value: rec?.checkIn || '09:00' })}
        ${UI.formField({ label: lang === 'ar' ? 'وقت الخروج' : 'Check Out', name: 'checkOut', type: 'time', value: rec?.checkOut || '17:00' })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: rec?.status || 'present', options: ['present', 'late', 'absent', 'excused', 'remote', 'rest'].map((s) => ({ value: s, label: s === 'rest' ? (lang === 'ar' ? 'راحة شهرية' : 'Monthly rest') : ZenI18n.t('status.' + s) })) })}
        ${UI.formField({ label: lang === 'ar' ? 'ملاحظات' : 'Notes', name: 'notes', type: 'textarea', value: rec?.notes })}
      </form>
    `;
    const m = UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل سجل حضور' : 'Edit Attendance') : (lang === 'ar' ? 'تسجيل حضور' : 'Add Attendance'),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#att-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          if (data.status === 'rest') {
            const month = String(data.date || '').slice(0, 7);
            const emp = S.getById('employees', data.employeeId);
            const quota = window.ZenRestDays ? ZenRestDays.quota(emp) : 4;
            const used = window.ZenRestDays ? ZenRestDays.used(data.employeeId, month, id) : 0;
            const duplicateDate = S.findBy('attendance', r => r.employeeId === data.employeeId && r.date === data.date && r.status === 'rest' && r.id !== id).length > 0;
            if (!duplicateDate && used >= quota) {
              window.alert(lang === 'ar' ? 'تم استنفاد رصيد أيام الراحة لهذا الشهر.' : 'The monthly rest-day allowance has been exhausted.');
              return;
            }
            data.checkIn = '';
            data.checkOut = '';
            data.notes = data.notes || (lang === 'ar' ? 'يوم راحة شهرية مرن' : 'Flexible monthly rest day');
          }
          // Validate check-in/out
          if (data.checkIn && data.checkOut && data.checkOut < data.checkIn) {
            // Allow if overnight but warn
            UI.toast(lang === 'ar' ? 'تنبيه: وقت الخروج قبل الدخول (وردية ليلية؟)' : 'Note: checkout before checkin (overnight?)', 'warning');
          }
          const shift = S.getCollection('shifts').find((s) => s.id === S.getById('employees', data.employeeId)?.shiftId);
          let workMin = 0, lateMin = 0;
          if (data.status !== 'rest' && data.checkIn && data.checkOut) {
            workMin = U.diffMinutes(data.checkIn, data.checkOut) - (shift?.breakMinutes || 60);
            const startMin = shift ? U.timeToMinutes(shift.startTime) : 540;
            const checkInMin = U.timeToMinutes(data.checkIn);
            lateMin = Math.max(0, checkInMin - startMin - (shift?.graceMinutes || 15));
            if (lateMin > 0 && data.status === 'present') data.status = 'late';
          }
          const newId = rec?.id || 'att-' + Date.now().toString(36);
          if (id) {
            S.update('attendance', id, { ...data, workMinutes: workMin, lateMinutes: lateMin });
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            S.insert('attendance', { id: newId, ...data, workMinutes: workMin, lateMinutes: lateMin, overtimeMinutes: 0, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); renderTable();
        } }
      ]
    });
  }

  function del(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف سجل الحضور؟' : 'Delete attendance record?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('attendance', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); renderTable(); }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (a) => a.id },
      { label: ZenI18n.t('common.employee'), value: (a) => { const e = empMap[a.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : a.employeeId; } },
      { label: ZenI18n.t('common.date'), value: (a) => a.date },
      { label: lang === 'ar' ? 'دخول' : 'Check In', value: (a) => a.checkIn || '' },
      { label: lang === 'ar' ? 'خروج' : 'Check Out', value: (a) => a.checkOut || '' },
      { label: ZenI18n.t('common.status'), value: (a) => ZenI18n.t('status.' + a.status) },
      { label: lang === 'ar' ? 'دقائق متأخرة' : 'Late (min)', value: (a) => a.lateMinutes || 0 },
      { label: lang === 'ar' ? 'ساعات عمل' : 'Work (hrs)', value: (a) => a.workMinutes ? (a.workMinutes / 60).toFixed(1) : 0 },
    ], 'zenhr-attendance.xls', 'Attendance');
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
