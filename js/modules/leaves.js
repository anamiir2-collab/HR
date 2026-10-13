/* ============================================================
   ZenHR — Leaves Module
   ============================================================ */
window.ZenLeaves = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', statusFilter: '', typeFilter: '', highlightId: null };

  function render(params) {
    if (params && params.id) state.highlightId = params.id;
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const pending = S.findBy('leaves', (l) => l.status === 'pending');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="lv-search" placeholder="${lang === 'ar' ? 'ابحث بالاسم أو الرقم...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="lv-type-filter">
            <option value="">${lang === 'ar' ? 'كل الأنواع' : 'All types'}</option>
            ${['annual', 'sick', 'emergency', 'unpaid', 'other'].map((t) => `<option value="${t}" ${state.typeFilter === t ? 'selected' : ''}>${ZenI18n.t('leave.' + t)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="lv-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${['pending', 'approved', 'rejected', 'cancelled'].map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${ZenI18n.t('status.' + s)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="lv-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="lv-add">${lang === 'ar' ? 'طلب إجازة' : 'New Leave'}</button>
        </div>
      </div>
      <div class="stat-grid mb-16">
        ${miniStat('◷', 'warning', ZenI18n.t('status.pending'), pending.length)}
        ${miniStat('✓', 'success', ZenI18n.t('status.approved'), S.findBy('leaves', (l) => l.status === 'approved').length)}
        ${miniStat('✕', 'danger', ZenI18n.t('status.rejected'), S.findBy('leaves', (l) => l.status === 'rejected').length)}
        ${miniStat('▢', 'info', lang === 'ar' ? 'إجمالي الأيام' : 'Total Days', S.getCollection('leaves').reduce((s, l) => s + l.days, 0))}
      </div>
      <div id="lv-table-wrap"></div>
      <div id="lv-pagination"></div>
    `;

    document.getElementById('lv-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('lv-type-filter').onchange = (e) => { state.typeFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('lv-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('lv-add').onclick = () => showForm();
    document.getElementById('lv-export').onclick = () => exportData();

    renderTable();
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value">${U.num(value)}</div></div>`;
  }

  function getFiltered() {
    let rows = S.getCollection('leaves');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.statusFilter) rows = rows.filter((l) => l.status === state.statusFilter);
    if (state.typeFilter) rows = rows.filter((l) => l.type === state.typeFilter);
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((l) => {
        const e = empMap[l.employeeId];
        return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
      });
    }
    rows.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('lv-table-wrap');
    const pageWrap = document.getElementById('lv-pagination');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (l) => { const e = empMap[l.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), l.employeeId) : U.esc(l.employeeId); } },
        { label: ZenI18n.t('common.type'), render: (l) => ZenI18n.t('leave.' + l.type) },
        { label: ZenI18n.t('leave.startDate'), render: (l) => U.date(l.startDate) },
        { label: ZenI18n.t('leave.endDate'), render: (l) => U.date(l.endDate) },
        { label: ZenI18n.t('leave.days'), render: (l) => l.days },
        { label: ZenI18n.t('leave.requestDate'), render: (l) => U.date(l.requestDate) },
        { label: ZenI18n.t('common.status'), render: (l) => UI.statusBadge(l.status) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (l) => `<div class="row-actions">
          ${l.status === 'pending' ? `<button class="btn sm ghost" data-approve="${l.id}" title="${ZenI18n.t('status.approved')}">✓</button><button class="btn sm ghost" data-reject="${l.id}" title="${ZenI18n.t('status.rejected')}">✕</button>` : ''}
          <button class="btn sm ghost" data-view="${l.id}">👁</button>
          <button class="btn sm ghost" data-edit="${l.id}">✎</button>
          <button class="btn sm ghost" data-del="${l.id}">🗑</button>
        </div>` }
      ],
      rows: pageRows.map((r) => state.highlightId === r.id ? { ...r, _highlight: true } : r),
    });

    if (state.highlightId) {
      const row = wrap.querySelector(`[data-view="${state.highlightId}"]`)?.closest('tr');
      if (row) { row.style.background = 'var(--brand-50)'; row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      state.highlightId = null;
    }

    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => showDetail(b.dataset.view));
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));
    wrap.querySelectorAll('[data-approve]').forEach((b) => b.onclick = () => decide(b.dataset.approve, 'approved'));
    wrap.querySelectorAll('[data-reject]').forEach((b) => b.onclick = () => decide(b.dataset.reject, 'rejected'));

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const lv = id ? S.getById('leaves', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    const body = `
      <form id="lv-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: lv?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: ZenI18n.t('common.type'), name: 'type', type: 'select', value: lv?.type || 'annual', options: ['annual', 'sick', 'emergency', 'unpaid', 'other'].map((t) => ({ value: t, label: ZenI18n.t('leave.' + t) })) })}
        ${UI.formField({ label: ZenI18n.t('leave.startDate'), name: 'startDate', type: 'date', value: lv?.startDate || U.today(), required: true })}
        ${UI.formField({ label: ZenI18n.t('leave.endDate'), name: 'endDate', type: 'date', value: lv?.endDate || U.today(), required: true })}
        ${UI.formField({ label: ZenI18n.t('leave.requestDate'), name: 'requestDate', type: 'date', value: lv?.requestDate || U.today(), required: true })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: lv?.status || 'pending', options: ['pending', 'approved', 'rejected', 'cancelled'].map((s) => ({ value: s, label: ZenI18n.t('status.' + s) })) })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(lv?.notes || '')}</textarea></label>
      </form>
    `;
    const m = UI.modal({
      title: lv ? (lang === 'ar' ? 'تعديل طلب إجازة' : 'Edit Leave') : (lang === 'ar' ? 'طلب إجازة جديد' : 'New Leave Request'),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#lv-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          if (data.endDate < data.startDate) { UI.toast(lang === 'ar' ? 'تاريخ النهاية قبل البداية' : 'End date before start date', 'error'); return; }
          data.days = U.daysInclusive(data.startDate, data.endDate);
          // Annual, casual/emergency and unpaid leave require the monthly flexible-rest quota to be exhausted first.
          if (['annual', 'emergency', 'unpaid'].includes(data.type)) {
            const leaveMonth = String(data.startDate || '').slice(0, 7);
            const remaining = window.ZenRestDays
              ? ZenRestDays.remaining(data.employeeId, leaveMonth)
              : Math.max(0, 4 - S.findBy('attendance', r => r.employeeId === data.employeeId && r.status === 'rest' && String(r.date || '').slice(0, 7) === leaveMonth).length);
            if (remaining > 0) {
              const message = lang === 'ar'
                ? 'لا يمكنك تقديم إجازة، يجب عليك استنفاد أيام الراحة المتبقية لديك أولاً (المتبقي: ' + remaining + ' أيام)'
                : 'You cannot request leave until you use all monthly rest days first (remaining: ' + remaining + ' days).';
              window.alert(message);
              return;
            }
          }
          // Check overlap
          const overlaps = S.findBy('leaves', (l) =>
            l.id !== id && l.employeeId === data.employeeId && l.status === 'approved' &&
            !(data.endDate < l.startDate || data.startDate > l.endDate)
          );
          if (overlaps.length > 0) {
            UI.toast(lang === 'ar' ? 'يوجد تعارض مع إجازة موافق عليها' : 'Overlaps with approved leave', 'warning');
          }
          if (id) {
            S.update('leaves', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'lv-' + Date.now().toString(36);
            S.insert('leaves', { id: newId, ...data, decisionDate: null, decisionNotes: '', isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); renderTable();
        } }
      ]
    });
  }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const lv = S.getById('leaves', id);
    if (!lv) return;
    const emp = S.getById('employees', lv.employeeId);
    const body = `
      <div class="detail-grid">
        ${detailItem(ZenI18n.t('common.employee'), emp ? emp.name : lv.employeeId)}
        ${detailItem(ZenI18n.t('emp.id'), emp ? emp.id : '—')}
        ${detailItem(ZenI18n.t('common.type'), ZenI18n.t('leave.' + lv.type))}
        ${detailItem(ZenI18n.t('leave.startDate'), U.date(lv.startDate))}
        ${detailItem(ZenI18n.t('leave.endDate'), U.date(lv.endDate))}
        ${detailItem(ZenI18n.t('leave.days'), lv.days)}
        ${detailItem(ZenI18n.t('leave.requestDate'), U.date(lv.requestDate))}
        ${detailItem(ZenI18n.t('common.status'), UI.statusBadge(lv.status))}
        ${detailItem(ZenI18n.t('leave.decisionDate'), lv.decisionDate ? U.date(lv.decisionDate) : '—')}
        ${detailItem(ZenI18n.t('leave.decisionNotes'), lv.decisionNotes || '—')}
        ${detailItem(ZenI18n.t('common.notes'), lv.notes || '—')}
      </div>
    `;
    UI.modal({
      title: lang === 'ar' ? 'تفاصيل الإجازة' : 'Leave Details',
      body,
      footer: lv.status === 'pending' ? [
        { label: ZenI18n.t('status.rejected'), kind: 'danger', onClick: (mm) => { mm.close(); decide(id, 'rejected'); } },
        { label: ZenI18n.t('status.approved'), kind: 'success', onClick: (mm) => { mm.close(); decide(id, 'approved'); } },
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() }
      ] : [{ label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() }],
    });
  }

  function decide(id, decision) {
    const lang = ZenI18n.lang;
    UI.confirm({
      title: ZenI18n.t('status.' + decision),
      message: lang === 'ar' ? `تأكيد ${decision === 'approved' ? 'الموافقة' : 'الرفض'} على الطلب؟` : `Confirm ${decision}?`,
      kind: decision === 'approved' ? 'success' : 'danger',
      confirmLabel: ZenI18n.t('common.confirm'),
      onConfirm: () => {
        S.update('leaves', id, { status: decision, decisionDate: U.today(), decisionNotes: decision === 'approved' ? 'تمت الموافقة' : 'تم الرفض' });
        UI.toast(lang === 'ar' ? 'تم تحديث الحالة' : 'Status updated', 'success');
        renderTable();
      }
    });
  }

  function del(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف طلب الإجازة؟' : 'Delete leave?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('leaves', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); renderTable(); }
    });
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><span class="label">${U.esc(label)}</span><span class="value">${value}</span></div>`;
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (l) => l.id },
      { label: ZenI18n.t('common.employee'), value: (l) => { const e = empMap[l.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : l.employeeId; } },
      { label: ZenI18n.t('common.type'), value: (l) => ZenI18n.t('leave.' + l.type) },
      { label: ZenI18n.t('leave.startDate'), value: (l) => l.startDate },
      { label: ZenI18n.t('leave.endDate'), value: (l) => l.endDate },
      { label: ZenI18n.t('leave.days'), value: (l) => l.days },
      { label: ZenI18n.t('common.status'), value: (l) => ZenI18n.t('status.' + l.status) },
      { label: ZenI18n.t('leave.requestDate'), value: (l) => l.requestDate },
    ], 'zenhr-leaves.xls', 'Leaves');
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
