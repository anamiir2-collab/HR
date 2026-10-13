/* ============================================================
   AGRIMASTERS HR — Documents Module
   Employee document management: employment contracts, identity docs,
   qualifications, certificates, insurance docs, medical fitness, etc.
   Issue/expiry dates, expiry reminders, missing-document alerts,
   document categories, restricted access, status reports.
   ============================================================ */
window.ZenDocuments = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', categoryFilter: '', statusFilter: '', empFilter: '' };

  const CATEGORIES = [
    { id: 'contract', ar: 'عقد عمل', en: 'Employment Contract' },
    { id: 'national_id', ar: 'بطاقة هوية', en: 'National ID' },
    { id: 'passport', ar: 'جواز سفر', en: 'Passport' },
    { id: 'qualification', ar: 'مؤهل علمي', en: 'Educational Qualification' },
    { id: 'certificate', ar: 'شهادة', en: 'Certificate' },
    { id: 'insurance', ar: 'مستند تأمين', en: 'Insurance Document' },
    { id: 'medical', ar: 'لياقة طبية', en: 'Medical Fitness' },
    { id: 'police_record', ar: 'فيش جنائي', en: 'Police Record' },
    { id: 'military', ar: 'موقف تجنيد', en: 'Military Status' },
    { id: 'birth_certificate', ar: 'شهادة ميلاد', en: 'Birth Certificate' },
    { id: 'bank', ar: 'بيانات بنكية', en: 'Bank Details' },
    { id: 'other', ar: 'أخرى', en: 'Other' },
  ];

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const today = new Date();
    const records = S.getCollection('documents');
    const employees = S.getCollection('employees');

    // Compute statuses
    const annotated = records.map((r) => {
      let status = 'valid';
      if (!r.issueDate && !r.expiryDate) status = 'missing';
      else if (r.expiryDate && new Date(r.expiryDate) < today) status = 'expired';
      else if (r.expiryDate) {
        const days = (new Date(r.expiryDate) - today) / 86400000;
        if (days >= 0 && days <= 30) status = 'expiring';
      }
      return { ...r, _status: status };
    });

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="doc-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="doc-category-filter">
            <option value="">${lang === 'ar' ? 'كل الفئات' : 'All categories'}</option>
            ${CATEGORIES.map((cat) => `<option value="${cat.id}" ${state.categoryFilter === cat.id ? 'selected' : ''}>${lang === 'ar' ? cat.ar : cat.en}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <select id="doc-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="valid" ${state.statusFilter === 'valid' ? 'selected' : ''}>${lang === 'ar' ? 'ساري' : 'Valid'}</option>
            <option value="expiring" ${state.statusFilter === 'expiring' ? 'selected' : ''}>${lang === 'ar' ? 'ينتهي قريبًا' : 'Expiring Soon'}</option>
            <option value="expired" ${state.statusFilter === 'expired' ? 'selected' : ''}>${lang === 'ar' ? 'منتهي' : 'Expired'}</option>
            <option value="missing" ${state.statusFilter === 'missing' ? 'selected' : ''}>${lang === 'ar' ? 'مفقود' : 'Missing'}</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="doc-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="doc-add">${lang === 'ar' ? 'إضافة مستند' : 'Add Document'}</button>
        </div>
      </div>
      <div id="doc-summary" class="stat-grid mb-16"></div>
      <div id="doc-table-wrap"></div>
      <div id="doc-pagination"></div>
    `;

    document.getElementById('doc-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('doc-category-filter').onchange = (e) => { state.categoryFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('doc-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('doc-add').onclick = () => showForm();
    document.getElementById('doc-export').onclick = () => exportData();

    state._annotated = annotated;
    renderTable();
  }

  function getFiltered() {
    let rows = state._annotated || [];
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.categoryFilter) rows = rows.filter((r) => r.category === state.categoryFilter);
    if (state.statusFilter) rows = rows.filter((r) => r._status === state.statusFilter);
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const e = empMap[r.employeeId];
        return (e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))) ||
          (r.title || '').toLowerCase().includes(q) ||
          (r.number || '').toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => {
      // Expiring/expired first, then by expiry date
      const order = { expired: 0, expiring: 1, missing: 2, valid: 3 };
      if (order[a._status] !== order[b._status]) return order[a._status] - order[b._status];
      return (a.expiryDate || '9999') < (b.expiryDate || '9999') ? -1 : 1;
    });
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('doc-table-wrap');
    const pageWrap = document.getElementById('doc-pagination');
    const summary = document.getElementById('doc-summary');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    const today = new Date();

    if (summary) {
      const valid = filtered.filter((r) => r._status === 'valid').length;
      const expiring = filtered.filter((r) => r._status === 'expiring').length;
      const expired = filtered.filter((r) => r._status === 'expired').length;
      const missing = filtered.filter((r) => r._status === 'missing').length;
      summary.innerHTML = `
        ${miniStat('✓', 'success', lang === 'ar' ? 'سارية' : 'Valid', valid)}
        ${miniStat('!', 'warning', lang === 'ar' ? 'تنتهي قريبًا' : 'Expiring', expiring)}
        ${miniStat('✕', 'danger', lang === 'ar' ? 'منتهية' : 'Expired', expired)}
        ${miniStat('?', 'gray', lang === 'ar' ? 'مفقودة' : 'Missing', missing)}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId); } },
        { label: lang === 'ar' ? 'الفئة' : 'Category', render: (r) => U.esc(translateCategory(r.category)) },
        { label: lang === 'ar' ? 'العنوان' : 'Title', render: (r) => `<b>${U.esc(r.title || '—')}</b>${r.number ? `<br><small>${U.esc(r.number)}</small>` : ''}` },
        { label: lang === 'ar' ? 'الإصدار' : 'Issue Date', render: (r) => U.date(r.issueDate) },
        { label: lang === 'ar' ? 'الانتهاء' : 'Expiry Date', render: (r) => {
          if (!r.expiryDate) return '<span class="muted">—</span>';
          const days = Math.round((new Date(r.expiryDate) - today) / 86400000);
          return `<b>${U.date(r.expiryDate)}</b>${days >= 0 && days <= 60 ? `<br><small style="color:var(--warning-700)">${days} ${lang === 'ar' ? 'يوم متبقي' : 'days left'}</small>` : ''}`;
        } },
        { label: ZenI18n.t('common.status'), render: (r) => statusChip(r._status) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (r) => `<div class="row-actions">
          <button class="btn sm ghost" data-view="${r.id}" title="${ZenI18n.t('common.view')}">👁</button>
          <button class="btn sm ghost" data-edit="${r.id}" title="${ZenI18n.t('common.edit')}">✎</button>
          <button class="btn sm ghost" data-del="${r.id}" title="${ZenI18n.t('common.delete')}">🗑</button>
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => showDetail(b.dataset.view));
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));
    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(U.num(value))}</div></div>`;
  }

  function statusChip(s) {
    const lang = ZenI18n.lang;
    const map = {
      valid: { cls: 'valid', label: lang === 'ar' ? 'ساري' : 'Valid' },
      expiring: { cls: 'expiring', label: lang === 'ar' ? 'ينتهي قريبًا' : 'Expiring' },
      expired: { cls: 'expired', label: lang === 'ar' ? 'منتهي' : 'Expired' },
      missing: { cls: 'missing', label: lang === 'ar' ? 'مفقود' : 'Missing' },
    };
    const m = map[s] || map.missing;
    return `<span class="doc-status ${m.cls}">${U.esc(m.label)}</span>`;
  }

  function translateCategory(c) {
    const found = CATEGORIES.find((x) => x.id === c);
    if (!found) return c || '—';
    return ZenI18n.lang === 'ar' ? found.ar : found.en;
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('documents', id) : null;
    const employees = S.getCollection('employees');

    const body = `
      <form id="doc-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: lang === 'ar' ? 'الفئة' : 'Category', name: 'category', type: 'select', value: rec?.category || 'contract', required: true, options: CATEGORIES.map((c) => ({ value: c.id, label: lang === 'ar' ? c.ar : c.en })) })}
        ${UI.formField({ label: lang === 'ar' ? 'العنوان' : 'Title', name: 'title', value: rec?.title, required: true, placeholder: lang === 'ar' ? 'مثال: عقد عمل محدد المدة' : 'e.g. Fixed-term employment contract' })}
        ${UI.formField({ label: lang === 'ar' ? 'رقم المستند' : 'Document Number', name: 'number', value: rec?.number })}
        ${UI.formField({ label: lang === 'ar' ? 'جهة الإصدار' : 'Issuing Authority', name: 'issuingAuthority', value: rec?.issuingAuthority })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الإصدار' : 'Issue Date', name: 'issueDate', type: 'date', value: rec?.issueDate })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date', name: 'expiryDate', type: 'date', value: rec?.expiryDate })}
        ${UI.formField({ label: lang === 'ar' ? 'تذكير قبل (أيام)' : 'Reminder (days before)', name: 'reminderDays', type: 'number', value: rec?.reminderDays || 30, attrs: ' min="1"' })}
        ${UI.formField({ label: lang === 'ar' ? 'مكان الحفظ' : 'Storage Location', name: 'storageLocation', value: rec?.storageLocation, placeholder: lang === 'ar' ? 'مثال: خزانة الملفات - درج 3' : 'e.g. Filing cabinet - drawer 3' })}
        ${UI.formField({ label: lang === 'ar' ? 'حساس؟' : 'Confidential?', name: 'confidential', type: 'select', value: rec?.confidential ? 'yes' : 'no', options: [{ value: 'no', label: lang === 'ar' ? 'لا' : 'No' }, { value: 'yes', label: lang === 'ar' ? 'نعم' : 'Yes' }] })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
      <div class="alert info mt-16">
        <b>${lang === 'ar' ? 'ملاحظة:' : 'Note:'}</b>
        ${lang === 'ar' ? 'لا يتم رفع الملفات الفعلية في هذا الإصدار. سجّل مكان الحفظ الفعلي (خزانة، درج، مجلد) للوصول إليه لاحقًا. للمستندات الحساسة، قيّد الوصول للمستخدمين المخولين فقط.' : 'Actual file uploads are not supported in this version. Record the physical storage location (cabinet, drawer, folder) for retrieval. For confidential documents, restrict access to authorized users only.'}
      </div>
    `;

    UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل مستند' : 'Edit Document') : (lang === 'ar' ? 'إضافة مستند جديد' : 'Add New Document'),
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
    const form = body.querySelector('#doc-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = UI.readForm(form);
    if (!data.employeeId || !data.title) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
    data.confidential = data.confidential === 'yes';
    data.reminderDays = Number(data.reminderDays) || 30;
    if (id) {
      S.update('documents', id, data);
      ZenAudit.logUpdate('documents', id, { fields: Object.keys(data) });
      UI.toast(lang === 'ar' ? 'تم تحديث المستند' : 'Document updated', 'success');
    } else {
      const newId = 'DOC-' + Date.now().toString(36).toUpperCase();
      S.insert('documents', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString(), createdBy: (ZenAuth.currentUser() || {}).user || 'admin' });
      ZenAudit.logCreate('documents', newId, { employeeId: data.employeeId, category: data.category, title: data.title });
      UI.toast(lang === 'ar' ? 'تمت إضافة المستند' : 'Document added', 'success');
    }
    modal.close();
    render();
  }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const r = S.getById('documents', id);
    if (!r) return;
    const emp = S.getById('employees', r.employeeId);
    const today = new Date();
    let status = 'valid';
    if (r.expiryDate && new Date(r.expiryDate) < today) status = 'expired';
    else if (r.expiryDate) {
      const days = (new Date(r.expiryDate) - today) / 86400000;
      if (days >= 0 && days <= 30) status = 'expiring';
    }

    UI.modal({
      title: lang === 'ar' ? 'تفاصيل المستند' : 'Document Details',
      subtitle: r.id,
      size: 'md',
      body: `
        <div style="margin-bottom:16px">${emp ? UI.avatarCell(lang === 'ar' ? emp.name : (emp.nameEn || emp.name), emp.id) : ''}</div>
        <div class="form-grid">
          <div><b>${lang === 'ar' ? 'الفئة' : 'Category'}:</b> ${U.esc(translateCategory(r.category))}</div>
          <div><b>${lang === 'ar' ? 'العنوان' : 'Title'}:</b> ${U.esc(r.title)}</div>
          <div><b>${lang === 'ar' ? 'رقم المستند' : 'Number'}:</b> ${U.esc(r.number || '—')}</div>
          <div><b>${lang === 'ar' ? 'جهة الإصدار' : 'Issuing Authority'}:</b> ${U.esc(r.issuingAuthority || '—')}</div>
          <div><b>${lang === 'ar' ? 'الإصدار' : 'Issue Date'}:</b> ${U.date(r.issueDate)}</div>
          <div><b>${lang === 'ar' ? 'الانتهاء' : 'Expiry Date'}:</b> ${U.date(r.expiryDate)}</div>
          <div><b>${lang === 'ar' ? 'الحالة' : 'Status'}:</b> ${statusChip(status)}</div>
          <div><b>${lang === 'ar' ? 'مكان الحفظ' : 'Storage'}:</b> ${U.esc(r.storageLocation || '—')}</div>
          <div><b>${lang === 'ar' ? 'حساس' : 'Confidential'}:</b> ${r.confidential ? UI.badge(lang === 'ar' ? 'نعم' : 'Yes', 'danger') : UI.badge(lang === 'ar' ? 'لا' : 'No', 'gray')}</div>
          <div><b>${lang === 'ar' ? 'تذكير قبل' : 'Reminder'}:</b> ${r.reminderDays || 30} ${lang === 'ar' ? 'يوم' : 'days'}</div>
        </div>
        ${r.notes ? `<div style="margin-top:12px"><b>${ZenI18n.t('common.notes')}:</b><p>${U.esc(r.notes)}</p></div>` : ''}
      `,
      footer: [
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.edit'), kind: 'primary', onClick: (mm) => { mm.close(); showForm(id); } },
      ]
    });
  }

  function del(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف هذا المستند؟' : 'Delete this document?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => {
        S.remove('documents', id);
        ZenAudit.logDelete('documents', id, {});
        UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
        render();
      }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    if (!rows.length) { UI.toast(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning'); return; }
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toXLSX(rows, [
      { label: 'Document ID', value: (r) => r.id },
      { label: lang === 'ar' ? 'الموظف' : 'Employee', value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
      { label: 'Employee ID', value: (r) => r.employeeId },
      { label: lang === 'ar' ? 'الفئة' : 'Category', value: (r) => translateCategory(r.category) },
      { label: lang === 'ar' ? 'العنوان' : 'Title', value: (r) => r.title || '' },
      { label: lang === 'ar' ? 'رقم المستند' : 'Number', value: (r) => r.number || '' },
      { label: lang === 'ar' ? 'جهة الإصدار' : 'Issuing Authority', value: (r) => r.issuingAuthority || '' },
      { label: lang === 'ar' ? 'الإصدار' : 'Issue Date', value: (r) => r.issueDate || '', type: 'date' },
      { label: lang === 'ar' ? 'الانتهاء' : 'Expiry Date', value: (r) => r.expiryDate || '', type: 'date' },
      { label: lang === 'ar' ? 'الحالة' : 'Status', value: (r) => r._status },
      { label: lang === 'ar' ? 'مكان الحفظ' : 'Storage', value: (r) => r.storageLocation || '' },
      { label: lang === 'ar' ? 'حساس' : 'Confidential', value: (r) => r.confidential ? 'Yes' : 'No' },
    ], `documents-${U.today()}.xlsx`, 'Documents');
    ZenAudit.logExport('documents', { count: rows.length });
    UI.toast(lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
