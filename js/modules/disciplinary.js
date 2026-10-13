/* ============================================================
   AGRIMASTERS HR — Disciplinary Actions & Investigations Module
   Records incidents, investigations, employee responses,
   warning letters, approved disciplinary decisions, and history.
   Approval workflow + audit trail. Restricted to authorized users.
   ============================================================ */
window.ZenDisciplinary = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', statusFilter: '', typeFilter: '', depFilter: '' };

  const TYPES = [
    { id: 'verbal_warning', ar: 'إنذار شفهي', en: 'Verbal Warning' },
    { id: 'written_warning', ar: 'إنذار كتابي', en: 'Written Warning' },
    { id: 'final_warning', ar: 'إنذار نهائي', en: 'Final Warning' },
    { id: 'suspension', ar: 'إيقاف عن العمل', en: 'Suspension' },
    { id: 'deduction', ar: 'خصم مالي', en: 'Financial Deduction' },
    { id: 'demotion', ar: 'خفض درجة', en: 'Demotion' },
    { id: 'termination', ar: 'إنهاء خدمة', en: 'Termination' },
    { id: 'other', ar: 'أخرى', en: 'Other' },
  ];

  const STATUSES = ['open', 'under_investigation', 'pending_decision', 'approved', 'rejected', 'closed'];

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const records = S.getCollection('disciplinary');
    const departments = S.getCollection('departments');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="dis-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="dis-type-filter">
            <option value="">${lang === 'ar' ? 'كل الأنواع' : 'All types'}</option>
            ${TYPES.map((t) => `<option value="${t.id}" ${state.typeFilter === t.id ? 'selected' : ''}>${lang === 'ar' ? t.ar : t.en}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="dis-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${STATUSES.map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${translateStatus(s)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="dis-dep-filter">
            <option value="">${lang === 'ar' ? 'كل الأقسام' : 'All departments'}</option>
            ${departments.map((d) => `<option value="${d.id}" ${state.depFilter === d.id ? 'selected' : ''}>${U.esc(lang === 'ar' ? d.name : d.nameEn)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="dis-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="dis-add">${lang === 'ar' ? 'تسجيل واقعة' : 'Record Incident'}</button>
        </div>
      </div>
      <div id="dis-summary" class="stat-grid mb-16"></div>
      <div id="dis-table-wrap"></div>
      <div id="dis-pagination"></div>
    `;

    document.getElementById('dis-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('dis-type-filter').onchange = (e) => { state.typeFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('dis-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('dis-dep-filter').onchange = (e) => { state.depFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('dis-add').onclick = () => showForm();
    document.getElementById('dis-export').onclick = () => exportData();
    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection('disciplinary');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.typeFilter) rows = rows.filter((r) => r.type === state.typeFilter);
    if (state.statusFilter) rows = rows.filter((r) => r.status === state.statusFilter);
    if (state.depFilter) rows = rows.filter((r) => { const e = empMap[r.employeeId]; return e && e.departmentId === state.depFilter; });
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const e = empMap[r.employeeId];
        return (e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))) ||
          (r.incidentDescription || '').toLowerCase().includes(q) ||
          (r.id || '').toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => (a.incidentDate < b.incidentDate ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('dis-table-wrap');
    const pageWrap = document.getElementById('dis-pagination');
    const summary = document.getElementById('dis-summary');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const open = filtered.filter((r) => r.status === 'open' || r.status === 'under_investigation' || r.status === 'pending_decision').length;
      const approved = filtered.filter((r) => r.status === 'approved').length;
      const terminations = filtered.filter((r) => r.status === 'approved' && r.type === 'termination').length;
      summary.innerHTML = `
        ${miniStat('!', 'brand', lang === 'ar' ? 'إجمالي الواقعات' : 'Total Incidents', filtered.length)}
        ${miniStat('◷', 'warning', lang === 'ar' ? 'قيد المعالجة' : 'In Progress', open)}
        ${miniStat('✓', 'success', lang === 'ar' ? 'معتمدة' : 'Approved', approved)}
        ${miniStat('⏻', 'danger', lang === 'ar' ? 'إنهاء خدمات' : 'Terminations', terminations)}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: lang === 'ar' ? 'المرجع' : 'Reference', render: (r) => `<code>${U.esc(r.id)}</code>` },
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId); } },
        { label: ZenI18n.t('common.type'), render: (r) => U.esc(translateType(r.type)) },
        { label: lang === 'ar' ? 'تاريخ الواقعة' : 'Incident Date', render: (r) => U.date(r.incidentDate) },
        { label: lang === 'ar' ? 'الوصف' : 'Description', render: (r) => `<div style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(r.incidentDescription || '—')}</div>` },
        { label: ZenI18n.t('common.status'), render: (r) => UI.badge(translateStatus(r.status), statusColor(r.status)) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (r) => `<div class="row-actions">
          <button class="btn sm ghost" data-view="${r.id}" title="${ZenI18n.t('common.view')}">👁</button>
          <button class="btn sm ghost" data-edit="${r.id}" title="${ZenI18n.t('common.edit')}">✎</button>
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => showDetail(b.dataset.view));
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(U.num(value))}</div></div>`;
  }

  function translateType(t) {
    const found = TYPES.find((x) => x.id === t);
    if (!found) return t || '—';
    return ZenI18n.lang === 'ar' ? found.ar : found.en;
  }

  function translateStatus(s) {
    const map = {
      open: ZenI18n.lang === 'ar' ? 'مفتوحة' : 'Open',
      under_investigation: ZenI18n.lang === 'ar' ? 'قيد التحقيق' : 'Under Investigation',
      pending_decision: ZenI18n.lang === 'ar' ? 'بانتظار القرار' : 'Pending Decision',
      approved: ZenI18n.lang === 'ar' ? 'معتمدة' : 'Approved',
      rejected: ZenI18n.lang === 'ar' ? 'مرفوضة' : 'Rejected',
      closed: ZenI18n.lang === 'ar' ? 'مغلقة' : 'Closed',
    };
    return map[s] || s;
  }

  function statusColor(s) {
    return { open: 'info', under_investigation: 'warning', pending_decision: 'warning', approved: 'success', rejected: 'danger', closed: 'gray' }[s] || 'gray';
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('disciplinary', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');

    const body = `
      <form id="dis-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: ZenI18n.t('common.type'), name: 'type', type: 'select', value: rec?.type || 'verbal_warning', required: true, options: TYPES.map((t) => ({ value: t.id, label: lang === 'ar' ? t.ar : t.en })) })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الواقعة' : 'Incident Date', name: 'incidentDate', type: 'date', value: rec?.incidentDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الاكتشاف' : 'Discovery Date', name: 'discoveryDate', type: 'date', value: rec?.discoveryDate })}
        ${UI.formField({ label: lang === 'ar' ? 'مكان الواقعة' : 'Location', name: 'incidentLocation', value: rec?.incidentLocation })}
        ${UI.formField({ label: lang === 'ar' ? 'الشاكي' : 'Complainant', name: 'complainant', value: rec?.complainant })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: rec?.status || 'open', options: STATUSES.map((s) => ({ value: s, label: translateStatus(s) })) })}
        <label class="field full"><span>${lang === 'ar' ? 'وصف الواقعة' : 'Incident Description'} <span style="color:var(--danger-500)">*</span></span>
          <textarea name="incidentDescription" rows="3" required>${U.esc(rec?.incidentDescription || '')}</textarea>
        </label>
        <label class="field full"><span>${lang === 'ar' ? 'ملاحظات التحقيق' : 'Investigation Notes'}</span>
          <textarea name="investigationNotes" rows="3">${U.esc(rec?.investigationNotes || '')}</textarea>
        </label>
        <label class="field full"><span>${lang === 'ar' ? 'رد الموظف' : 'Employee Response'}</span>
          <textarea name="employeeResponse" rows="3">${U.esc(rec?.employeeResponse || '')}</textarea>
        </label>
        <label class="field full"><span>${lang === 'ar' ? 'القرار' : 'Decision'}</span>
          <textarea name="decision" rows="2">${U.esc(rec?.decision || '')}</textarea>
        </label>
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ القرار' : 'Decision Date', name: 'decisionDate', type: 'date', value: rec?.decisionDate })}
        ${UI.formField({ label: lang === 'ar' ? 'الخصم المالي (إن وجد)' : 'Financial Deduction (if any)', name: 'deductionAmount', type: 'number', value: rec?.deductionAmount || 0, attrs: ' min="0" step="0.01"' })}
        ${UI.formField({ label: lang === 'ar' ? 'فترة الخصم' : 'Deduction Period', name: 'deductionPeriod', type: 'month', value: rec?.deductionPeriod })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
      <div class="alert warning mt-16">
        <b>${lang === 'ar' ? 'تنبيه قانوني:' : 'Legal notice:'}</b>
        ${lang === 'ar' ? 'يجب أن تتبع الإجراءات التأديبية السياسة المعتمدة من الشركة والقانون المعمول به. أي خصومات أو عقوبات يجب التحقق منها قانونيًا قبل الاعتماد.' : 'Disciplinary procedures must follow approved company policy and applicable law. Any deductions or penalties must be legally verified before approval.'}
      </div>
    `;

    UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل واقعة تأديبية' : 'Edit Disciplinary Record') : (lang === 'ar' ? 'تسجيل واقعة جديدة' : 'Record New Incident'),
      subtitle: rec ? rec.id : (lang === 'ar' ? 'سيتم توليد المرجع تلقائيًا' : 'Reference will be generated'),
      size: 'lg',
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => saveForm(mm, body, id) }
      ]
    });
  }

  function saveForm(modal, body, id) {
    const lang = ZenI18n.lang;
    const form = body.querySelector('#dis-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = UI.readForm(form);
    if (!data.employeeId || !data.incidentDescription || !data.incidentDate) {
      UI.toast(ZenI18n.t('common.required'), 'warning');
      return;
    }
    data.deductionAmount = Number(data.deductionAmount) || 0;
    if (id) {
      const before = S.getById('disciplinary', id);
      S.update('disciplinary', id, data);
      ZenAudit.logUpdate('disciplinary', id, { fields: Object.keys(data) });
      UI.toast(lang === 'ar' ? 'تم تحديث الواقعة' : 'Incident updated', 'success');
    } else {
      const newId = 'DIS-' + Date.now().toString(36).toUpperCase();
      S.insert('disciplinary', {
        id: newId,
        ...data,
        createdBy: (ZenAuth.currentUser() || {}).user || 'admin',
        isDemo: false,
        createdAt: new Date().toISOString(),
      });
      ZenAudit.logCreate('disciplinary', newId, { employeeId: data.employeeId, type: data.type });
      UI.toast(lang === 'ar' ? 'تم تسجيل الواقعة' : 'Incident recorded', 'success');
    }
    modal.close();
    renderTable();
  }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const r = S.getById('disciplinary', id);
    if (!r) return;
    const emp = S.getById('employees', r.employeeId);
    const dep = emp ? S.getById('departments', emp.departmentId) : null;

    UI.modal({
      title: lang === 'ar' ? 'تفاصيل الواقعة التأديبية' : 'Disciplinary Incident Details',
      subtitle: r.id,
      size: 'lg',
      body: `
        <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          ${emp ? UI.avatarCell(lang === 'ar' ? emp.name : (emp.nameEn || emp.name), emp.id) : ''}
          <p style="margin:6px 0 0;color:var(--text-muted);font-size:12px">${emp ? U.esc(emp.id + ' · ' + (lang === 'ar' ? emp.jobTitle : (emp.jobTitleEn || emp.jobTitle))) : ''}${dep ? ' · ' + U.esc(lang === 'ar' ? dep.name : dep.nameEn) : ''}</p>
        </div>
        <div class="form-grid">
          <div><b>${lang === 'ar' ? 'النوع' : 'Type'}:</b> ${U.esc(translateType(r.type))}</div>
          <div><b>${lang === 'ar' ? 'الحالة' : 'Status'}:</b> ${UI.badge(translateStatus(r.status), statusColor(r.status))}</div>
          <div><b>${lang === 'ar' ? 'تاريخ الواقعة' : 'Incident Date'}:</b> ${U.date(r.incidentDate)}</div>
          <div><b>${lang === 'ar' ? 'تاريخ الاكتشاف' : 'Discovery Date'}:</b> ${U.date(r.discoveryDate)}</div>
          <div><b>${lang === 'ar' ? 'مكان الواقعة' : 'Location'}:</b> ${U.esc(r.incidentLocation || '—')}</div>
          <div><b>${lang === 'ar' ? 'الشاكي' : 'Complainant'}:</b> ${U.esc(r.complainant || '—')}</div>
        </div>
        <div style="margin-top:16px"><b>${lang === 'ar' ? 'وصف الواقعة' : 'Incident Description'}:</b><p>${U.esc(r.incidentDescription || '—')}</p></div>
        <div style="margin-top:12px"><b>${lang === 'ar' ? 'ملاحظات التحقيق' : 'Investigation Notes'}:</b><p>${U.esc(r.investigationNotes || '—')}</p></div>
        <div style="margin-top:12px"><b>${lang === 'ar' ? 'رد الموظف' : 'Employee Response'}:</b><p>${U.esc(r.employeeResponse || '—')}</p></div>
        <div style="margin-top:12px"><b>${lang === 'ar' ? 'القرار' : 'Decision'}:</b><p>${U.esc(r.decision || '—')}</p></div>
        <div style="margin-top:12px"><b>${lang === 'ar' ? 'تاريخ القرار' : 'Decision Date'}:</b> ${U.date(r.decisionDate)}</div>
        ${r.deductionAmount > 0 ? `<div style="margin-top:8px"><b>${lang === 'ar' ? 'الخصم المالي' : 'Financial Deduction'}:</b> ${U.money(r.deductionAmount)} (${r.deductionPeriod || '—'})</div>` : ''}
        ${r.notes ? `<div style="margin-top:12px"><b>${ZenI18n.t('common.notes')}:</b><p>${U.esc(r.notes)}</p></div>` : ''}
        <div style="margin-top:16px;font-size:11px;color:var(--text-muted)">
          ${lang === 'ar' ? 'أُنشئ بواسطة' : 'Created by'}: ${U.esc(r.createdBy || '—')} · ${U.date(r.createdAt)} ${U.time(r.createdAt)}
        </div>
      `,
      footer: [
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() },
        ...(r.status === 'pending_decision' ? [
          { label: lang === 'ar' ? 'رفض' : 'Reject', kind: 'danger', onClick: (mm) => { S.update('disciplinary', id, { status: 'rejected', decisionDate: U.today() }); ZenAudit.logReject('disciplinary', id, {}); mm.close(); renderTable(); UI.toast(lang === 'ar' ? 'تم الرفض' : 'Rejected', 'success'); } },
          { label: lang === 'ar' ? 'اعتماد' : 'Approve', kind: 'primary', onClick: (mm) => { S.update('disciplinary', id, { status: 'approved', decisionDate: U.today() }); ZenAudit.logApprove('disciplinary', id, {}); mm.close(); renderTable(); UI.toast(lang === 'ar' ? 'تم الاعتماد' : 'Approved', 'success'); } },
        ] : []),
        { label: ZenI18n.t('common.edit'), kind: 'secondary', onClick: (mm) => { mm.close(); showForm(id); } },
      ]
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    if (!rows.length) { UI.toast(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning'); return; }
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toXLSX(rows, [
      { label: lang === 'ar' ? 'المرجع' : 'Reference', value: (r) => r.id },
      { label: lang === 'ar' ? 'الموظف' : 'Employee', value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
      { label: 'Employee ID', value: (r) => r.employeeId },
      { label: lang === 'ar' ? 'النوع' : 'Type', value: (r) => translateType(r.type) },
      { label: lang === 'ar' ? 'تاريخ الواقعة' : 'Incident Date', value: (r) => r.incidentDate, type: 'date' },
      { label: lang === 'ar' ? 'الحالة' : 'Status', value: (r) => translateStatus(r.status) },
      { label: lang === 'ar' ? 'الوصف' : 'Description', value: (r) => r.incidentDescription || '', wrap: true },
      { label: lang === 'ar' ? 'القرار' : 'Decision', value: (r) => r.decision || '', wrap: true },
      { label: lang === 'ar' ? 'الخصم' : 'Deduction', value: (r) => r.deductionAmount || 0, type: 'money' },
      { label: lang === 'ar' ? 'فترة الخصم' : 'Period', value: (r) => r.deductionPeriod || '' },
    ], `disciplinary-${U.today()}.xlsx`, 'Disciplinary');
    ZenAudit.logExport('disciplinary', { count: rows.length });
    UI.toast(lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
