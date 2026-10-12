/* ============================================================
   ZenHR — Departments Module
   ============================================================ */
window.ZenDepartments = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { search: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const employees = S.getCollection('employees');
    const departments = S.getCollection('departments');

    const q = state.search.trim().toLowerCase();
    const filtered = q ? departments.filter((d) => d.name.toLowerCase().includes(q) || (d.nameEn || '').toLowerCase().includes(q)) : departments;

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="dep-search" placeholder="${lang === 'ar' ? 'ابحث عن قسم...' : 'Search departments...'}" value="${U.esc(state.search)}">
        </label>
        <div class="actions">
          <button class="btn primary" id="dep-add">${lang === 'ar' ? 'إضافة قسم' : 'Add Department'}</button>
        </div>
      </div>
      <div class="grid-auto" id="dep-grid"></div>
    `;

    document.getElementById('dep-search').oninput = U.debounce((e) => { state.search = e.target.value; render(); }, 200);
    document.getElementById('dep-add').onclick = () => showForm();

    const grid = document.getElementById('dep-grid');
    if (filtered.length === 0) {
      grid.innerHTML = UI.empty('∅', ZenI18n.t('common.empty'), '');
      return;
    }

    grid.innerHTML = filtered.map((d) => {
      const count = employees.filter((e) => e.departmentId === d.id && e.employmentStatus === 'active').length;
      const mgr = d.managerId ? S.getById('employees', d.managerId) : null;
      return `<div class="card" style="cursor:pointer" data-edit="${d.id}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div>
            <h3 style="margin:0 0 4px">${U.esc(lang === 'ar' ? d.name : d.nameEn)}</h3>
            <p style="margin:0;font-size:12px;color:var(--text-muted)">${U.esc(lang === 'ar' ? d.nameEn : d.name)}</p>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn sm ghost" data-edit-stop="${d.id}">✎</button>
            <button class="btn sm ghost" data-del="${d.id}">🗑</button>
          </div>
        </div>
        <p style="margin:12px 0;font-size:12px;color:var(--text-muted)">${U.esc(d.description || '')}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--border)">
          <div>
            <small style="color:var(--text-muted);font-size:11px">${lang === 'ar' ? 'عدد الموظفين' : 'Employees'}</small>
            <div style="font-size:18px;font-weight:700;color:var(--brand-700)">${count}</div>
          </div>
          <div style="text-align:end">
            <small style="color:var(--text-muted);font-size:11px">${lang === 'ar' ? 'المدير' : 'Manager'}</small>
            <div style="font-size:13px;font-weight:600">${mgr ? U.esc(mgr.name) : '—'}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-edit], [data-edit-stop]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); showForm(b.dataset.edit || b.dataset.editStop); });
    grid.querySelectorAll('[data-del]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); del(b.dataset.del); });
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const dep = id ? S.getById('departments', id) : null;
    const employees = S.getCollection('employees');
    const body = `
      <form id="dep-form">
        ${UI.formField({ label: lang === 'ar' ? 'اسم القسم (عربي)' : 'Department Name (Arabic)', name: 'name', value: dep?.name, required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)', name: 'nameEn', value: dep?.nameEn })}
        ${UI.formField({ label: lang === 'ar' ? 'الوصف' : 'Description', name: 'description', type: 'textarea', value: dep?.description })}
        ${UI.formField({ label: lang === 'ar' ? 'المدير' : 'Manager', name: 'managerId', type: 'select', value: dep?.managerId || '', options: [{ value: '', label: '—' }, ...employees.filter((e) => /مدير|Manager/.test(e.jobTitle)).map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
      </form>
    `;
    const m = UI.modal({
      title: dep ? (lang === 'ar' ? 'تعديل قسم' : 'Edit Department') : (lang === 'ar' ? 'إضافة قسم' : 'Add Department'),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#dep-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (id) {
            S.update('departments', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'dep-' + Date.now().toString(36);
            S.insert('departments', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تمت الإضافة' : 'Added', 'success');
          }
          mm.close(); render();
        } }
      ]
    });
  }

  function del(id) {
    const employees = S.getCollection('employees');
    const hasEmps = employees.some((e) => e.departmentId === id);
    if (hasEmps) {
      UI.confirm({
        title: ZenI18n.t('common.delete'),
        message: ZenI18n.lang === 'ar' ? 'لا يمكن حذف قسم يحتوي على موظفين. الرجاء إعادة تعيين الموظفين أولاً.' : 'Cannot delete a department with employees. Please reassign employees first.',
        kind: 'danger',
        confirmLabel: ZenI18n.t('common.confirm'),
      });
      return;
    }
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'تأكيد حذف القسم؟' : 'Delete department?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('departments', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); render(); }
    });
  }

  return { render };
})();
