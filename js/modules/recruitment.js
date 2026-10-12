/* ============================================================
   ZenHR — Recruitment Module (Vacancies + Candidates)
   ============================================================ */
window.ZenRecruitment = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { tab: 'vacancies', search: '', statusFilter: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const vacancies = S.getCollection('vacancies');
    const candidates = S.getCollection('candidates');

    c.innerHTML = `
      <div class="toolbar">
        <div class="tabs" style="margin:0;border:none">
          <div class="tab ${state.tab === 'vacancies' ? 'active' : ''}" data-tab="vacancies">${lang === 'ar' ? 'الوظائف الشاغرة' : 'Vacancies'} (${vacancies.length})</div>
          <div class="tab ${state.tab === 'candidates' ? 'active' : ''}" data-tab="candidates">${lang === 'ar' ? 'المرشحون' : 'Candidates'} (${candidates.length})</div>
        </div>
        <div class="spacer"></div>
        <div class="actions">
          <button class="btn primary" id="rc-add">${state.tab === 'vacancies' ? (lang === 'ar' ? 'إضافة وظيفة' : 'Add Vacancy') : (lang === 'ar' ? 'إضافة مرشح' : 'Add Candidate')}</button>
        </div>
      </div>
      <div id="rc-list"></div>
    `;

    c.querySelectorAll('.tab').forEach((t) => t.onclick = () => { state.tab = t.dataset.tab; render(); });
    document.getElementById('rc-add').onclick = () => state.tab === 'vacancies' ? showVacancyForm() : showCandidateForm();

    if (state.tab === 'vacancies') renderVacancies();
    else renderCandidates();
  }

  function renderVacancies() {
    const lang = ZenI18n.lang;
    const list = document.getElementById('rc-list');
    const vacancies = S.getCollection('vacancies');
    const departments = S.getCollection('departments');
    const candidates = S.getCollection('candidates');

    if (vacancies.length === 0) {
      list.innerHTML = UI.empty('∅', ZenI18n.t('common.empty'), '');
      return;
    }

    list.innerHTML = `<div class="grid-auto">` + vacancies.map((v) => {
      const dep = S.getById('departments', v.departmentId);
      const count = candidates.filter((c) => c.vacancyId === v.id).length;
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h3 style="margin:0 0 4px">${U.esc(v.jobTitle)}</h3>
            <p style="margin:0;font-size:12px;color:var(--text-muted)">${U.esc(dep ? (lang === 'ar' ? dep.name : dep.nameEn) : '—')}</p>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn sm ghost" data-edit="${v.id}">✎</button>
            <button class="btn sm ghost" data-del="${v.id}">🗑</button>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--border)">
          <div><small style="color:var(--text-muted);font-size:11px">${lang === 'ar' ? 'مرشحون' : 'Candidates'}</small><div style="font-size:18px;font-weight:700;color:var(--brand-700)">${count}</div></div>
          ${v.status === 'open' ? UI.badge(lang === 'ar' ? 'مفتوحة' : 'Open', 'success') : UI.badge(lang === 'ar' ? 'مغلقة' : 'Closed', 'gray')}
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">${lang === 'ar' ? 'فتح:' : 'Opened:'} ${U.date(v.openingDate)} ${v.closingDate ? ' · ' + (lang === 'ar' ? 'إغلاق:' : 'Closes:') + ' ' + U.date(v.closingDate) : ''}</div>
      </div>`;
    }).join('') + '</div>';

    list.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showVacancyForm(b.dataset.edit));
    list.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => delVacancy(b.dataset.del));
  }

  function renderCandidates() {
    const lang = ZenI18n.lang;
    const list = document.getElementById('rc-list');
    const candidates = S.getCollection('candidates');
    const vacancies = S.getCollection('vacancies');
    const vMap = {};
    vacancies.forEach((v) => vMap[v.id] = v);

    list.innerHTML = UI.buildTable({
      columns: [
        { label: lang === 'ar' ? 'المرشح' : 'Candidate', render: (c) => UI.avatarCell(c.name, c.email) },
        { label: lang === 'ar' ? 'الوظيفة' : 'Vacancy', render: (c) => U.esc(vMap[c.vacancyId]?.jobTitle || '—') },
        { label: lang === 'ar' ? 'تاريخ التقديم' : 'Applied', render: (c) => U.date(c.applicationDate) },
        { label: lang === 'ar' ? 'المرحلة' : 'Stage', render: (c) => {
          const stageMap = { new: { label: lang === 'ar' ? 'جديد' : 'New', kind: 'info' }, screening: { label: lang === 'ar' ? 'فحص' : 'Screening', kind: 'info' }, interview: { label: lang === 'ar' ? 'مقابلة' : 'Interview', kind: 'warning' }, offer: { label: lang === 'ar' ? 'عرض' : 'Offer', kind: 'brand' }, hired: { label: lang === 'ar' ? 'تم التعيين' : 'Hired', kind: 'success' }, rejected: { label: lang === 'ar' ? 'مرفوض' : 'Rejected', kind: 'danger' } };
          const s = stageMap[c.stage] || stageMap.new;
          return UI.badge(s.label, s.kind);
        } },
        { label: lang === 'ar' ? 'القرار' : 'Decision', render: (c) => U.esc(c.decision || '—') },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (c) => `<div class="row-actions">
          <button class="btn sm ghost" data-edit="${c.id}">✎</button>
          <button class="btn sm ghost" data-del="${c.id}">🗑</button>
        </div>` }
      ],
      rows: candidates,
    });

    list.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showCandidateForm(b.dataset.edit));
    list.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => delCandidate(b.dataset.del));
  }

  function showVacancyForm(id) {
    const lang = ZenI18n.lang;
    const v = id ? S.getById('vacancies', id) : null;
    const departments = S.getCollection('departments');
    const body = `
      <form id="vc-form" class="form-grid">
        ${UI.formField({ label: lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title', name: 'jobTitle', value: v?.jobTitle, required: true })}
        ${UI.formField({ label: ZenI18n.t('common.department'), name: 'departmentId', type: 'select', value: v?.departmentId, options: [{ value: '', label: '—' }, ...departments.map((d) => ({ value: d.id, label: (lang === 'ar' ? d.name : d.nameEn) }))] })}
        ${UI.formField({ label: lang === 'ar' ? 'الحالة' : 'Status', name: 'status', type: 'select', value: v?.status || 'open', options: [
          { value: 'open', label: lang === 'ar' ? 'مفتوحة' : 'Open' },
          { value: 'closed', label: lang === 'ar' ? 'مغلقة' : 'Closed' },
        ] })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الفتح' : 'Opening Date', name: 'openingDate', type: 'date', value: v?.openingDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الإغلاق' : 'Closing Date', name: 'closingDate', type: 'date', value: v?.closingDate })}
      </form>
    `;
    const m = UI.modal({
      title: v ? (lang === 'ar' ? 'تعديل وظيفة' : 'Edit Vacancy') : (lang === 'ar' ? 'إضافة وظيفة' : 'Add Vacancy'),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#vc-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (id) {
            S.update('vacancies', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'vc-' + Date.now().toString(36);
            S.insert('vacancies', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); render();
        } }
      ]
    });
  }

  function showCandidateForm(id) {
    const lang = ZenI18n.lang;
    const c = id ? S.getById('candidates', id) : null;
    const vacancies = S.getCollection('vacancies').filter((v) => v.status === 'open');
    const body = `
      <form id="cd-form" class="form-grid">
        ${UI.formField({ label: lang === 'ar' ? 'الوظيفة' : 'Vacancy', name: 'vacancyId', type: 'select', value: c?.vacancyId, required: true, options: [{ value: '', label: '—' }, ...vacancies.map((v) => ({ value: v.id, label: v.jobTitle })) ] })}
        ${UI.formField({ label: lang === 'ar' ? 'اسم المرشح' : 'Candidate Name', name: 'name', value: c?.name, required: true })}
        ${UI.formField({ label: ZenI18n.t('emp.email'), name: 'email', type: 'email', value: c?.email })}
        ${UI.formField({ label: ZenI18n.t('emp.phone'), name: 'phone', type: 'tel', value: c?.phone })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ التقديم' : 'Application Date', name: 'applicationDate', type: 'date', value: c?.applicationDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'المرحلة' : 'Stage', name: 'stage', type: 'select', value: c?.stage || 'new', options: [
          { value: 'new', label: lang === 'ar' ? 'جديد' : 'New' },
          { value: 'screening', label: lang === 'ar' ? 'فحص' : 'Screening' },
          { value: 'interview', label: lang === 'ar' ? 'مقابلة' : 'Interview' },
          { value: 'offer', label: lang === 'ar' ? 'عرض' : 'Offer' },
          { value: 'hired', label: lang === 'ar' ? 'تم التعيين' : 'Hired' },
          { value: 'rejected', label: lang === 'ar' ? 'مرفوض' : 'Rejected' },
        ] })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ المقابلة' : 'Interview Date', name: 'interviewDate', type: 'date', value: c?.interviewDate })}
        ${UI.formField({ label: lang === 'ar' ? 'القرار' : 'Decision', name: 'decision', value: c?.decision })}
        <label class="field full"><span>${lang === 'ar' ? 'ملاحظات المقابلة' : 'Interview Notes'}</span><textarea name="interviewNotes" rows="2">${U.esc(c?.interviewNotes || '')}</textarea></label>
      </form>
      <p style="font-size:11px;color:var(--text-muted)">🚫 ${lang === 'ar' ? 'لا يتم إنشاء حسابات للمرشحين' : 'No candidate accounts are created'}</p>
    `;
    const m = UI.modal({
      title: c ? (lang === 'ar' ? 'تعديل مرشح' : 'Edit Candidate') : (lang === 'ar' ? 'إضافة مرشح' : 'Add Candidate'),
      body, size: 'lg',
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#cd-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.vacancyId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          if (id) {
            S.update('candidates', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'cd-' + Date.now().toString(36);
            S.insert('candidates', { id: newId, ...data, hiredEmployeeId: null, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); render();
        } }
      ]
    });
  }

  function delVacancy(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف الوظيفة؟ سيتم الاحتفاظ بالمرشحين.' : 'Delete vacancy? Candidates will be preserved.',
      kind: 'danger', confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('vacancies', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); render(); }
    });
  }
  function delCandidate(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف المرشح؟' : 'Delete candidate?',
      kind: 'danger', confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('candidates', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); render(); }
    });
  }

  return { render };
})();
