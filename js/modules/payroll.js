/* ============================================================
   ZenHR — Payroll Module
   Calculation model:
   Gross = Basic + Allowances + Rewards + Overtime
   Total Deductions = Deductions + Penalties + Insurance(emp) + Tax + Loan installment + Other
   Net = Gross - Total Deductions
   ============================================================ */
window.ZenPayroll = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, period: '', statusFilter: '', search: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const periods = [...new Set(S.getCollection('payroll').map((p) => p.period))].sort().reverse();

    if (!state.period && periods.length > 0) state.period = periods[0];

    c.innerHTML = `
      <div class="toolbar">
        <label class="field">
          <select id="pr-period">
            <option value="">${lang === 'ar' ? '— اختر الشهر —' : '— Select period —'}</option>
            ${periods.map((p) => `<option value="${p}" ${state.period === p ? 'selected' : ''}>${U.monthLabel(p)}</option>`).join('')}
            <option value="new">${lang === 'ar' ? '＋ توليد لشهر جديد' : '＋ Generate new month'}</option>
          </select>
        </label>
        <label class="field search-field">
          <input type="text" id="pr-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="pr-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            ${['draft', 'processed', 'paid'].map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${ZenI18n.t('status.' + s)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="pr-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="pr-generate">${lang === 'ar' ? 'توليد المرتبات' : 'Generate Payroll'}</button>
        </div>
      </div>
      <div id="pr-rounding-settings" class="rounding-settings"></div>
      <div id="pr-summary" class="stat-grid mb-16"></div>
      <div id="pr-table-wrap"></div>
      <div id="pr-pagination"></div>
    `;

    document.getElementById('pr-period').onchange = (e) => {
      if (e.target.value === 'new') { generateMonth(); return; }
      state.period = e.target.value; state.page = 1; renderTable();
    };
    document.getElementById('pr-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('pr-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('pr-generate').onclick = () => generateMonth();
    document.getElementById('pr-export').onclick = () => exportData();
    renderRoundingSettings();

    renderTable();
  }


  function renderRoundingSettings() {
    const root = document.getElementById('pr-rounding-settings');
    if (!root) return;
    const lang = ZenI18n.lang;
    const ar = lang === 'ar';
    const t = (a, e) => ar ? a : e;
    const cfg = ZenRounding.getSettings();
    const options = [
      ['basicSalary', t('الراتب الأساسي', 'Basic salary')],
      ['allowances', t('البدلات', 'Allowances')],
      ['bonuses', t('الحوافز والمكافآت', 'Incentives & bonuses')],
      ['overtime', t('الأوفر تايم', 'Overtime')],
      ['deductions', t('الخصومات', 'Deductions')],
      ['penalties', t('الجزاءات', 'Penalties')],
      ['advances', t('أقساط السلف', 'Loan installments')],
      ['insurance', t('تأمين الموظف', 'Employee insurance')],
      ['tax', t('الضريبة', 'Tax')],
      ['otherDeductions', t('خصومات أخرى', 'Other deductions')],
    ];
    root.innerHTML = `
      <section class="card">
        <div class="card-head"><div><h3>${t('تقريب عناصر المرتب والبدلات','Payroll item rounding')}</h3><p class="muted">${t('فعّل التقريب لكل بند بشكل مستقل. يتم التقريب لأقرب 5 جنيهات، وتُحفظ الاختيارات على هذا الجهاز.','Enable rounding per item. Amounts round to the nearest 5 EGP; choices are saved on this device.')}</p></div><span class="badge ${cfg.enabled ? 'success' : 'gray'}">${cfg.enabled ? t('مفعّل','Enabled') : t('غير مفعّل','Disabled')}</span></div>
        <div class="rounding-setting-grid">
          ${options.map(([key,label]) => `<label class="rounding-option"><span>${label}</span><input type="checkbox" data-round-category="${key}" ${cfg.enabled && cfg.applyTo[key] !== false ? 'checked' : ''} aria-label="${label}"></label>`).join('')}
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:12px">${t('مثال: 2522 ← 2520، و2524 ← 2525. التغيير يطبق على المرتبات التي تُحسب أو تُنشأ بعد تعديل الإعدادات.','Example: 2522 → 2520 and 2524 → 2525. Changes apply to payroll calculated or generated after updating these settings.')}</p>
      </section>`;
    root.querySelectorAll('[data-round-category]').forEach(input => input.addEventListener('change', () => {
      const next = ZenRounding.getSettings();
      const applyTo = {};
      root.querySelectorAll('[data-round-category]').forEach(box => applyTo[box.dataset.roundCategory] = box.checked);
      next.applyTo = Object.assign({}, next.applyTo, applyTo);
      next.enabled = Object.values(applyTo).some(Boolean);
      next.increment = 5;
      ZenRounding.saveSettings(next);
      renderRoundingSettings();
      UI.toast(t('تم حفظ إعدادات التقريب','Rounding settings saved'), 'success');
    }));
  }

  function roundPayrollAmount(category, amount) {
    const value = Number(amount) || 0;
    const cfg = ZenRounding.getSettings();
    if (!cfg.enabled || cfg.applyTo[category] === false) return value;
    return ZenRounding.roundDown(value, 5);
  }

  function getFiltered() {
    let rows = S.getCollection('payroll');
    if (state.period) rows = rows.filter((p) => p.period === state.period);
    if (state.statusFilter) rows = rows.filter((p) => p.status === state.statusFilter);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) => {
        const e = empMap[p.employeeId];
        return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
      });
    }
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('pr-table-wrap');
    const pageWrap = document.getElementById('pr-pagination');
    const summary = document.getElementById('pr-summary');
    if (!wrap) return;

    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const totalGross = filtered.reduce((s, p) => s + p.grossEarnings, 0);
      const totalDed = filtered.reduce((s, p) => s + p.totalDeductions, 0);
      const totalNet = filtered.reduce((s, p) => s + p.netSalary, 0);
      const draftCount = filtered.filter((p) => p.status === 'draft').length;
      summary.innerHTML = `
        ${miniStat('↗', 'success', lang === 'ar' ? 'إجمالي الراتب' : 'Gross Total', U.money(totalGross))}
        ${miniStat('−', 'danger', lang === 'ar' ? 'إجمالي الخصومات' : 'Total Deductions', U.money(totalDed))}
        ${miniStat('=', 'brand', lang === 'ar' ? 'صافي الإجمالي' : 'Net Total', U.money(totalNet))}
        ${miniStat('◷', 'warning', lang === 'ar' ? 'مسودات' : 'Draft', draftCount)}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (p) => { const e = empMap[p.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), p.employeeId) : U.esc(p.employeeId); } },
        { label: ZenI18n.t('emp.basicSalary'), render: (p) => U.money(p.basicSalary) },
        { label: lang === 'ar' ? 'بدلات' : 'Allow.', render: (p) => U.money(p.allowances) },
        { label: lang === 'ar' ? 'مكافآت' : 'Rewards', render: (p) => U.money(p.rewards) },
        { label: lang === 'ar' ? 'خصومات' : 'Deduct.', render: (p) => U.money(p.deductions) },
        { label: lang === 'ar' ? 'تأمين' : 'Insur.', render: (p) => U.money(p.insuranceEmployee) },
        { label: lang === 'ar' ? 'ضريبة' : 'Tax', render: (p) => U.money(p.tax) },
        { label: lang === 'ar' ? 'صافي' : 'Net', render: (p) => `<b>${U.money(p.netSalary)}</b>` },
        { label: ZenI18n.t('common.status'), render: (p) => UI.statusBadge(p.status) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (p) => `<div class="row-actions">
          <button class="btn sm ghost" data-view="${p.id}">👁</button>
          <button class="btn sm ghost" data-edit="${p.id}">✎</button>
          ${p.status !== 'paid' ? `<button class="btn sm ghost" data-pay="${p.id}" title="${lang === 'ar' ? 'دفع' : 'Mark paid'}">$</button>` : ''}
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => showDetail(b.dataset.view));
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => markPaid(b.dataset.pay));

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(value)}</div></div>`;
  }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const p = S.getById('payroll', id);
    if (!p) return;
    const emp = S.getById('employees', p.employeeId);

    // Build rounding comparison
    const roundingCfg = ZenRounding.getSettings();
    let roundingHtml = '';
    if (roundingCfg.enabled) {
      const items = [
        { category: 'basicSalary', label: lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary', amount: p.basicSalary },
        { category: 'allowances', label: lang === 'ar' ? 'البدلات' : 'Allowances', amount: p.allowances },
        { category: 'bonuses', label: lang === 'ar' ? 'المكافآت' : 'Bonuses', amount: p.rewards },
        { category: 'overtime', label: lang === 'ar' ? 'العمل الإضافي' : 'Overtime', amount: p.overtime },
        { category: 'deductions', label: lang === 'ar' ? 'الخصومات' : 'Deductions', amount: p.deductions },
        { category: 'penalties', label: lang === 'ar' ? 'الجزاءات' : 'Penalties', amount: p.penalties },
        { category: 'insurance', label: lang === 'ar' ? 'تأمين الموظف' : 'Emp Insurance', amount: p.insuranceEmployee },
        { category: 'advances', label: lang === 'ar' ? 'قسط سلفة' : 'Loan Install.', amount: p.loanInstallment },
      ].filter((it) => it.amount > 0);
      const result = ZenRounding.applyToItems(items);
      const anyApplied = result.items.some((it) => it.applied);
      if (anyApplied) {
        roundingHtml = `
          <div class="card mt-16" style="background:var(--brand-50);border:1px solid var(--brand-100)">
            <div class="card-head"><div><h3 style="color:var(--brand-700)">${lang === 'ar' ? 'جدول مقارنة التقريب' : 'Rounding Comparison Table'}</h3>
            <p style="font-size:12px">${lang === 'ar' ? 'التقريب للأسفل إلى أقرب ' + roundingCfg.increment + ' جنيه' : 'Rounded down to nearest ' + roundingCfg.increment + ' EGP'}</p></div></div>
            <div class="table-scroll"><table class="data">
              <thead><tr>
                <th>${lang === 'ar' ? 'البند' : 'Financial Item'}</th>
                <th>${lang === 'ar' ? 'المبلغ الأصلي' : 'Original'}</th>
                <th>${lang === 'ar' ? 'بعد التقريب' : 'Rounded'}</th>
                <th>${lang === 'ar' ? 'الفرق' : 'Difference'}</th>
              </tr></thead>
              <tbody>
                ${result.items.map((it) => it.applied ? `
                  <tr>
                    <td>${U.esc(it.label)}${it.isDeduction ? ' <span class="badge gray" style="font-size:9px">خصم</span>' : ''}</td>
                    <td>${U.num(it.original)}</td>
                    <td><b>${U.num(it.rounded)}</b></td>
                    <td style="color:${it.difference < 0 ? 'var(--danger-700)' : 'var(--success-700)'}">${it.difference > 0 ? '+' : ''}${U.num(it.difference)}</td>
                  </tr>
                ` : '').join('')}
                <tr style="background:var(--brand-100);font-weight:bold">
                  <td>${lang === 'ar' ? 'صافي الراتب الأصلي' : 'Original Net'}</td>
                  <td>${U.num(result.totals.originalNet)}</td>
                  <td>${lang === 'ar' ? 'صافي بعد التقريب' : 'Rounded Net'}</td>
                  <td><b style="color:var(--brand-700)">${U.num(result.totals.roundedNet)}</b></td>
                </tr>
              </tbody>
            </table></div>
          </div>
        `;
      }
    }

    const body = `
      <h3 style="margin:0 0 4px">${U.esc(emp ? emp.name : p.employeeId)}</h3>
      <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px">${U.esc(p.employeeId)} · ${U.monthLabel(p.period)}</p>
      <div class="detail-grid">
        <div class="detail-item"><span class="label">${ZenI18n.t('emp.basicSalary')}</span><span class="value">${U.money(p.basicSalary)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'البدلات' : 'Allowances'}</span><span class="value">${U.money(p.allowances)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'المكافآت' : 'Rewards'}</span><span class="value">${U.money(p.rewards)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'العمل الإضافي' : 'Overtime'}</span><span class="value">${U.money(p.overtime)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'الإجمالي' : 'Gross'}</span><span class="value big success">${U.money(p.grossEarnings)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><hr style="border:none;border-top:1px solid var(--border);margin:8px 0"></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'الخصومات' : 'Deductions'}</span><span class="value">${U.money(p.deductions)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'الجزاءات' : 'Penalties'}</span><span class="value">${U.money(p.penalties)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'تأمين الموظف' : 'Emp Insurance'}</span><span class="value">${U.money(p.insuranceEmployee)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'ضريبة' : 'Tax'}</span><span class="value">${U.money(p.tax)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'قسط سلفة' : 'Loan Install.'}</span><span class="value">${U.money(p.loanInstallment)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'إجمالي الخصومات' : 'Total Deduct.'}</span><span class="value big danger">${U.money(p.totalDeductions)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><hr style="border:none;border-top:2px solid var(--brand-700);margin:8px 0"></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'صافي الراتب' : 'Net Salary'}</span><span class="value big" style="font-size:22px;color:var(--brand-700)">${U.money(p.netSalary)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'الحالة' : 'Status'}</span><span class="value">${UI.statusBadge(p.status)}</span></div>
        ${p.paymentDate ? `<div class="detail-item"><span class="label">${lang === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</span><span class="value">${U.date(p.paymentDate)}</span></div>` : ''}
      </div>
      ${roundingHtml}
    `;
    UI.modal({
      title: lang === 'ar' ? 'تفاصيل المرتب' : 'Payroll Detail',
      body,
      size: 'lg',
      footer: [
        { label: ZenI18n.t('common.print'), kind: 'secondary', onClick: () => printSlip(p) },
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() }
      ],
    });
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const p = id ? S.getById('payroll', id) : null;
    const body = `
      <form id="pr-form" class="form-grid">
        ${UI.formField({ label: lang === 'ar' ? 'الشهر' : 'Period', name: 'period', type: 'month', value: p?.period || U.currentMonth(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary', name: 'basicSalary', type: 'number', value: p?.basicSalary, required: true, attrs: ' min="0" step="100"' })}
        ${UI.formField({ label: lang === 'ar' ? 'البدلات' : 'Allowances', name: 'allowances', type: 'number', value: p?.allowances || 0, attrs: ' min="0" step="50"' })}
        ${UI.formField({ label: lang === 'ar' ? 'المكافآت' : 'Rewards', name: 'rewards', type: 'number', value: p?.rewards || 0, attrs: ' min="0" step="50"' })}
        ${UI.formField({ label: lang === 'ar' ? 'العمل الإضافي' : 'Overtime', name: 'overtime', type: 'number', value: p?.overtime || 0, attrs: ' min="0" step="50"' })}
        ${UI.formField({ label: lang === 'ar' ? 'الخصومات' : 'Deductions', name: 'deductions', type: 'number', value: p?.deductions || 0, attrs: ' min="0" step="50"' })}
        ${UI.formField({ label: lang === 'ar' ? 'الجزاءات' : 'Penalties', name: 'penalties', type: 'number', value: p?.penalties || 0, attrs: ' min="0" step="50"' })}
        ${UI.formField({ label: lang === 'ar' ? 'قسط السلفة' : 'Loan Installment', name: 'loanInstallment', type: 'number', value: p?.loanInstallment || 0, attrs: ' min="0" step="50"' })}
        ${UI.formField({ label: lang === 'ar' ? 'تعديلات أخرى' : 'Other Adjustments', name: 'otherAdjustments', type: 'number', value: p?.otherAdjustments || 0, attrs: ' step="50"' })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: p?.status || 'draft', options: ['draft', 'processed', 'paid'].map((s) => ({ value: s, label: ZenI18n.t('status.' + s) })) })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(p?.notes || '')}</textarea></label>
      </form>
    `;
    const m = UI.modal({
      title: p ? (lang === 'ar' ? 'تعديل مرتب' : 'Edit Payroll') : (lang === 'ar' ? 'إضافة مرتب' : 'Add Payroll'),
      size: 'lg',
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#pr-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          ['basicSalary', 'allowances', 'rewards', 'overtime', 'deductions', 'penalties', 'loanInstallment', 'otherAdjustments'].forEach((k) => data[k] = Number(data[k]) || 0);
          // Round each enabled component independently before calculating totals.
          data.basicSalary = roundPayrollAmount('basicSalary', data.basicSalary);
          data.allowances = roundPayrollAmount('allowances', data.allowances);
          data.rewards = roundPayrollAmount('bonuses', data.rewards);
          data.overtime = roundPayrollAmount('overtime', data.overtime);
          data.deductions = roundPayrollAmount('deductions', data.deductions);
          data.penalties = roundPayrollAmount('penalties', data.penalties);
          data.loanInstallment = roundPayrollAmount('advances', data.loanInstallment);
          data.otherAdjustments = roundPayrollAmount('otherDeductions', data.otherAdjustments);
          const gross = data.basicSalary + data.allowances + data.rewards + data.overtime;
          const insuranceEmp = roundPayrollAmount('insurance', Math.round(data.basicSalary * (S.settings.insuranceEmployeeRate / 100)));
          const tax = roundPayrollAmount('tax', estimateTax(gross, S.settings.taxBrackets));
          const totalDed = data.deductions + data.penalties + insuranceEmp + tax + data.loanInstallment + data.otherAdjustments;
          const net = gross - totalDed;
          Object.assign(data, {
            insuranceEmployee: insuranceEmp,
            insuranceEmployer: Math.round(data.basicSalary * (S.settings.insuranceEmployerRate / 100)),
            tax, grossEarnings: gross, totalDeductions: totalDed, netSalary: net
          });
          if (id) {
            S.update('payroll', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'pr-' + Date.now().toString(36);
            S.insert('payroll', { id: newId, ...data, paymentDate: null, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); renderTable();
        } }
      ]
    });
  }

  function generateMonth() {
    const lang = ZenI18n.lang;
    UI.confirm({
      title: lang === 'ar' ? 'توليد مرتبات شهر' : 'Generate Month Payroll',
      message: lang === 'ar' ? 'سيتم إنشاء سجلات مرتبات لجميع الموظفين النشطين للشهر الحالي. لن يتم استبدال السجلات الموجودة.' : 'Will generate payroll records for all active employees for current month. Existing records won\'t be replaced.',
      kind: 'info',
      confirmLabel: lang === 'ar' ? 'توليد' : 'Generate',
      onConfirm: () => {
        const ym = U.currentMonth();
        const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
        const existing = S.findBy('payroll', (p) => p.period === ym);
        const existingIds = new Set(existing.map((p) => p.employeeId));
        let created = 0;
        employees.forEach((emp) => {
          if (existingIds.has(emp.id)) return;
          if (emp.hireDate > ym + '-28') return;
          const basic = roundPayrollAmount('basicSalary', emp.basicSalary);
          // Sum applicable allowances/rewards/etc for current month and round enabled components.
          const allowances = roundPayrollAmount('allowances', S.findBy('allowances', (a) => a.employeeId === emp.id && a.status === 'active').reduce((s, a) => s + a.amount, 0));
          const rewards = roundPayrollAmount('bonuses', S.findBy('rewards', (r) => r.employeeId === emp.id && r.status === 'active').reduce((s, r) => s + r.amount, 0));
          const deductions = roundPayrollAmount('deductions', S.findBy('deductions', (d) => d.employeeId === emp.id && d.status === 'active').reduce((s, d) => s + d.amount, 0));
          const penalties = roundPayrollAmount('penalties', S.findBy('penalties', (p) => p.employeeId === emp.id && p.status === 'active').reduce((s, p) => s + p.amount, 0));
          const insuranceEmp = roundPayrollAmount('insurance', Math.round(basic * (S.settings.insuranceEmployeeRate / 100)));
          const tax = roundPayrollAmount('tax', estimateTax(basic + allowances + rewards, S.settings.taxBrackets));
          // Loan installment
          const activeLoans = S.findBy('loans', (l) => l.employeeId === emp.id && l.status === 'active');
          const loanInstallment = roundPayrollAmount('advances', activeLoans.reduce((s, l) => s + l.installmentAmount, 0));
          const gross = basic + allowances + rewards;
          const net = gross - totalDed;
          S.insert('payroll', {
            id: 'pr-' + ym + '-' + emp.id,
            employeeId: emp.id,
            period: ym,
            basicSalary: basic,
            allowances, rewards, overtime: 0,
            deductions, penalties,
            insuranceEmployee: insuranceEmp,
            insuranceEmployer: Math.round(basic * (S.settings.insuranceEmployerRate / 100)),
            tax, loanInstallment, otherAdjustments: 0,
            grossEarnings: gross, totalDeductions: totalDed, netSalary: net,
            status: 'draft', paymentDate: null, notes: '',
            isDemo: false, createdAt: new Date().toISOString(),
          });
          created++;
        });
        state.period = ym;
        UI.toast(lang === 'ar' ? `تم إنشاء ${created} سجل` : `${created} records created`, 'success');
        render();
      }
    });
  }

  function markPaid(id) {
    const lang = ZenI18n.lang;
    UI.confirm({
      title: lang === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment',
      message: lang === 'ar' ? 'تحديد المرتب كمدفوع؟' : 'Mark payroll as paid?',
      kind: 'success',
      confirmLabel: lang === 'ar' ? 'دفع' : 'Mark Paid',
      onConfirm: () => {
        S.update('payroll', id, { status: 'paid', paymentDate: U.today() });
        UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
        renderTable();
      }
    });
  }

  function printSlip(p) {
    const emp = S.getById('employees', p.employeeId);
    const roundingCfg = ZenRounding.getSettings();
    let roundingRows = '';
    if (roundingCfg.enabled) {
      const items = [
        { category: 'basicSalary', label: ZenI18n.lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary', amount: p.basicSalary },
        { category: 'allowances', label: ZenI18n.lang === 'ar' ? 'البدلات' : 'Allowances', amount: p.allowances },
        { category: 'bonuses', label: ZenI18n.lang === 'ar' ? 'المكافآت' : 'Bonuses', amount: p.rewards },
        { category: 'overtime', label: ZenI18n.lang === 'ar' ? 'العمل الإضافي' : 'Overtime', amount: p.overtime },
        { category: 'deductions', label: ZenI18n.lang === 'ar' ? 'الخصومات' : 'Deductions', amount: p.deductions },
        { category: 'penalties', label: ZenI18n.lang === 'ar' ? 'الجزاءات' : 'Penalties', amount: p.penalties },
        { category: 'insurance', label: ZenI18n.lang === 'ar' ? 'تأمين الموظف' : 'Emp Insurance', amount: p.insuranceEmployee },
        { category: 'advances', label: ZenI18n.lang === 'ar' ? 'قسط سلفة' : 'Loan Install.', amount: p.loanInstallment },
      ].filter((it) => it.amount > 0);
      const r = ZenRounding.applyToItems(items);
      if (r.items.some((it) => it.applied)) {
        roundingRows = `
          <h3 style="color:#14532d;margin:20px 0 8px">${ZenI18n.lang === 'ar' ? 'جدول مقارنة التقريب' : 'Rounding Comparison'}</h3>
          <table>
            <thead><tr><th>${ZenI18n.lang === 'ar' ? 'البند' : 'Item'}</th><th>${ZenI18n.lang === 'ar' ? 'أصلي' : 'Original'}</th><th>${ZenI18n.lang === 'ar' ? 'بعد التقريب' : 'Rounded'}</th><th>${ZenI18n.lang === 'ar' ? 'الفرق' : 'Difference'}</th></tr></thead>
            <tbody>
              ${r.items.filter((it) => it.applied).map((it) => `<tr><td>${it.label}</td><td>${U.num(it.original)}</td><td><b>${U.num(it.rounded)}</b></td><td>${it.difference > 0 ? '+' : ''}${U.num(it.difference)}</td></tr>`).join('')}
              <tr style="background:#dcfce7;font-weight:bold"><td>${ZenI18n.lang === 'ar' ? 'الصافي الأصلي' : 'Original Net'}</td><td>${U.num(r.totals.originalNet)}</td><td>${ZenI18n.lang === 'ar' ? 'الصافي بعد التقريب' : 'Rounded Net'}</td><td>${U.num(r.totals.roundedNet)}</td></tr>
            </tbody>
          </table>
        `;
      }
    }
    const html = `
      <h2 style="margin:0;color:#14532d">${ZenI18n.lang === 'ar' ? 'قسيمة راتب' : 'Payslip'}</h2>
      <p style="margin:4px 0 16px;color:#64748b">${U.esc(emp ? emp.name : p.employeeId)} · ${U.monthLabel(p.period)}</p>
      <table>
        <tr><th>${ZenI18n.t('emp.basicSalary')}</th><td>${U.money(p.basicSalary)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'البدلات' : 'Allowances'}</th><td>${U.money(p.allowances)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'المكافآت' : 'Rewards'}</th><td>${U.money(p.rewards)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'العمل الإضافي' : 'Overtime'}</th><td>${U.money(p.overtime)}</td></tr>
        <tr style="background:#dcfce7;font-weight:bold"><td>${ZenI18n.lang === 'ar' ? 'إجمالي الراتب' : 'Gross'}</td><td>${U.money(p.grossEarnings)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'الخصومات' : 'Deductions'}</th><td>${U.money(p.deductions)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'الجزاءات' : 'Penalties'}</th><td>${U.money(p.penalties)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'تأمين' : 'Insurance'}</th><td>${U.money(p.insuranceEmployee)}</td></tr>
        <tr><th>${ZenI18n.lang === 'ar' ? 'ضريبة' : 'Tax'}</th><td>${U.money(p.tax)}</td></tr>
        ${p.loanInstallment ? `<tr><th>${ZenI18n.lang === 'ar' ? 'قسط سلفة' : 'Loan'}</th><td>${U.money(p.loanInstallment)}</td></tr>` : ''}
        <tr style="background:#fee2e2;font-weight:bold"><td>${ZenI18n.lang === 'ar' ? 'إجمالي الخصومات' : 'Total Deductions'}</td><td>${U.money(p.totalDeductions)}</td></tr>
        <tr style="background:#dcfce7;font-size:14pt;font-weight:bold"><td>${ZenI18n.lang === 'ar' ? 'صافي الراتب' : 'Net Salary'}</td><td>${U.money(p.netSalary)}</td></tr>
      </table>
      ${roundingRows}
    `;
    U.printElement(html, ZenI18n.lang === 'ar' ? 'قسيمة راتب' : 'Payslip');
  }

  function estimateTax(monthlyGross, brackets) {
    const annual = monthlyGross * 12;
    let tax = 0, prev = 0;
    for (const b of brackets) {
      if (annual > prev) {
        const slice = Math.min(annual, b.upTo) - prev;
        tax += slice * b.rate;
        prev = b.upTo;
        if (annual <= b.upTo) break;
      } else break;
    }
    return Math.round(tax / 12);
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    if (!rows.length) { UI.toast(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning'); return; }
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    const roundingCfg = ZenRounding.getSettings();
    const columns = [
      { label: ZenI18n.t('common.employee'), value: (p) => { const e = empMap[p.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : p.employeeId; } },
      { label: 'Employee ID', value: (p) => p.employeeId },
      { label: lang === 'ar' ? 'الشهر' : 'Period', value: (p) => p.period },
      { label: ZenI18n.t('emp.basicSalary'), value: (p) => p.basicSalary, type: 'money' },
      { label: lang === 'ar' ? 'البدلات' : 'Allowances', value: (p) => p.allowances, type: 'money' },
      { label: lang === 'ar' ? 'المكافآت' : 'Rewards', value: (p) => p.rewards, type: 'money' },
      { label: lang === 'ar' ? 'العمل الإضافي' : 'Overtime', value: (p) => p.overtime, type: 'money' },
      { label: lang === 'ar' ? 'إجمالي الراتب' : 'Gross', value: (p) => p.grossEarnings, type: 'money' },
      { label: lang === 'ar' ? 'الخصومات' : 'Deductions', value: (p) => p.deductions, type: 'money' },
      { label: lang === 'ar' ? 'الجزاءات' : 'Penalties', value: (p) => p.penalties, type: 'money' },
      { label: lang === 'ar' ? 'تأمين' : 'Insurance', value: (p) => p.insuranceEmployee, type: 'money' },
      { label: lang === 'ar' ? 'ضريبة' : 'Tax', value: (p) => p.tax, type: 'money' },
      { label: lang === 'ar' ? 'صافي' : 'Net', value: (p) => p.netSalary, type: 'money' },
      { label: ZenI18n.t('common.status'), value: (p) => ZenI18n.t('status.' + p.status) },
    ];
    // Add rounding columns if enabled
    if (roundingCfg.enabled) {
      columns.push(
        { label: lang === 'ar' ? 'الصافي بعد التقريب' : 'Rounded Net', value: (p) => {
          const items = [
            { category: 'basicSalary', amount: p.basicSalary },
            { category: 'allowances', amount: p.allowances },
            { category: 'bonuses', amount: p.rewards },
            { category: 'overtime', amount: p.overtime },
            { category: 'deductions', amount: p.deductions },
            { category: 'penalties', amount: p.penalties },
            { category: 'insurance', amount: p.insuranceEmployee },
            { category: 'advances', amount: p.loanInstallment },
          ];
          const r = ZenRounding.applyToItems(items);
          return r.totals.roundedNet;
        }, type: 'money' },
        { label: lang === 'ar' ? 'فرق التقريب' : 'Rounding Difference', value: (p) => {
          const items = [
            { category: 'basicSalary', amount: p.basicSalary },
            { category: 'allowances', amount: p.allowances },
            { category: 'bonuses', amount: p.rewards },
            { category: 'overtime', amount: p.overtime },
            { category: 'deductions', amount: p.deductions },
            { category: 'penalties', amount: p.penalties },
            { category: 'insurance', amount: p.insuranceEmployee },
            { category: 'advances', amount: p.loanInstallment },
          ];
          const r = ZenRounding.applyToItems(items);
          return r.totals.roundedNet - r.totals.originalNet;
        }, type: 'money' }
      );
    }
    const filename = `agrimasters-payroll-${state.period || U.today()}.xlsx`;
    ZenExport.toXLSX(rows, columns, filename, lang === 'ar' ? 'المرتبات' : 'Payroll', { title: 'AGRIMASTERS HR — ' + (lang === 'ar' ? 'تقرير المرتبات' : 'Payroll Report') });
    if (window.ZenAudit) ZenAudit.logExport('payroll', { count: rows.length, rounding: roundingCfg.enabled });
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير بصيغة XLSX' : 'Exported as XLSX', 'success');
  }

  return { render, estimateTax };
})();
