/* ============================================================
   ZenHR — Generic Finance Module Factory
   Creates Allowances/Rewards/Penalties/Deductions modules
   Each module shares the same CRUD pattern with type-specific labels
   ============================================================ */
window.ZenFinanceModule = function (config) {
  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', statusFilter: '', typeFilter: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const employees = S.getCollection('employees');
    const records = S.getCollection(config.collection);

    const types = [...new Set(records.map((r) => r.type))];

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="fin-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="fin-type-filter">
            <option value="">${lang === 'ar' ? 'كل الأنواع' : 'All types'}</option>
            ${types.map((t) => `<option value="${U.esc(t)}" ${state.typeFilter === t ? 'selected' : ''}>${U.esc(t)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="fin-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${['active', 'processed', 'archived'].map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${ZenI18n.t('status.' + s, s)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="fin-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="fin-add">${lang.collectionLabel || config.addLabel}</button>
        </div>
      </div>
      <div id="fin-summary" class="stat-grid mb-16"></div>
      <div id="fin-table-wrap"></div>
      <div id="fin-pagination"></div>
    `;

    document.getElementById('fin-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('fin-type-filter').onchange = (e) => { state.typeFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('fin-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('fin-add').onclick = () => showForm();
    document.getElementById('fin-export').onclick = () => exportData();

    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection(config.collection);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.statusFilter) rows = rows.filter((r) => r.status === state.statusFilter);
    if (state.typeFilter) rows = rows.filter((r) => r.type === state.typeFilter);
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const e = empMap[r.employeeId];
        return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) || (r.reason || '').toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('fin-table-wrap');
    const pageWrap = document.getElementById('fin-pagination');
    const summary = document.getElementById('fin-summary');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const total = filtered.reduce((s, r) => s + r.amount, 0);
      const thisMonth = filtered.filter((r) => r.effectiveDate && r.effectiveDate.startsWith(U.currentMonth())).reduce((s, r) => s + r.amount, 0);
      const active = filtered.filter((r) => r.status === 'active').length;
      summary.innerHTML = `
        ${miniStat('⟨', 'brand', lang === 'ar' ? 'الإجمالي' : 'Total', U.money(total))}
        ${miniStat('◷', 'info', lang === 'ar' ? 'هذا الشهر' : 'This Month', U.money(thisMonth))}
        ${miniStat('✓', 'success', lang === 'ar' ? 'سجلات نشطة' : 'Active Records', active)}
        ${miniStat('▢', 'gray', lang === 'ar' ? 'إجمالي السجلات' : 'Total Records', filtered.length)}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId); } },
        { label: ZenI18n.t('common.type'), render: (r) => U.esc(r.type) },
        { label: ZenI18n.t('common.amount'), render: (r) => U.money(r.amount) },
        { label: ZenI18n.t('common.date'), render: (r) => U.date(r.effectiveDate) },
        { label: ZenI18n.t('common.reason'), render: (r) => U.esc(r.reason || '—') },
        { label: lang === 'ar' ? 'الشهر' : 'Period', render: (r) => r.payrollPeriod ? U.monthLabel(r.payrollPeriod) : '—' },
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
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(value)}</div></div>`;
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById(config.collection, id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    const body = `
      <form id="fin-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: ZenI18n.t('common.type'), name: 'type', value: rec?.type, required: true, placeholder: config.typePlaceholder || '' })}
        ${UI.formField({ label: ZenI18n.t('common.amount'), name: 'amount', type: 'number', value: rec?.amount, required: true, attrs: ' min="0" step="10"' })}
        ${UI.formField({ label: ZenI18n.t('common.date'), name: 'effectiveDate', type: 'date', value: rec?.effectiveDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'الشهر' : 'Payroll Period', name: 'payrollPeriod', type: 'month', value: rec?.payrollPeriod || U.currentMonth() })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: rec?.status || 'active', options: ['active', 'processed', 'archived'].map((s) => ({ value: s, label: ZenI18n.t('status.' + s, s) })) })}
        <label class="field full"><span>${ZenI18n.t('common.reason')}</span><textarea name="reason" rows="2">${U.esc(rec?.reason || '')}</textarea></label>
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
    `;
    const m = UI.modal({
      title: rec ? (lang === 'ar' ? config.editLabel : config.editLabelEn) : (lang === 'ar' ? config.addLabel : config.addLabelEn),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#fin-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          data.amount = Number(data.amount) || 0;
          if (id) {
            S.update(config.collection, id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const prefix = config.prefix || 'fin';
            const newId = prefix + '-' + Date.now().toString(36);
            S.insert(config.collection, { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
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
      message: ZenI18n.lang === 'ar' ? 'حذف هذا السجل؟' : 'Delete this record?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove(config.collection, id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); renderTable(); }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (r) => r.id },
      { label: ZenI18n.t('common.employee'), value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
      { label: 'Employee ID', value: (r) => r.employeeId },
      { label: ZenI18n.t('common.type'), value: (r) => r.type },
      { label: ZenI18n.t('common.amount'), value: (r) => r.amount },
      { label: ZenI18n.t('common.date'), value: (r) => r.effectiveDate },
      { label: lang === 'ar' ? 'الشهر' : 'Period', value: (r) => r.payrollPeriod || '' },
      { label: ZenI18n.t('common.status'), value: (r) => r.status },
      { label: ZenI18n.t('common.reason'), value: (r) => r.reason || '' },
    ], `zenhr-${config.collection}.xls`, config.collection);
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
};
