/* ============================================================
   AGRIMASTERS HR — Offboarding Module
   Resignation, termination, exit interviews, clearance checklists,
   final payroll review, document archiving, employee status changes.
   Preserves historical attendance & payroll records.
   ============================================================ */
window.ZenOffboarding = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', typeFilter: '', statusFilter: '' };

  const TYPES = [
    { id: 'resignation', ar: 'استقالة', en: 'Resignation' },
    { id: 'termination', ar: 'إنهاء خدمة', en: 'Termination' },
    { id: 'end_of_contract', ar: 'انتهاء عقد', en: 'End of Contract' },
    { id: 'retirement', ar: 'تقاعد', en: 'Retirement' },
    { id: 'death', ar: 'وفاة', en: 'Death' },
    { id: 'dismissal', ar: 'فصل', en: 'Dismissal' },
  ];

  const STATUSES = ['pending', 'approved', 'in_progress', 'completed', 'cancelled'];

  // Clearance checklist items
  const CLEARANCE_ITEMS = [
    { id: 'company_id', ar: 'استلام البطاقة التعريفية', en: 'Company ID card returned' },
    { id: 'laptop', ar: 'استلام الحاسب المحمول', en: 'Laptop returned' },
    { id: 'phone', ar: 'استلام الهاتف', en: 'Phone returned' },
    { id: 'keys', ar: 'استلام المفاتيح', en: 'Keys returned' },
    { id: 'documents', ar: 'استلام المستندات', en: 'Documents returned' },
    { id: 'uniform', ar: 'استلم الزي الموحد', en: 'Uniform returned' },
    { id: 'tools', ar: 'استلام العدد والأدوات', en: 'Tools returned' },
    { id: 'accounts', ar: 'إلغاء الحسابات والصلاحيات', en: 'Accounts & access revoked' },
    { id: 'loans_settled', ar: 'تسوية السلف والقروض', en: 'Loans & advances settled' },
    { id: 'final_pay', ar: 'مراجعة المستحقات النهائية', en: 'Final payroll reviewed' },
    { id: 'exit_interview', ar: 'مقابلة الخروج', en: 'Exit interview conducted' },
    { id: 'certificate', ar: 'تسليم شهادة الخبرة', en: 'Experience certificate issued' },
  ];

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="off-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="off-type-filter">
            <option value="">${lang === 'ar' ? 'كل الأنواع' : 'All types'}</option>
            ${TYPES.map((t) => `<option value="${t.id}" ${state.typeFilter === t.id ? 'selected' : ''}>${lang === 'ar' ? t.ar : t.en}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="off-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${STATUSES.map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${translateStatus(s)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="off-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="off-add">${lang === 'ar' ? 'إنهاء خدمة موظف' : 'Start Offboarding'}</button>
        </div>
      </div>
      <div id="off-summary" class="stat-grid mb-16"></div>
      <div id="off-table-wrap"></div>
      <div id="off-pagination"></div>
    `;

    document.getElementById('off-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('off-type-filter').onchange = (e) => { state.typeFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('off-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('off-add').onclick = () => showForm();
    document.getElementById('off-export').onclick = () => exportData();
    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection('offboarding');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.typeFilter) rows = rows.filter((r) => r.type === state.typeFilter);
    if (state.statusFilter) rows = rows.filter((r) => r.status === state.statusFilter);
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const e = empMap[r.employeeId];
        return (e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))) ||
          (r.id || '').toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('off-table-wrap');
    const pageWrap = document.getElementById('off-pagination');
    const summary = document.getElementById('off-summary');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const inProgress = filtered.filter((r) => r.status === 'pending' || r.status === 'approved' || r.status === 'in_progress').length;
      const completed = filtered.filter((r) => r.status === 'completed').length;
      const clearancePct = filtered.length ? Math.round(filtered.filter((r) => r.status === 'completed').length / filtered.length * 100) : 0;
      summary.innerHTML = `
        ${miniStat('⏻', 'brand', lang === 'ar' ? 'إجمالي حالات الإنهاء' : 'Total Offboardings', filtered.length)}
        ${miniStat('◷', 'warning', lang === 'ar' ? 'قيد المعالجة' : 'In Progress', inProgress)}
        ${miniStat('✓', 'success', lang === 'ar' ? 'مكتملة' : 'Completed', completed)}
        ${miniStat('%', 'info', lang === 'ar' ? 'نسبة الإكمال' : 'Completion Rate', clearancePct + '%')}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: lang === 'ar' ? 'المرجع' : 'Reference', render: (r) => `<code>${U.esc(r.id)}</code>` },
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId); } },
        { label: ZenI18n.t('common.type'), render: (r) => U.esc(translateType(r.type)) },
        { label: lang === 'ar' ? 'تاريخ آخر يوم' : 'Last Day', render: (r) => U.date(r.lastWorkingDay) },
        { label: lang === 'ar' ? 'القائمة' : 'Checklist', render: (r) => checklistProgress(r.clearance || {}) },
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

  function checklistProgress(clearance) {
    const total = CLEARANCE_ITEMS.length;
    const done = CLEARANCE_ITEMS.filter((it) => clearance[it.id]).length;
    const pct = Math.round(done / total * 100);
    const color = pct === 100 ? 'success' : (pct >= 50 ? 'info' : 'warning');
    return `<div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--${color}-500)"></div>
      </div>
      <span class="badge ${color}">${done}/${total}</span>
    </div>`;
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(value)}</div></div>`;
  }

  function translateType(t) {
    const found = TYPES.find((x) => x.id === t);
    if (!found) return t || '—';
    return ZenI18n.lang === 'ar' ? found.ar : found.en;
  }

  function translateStatus(s) {
    const map = {
      pending: ZenI18n.lang === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval',
      approved: ZenI18n.lang === 'ar' ? 'معتمد' : 'Approved',
      in_progress: ZenI18n.lang === 'ar' ? 'قيد المعالجة' : 'In Progress',
      completed: ZenI18n.lang === 'ar' ? 'مكتمل' : 'Completed',
      cancelled: ZenI18n.lang === 'ar' ? 'ملغي' : 'Cancelled',
    };
    return map[s] || s;
  }

  function statusColor(s) {
    return { pending: 'warning', approved: 'info', in_progress: 'info', completed: 'success', cancelled: 'gray' }[s] || 'gray';
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('offboarding', id) : null;
    // For new records: show active/on_leave employees. For existing: keep the original employee.
    const employees = rec ? [] : S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave' || e.employmentStatus === 'inactive');

    const clearance = rec?.clearance || {};
    const checklistHtml = CLEARANCE_ITEMS.map((item) => `
      <label class="field" style="display:flex;align-items:center;gap:8px;flex-direction:row">
        <input type="checkbox" name="clearance_${item.id}" ${clearance[item.id] ? 'checked' : ''}>
        <span>${U.esc(lang === 'ar' ? item.ar : item.en)}</span>
      </label>
    `).join('');

    const body = `
      <form id="off-form" class="form-grid">
        ${rec ? `<div class="full"><b>${lang === 'ar' ? 'الموظف' : 'Employee'}:</b> ${U.esc(rec.employeeId)}</div>` :
        UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: ZenI18n.t('common.type'), name: 'type', type: 'select', value: rec?.type || 'resignation', required: true, options: TYPES.map((t) => ({ value: t.id, label: lang === 'ar' ? t.ar : t.en })) })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الإخطار' : 'Notice Date', name: 'noticeDate', type: 'date', value: rec?.noticeDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'آخر يوم عمل' : 'Last Working Day', name: 'lastWorkingDay', type: 'date', value: rec?.lastWorkingDay, required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'فترة الإشعار (أيام)' : 'Notice Period (days)', name: 'noticePeriodDays', type: 'number', value: rec?.noticePeriodDays || 0, attrs: ' min="0"' })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: rec?.status || 'pending', options: STATUSES.map((s) => ({ value: s, label: translateStatus(s) })) })}
        ${UI.formField({ label: lang === 'ar' ? 'المستحقات النهائية' : 'Final Settlement (EGP)', name: 'finalSettlement', type: 'number', value: rec?.finalSettlement || 0, attrs: ' min="0" step="0.01"' })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ التسوية' : 'Settlement Date', name: 'settlementDate', type: 'date', value: rec?.settlementDate })}
        <label class="field full"><span>${lang === 'ar' ? 'سبب الإنهاء' : 'Reason'}</span><textarea name="reason" rows="3">${U.esc(rec?.reason || '')}</textarea></label>
        <label class="field full"><span>${lang === 'ar' ? 'ملاحظات مقابلة الخروج' : 'Exit Interview Notes'}</span><textarea name="exitInterviewNotes" rows="3">${U.esc(rec?.exitInterviewNotes || '')}</textarea></label>
        <label class="field full"><span>${lang === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
      <div class="card mt-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'قائمة التخليص' : 'Clearance Checklist'}</h3></div></div>
        <div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
          ${checklistHtml}
        </div>
      </div>
      <div class="alert info mt-16">
        <b>${lang === 'ar' ? 'ملاحظة:' : 'Note:'}</b>
        ${lang === 'ar' ? 'لا يتم حذف سجلات الحضور والمرتبات التاريخية عند إنهاء الخدمة، بل يتم أرشفتها للحفاظ على السجل التوظيفي الكامل.' : 'Historical attendance and payroll records are preserved when employment ends — they are archived, not deleted.'}
      </div>
    `;

    UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل حالة الإنهاء' : 'Edit Offboarding') : (lang === 'ar' ? 'بدء إنهاء خدمة موظف' : 'Start Employee Offboarding'),
      subtitle: rec ? rec.id : '',
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
    const form = body.querySelector('#off-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = UI.readForm(form);

    // Extract clearance checkboxes
    const clearance = {};
    CLEARANCE_ITEMS.forEach((item) => {
      const cb = body.querySelector(`[name="clearance_${item.id}"]`);
      if (cb) clearance[item.id] = cb.checked;
    });

    if (id) {
      S.update('offboarding', id, { ...data, clearance });
      ZenAudit.logUpdate('offboarding', id, { status: data.status, type: data.type });
      // If status is 'completed', update employee status
      if (data.status === 'completed') {
        const emp = S.getById('employees', S.getById('offboarding', id).employeeId);
        if (emp && emp.employmentStatus !== 'resigned' && emp.employmentStatus !== 'terminated') {
          const newStatus = data.type === 'resignation' || data.type === 'retirement' || data.type === 'end_of_contract' ? 'resigned' : 'terminated';
          S.update('employees', emp.id, { employmentStatus: newStatus, endDate: data.lastWorkingDay });
          ZenAudit.logUpdate('employees', emp.id, { field: 'employmentStatus', oldValue: emp.employmentStatus, newValue: newStatus, reason: 'offboarding completed' });
        }
      }
      UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
    } else {
      if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
      const newId = 'OFF-' + Date.now().toString(36).toUpperCase();
      S.insert('offboarding', {
        id: newId,
        ...data,
        clearance,
        finalSettlement: Number(data.finalSettlement) || 0,
        noticePeriodDays: Number(data.noticePeriodDays) || 0,
        initiatedBy: (ZenAuth.currentUser() || {}).user || 'admin',
        isDemo: false,
        createdAt: new Date().toISOString(),
      });
      ZenAudit.logCreate('offboarding', newId, { employeeId: data.employeeId, type: data.type });
      UI.toast(lang === 'ar' ? 'تم بدء إجراءات الإنهاء' : 'Offboarding started', 'success');
    }
    modal.close();
    renderTable();
  }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const r = S.getById('offboarding', id);
    if (!r) return;
    const emp = S.getById('employees', r.employeeId);
    const dep = emp ? S.getById('departments', emp.departmentId) : null;

    const checklistDone = CLEARANCE_ITEMS.filter((it) => (r.clearance || {})[it.id]).length;
    const checklistTotal = CLEARANCE_ITEMS.length;

    UI.modal({
      title: lang === 'ar' ? 'تفاصيل إنهاء الخدمة' : 'Offboarding Details',
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
          <div><b>${lang === 'ar' ? 'تاريخ الإخطار' : 'Notice Date'}:</b> ${U.date(r.noticeDate)}</div>
          <div><b>${lang === 'ar' ? 'آخر يوم عمل' : 'Last Working Day'}:</b> ${U.date(r.lastWorkingDay)}</div>
          <div><b>${lang === 'ar' ? 'فترة الإشعار' : 'Notice Period'}:</b> ${r.noticePeriodDays || 0} ${lang === 'ar' ? 'يوم' : 'days'}</div>
          <div><b>${lang === 'ar' ? 'المستحقات النهائية' : 'Final Settlement'}:</b> ${U.money(r.finalSettlement)}</div>
          <div><b>${lang === 'ar' ? 'تاريخ التسوية' : 'Settlement Date'}:</b> ${U.date(r.settlementDate)}</div>
        </div>
        <div style="margin-top:16px"><b>${lang === 'ar' ? 'السبب' : 'Reason'}:</b><p>${U.esc(r.reason || '—')}</p></div>
        <div style="margin-top:12px"><b>${lang === 'ar' ? 'مقابلة الخروج' : 'Exit Interview'}:</b><p>${U.esc(r.exitInterviewNotes || '—')}</p></div>

        <div class="card mt-16">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'قائمة التخليص' : 'Clearance Checklist'}</h3><p>${checklistDone} / ${checklistTotal} ${lang === 'ar' ? 'مكتمل' : 'completed'}</p></div></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">
            ${CLEARANCE_ITEMS.map((item) => {
              const done = (r.clearance || {})[item.id];
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:${done ? 'var(--success-100)' : 'var(--gray-50)'}">
                <span style="font-size:14px">${done ? '✓' : '○'}</span>
                <span style="${done ? '' : 'color:var(--text-muted)'}">${U.esc(lang === 'ar' ? item.ar : item.en)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        ${r.notes ? `<div style="margin-top:12px"><b>${ZenI18n.t('common.notes')}:</b><p>${U.esc(r.notes)}</p></div>` : ''}
        <div style="margin-top:16px;font-size:11px;color:var(--text-muted)">
          ${lang === 'ar' ? 'بدأ بواسطة' : 'Initiated by'}: ${U.esc(r.initiatedBy || '—')} · ${U.date(r.createdAt)} ${U.time(r.createdAt)}
        </div>
      `,
      footer: [
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.print'), kind: 'secondary', onClick: () => printOffboarding(r) },
        { label: ZenI18n.t('common.edit'), kind: 'primary', onClick: (mm) => { mm.close(); showForm(id); } },
      ]
    });
  }

  function printOffboarding(r) {
    const lang = ZenI18n.lang;
    const emp = S.getById('employees', r.employeeId);
    const empName = emp ? (lang === 'ar' ? emp.name : (emp.nameEn || emp.name)) : r.employeeId;
    const html = `
      <h2>${lang === 'ar' ? 'إقرار إنهاء الخدمة' : 'Employment Termination Statement'}</h2>
      <p><b>${lang === 'ar' ? 'الموظف' : 'Employee'}:</b> ${U.esc(empName)} (${U.esc(r.employeeId)})</p>
      <p><b>${lang === 'ar' ? 'النوع' : 'Type'}:</b> ${U.esc(translateType(r.type))}</p>
      <p><b>${lang === 'ar' ? 'تاريخ الإخطار' : 'Notice Date'}:</b> ${U.date(r.noticeDate)}</p>
      <p><b>${lang === 'ar' ? 'آخر يوم عمل' : 'Last Working Day'}:</b> ${U.date(r.lastWorkingDay)}</p>
      <p><b>${lang === 'ar' ? 'المستحقات النهائية' : 'Final Settlement'}:</b> ${U.money(r.finalSettlement)}</p>
      <h3>${lang === 'ar' ? 'قائمة التخليص' : 'Clearance Checklist'}</h3>
      <table>
        <thead><tr><th>${lang === 'ar' ? 'البند' : 'Item'}</th><th>${lang === 'ar' ? 'الحالة' : 'Status'}</th></tr></thead>
        <tbody>${CLEARANCE_ITEMS.map((it) => {
          const done = (r.clearance || {})[it.id];
          return `<tr><td>${U.esc(lang === 'ar' ? it.ar : it.en)}</td><td>${done ? (lang === 'ar' ? 'مكتمل ✓' : 'Done ✓') : (lang === 'ar' ? 'غير مكتمل' : 'Pending')}</td></tr>`;
        }).join('')}</tbody>
      </table>
    `;
    U.printElement(html, lang === 'ar' ? 'إقرار إنهاء الخدمة' : 'Termination Statement');
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
      { label: lang === 'ar' ? 'تاريخ الإخطار' : 'Notice Date', value: (r) => r.noticeDate, type: 'date' },
      { label: lang === 'ar' ? 'آخر يوم عمل' : 'Last Working Day', value: (r) => r.lastWorkingDay, type: 'date' },
      { label: lang === 'ar' ? 'الحالة' : 'Status', value: (r) => translateStatus(r.status) },
      { label: lang === 'ar' ? 'المستحقات النهائية' : 'Final Settlement', value: (r) => r.finalSettlement || 0, type: 'money' },
      { label: lang === 'ar' ? 'السبب' : 'Reason', value: (r) => r.reason || '', wrap: true },
      { label: lang === 'ar' ? 'بنود التخليص المكتملة' : 'Checklist Items Done', value: (r) => CLEARANCE_ITEMS.filter((it) => (r.clearance || {})[it.id]).length + ' / ' + CLEARANCE_ITEMS.length },
    ], `offboarding-${U.today()}.xlsx`, 'Offboarding');
    ZenAudit.logExport('offboarding', { count: rows.length });
    UI.toast(lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
