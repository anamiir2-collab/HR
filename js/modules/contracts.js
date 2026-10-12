/* ============================================================
   ZenHR — Contracts & Documents Module
   ============================================================ */
window.ZenContracts = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', statusFilter: '' };

  function render(params) {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const records = S.getCollection('contracts');
    const today = new Date();

    const q = state.search.trim().toLowerCase();
    let filtered = records;
    if (state.statusFilter) filtered = filtered.filter((r) => r.status === state.statusFilter);
    if (q) {
      const empMap = {};
      S.getCollection('employees').forEach((e) => empMap[e.id] = e);
      filtered = filtered.filter((r) => {
        const e = empMap[r.employeeId];
        return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
      });
    }

    const upcoming = filtered.filter((r) => {
      if (r.status !== 'active' || !r.endDate) return false;
      const days = (new Date(r.endDate) - today) / 86400000;
      return days >= 0 && days <= 60;
    });
    const expired = filtered.filter((r) => r.endDate && new Date(r.endDate) < today && r.status === 'active');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="ct-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="ct-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>${ZenI18n.t('status.active')}</option>
            <option value="expired" ${state.statusFilter === 'expired' ? 'selected' : ''}>${lang === 'ar' ? 'منتهي' : 'Expired'}</option>
            <option value="terminated" ${state.statusFilter === 'terminated' ? 'selected' : ''}>${ZenI18n.t('status.terminated')}</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="ct-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="ct-add">${lang === 'ar' ? 'إضافة عقد' : 'Add Contract'}</button>
        </div>
      </div>
      <div class="stat-grid mb-16">
        ${miniStat('▢', 'brand', lang === 'ar' ? 'إجمالي العقود' : 'Total Contracts', filtered.length)}
        ${miniStat('!', 'warning', lang === 'ar' ? 'تنتهي قريباً' : 'Expiring Soon', upcoming.length)}
        ${miniStat('✕', 'danger', lang === 'ar' ? 'منتهية' : 'Expired', expired.length)}
        ${miniStat('✓', 'success', lang === 'ar' ? 'نشطة' : 'Active', filtered.filter((r) => r.status === 'active').length)}
      </div>
      <div id="ct-table-wrap"></div>
      <div id="ct-pagination"></div>
    `;

    document.getElementById('ct-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('ct-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('ct-add').onclick = () => showForm();
    document.getElementById('ct-export').onclick = () => exportData();

    renderTable();
    if (params && params.id) state.highlightId = params.id;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('ct-table-wrap');
    const pageWrap = document.getElementById('ct-pagination');
    if (!wrap) return;
    let filtered = S.getCollection('contracts');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.statusFilter === 'expired') {
      filtered = filtered.filter((r) => r.endDate && new Date(r.endDate) < new Date() && r.status === 'active');
    } else if (state.statusFilter) {
      filtered = filtered.filter((r) => r.status === state.statusFilter);
    }
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      filtered = filtered.filter((r) => { const e = empMap[r.employeeId]; return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)); });
    }
    filtered.sort((a, b) => (a.endDate < b.endDate ? -1 : 1));

    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const today = new Date();

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId); } },
        { label: lang === 'ar' ? 'النوع' : 'Type', render: (r) => r.type === 'fixed' ? (lang === 'ar' ? 'محدد المدة' : 'Fixed-term') : (lang === 'ar' ? 'غير محدد' : 'Open') },
        { label: lang === 'ar' ? 'البداية' : 'Start', render: (r) => U.date(r.startDate) },
        { label: lang === 'ar' ? 'النهاية' : 'End', render: (r) => U.date(r.endDate) },
        { label: lang === 'ar' ? 'أيام متبقية' : 'Days Left', render: (r) => { if (!r.endDate) return '—'; const d = Math.round((new Date(r.endDate) - today) / 86400000); const cls = d < 0 ? 'text-danger' : d <= 30 ? 'text-warning' : d <= 60 ? 'text-brand' : 'text-success'; return `<span class="${cls} bold">${d < 0 ? 0 : d}</span>`; } },
        { label: ZenI18n.t('common.status'), render: (r) => UI.statusBadge(r.status) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (r) => `<div class="row-actions">
          <button class="btn sm ghost" data-edit="${r.id}">✎</button>
          <button class="btn sm ghost" data-del="${r.id}">🗑</button>
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
    const rec = id ? S.getById('contracts', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    const body = `
      <form id="ct-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: lang === 'ar' ? 'النوع' : 'Type', name: 'type', type: 'select', value: rec?.type || 'fixed', options: [
          { value: 'fixed', label: lang === 'ar' ? 'محدد المدة' : 'Fixed-term' },
          { value: 'open', label: lang === 'ar' ? 'غير محدد المدة' : 'Open-ended' },
        ] })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ البداية' : 'Start Date', name: 'startDate', type: 'date', value: rec?.startDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ النهاية' : 'End Date', name: 'endDate', type: 'date', value: rec?.endDate })}
        ${UI.formField({ label: lang === 'ar' ? 'عنوان المستند' : 'Document Title', name: 'documentTitle', value: rec?.documentTitle })}
        ${UI.formField({ label: lang === 'ar' ? 'الفئة' : 'Category', name: 'category', value: rec?.category || 'عقد عمل' })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ التذكير' : 'Reminder Date', name: 'reminderDate', type: 'date', value: rec?.reminderDate })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: rec?.status || 'active', options: [
          { value: 'active', label: ZenI18n.t('status.active') },
          { value: 'expired', label: lang === 'ar' ? 'منتهي' : 'Expired' },
          { value: 'terminated', label: ZenI18n.t('status.terminated') },
        ] })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
      <p style="font-size:11px;color:var(--text-muted)">📝 ${lang === 'ar' ? 'هذه وحدة تعقب مستندات. لا يتم رفع الملفات إلى خادم.' : 'Document tracking module. No files are uploaded to a server.'}</p>
    `;
    const m = UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل عقد' : 'Edit Contract') : (lang === 'ar' ? 'إضافة عقد' : 'Add Contract'),
      body, size: 'lg',
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#ct-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          if (id) {
            S.update('contracts', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'ct-' + Date.now().toString(36);
            S.insert('contracts', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
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
      message: ZenI18n.lang === 'ar' ? 'حذف العقد؟' : 'Delete contract?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('contracts', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); renderTable(); }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    let rows = S.getCollection('contracts');
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (r) => r.id },
      { label: ZenI18n.t('common.employee'), value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
      { label: lang === 'ar' ? 'النوع' : 'Type', value: (r) => r.type },
      { label: lang === 'ar' ? 'البداية' : 'Start', value: (r) => r.startDate },
      { label: lang === 'ar' ? 'النهاية' : 'End', value: (r) => r.endDate || '' },
      { label: ZenI18n.t('common.status'), value: (r) => r.status },
    ], 'zenhr-contracts.xls', 'Contracts');
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
