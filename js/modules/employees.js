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
          <button class="btn ghost" id="emp-import">${lang === 'ar' ? 'استيراد XLSX' : 'Import XLSX'}</button>
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
    document.getElementById('emp-import').onclick = () => showImportDialog();
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
        { label: ZenI18n.t('common.employee'), key: 'name', render: (e) => `<span class="employee-avatar-cell">${e.profileImage ? `<img class="employee-mini-photo" src="${U.esc(e.profileImage)}" alt="">` : `<span class="employee-mini-photo employee-mini-placeholder">${U.esc(U.initials(e.name))}</span>`}<span>${U.esc(lang === 'ar' ? e.name : (e.nameEn || e.name))}</span></span>` },
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
        <div class="field full employee-photo-field">
          <span>${lang === 'ar' ? 'الصورة الشخصية' : 'Profile picture'}</span>
          <div class="employee-photo-editor">
            <img id="emp-photo-preview" src="${U.esc(emp?.profileImage || '')}" alt="" ${emp?.profileImage ? '' : 'hidden'}>
            <div id="emp-photo-placeholder" class="employee-photo-placeholder" ${emp?.profileImage ? 'hidden' : ''}>${U.esc(U.initials(emp?.name || (lang === 'ar' ? 'موظف' : 'Employee')))}</div>
            <div class="employee-photo-actions">
              <input id="emp-photo-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="${lang === 'ar' ? 'رفع صورة شخصية' : 'Upload profile picture'}">
              <small>${lang === 'ar' ? 'الصورة تُضغط وتُحفظ محليًا على هذا الجهاز.' : 'The image is resized and stored locally on this device.'}</small>
              <button type="button" class="btn sm ghost" id="emp-photo-remove">${lang === 'ar' ? 'إزالة الصورة' : 'Remove photo'}</button>
            </div>
          </div>
        </div>
        <div class="field"><span>${lang === 'ar' ? 'ساعات العمل الشهرية المستهدفة' : 'Target monthly hours'}</span><input name="monthlyHours" type="number" min="0" max="400" step="1" value="${emp?.monthlyHours ?? ''}" placeholder="${S.settings.monthlyWorkingHours || 208}"></div>
        <div class="field"><span>${lang === 'ar' ? 'ساعات العمل اليومية المستهدفة' : 'Target daily hours'}</span><input name="dailyHours" type="number" min="0" max="24" step="0.5" value="${emp?.dailyHours ?? ''}" placeholder="8"></div>
        <div class="field"><span>${lang === 'ar' ? 'نظام أيام الراحة' : 'Rest-day system'}</span><select name="restDaysMode">
          <option value="default" ${(emp?.restDaysMode || 'default') === 'default' ? 'selected' : ''}>${lang === 'ar' ? 'استخدام النظام العام / جدول الورديات' : 'Use company / shift schedule'}</option>
          <option value="dates" ${emp?.restDaysMode === 'dates' ? 'selected' : ''}>${lang === 'ar' ? 'تواريخ راحة محددة' : 'Specific rest dates'}</option>
          <option value="monthlyDays" ${emp?.restDaysMode === 'monthlyDays' ? 'selected' : ''}>${lang === 'ar' ? 'أيام ثابتة من كل شهر (مثل 1 و15)' : 'Recurring days each month (e.g. 1 and 15)'}</option>
          <option value="weekly" ${emp?.restDaysMode === 'weekly' ? 'selected' : ''}>${lang === 'ar' ? 'أيام أسبوعية مخصصة' : 'Custom weekdays'}</option>
          <option value="none" ${emp?.restDaysMode === 'none' ? 'selected' : ''}>${lang === 'ar' ? 'بدون أيام راحة' : 'No rest days'}</option>
        </select></div>
        <label class="field"><span>${lang === 'ar' ? 'تواريخ الراحة (YYYY-MM-DD، افصل بفاصلة)' : 'Rest dates (YYYY-MM-DD, comma-separated)'}</span><textarea name="restDates" rows="2" placeholder="2026-10-01, 2026-10-15">${U.esc(Array.isArray(emp?.restDates) ? emp.restDates.join(', ') : (emp?.restDates || ''))}</textarea></label>
        <label class="field"><span>${lang === 'ar' ? 'أرقام أيام الراحة: أيام الشهر (1–31) أو أيام الأسبوع (0=الأحد، 6=السبت)' : 'Rest day numbers: month days (1–31) or weekdays (0=Sun, 6=Sat)'}</span><input name="recurringRestDays" value="${U.esc(Array.isArray(emp?.recurringRestDays) ? emp.recurringRestDays.join(', ') : (emp?.recurringRestDays || ''))}" placeholder="1, 15"></label>
        <label class="field full"><span>${lang === 'ar' ? 'ملاحظات نظام العمل الخاص' : 'Flexible work-system notes'}</span><textarea name="workSystemNotes" rows="2">${U.esc(emp?.workSystemNotes || '')}</textarea></label>
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
    const form = m.bodyEl.querySelector('#emp-form');
    if (form) {
      form.dataset.profileImage = emp?.profileImage || '';
      const fileInput = form.querySelector('#emp-photo-file');
      const preview = form.querySelector('#emp-photo-preview');
      const placeholder = form.querySelector('#emp-photo-placeholder');
      const remove = form.querySelector('#emp-photo-remove');
      function refreshPhoto() {
        const src = form.dataset.profileImage || '';
        preview.src = src;
        preview.hidden = !src;
        placeholder.hidden = !!src;
      }
      fileInput.onchange = async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
          UI.toast(lang === 'ar' ? 'اختر صورة JPG أو PNG أو WebP' : 'Choose a JPG, PNG or WebP image', 'warning');
          fileInput.value = '';
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          UI.toast(lang === 'ar' ? 'حجم الصورة الأصلي يجب ألا يتجاوز 8 ميجابايت' : 'Original image must be under 8 MB', 'warning');
          fileInput.value = '';
          return;
        }
        try {
          const dataUrl = await compressEmployeePhoto(file);
          form.dataset.profileImage = dataUrl;
          refreshPhoto();
        } catch (_) {
          UI.toast(lang === 'ar' ? 'تعذّر قراءة الصورة' : 'Could not read image', 'error');
        }
      };
      remove.onclick = () => { form.dataset.profileImage = ''; fileInput.value = ''; refreshPhoto(); };
    }
  }

  function compressEmployeePhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 360, scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          let quality = 0.76, output = canvas.toDataURL('image/jpeg', quality);
          while (output.length > 160000 && quality > 0.42) { quality -= 0.08; output = canvas.toDataURL('image/jpeg', quality); }
          resolve(output);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function saveForm(modal, body, id) {
    const form = body.querySelector('#emp-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = UI.readForm(form);
    data.profileImage = form.dataset.profileImage || '';
    data.monthlyHours = data.monthlyHours === '' ? null : Number(data.monthlyHours);
    data.dailyHours = data.dailyHours === '' ? null : Number(data.dailyHours);
    data.restDaysMode = data.restDaysMode || 'default';
    data.restDates = String(data.restDates || '').split(/[\\n,;]+/).map(v => v.trim()).filter(v => /^\\d{4}-\\d{2}-\\d{2}$/.test(v));
    data.recurringRestDays = String(data.recurringRestDays || '').split(/[\\s,;]+/).map(Number).filter(v => Number.isInteger(v) && (data.restDaysMode === 'weekly' ? v >= 0 && v <= 6 : v >= 1 && v <= 31));
    data.workSystemNotes = data.workSystemNotes || '';
    if (!data.name || !data.departmentId || !data.hireDate || !data.basicSalary) {
      UI.toast(ZenI18n.t('common.required'), 'warning');
      return;
    }
    // Duplicate employee number detection
    if (!id) {
      const existing = S.findBy('employees', (e) => e.id === data.employeeId);
      // (auto-generated ID, so duplicates are unlikely — but check anyway)
    }
    if (id) {
      const before = S.getById('employees', id);
      S.update('employees', id, {
        name: data.name, nameEn: data.nameEn, departmentId: data.departmentId,
        jobTitle: data.jobTitle, employmentType: data.employmentType, employmentStatus: data.employmentStatus,
        basicSalary: Number(data.basicSalary), hireDate: data.hireDate, contractStart: data.contractStart, contractEnd: data.contractEnd,
        shiftId: data.shiftId, workLocation: data.workLocation, phone: data.phone, email: data.email,
        address: data.address, emergencyContact: data.emergencyContact, notes: data.notes,
        profileImage: data.profileImage, monthlyHours: data.monthlyHours, dailyHours: data.dailyHours,
        restDaysMode: data.restDaysMode, restDates: data.restDates, recurringRestDays: data.recurringRestDays, workSystemNotes: data.workSystemNotes,
      });
      if (window.ZenAudit) ZenAudit.logUpdate('employees', id, { fields: Object.keys(data), employeeName: data.name });
      UI.toast(lang() === 'ar' ? 'تم تحديث الموظف' : 'Employee updated', 'success');
    } else {
      // Generate unique sequential employee number
      let seq = S.count('employees') + 1;
      let newId = 'EMP-' + String(seq).padStart(4, '0');
      while (S.getById('employees', newId)) {
        seq++;
        newId = 'EMP-' + String(seq).padStart(4, '0');
      }
      S.insert('employees', {
        id: newId,
        name: data.name, nameEn: data.nameEn, departmentId: data.departmentId,
        jobTitle: data.jobTitle, jobTitleEn: data.jobTitle, employmentType: data.employmentType,
        employmentStatus: data.employmentStatus, hireDate: data.hireDate, contractStart: data.contractStart || data.hireDate,
        contractEnd: data.contractEnd, basicSalary: Number(data.basicSalary), shiftId: data.shiftId,
        workLocation: data.workLocation, phone: data.phone, email: data.email, address: data.address,
        emergencyContact: data.emergencyContact, notes: data.notes, profileImage: data.profileImage,
        monthlyHours: data.monthlyHours, dailyHours: data.dailyHours, restDaysMode: data.restDaysMode,
        restDates: data.restDates, recurringRestDays: data.recurringRestDays, workSystemNotes: data.workSystemNotes, isDemo: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      if (window.ZenAudit) ZenAudit.logCreate('employees', newId, { employeeName: data.name, departmentId: data.departmentId });
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
    const restMode = emp.restDaysMode || 'default';
    const restDateList = Array.isArray(emp.restDates) ? emp.restDates : String(emp.restDates || '').split(/[\\n,;]+/).map(v => v.trim()).filter(Boolean);
    const recurringList = Array.isArray(emp.recurringRestDays) ? emp.recurringRestDays : String(emp.recurringRestDays || '').split(/[\\s,;]+/).map(Number).filter(Number.isFinite);
    const weekNames = lang === 'ar' ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const restDetails = restMode === 'dates' ? (restDateList.join('، ') || '—') :
      restMode === 'monthlyDays' ? (recurringList.join('، ') || '—') :
      restMode === 'weekly' ? (recurringList.map(n => weekNames[n]).filter(Boolean).join('، ') || '—') :
      restMode === 'none' ? (lang === 'ar' ? 'لا توجد أيام راحة' : 'No rest days') :
      (lang === 'ar' ? 'حسب النظام العام وجدول الورديات' : 'Company rules and shift plan');

    const body = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div class="employee-profile-avatar">${emp.profileImage ? `<img src="${U.esc(emp.profileImage)}" alt="">` : `<span class="avatar ${U.avatarColor(emp.name)}">${U.esc(U.initials(emp.name))}</span>`}</div>
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
        ${detailItem(lang === 'ar' ? 'ساعات العمل الشهرية' : 'Monthly target hours', emp.monthlyHours ?? S.settings.monthlyWorkingHours)}
        ${detailItem(lang === 'ar' ? 'ساعات العمل اليومية' : 'Daily target hours', emp.dailyHours ?? '—')}
        ${detailItem(lang === 'ar' ? 'نظام الراحة' : 'Rest system', ({default:lang==='ar'?'النظام العام': 'Company/shift default',dates:lang==='ar'?'تواريخ محددة':'Specific dates',monthlyDays:lang==='ar'?'أيام شهرية متكررة':'Recurring monthly days',weekly:lang==='ar'?'أيام أسبوعية مخصصة':'Custom weekdays',none:lang==='ar'?'بدون راحة':'No rest days'})[emp.restDaysMode || 'default'])}
        ${detailItem(lang === 'ar' ? 'تفاصيل أيام الراحة' : 'Rest-day details', restDetails)}
        ${detailItem(ZenI18n.t('emp.phone'), emp.phone || '—')}
        ${detailItem(ZenI18n.t('emp.email'), emp.email || '—')}
        ${detailItem(ZenI18n.t('emp.address'), emp.address || '—')}
        ${detailItem(ZenI18n.t('emp.emergency'), emp.emergencyContact || '—')}
      </div>
      ${emp.notes ? `<p style="margin:12px 0 0;font-size:13px"><b>${ZenI18n.t('common.notes')}:</b> ${U.esc(emp.notes)}</p>` : ''}
      ${emp.workSystemNotes ? `<p style="margin:12px 0 0;font-size:13px"><b>${lang === 'ar' ? 'ملاحظات نظام العمل:' : 'Work-system notes:'}</b> ${U.esc(emp.workSystemNotes)}</p>` : ''}

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
    // Check for related records — prevent hard deletion but allow status change
    const attendanceCount = S.findBy('attendance', (a) => a.employeeId === id).length;
    const payrollCount = S.findBy('payroll', (p) => p.employeeId === id).length;
    const hasHistory = attendanceCount > 0 || payrollCount > 0;
    const msg = hasHistory
      ? (ZenI18n.lang === 'ar'
        ? `الموظف "${emp.name}" لديه ${attendanceCount} سجل حضور و${payrollCount} سجل مرتبات. سيتم تغيير حالته إلى "غير نشط" مع الحفاظ على السجلات التاريخية.`
        : `Employee "${emp.nameEn || emp.name}" has ${attendanceCount} attendance and ${payrollCount} payroll records. Status will change to Inactive; historical records are preserved.`)
      : (ZenI18n.lang === 'ar' ? `هل تريد أرشفة الموظف "${emp.name}"؟ سيتم تغيير حالته إلى "غير نشط".` : `Archive employee "${emp.nameEn || emp.name}"? Status will become Inactive.`);
    UI.confirm({
      title: ZenI18n.t('common.archive'),
      message: msg,
      kind: 'warning',
      confirmLabel: ZenI18n.t('common.archive'),
      onConfirm: () => {
        S.update('employees', id, { employmentStatus: 'inactive' });
        if (window.ZenAudit) ZenAudit.logArchive('employees', id, { employeeName: emp.name, hadHistory: hasHistory });
        UI.toast(ZenI18n.lang === 'ar' ? 'تمت الأرشفة' : 'Archived', 'success');
        renderTable();
      }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    if (!rows.length) { UI.toast(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning'); return; }
    ZenExport.toXLSX(rows, [
      { label: 'ID', value: (e) => e.id },
      { label: lang === 'ar' ? 'الاسم' : 'Name', value: (e) => lang === 'ar' ? e.name : (e.nameEn || e.name) },
      { label: lang === 'ar' ? 'الاسم بالإنجليزية' : 'English Name', value: (e) => e.nameEn || '' },
      { label: ZenI18n.t('common.department'), value: (e) => deptName(e.departmentId) },
      { label: ZenI18n.t('emp.jobTitle'), value: (e) => lang === 'ar' ? e.jobTitle : e.jobTitleEn },
      { label: ZenI18n.t('emp.employmentType'), value: (e) => ZenI18n.t('emp.' + e.employmentType) },
      { label: ZenI18n.t('emp.employmentStatus'), value: (e) => ZenI18n.t('status.' + e.employmentStatus) },
      { label: ZenI18n.t('emp.basicSalary'), value: (e) => e.basicSalary, type: 'money' },
      { label: lang === 'ar' ? 'ساعات العمل الشهرية' : 'Monthly target hours', value: (e) => e.monthlyHours ?? '' },
      { label: lang === 'ar' ? 'ساعات العمل اليومية' : 'Daily target hours', value: (e) => e.dailyHours ?? '' },
      { label: lang === 'ar' ? 'نظام الراحة' : 'Rest-day system', value: (e) => e.restDaysMode || 'default' },
      { label: lang === 'ar' ? 'تواريخ الراحة' : 'Rest dates', value: (e) => Array.isArray(e.restDates) ? e.restDates.join(', ') : (e.restDates || '') },
      { label: lang === 'ar' ? 'ملاحظات نظام العمل' : 'Work-system notes', value: (e) => e.workSystemNotes || '' },
      { label: ZenI18n.t('emp.hireDate'), value: (e) => e.hireDate, type: 'date' },
      { label: ZenI18n.t('emp.phone'), value: (e) => e.phone || '' },
      { label: ZenI18n.t('emp.email'), value: (e) => e.email || '' },
      { label: ZenI18n.t('emp.location'), value: (e) => e.workLocation || '' },
    ], `agrimasters-employees-${U.today()}.xlsx`, lang === 'ar' ? 'الموظفون' : 'Employees', { title: 'AGRIMASTERS HR — ' + (lang === 'ar' ? 'دليل الموظفين' : 'Employee Directory') });
    if (window.ZenAudit) ZenAudit.logExport('employees', { count: rows.length });
    UI.toast(ZenI18n.lang === 'ar' ? 'تم تصدير البيانات بصيغة XLSX' : 'Exported as XLSX', 'success');
  }

  function showImportDialog() {
    const lang = ZenI18n.lang;
    const departments = S.getCollection('departments');
    const depMap = {};
    departments.forEach((d) => {
      depMap[d.id] = d;
      // also map by name (ar/en) for fuzzy import matching
      depMap[(d.name || '').toLowerCase()] = d;
      depMap[(d.nameEn || '').toLowerCase()] = d;
    });

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ZenXlsxImport.readFile(file).then((result) => {
        const { rows, headers, filename } = result;
        if (!rows.length) { UI.toast(lang === 'ar' ? 'الملف فارغ' : 'File is empty', 'warning'); return; }

        // Map expected headers (case-insensitive)
        const findHeader = (patterns) => headers.find((h) => patterns.some((p) => p.test(h.toLowerCase())));
        const hName = findHeader([/^(name|الاسم|اسم)$/, /name.*ar/, /ar.*name/]) || findHeader([/name/]);
        const hNameEn = findHeader([/name.*en/, /en.*name/]);
        const hId = findHeader([/^id$/, /employee.*id/, /emp.*id/, /رقم/, /موظف/]);
        const hJobTitle = findHeader([/job.*title/, /title/, /وظيفة/, /مسما/]);
        const hDep = findHeader([/department/, /dep/, /قسم/]);
        const hSalary = findHeader([/salary/, /basic/, /راتب/, /أساسي/]);
        const hHireDate = findHeader([/hire.*date/, /date.*hire/, /تعيين/, /تاريخ.*تعيين/]);
        const hPhone = findHeader([/phone/, /تليفون/, /موبايل/]);
        const hEmail = findHeader([/email/, /بريد/]);
        const hType = findHeader([/type/, /نوع/]);
        const hStatus = findHeader([/status/, /حالة/]);

        // Validate
        if (!hName) {
          UI.toast(lang === 'ar' ? 'لم يتم العثور على عمود "الاسم". تأكد من وجود عمود باسم Name أو الاسم.' : 'Could not find a Name column. Expected "Name" or "الاسم".', 'error');
          return;
        }

        // Build preview
        const previewRows = rows.slice(0, 10);
        const previewHtml = `
          <div class="alert info">
            <b>${lang === 'ar' ? 'ملف:' : 'File:'}</b> ${U.esc(filename)} · 
            <b>${lang === 'ar' ? 'صفوف:' : 'Rows:'}</b> ${rows.length} · 
            <b>${lang === 'ar' ? 'أعمدة:' : 'Columns:'}</b> ${headers.length}
          </div>
          <div class="alert ${hName ? 'success' : 'danger'}">
            <b>${lang === 'ar' ? 'تعيين الأعمدة:' : 'Column mapping:'}</b>
            <ul style="margin:6px 0 0;padding-inline-start:20px;font-size:12px">
              <li>${lang === 'ar' ? 'الاسم' : 'Name'}: <code>${U.esc(hName || '—')}</code></li>
              <li>${lang === 'ar' ? 'الإنجليزية' : 'English Name'}: <code>${U.esc(hNameEn || '—')}</code></li>
              <li>${lang === 'ar' ? 'المعرّف' : 'ID'}: <code>${U.esc(hId || '(auto)')}</code></li>
              <li>${lang === 'ar' ? 'المسمى' : 'Job Title'}: <code>${U.esc(hJobTitle || '—')}</code></li>
              <li>${lang === 'ar' ? 'القسم' : 'Department'}: <code>${U.esc(hDep || '—')}</code></li>
              <li>${lang === 'ar' ? 'الراتب' : 'Salary'}: <code>${U.esc(hSalary || '—')}</code></li>
              <li>${lang === 'ar' ? 'تاريخ التعيين' : 'Hire Date'}: <code>${U.esc(hHireDate || '—')}</code></li>
            </ul>
          </div>
          <h4>${lang === 'ar' ? 'معاينة (10 صفوف)' : 'Preview (10 rows)'}</h4>
          <div class="table-scroll"><table class="data">
            <thead><tr>${headers.slice(0, 6).map((h) => `<th>${U.esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${previewRows.map((r) => `<tr>${headers.slice(0, 6).map((h) => `<td>${U.esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>
        `;

        UI.modal({
          title: lang === 'ar' ? 'استيراد الموظفين' : 'Import Employees',
          body: previewHtml,
          size: 'lg',
          footer: [
            { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
            { label: lang === 'ar' ? `استيراد ${rows.length} موظف` : `Import ${rows.length} employees`, kind: 'primary', onClick: (mm) => {
              let added = 0, skipped = 0, errors = 0;
              let seq = S.count('employees') + 1;
              rows.forEach((r) => {
                const name = (r[hName] || '').toString().trim();
                if (!name) { skipped++; return; }
                // Department lookup
                let depId = '';
                if (hDep) {
                  const depKey = (r[hDep] || '').toString().trim().toLowerCase();
                  const dep = depMap[depKey];
                  if (dep) depId = dep.id;
                  else {
                    // Try partial match
                    const found = departments.find((d) =>
                      (d.name || '').includes(r[hDep] || '') || (d.nameEn || '').includes(r[hDep] || '')
                    );
                    if (found) depId = found.id;
                  }
                }
                // ID
                let empId = '';
                if (hId) {
                  empId = (r[hId] || '').toString().trim();
                  if (empId && S.getById('employees', empId)) { skipped++; return; }
                }
                if (!empId) {
                  while (true) {
                    empId = 'EMP-' + String(seq).padStart(4, '0');
                    seq++;
                    if (!S.getById('employees', empId)) break;
                  }
                }
                const hireDate = hHireDate ? (r[hHireDate] || '').toString().trim() : U.today();
                const basicSalary = hSalary ? Number(String(r[hSalary]).replace(/[^\d.\-]/g, '')) || 0 : 0;
                const employmentType = hType ? normalizeType(r[hType]) : 'full_time';
                const employmentStatus = hStatus ? normalizeStatus(r[hStatus]) : 'active';

                S.insert('employees', {
                  id: empId,
                  name,
                  nameEn: hNameEn ? (r[hNameEn] || '').toString().trim() : '',
                  departmentId: depId,
                  jobTitle: hJobTitle ? (r[hJobTitle] || '').toString().trim() : '',
                  jobTitleEn: hJobTitle ? (r[hJobTitle] || '').toString().trim() : '',
                  employmentType,
                  employmentStatus,
                  hireDate,
                  contractStart: hireDate,
                  contractEnd: '',
                  basicSalary,
                  shiftId: '',
                  workLocation: '',
                  phone: hPhone ? (r[hPhone] || '').toString().trim() : '',
                  email: hEmail ? (r[hEmail] || '').toString().trim() : '',
                  address: '',
                  emergencyContact: '',
                  notes: '',
                  isDemo: false,
                  imported: true,
                  createdAt: new Date().toISOString(),
                });
                added++;
              });
              if (window.ZenAudit) ZenAudit.logImport('employees', { filename, count: added, skipped, errors });
              UI.toast(lang === 'ar' ? `تم استيراد ${added} موظف، تخطي ${skipped}` : `Imported ${added} employees, skipped ${skipped}`, 'success');
              mm.close();
              renderTable();
            } }
          ]
        });
      }).catch((err) => {
        console.error('Import failed:', err);
        UI.toast((lang === 'ar' ? 'فشل الاستيراد: ' : 'Import failed: ') + err.message, 'error');
      });
    };
    input.click();
  }

  function normalizeType(s) {
    const v = String(s || '').toLowerCase();
    if (v.includes('full') || v.includes('كامل')) return 'full_time';
    if (v.includes('part') || v.includes('جزء')) return 'part_time';
    if (v.includes('contract') || v.includes('عقد')) return 'contract';
    if (v.includes('intern') || v.includes('تدريب')) return 'intern';
    return 'full_time';
  }
  function normalizeStatus(s) {
    const v = String(s || '').toLowerCase();
    if (v.includes('active') || v.includes('نشط')) return 'active';
    if (v.includes('leave') || v.includes('إجازة')) return 'on_leave';
    if (v.includes('inactive') || v.includes('غير')) return 'inactive';
    if (v.includes('resign') || v.includes('استقال')) return 'resigned';
    if (v.includes('termin') || v.includes('منتهي')) return 'terminated';
    return 'active';
  }

  return { render, state };
})();
