/* ============================================================
   ZenHR — Insurance & Taxes Module
   Note: Calculations are placeholders for demo/testing only,
   not legally verified. Update rates in Settings.
   ============================================================ */
window.ZenInsurance = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { search: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const records = S.getCollection('insurance');
    const employees = S.getCollection('employees');
    const empMap = {};
    employees.forEach((e) => empMap[e.id] = e);

    const q = state.search.trim().toLowerCase();
    const filtered = q ? records.filter((r) => {
      const e = empMap[r.employeeId];
      return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
    }) : records;

    const totalEmp = records.reduce((s, r) => s + r.employeeContribution, 0);
    const totalEmr = records.reduce((s, r) => s + r.employerContribution, 0);
    const activeEmployees = employees.filter((e) => e.employmentStatus === 'active');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="ins-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <div class="actions">
          <button class="btn primary" id="ins-add">${lang === 'ar' ? 'إضافة سجل تأمين' : 'Add Insurance Record'}</button>
        </div>
      </div>

      <div class="stat-grid mb-16">
        ${miniStat('⟨', 'brand', lang === 'ar' ? 'مساهمة الموظفين (شهري)' : 'Employee Contribution', U.money(totalEmp))}
        ${miniStat('⟩', 'info', lang === 'ar' ? 'مساهمة صاحب العمل (شهري)' : 'Employer Contribution', U.money(totalEmr))}
        ${miniStat('=', 'success', lang === 'ar' ? 'الإجمالي الشهري' : 'Total Monthly', U.money(totalEmp + totalEmr))}
        ${miniStat('▢', 'gray', lang === 'ar' ? 'سجلات التأمين' : 'Insurance Records', records.length)}
      </div>

      <div class="card mb-16">
        <div class="card-head">
          <div>
            <h3>${lang === 'ar' ? 'إعدادات التأمين والضرائب' : 'Insurance & Tax Settings'}</h3>
            <p style="color:var(--warning-700);font-size:12px">⚠ ${lang === 'ar' ? 'قيم تجريبية للأغراض التوضيحية فقط - راجع المعدلات القانونية الحالية' : 'Demo values for illustration only — verify against current legal rates'}</p>
          </div>
          <button class="btn sm secondary" id="ins-settings">${lang === 'ar' ? 'تعديل' : 'Edit'}</button>
        </div>
        <div class="detail-grid">
          ${detailItem(lang === 'ar' ? 'نسبة الموظف' : 'Employee Rate', S.settings.insuranceEmployeeRate + '%')}
          ${detailItem(lang === 'ar' ? 'نسبة صاحب العمل' : 'Employer Rate', S.settings.insuranceEmployerRate + '%')}
          ${detailItem(lang === 'ar' ? 'شرائح الضرائب' : 'Tax Brackets', S.settings.taxBrackets.length + ' ' + (lang === 'ar' ? 'شرائح' : 'brackets'))}
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-scroll">
          <table class="data">
            <thead><tr>
              <th>${ZenI18n.t('common.employee')}</th>
              <th>${lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</th>
              <th>${lang === 'ar' ? 'مساهمة الموظف' : 'Employee Part'}</th>
              <th>${lang === 'ar' ? 'مساهمة صاحب العمل' : 'Employer Part'}</th>
              <th>${lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
              <th>${ZenI18n.t('common.actions')}</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? `<tr><td colspan="6">${UI.empty('∅', ZenI18n.t('common.empty'), '')}</td></tr>` :
                filtered.slice(0, 100).map((r) => {
                  const e = empMap[r.employeeId];
                  const total = r.employeeContribution + r.employerContribution;
                  return `<tr>
                    <td>${e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId)}</td>
                    <td>${e ? U.money(e.basicSalary) : '—'}</td>
                    <td>${U.money(r.employeeContribution)}</td>
                    <td>${U.money(r.employerContribution)}</td>
                    <td><b>${U.money(total)}</b></td>
                    <td><div class="row-actions">
                      <button class="btn sm ghost" data-edit="${r.id}">✎</button>
                      <button class="btn sm ghost" data-del="${r.id}">🗑</button>
                    </div></td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('ins-search').oninput = U.debounce((e) => { state.search = e.target.value; render(); }, 200);
    document.getElementById('ins-add').onclick = () => showForm();
    document.getElementById('ins-settings').onclick = () => showSettings();
    c.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    c.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(value)}</div></div>`;
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><span class="label">${U.esc(label)}</span><span class="value">${U.esc(value)}</span></div>`;
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('insurance', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active');
    const body = `
      <form id="ins-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name })) ] })}
        ${UI.formField({ label: lang === 'ar' ? 'مساهمة الموظف (شهري)' : 'Employee Contribution', name: 'employeeContribution', type: 'number', value: rec?.employeeContribution, required: true, attrs: ' min="0" step="10"' })}
        ${UI.formField({ label: lang === 'ar' ? 'مساهمة صاحب العمل (شهري)' : 'Employer Contribution', name: 'employerContribution', type: 'number', value: rec?.employerContribution, required: true, attrs: ' min="0" step="10"' })}
        ${UI.formField({ label: ZenI18n.t('common.date'), name: 'effectiveDate', type: 'date', value: rec?.effectiveDate || U.today(), required: true })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
      <p style="font-size:11px;color:var(--text-muted)">⚠ ${lang === 'ar' ? 'القيم تقديرية، يرجى مراجعة المعدلات القانونية الحالية' : 'Values are estimates — verify with current legal rates'}</p>
    `;
    const m = UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل سجل تأمين' : 'Edit Insurance') : (lang === 'ar' ? 'إضافة سجل تأمين' : 'Add Insurance'),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#ins-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          data.employeeContribution = Number(data.employeeContribution) || 0;
          data.employerContribution = Number(data.employerContribution) || 0;
          if (id) {
            S.update('insurance', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'ins-' + data.employeeId + '-' + Date.now().toString(36);
            S.insert('insurance', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); render();
        } }
      ]
    });
  }

  function showSettings() {
    const lang = ZenI18n.lang;
    const s = S.settings;
    const body = `
      <form id="ins-set-form" class="form-grid">
        ${UI.formField({ label: lang === 'ar' ? 'نسبة مساهمة الموظف %' : 'Employee Rate %', name: 'insuranceEmployeeRate', type: 'number', value: s.insuranceEmployeeRate, attrs: ' min="0" step="0.5"' })}
        ${UI.formField({ label: lang === 'ar' ? 'نسبة مساهمة صاحب العمل %' : 'Employer Rate %', name: 'insuranceEmployerRate', type: 'number', value: s.insuranceEmployerRate, attrs: ' min="0" step="0.5"' })}
        <div class="full"><span style="font-size:12px;font-weight:600">${lang === 'ar' ? 'شرائح الضريبة' : 'Tax Brackets'}</span></div>
        <div class="full" id="brackets-list">
          ${s.taxBrackets.map((b, i) => `
            <div style="display:flex;gap:8px;margin-bottom:6px">
              <input type="number" name="upTo-${i}" value="${b.upTo === Infinity ? '' : b.upTo}" placeholder="${lang === 'ar' ? 'حتى' : 'Up to'}" style="flex:1">
              <input type="number" name="rate-${i}" value="${b.rate}" step="0.05" placeholder="${lang === 'ar' ? 'النسبة' : 'Rate'}" style="width:80px">
            </div>
          `).join('')}
        </div>
      </form>
      <p style="font-size:11px;color:var(--warning-700)">⚠ ${lang === 'ar' ? 'تأكد من مراجعة المعدلات القانونية الحالية في بلدك قبل الاعتماد عليها' : 'Verify against current legal rates in your country before relying on these values'}</p>
    `;
    const m = UI.modal({
      title: lang === 'ar' ? 'إعدادات التأمين والضرائب' : 'Insurance & Tax Settings',
      size: 'lg',
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#ins-set-form');
          const data = UI.readForm(form);
          const newBrackets = [];
          let i = 0;
          while (data['upTo-' + i] !== undefined || data['rate-' + i] !== undefined) {
            const upTo = data['upTo-' + i] === '' ? Infinity : Number(data['upTo-' + i]);
            const rate = Number(data['rate-' + i]) || 0;
            newBrackets.push({ upTo, rate });
            i++;
          }
          S.settings.insuranceEmployeeRate = Number(data.insuranceEmployeeRate) || 0;
          S.settings.insuranceEmployerRate = Number(data.insuranceEmployerRate) || 0;
          S.settings.taxBrackets = newBrackets.length ? newBrackets : S.settings.taxBrackets;
          S.saveSettings();
          UI.toast(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
          mm.close(); render();
        } }
      ]
    });
  }

  function del(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف سجل التأمين؟' : 'Delete insurance record?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('insurance', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); render(); }
    });
  }

  return { render };
})();
