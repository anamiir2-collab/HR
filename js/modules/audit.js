/* ============================================================
   AGRIMASTERS HR — Audit Trail Viewer Module
   Renders the audit log with filters, search, and export.
   ============================================================ */
window.ZenAuditModule = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 50, search: '', actionFilter: '', entityFilter: '', from: '', to: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;

    const entities = [...new Set(S.getCollection('auditLog').map((r) => r.entity))].sort();
    const actions = [...new Set(S.getCollection('auditLog').map((r) => r.action))].sort();

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="aud-search" placeholder="${lang === 'ar' ? 'بحث في السجل...' : 'Search audit log...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="aud-action-filter">
            <option value="">${lang === 'ar' ? 'كل الإجراءات' : 'All actions'}</option>
            ${actions.map((a) => `<option value="${U.esc(a)}" ${state.actionFilter === a ? 'selected' : ''}>${U.esc(translateAction(a))}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="aud-entity-filter">
            <option value="">${lang === 'ar' ? 'كل الكيانات' : 'All entities'}</option>
            ${entities.map((e) => `<option value="${U.esc(e)}" ${state.entityFilter === e ? 'selected' : ''}>${U.esc(translateEntity(e))}</option>`).join('')}
          </select>
        </label>
        <label class="field"><input type="date" id="aud-from" value="${state.from}"></label>
        <label class="field"><input type="date" id="aud-to" value="${state.to}"></label>
        <div class="actions">
          <button class="btn secondary" id="aud-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn ghost danger" id="aud-clear">${lang === 'ar' ? 'مسح السجل' : 'Clear Log'}</button>
        </div>
      </div>
      <div id="aud-summary" class="stat-grid mb-16"></div>
      <div id="aud-table-wrap"></div>
      <div id="aud-pagination"></div>
    `;

    document.getElementById('aud-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('aud-action-filter').onchange = (e) => { state.actionFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('aud-entity-filter').onchange = (e) => { state.entityFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('aud-from').onchange = (e) => { state.from = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('aud-to').onchange = (e) => { state.to = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('aud-export').onclick = () => exportData();
    document.getElementById('aud-clear').onclick = () => clearLog();
    renderTable();
  }

  function getFiltered() {
    return ZenAudit.query({
      search: state.search,
      action: state.actionFilter,
      entity: state.entityFilter,
      from: state.from ? state.from + 'T00:00:00.000Z' : null,
      to: state.to ? state.to + 'T23:59:59.999Z' : null,
    });
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('aud-table-wrap');
    const pageWrap = document.getElementById('aud-pagination');
    const summary = document.getElementById('aud-summary');
    if (!wrap) return;

    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);

    if (summary) {
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = filtered.filter((r) => r.timestamp.startsWith(today)).length;
      const users = new Set(filtered.map((r) => r.user)).size;
      summary.innerHTML = `
        ${miniStat('⟲', 'brand', lang === 'ar' ? 'إجمالي السجلات' : 'Total Entries', U.num(filtered.length))}
        ${miniStat('◷', 'info', lang === 'ar' ? 'سجلات اليوم' : "Today's Entries", U.num(todayCount))}
        ${miniStat('👤', 'success', lang === 'ar' ? 'المستخدمون' : 'Users', U.num(users))}
        ${miniStat('▢', 'gray', lang === 'ar' ? 'الكيانات' : 'Entities', U.num(new Set(filtered.map((r) => r.entity)).size))}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: lang === 'ar' ? 'التاريخ والوقت' : 'Timestamp', render: (r) => `<div><b>${U.date(r.timestamp)} ${U.time(r.timestamp)}</b></div>` },
        { label: lang === 'ar' ? 'الإجراء' : 'Action', render: (r) => UI.badge(translateAction(r.action), actionColor(r.action)) },
        { label: lang === 'ar' ? 'الكيان' : 'Entity', render: (r) => U.esc(translateEntity(r.entity)) },
        { label: lang === 'ar' ? 'المعرف' : 'ID', render: (r) => U.esc(r.entityId || '—') },
        { label: lang === 'ar' ? 'المستخدم' : 'User', render: (r) => U.esc(lang === 'ar' ? r.userName : (r.userName || r.user)) },
        { label: lang === 'ar' ? 'التفاصيل' : 'Details', sortable: false, render: (r) => detailCell(r) },
      ],
      rows: pageRows,
    });

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function detailCell(r) {
    const d = r.detail || {};
    const parts = [];
    if (d.reason) parts.push(`<div><b>${ZenI18n.lang === 'ar' ? 'السبب' : 'Reason'}:</b> ${U.esc(d.reason)}</div>`);
    if (d.fields && Array.isArray(d.fields)) parts.push(`<div><b>${ZenI18n.lang === 'ar' ? 'الحقول' : 'Fields'}:</b> ${U.esc(d.fields.join(', '))}</div>`);
    if (d.summary) parts.push(`<div>${U.esc(d.summary)}</div>`);
    if (d.count != null) parts.push(`<div><b>${ZenI18n.lang === 'ar' ? 'العدد' : 'Count'}:</b> ${U.esc(d.count)}</div>`);
    if (d.filename) parts.push(`<div><b>${ZenI18n.lang === 'ar' ? 'الملف' : 'File'}:</b> ${U.esc(d.filename)}</div>`);
    if (!parts.length) return '<span class="muted">—</span>';
    return parts.join('');
  }

  function translateAction(a) {
    const map = {
      create: ZenI18n.lang === 'ar' ? 'إنشاء' : 'Create',
      update: ZenI18n.lang === 'ar' ? 'تعديل' : 'Update',
      delete: ZenI18n.lang === 'ar' ? 'حذف' : 'Delete',
      approve: ZenI18n.lang === 'ar' ? 'اعتماد' : 'Approve',
      reject: ZenI18n.lang === 'ar' ? 'رفض' : 'Reject',
      finalize: ZenI18n.lang === 'ar' ? 'إغلاق نهائي' : 'Finalize',
      import: ZenI18n.lang === 'ar' ? 'استيراد' : 'Import',
      export: ZenI18n.lang === 'ar' ? 'تصدير' : 'Export',
      archive: ZenI18n.lang === 'ar' ? 'أرشفة' : 'Archive',
      restore: ZenI18n.lang === 'ar' ? 'استرجاع' : 'Restore',
      login: ZenI18n.lang === 'ar' ? 'دخول' : 'Login',
      logout: ZenI18n.lang === 'ar' ? 'خروج' : 'Logout',
    };
    return map[a] || a;
  }

  function actionColor(a) {
    const map = {
      create: 'success', approve: 'success', restore: 'success', login: 'info',
      update: 'info', export: 'info', import: 'info',
      delete: 'danger', reject: 'danger', finalize: 'warning',
      archive: 'warning', logout: 'gray',
    };
    return map[a] || 'gray';
  }

  function translateEntity(e) {
    const key = e;
    const t = ZenI18n.t(key, e);
    return t === key ? e : t;
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(value)}</div></div>`;
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    if (!rows.length) { UI.toast(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning'); return; }
    ZenExport.toXLSX(rows, [
      { label: lang === 'ar' ? 'التاريخ' : 'Timestamp', value: (r) => r.timestamp },
      { label: lang === 'ar' ? 'الإجراء' : 'Action', value: (r) => r.action },
      { label: lang === 'ar' ? 'الكيان' : 'Entity', value: (r) => r.entity },
      { label: lang === 'ar' ? 'المعرف' : 'ID', value: (r) => r.entityId || '' },
      { label: lang === 'ar' ? 'المستخدم' : 'User', value: (r) => r.userName || r.user },
      { label: lang === 'ar' ? 'التفاصيل' : 'Details', value: (r) => JSON.stringify(r.detail || {}) },
    ], `audit-trail-${U.today()}.xlsx`, 'Audit Trail');
    ZenAudit.logExport('auditLog', { count: rows.length });
    UI.toast(lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  function clearLog() {
    UI.confirm({
      title: ZenI18n.lang === 'ar' ? 'مسح سجل التدقيق' : 'Clear Audit Log',
      message: ZenI18n.lang === 'ar' ? 'سيتم حذف جميع سجلات التدقيق نهائيًا. هل أنت متأكد؟' : 'This will permanently delete all audit log entries. Are you sure?',
      kind: 'danger',
      confirmLabel: ZenI18n.lang === 'ar' ? 'مسح الكل' : 'Clear All',
      onConfirm: () => {
        ZenAudit.clear();
        UI.toast(ZenI18n.lang === 'ar' ? 'تم مسح السجل' : 'Log cleared', 'success');
        render();
      }
    });
  }

  return { render };
})();

// Register under both names for compatibility
window.ZenAudit = window.ZenAudit || {};
window.ZenAudit.render = ZenAuditModule.render;
