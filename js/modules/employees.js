/* ============================================================
   ZenHR — Employees Module
   ============================================================ */
window.ZenEmployees = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', depFilter: '', statusFilter: '', typeFilter: '', sortBy: 'id', sortAsc: true };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const employees = S.getCollection('employees');
    const departments = S.getCollection('departments');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="emp-search" placeholder="${lang === 'ar' ? 'ابحث بالاسم أو الرقم...' : 'Search by name or ID...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="emp-dep-filter">
            <option value="">${lang === 'ar' ? 'كل الأقسام' : 'All departments'}</option>
            ${departments.map((d) => `<option value="${d.id}" ${state.depFilter === d.id ? 'selected' : ''}>${U.esc(lang === 'ar' ? d.name : d.nameEn)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="emp-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${['active', 'on_leave', 'inactive', 'resigned', 'terminated'].map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${ZenI18n.t('status.' + s)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="emp-type-filter">
            <option value="">${lang === 'ar' ? 'كل الأنواع' : 'All types'}</option>
            ${['full_time', 'part_time', 'contract', 'intern'].map((t) => `<option value="${t}" ${state.typeFilter === t ? 'selected' : ''}>${ZenI18n.t('emp.' + t)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="emp-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="emp-add">${lang === 'ar' ? 'إضافة موظف' : 'Add Employee'}</button>
        </div>
      </div>
      <div id="emp-table-wrap"></div>
      <div id="emp-pagination"></div>
    `;

    document.getElementById('emp-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('emp-dep-filter').onchange = (e) => { state.depFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('emp-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('emp-type-filter').onchange = (e) => { state.typeFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('emp-add').onclick = () => showForm();
    document.getElementById('emp-export').onclick = () => exportData();

    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection('employees');
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.nameEn || '').toLowerCase().includes(q) ||
        (e.id || '').toLowerCase().includes(q) ||
        (e.jobTitle || '').toLowerCase().includes(q) ||
        (e.phone || '').includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      );
    }
    if (state.depFilter) rows = rows.filter((e) => e.departmentId === state.depFilter);
    if (state.statusFilter) rows = rows.filter((e) => e.employmentStatus === state.statusFilter);
    if (state.typeFilter) rows = rows.filter((e) => e.employmentType === state.typeFilter);
    rows.sort((a, b) => {
      let av = a[state.sortBy], bv = b[state.sortBy];
      if (state.sortBy === 'basicSalary') { av = Number(av); bv = Number(bv); }
      else if (state.sortBy === 'hireDate') { av = new Date(av); bv = new Date(bv); }
      else { av = String(av || ''); bv = String(bv || ''); }
      if (av < bv) return state.sortAsc ? -1 : 1;
      if (av > bv) return state.sortAsc ? 1 : -1;
      return 0;
    });
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('emp-table-wrap');
    const pageWrap = document.getElementById('emp-pagination');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const departments = S.getCollection('departments');

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), key: 'name', render: (e) => UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), e.id) },
        { label: ZenI18n.t('common.department'), key: 'departmentId', render: (e) => U.esc(deptName(e.departmentId)) },
        { label: ZenI18n.t('emp.jobTitle'), key: 'jobTitle', render: (e) => U.esc(lang === 'ar' ? e.jobTitle : e.jobTitleEn) },
        { label: ZenI18n.t('emp.basicSalary'), key: 'basicSalary', render: (e) => U.money(e.basicSalary) },
        { label: ZenI18n.t('emp.hireDate'), key: 'hireDate', render: (e) => U.date(e.hireDate) },
        { label: ZenI18n.t('common.status'), key: 'employmentStatus', render: (e) => UI.statusBadge(e.employmentStatus) },
        { label: ZenI18n.t('common.actions'), key: '', sortable: false, render: (e) => `<div class="row-actions">
          <button class="btn sm ghost" data-view="${e.id}" title="${ZenI18n.t('common.view')}">👁</button>
          <button class="btn sm ghost" data-edit="${e.id}" title="${ZenI18n.t('common.edit')}">✎</button>
          <button class="btn sm ghost" data-archive="${e.id}" title="${ZenI18n.t('common.archive')}">↩</button>
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => showDetail(b.dataset.view));
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-archive]').forEach((b) => b.onclick = () => archive(b.dataset.archive));

    // sort headers
    wrap.querySelectorAll('th:not(.no-sort)').forEach((th, i) => {
      const cols = ['name', 'departmentId', 'jobTitle', 'basicSalary', 'hireDate', 'employmentStatus'];
      const col = cols[i];
      if (!col) return;
      th.onclick = () => { state.sortBy = col; state.sortAsc = state.sortBy === col ? !state.sortAsc : true; renderTable(); };
      if (state.sortBy === col) th.classList.add('sorted');
    });

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function deptName(id) {
    const d = S.getById('departments', id);
    if (!d) return '—';
    return ZenI18n.lang === 'ar' ? d.name : d.nameEn;
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const emp = id ? S.getById('employees', id) : null;
    const departments = S.getCollection('departments');
    const shifts = S.getCollection('shifts');
    const isEdit = !!emp;

    const body = `
      <form id="emp-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('emp.fullName'), name: 'name', value: emp?.name, required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'الاسم بالإنجليزية' : 'English Name', name: 'nameEn', value: emp?.nameEn })}
        ${UI.formField({ label: ZenI18n.t('common.department'), name: 'departmentId', type: 'select', value: emp?.departmentId, required: true, options: [{ value: '', label: '—' }, ...departments.map((d) => ({ value: d.id, label: (lang === 'ar' ? d.name : d.nameEn) }))] })}
        ${UI.formField({ label: ZenI18n.t('emp.jobTitle'), name: 'jobTitle', value: emp?.jobTitle, required: true })}
        ${UI.formField({ label: ZenI18n.t('emp.employmentType'), name: 'employmentType', type: 'select', value: emp?.employmentType || 'full_time', options: ['full_time', 'part_time', 'contract', 'intern'].map((t) => ({ value: t, label: ZenI18n.t('emp.' + t) })) })}
        ${UI.formField({ label: ZenI18n.t('emp.employmentStatus'), name: 'employmentStatus', type: 'select', value: emp?.employmentStatus || 'active', options: ['active', 'on_leave', 'inactive', 'resigned', 'terminated'].map((s) => ({ value: s, label: ZenI18n.t('status.' + s) })) })}
        ${UI.formField({ label: ZenI18n.t('emp.basicSalary'), name: 'basicSalary', type: 'number', value: emp?.basicSalary, required: true, attrs: ' min="0" step="100"' })}
        ${UI.formField({ label: ZenI18n.t('emp.hireDate'), name: 'hireDate', type: 'date', value: emp?.hireDate, required: true })}
        ${UI.formField({ label: ZenI18n.t('emp.contractStart'), name: 'contractStart', type: 'date', value: emp?.contractStart })}
        ${UI.formField({ label: ZenI18n.t('emp.contractEnd'), name: 'contractEnd', type: 'date', value: emp?.contractEnd })}
        ${UI.formField({ label: ZenI18n.t('emp.shift'), name: 'shiftId', type: 'select', value: emp?.shiftId, options: shifts.map((s) => ({ value: s.id, label: (lang === 'ar' ? s.name : s.nameEn) + ' (' + s.startTime + '-' + s.endTime + ')' })) })}
        ${UI.formField({ label: ZenI18n.t('emp.location'), name: 'workLocation', value: emp?.workLocation })}
        ${UI.formField({ label: ZenI18n.t('emp.phone'), name: 'phone', value: emp?.phone, type: 'tel' })}
        ${UI.formField({ label: ZenI18n.t('emp.email'), name: 'email', value: emp?.email, type: 'email' })}
        ${UI.formField({ label: ZenI18n.t('emp.address'), name: 'address', value: emp?.address })}
        ${UI.formField({ label: ZenI18n.t('emp.emergency'), name: 'emergencyContact', value: emp?.emergencyContact })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(emp?.notes || '')}</textarea></label>
      </form>
    `;

    const m = UI.modal({
      title: isEdit ? (lang === 'ar' ? 'تعديل موظف' : 'Edit Employee') : (lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee'),
      subtitle: emp ? emp.id : (lang === 'ar' ? 'سيتم توليد ID تلقائياً' : 'ID will be generated automatically'),
      size: 'lg',
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => saveForm(mm, body, id) }
      ]
    });
  }

  function saveForm(modal, body, id) {
    const form = body.querySelector('#emp-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = UI.readForm(form);
    if (!data.name || !data.departmentId || !data.hireDate || !data.basicSalary) {
      UI.toast(ZenI18n.t('common.required'), 'warning');
      return;
    }
    if (id) {
      S.update('employees', id, {
        name: data.name, nameEn: data.nameEn, departmentId: data.departmentId,
        jobTitle: data.jobTitle, employmentType: data.employmentType, employmentStatus: data.employmentStatus,
        basicSalary: Number(data.basicSalary), hireDate: data.hireDate, contractStart: data.contractStart, contractEnd: data.contractEnd,
        shiftId: data.shiftId, workLocation: data.workLocation, phone: data.phone, email: data.email,
        address: data.address, emergencyContact: data.emergencyContact, notes: data.notes,
      });
      UI.toast(lang() === 'ar' ? 'تم تحديث الموظف' : 'Employee updated', 'success');
    } else {
      const newId = 'EMP-' + String(S.count('employees') + 1).padStart(4, '0');
      S.insert('employees', {
        id: newId,
        name: data.name, nameEn: data.nameEn, departmentId: data.departmentId,
        jobTitle: data.jobTitle, jobTitleEn: data.jobTitle, employmentType: data.employmentType,
        employmentStatus: data.employmentStatus, hireDate: data.hireDate, contractStart: data.contractStart || data.hireDate,
        contractEnd: data.contractEnd, basicSalary: Number(data.basicSalary), shiftId: data.shiftId,
        workLocation: data.workLocation, phone: data.phone, email: data.email, address: data.address,
        emergencyContact: data.emergencyContact, notes: data.notes, isDemo: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      UI.toast(lang() === 'ar' ? 'تم إضافة الموظف' : 'Employee added', 'success');
    }
    modal.close();
    renderTable();
  }

  function lang() { return ZenI18n.lang; }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const emp = S.getById('employees', id);
    if (!emp) return;
    const dep = S.getById('departments', emp.departmentId);
    const shift = S.getById('shifts', emp.shiftId);
    const leaves = S.findBy('leaves', (l) => l.employeeId === id);
    const payroll = S.findBy('payroll', (p) => p.employeeId === id).slice(-6);
    const attendance = S.findBy('attendance', (a) => a.employeeId === id).slice(-7);
    const contracts = S.findBy('contracts', (c) => c.employeeId === id);
    const perf = S.findBy('performance', (p) => p.employeeId === id).slice(-3);
    const loans = S.findBy('loans', (l) => l.employeeId === id);

    const body = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div class="avatar ${U.avatarColor(emp.name)}" style="width:64px;height:64px;font-size:24px;border-radius:50%">${U.esc(U.initials(emp.name))}</div>
        <div>
          <h3 style="margin:0 0 4px">${U.esc(lang === 'ar' ? emp.name : (emp.nameEn || emp.name))}</h3>
          <p style="margin:0;color:var(--text-muted);font-size:13px">${U.esc(emp.id)} · ${U.esc(lang === 'ar' ? emp.jobTitle : emp.jobTitleEn)}</p>
          ${UI.statusBadge(emp.employmentStatus)}
        </div>
        <div style="margin-inline-start:auto;display:flex;gap:6px">
          <button class="btn secondary" data-edit-detail="${emp.id}">${ZenI18n.t('common.edit')}</button>
        </div>
      </div>
      <div class="detail-grid">
        ${detailItem(lang === 'ar' ? 'القسم' : 'Department', dep ? (lang === 'ar' ? dep.name : dep.nameEn) : '—')}
        ${detailItem(lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title', lang === 'ar' ? emp.jobTitle : emp.jobTitleEn)}
        ${detailItem(ZenI18n.t('emp.employmentType'), ZenI18n.t('emp.' + emp.employmentType))}
        ${detailItem(ZenI18n.t('emp.basicSalary'), U.money(emp.basicSalary), 'big')}
        ${detailItem(ZenI18n.t('emp.hireDate'), U.date(emp.hireDate))}
        ${detailItem(ZenI18n.t('emp.contractStart'), U.date(emp.contractStart))}
        ${detailItem(ZenI18n.t('emp.contractEnd'), U.date(emp.contractEnd))}
        ${detailItem(ZenI18n.t('emp.location'), emp.workLocation || '—')}
        ${detailItem(ZenI18n.t('emp.shift'), shift ? (lang === 'ar' ? shift.name : shift.nameEn) + ' (' + shift.startTime + '-' + shift.endTime + ')' : '—')}
        ${detailItem(ZenI18n.t('emp.phone'), emp.phone || '—')}
        ${detailItem(ZenI18n.t('emp.email'), emp.email || '—')}
        ${detailItem(ZenI18n.t('emp.address'), emp.address || '—')}
        ${detailItem(ZenI18n.t('emp.emergency'), emp.emergencyContact || '—')}
      </div>
      ${emp.notes ? `<p style="margin:12px 0 0;font-size:13px"><b>${ZenI18n.t('common.notes')}:</b> ${U.esc(emp.notes)}</p>` : ''}

      <div class="tabs mt-16">
        <div class="tab active" data-tab="payroll">${lang === 'ar' ? 'المرتبات' : 'Payroll'} (${payroll.length})</div>
        <div class="tab" data-tab="attendance">${lang === 'ar' ? 'الحضور' : 'Attendance'} (${attendance.length})</div>
        <div class="tab" data-tab="leaves">${lang === 'ar' ? 'الإجازات' : 'Leaves'} (${leaves.length})</div>
        <div class="tab" data-tab="perf">${lang === 'ar' ? 'الأداء' : 'Performance'} (${perf.length})</div>
        <div class="tab" data-tab="contracts">${lang === 'ar' ? 'العقود' : 'Contracts'} (${contracts.length})</div>
        <div class="tab" data-tab="loans">${lang === 'ar' ? 'السلف' : 'Loans'} (${loans.length})</div>
      </div>
      <div id="detail-tab-content"></div>
    `;

    const m = UI.modal({
      title: ZenI18n.t('common.employee'),
      size: 'lg',
      body,
      footer: [
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() }
      ]
    });

    const tabContent = m.bodyEl.querySelector('#detail-tab-content');
    function showTab(name) {
      const rows = { payroll, attendance, leaves, perf, contracts, loans }[name] || [];
      let cols;
      if (name === 'payroll') {
        cols = [
          { label: lang === 'ar' ? 'الشهر' : 'Period', render: (p) => U.monthLabel(p.period) },
          { label: lang === 'ar' ? 'الأساسي' : 'Basic', render: (p) => U.money(p.basicSalary) },
          { label: lang === 'ar' ? 'صافي' : 'Net', render: (p) => U.money(p.netSalary) },
          { label: ZenI18n.t('common.status'), render: (p) => UI.statusBadge(p.status) },
        ];
      } else if (name === 'attendance') {
        cols = [
          { label: ZenI18n.t('common.date'), render: (a) => U.date(a.date) },
          { label: lang === 'ar' ? 'دخول' : 'In', render: (a) => a.checkIn || '—' },
          { label: lang === 'ar' ? 'خروج' : 'Out', render: (a) => a.checkOut || '—' },
          { label: ZenI18n.t('common.status'), render: (a) => UI.statusBadge(a.status) },
        ];
      } else if (name === 'leaves') {
        cols = [
          { label: ZenI18n.t('common.type'), render: (l) => ZenI18n.t('leave.' + l.type) },
          { label: ZenI18n.t('leave.startDate'), render: (l) => U.date(l.startDate) },
          { label: ZenI18n.t('leave.endDate'), render: (l) => U.date(l.endDate) },
          { label: ZenI18n.t('leave.days'), render: (l) => l.days },
          { label: ZenI18n.t('common.status'), render: (l) => UI.statusBadge(l.status) },
        ];
      } else if (name === 'perf') {
        cols = [
          { label: lang === 'ar' ? 'الفترة' : 'Period', render: (p) => p.period },
          { label: lang === 'ar' ? 'النتيجة' : 'Score', render: (p) => `<b>${p.overallScore}</b>` },
          { label: lang === 'ar' ? 'التقييم' : 'Feedback', render: (p) => U.esc(p.feedback) },
        ];
      } else if (name === 'contracts') {
        cols = [
          { label: lang === 'ar' ? 'النوع' : 'Type', render: (c) => U.esc(c.type) },
          { label: lang === 'ar' ? 'البداية' : 'Start', render: (c) => U.date(c.startDate) },
          { label: lang === 'ar' ? 'النهاية' : 'End', render: (c) => U.date(c.endDate) },
          { label: ZenI18n.t('common.status'), render: (c) => UI.statusBadge(c.status) },
        ];
      } else if (name === 'loans') {
        cols = [
          { label: lang === 'ar' ? 'المبلغ الأصلي' : 'Original', render: (l) => U.money(l.originalAmount) },
          { label: lang === 'ar' ? 'المتبقي' : 'Remaining', render: (l) => U.money(l.remainingBalance) },
          { label: lang === 'ar' ? 'القسط القادم' : 'Next', render: (l) => U.date(l.nextInstallmentDate) },
          { label: ZenI18n.t('common.status'), render: (l) => UI.statusBadge(l.status) },
        ];
      }
      tabContent.innerHTML = rows.length === 0 ? UI.empty('∅', ZenI18n.t('common.empty'), '') : `<div class="table-scroll"><table class="data"><thead><tr>${cols.map((c) => `<th>${U.esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${c.render(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    showTab('payroll');
    m.bodyEl.querySelectorAll('.tab').forEach((t) => {
      t.onclick = () => {
        m.bodyEl.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        showTab(t.dataset.tab);
      };
    });
    m.bodyEl.querySelector('[data-edit-detail]').onclick = () => { m.close(); showForm(id); };
  }

  function detailItem(label, value, cls) {
    return `<div class="detail-item"><span class="label">${U.esc(label)}</span><span class="value ${cls || ''}">${U.esc(value)}</span></div>`;
  }

  function archive(id) {
    const emp = S.getById('employees', id);
    if (!emp) return;
    UI.confirm({
      title: ZenI18n.t('common.archive'),
      message: ZenI18n.lang === 'ar' ? `هل تريد أرشفة الموظف "${emp.name}"؟ سيتم تغيير حالته إلى "غير نشط".` : `Archive employee "${emp.nameEn || emp.name}"? Status will become Inactive.`,
      kind: 'warning',
      confirmLabel: ZenI18n.t('common.archive'),
      onConfirm: () => {
        S.update('employees', id, { employmentStatus: 'inactive' });
        UI.toast(ZenI18n.lang === 'ar' ? 'تمت الأرشفة' : 'Archived', 'success');
        renderTable();
      }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (e) => e.id },
      { label: lang === 'ar' ? 'الاسم' : 'Name', value: (e) => lang === 'ar' ? e.name : (e.nameEn || e.name) },
      { label: ZenI18n.t('common.department'), value: (e) => deptName(e.departmentId) },
      { label: ZenI18n.t('emp.jobTitle'), value: (e) => lang === 'ar' ? e.jobTitle : e.jobTitleEn },
      { label: ZenI18n.t('emp.employmentType'), value: (e) => ZenI18n.t('emp.' + e.employmentType) },
      { label: ZenI18n.t('emp.employmentStatus'), value: (e) => ZenI18n.t('status.' + e.employmentStatus) },
      { label: ZenI18n.t('emp.basicSalary'), value: (e) => e.basicSalary },
      { label: ZenI18n.t('emp.hireDate'), value: (e) => e.hireDate },
      { label: ZenI18n.t('emp.phone'), value: (e) => e.phone || '' },
      { label: ZenI18n.t('emp.email'), value: (e) => e.email || '' },
      { label: ZenI18n.t('emp.location'), value: (e) => e.workLocation || '' },
    ], 'zenhr-employees.xls', 'Employees');
    UI.toast(ZenI18n.lang === 'ar' ? 'تم تصدير البيانات' : 'Exported', 'success');
  }

  return { render, state };
})();
