/* ============================================================
   ZenHR — Loans & Salary Advances Module
   ============================================================ */
window.ZenLoans = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', statusFilter: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const records = S.getCollection('loans');

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="ln-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="ln-status-filter">
            <option value="">${lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>${ZenI18n.t('status.active')}</option>
            <option value="completed" ${state.statusFilter === 'completed' ? 'selected' : ''}>${ZenI18n.t('status.completed')}</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="ln-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="ln-add">${lang === 'ar' ? 'إضافة سلفة' : 'Add Loan'}</button>
        </div>
      </div>
      <div id="ln-summary" class="stat-grid mb-16"></div>
      <div id="ln-table-wrap"></div>
      <div id="ln-pagination"></div>
    `;

    document.getElementById('ln-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('ln-status-filter').onchange = (e) => { state.statusFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('ln-add').onclick = () => showForm();
    document.getElementById('ln-export').onclick = () => exportData();

    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection('loans');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.statusFilter) rows = rows.filter((l) => l.status === state.statusFilter);
    const q = state.search.trim().toLowerCase();
    if (q) rows = rows.filter((l) => { const e = empMap[l.employeeId]; return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)); });
    rows.sort((a, b) => (a.requestDate < b.requestDate ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('ln-table-wrap');
    const pageWrap = document.getElementById('ln-pagination');
    const summary = document.getElementById('ln-summary');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const totalOrig = filtered.reduce((s, l) => s + l.originalAmount, 0);
      const totalRemaining = filtered.reduce((s, l) => s + l.remainingBalance, 0);
      const active = filtered.filter((l) => l.status === 'active').length;
      summary.innerHTML = `
        ${miniStat('⟨', 'brand', lang === 'ar' ? 'إجمالي القروض' : 'Total Loans', U.money(totalOrig))}
        ${miniStat('⟩', 'danger', lang === 'ar' ? 'المتبقي' : 'Remaining', U.money(totalRemaining))}
        ${miniStat('◷', 'warning', lang === 'ar' ? 'سلف نشطة' : 'Active', active)}
        ${miniStat('▢', 'gray', lang === 'ar' ? 'إجمالي السجلات' : 'Records', filtered.length)}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (l) => { const e = empMap[l.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), l.employeeId) : U.esc(l.employeeId); } },
        { label: lang === 'ar' ? 'المبلغ الأصلي' : 'Original', render: (l) => U.money(l.originalAmount) },
        { label: lang === 'ar' ? 'القسط' : 'Installment', render: (l) => U.money(l.installmentAmount) },
        { label: lang === 'ar' ? 'المدفوع' : 'Paid', render: (l) => `${l.paidInstallments}/${l.installments}` },
        { label: lang === 'ar' ? 'المتبقي' : 'Remaining', render: (l) => U.money(l.remainingBalance) },
        { label: lang === 'ar' ? 'القسط القادم' : 'Next', render: (l) => U.date(l.nextInstallmentDate) },
        { label: ZenI18n.t('common.status'), render: (l) => UI.statusBadge(l.status) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (l) => `<div class="row-actions">
          ${l.status === 'active' ? `<button class="btn sm ghost" data-pay="${l.id}" title="${lang === 'ar' ? 'دفع قسط' : 'Pay Installment'}">$</button>` : ''}
          <button class="btn sm ghost" data-edit="${l.id}">✎</button>
          <button class="btn sm ghost" data-del="${l.id}">🗑</button>
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));
    wrap.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => payInstallment(b.dataset.pay));

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:18px">${U.esc(value)}</div></div>`;
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('loans', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active');
    const body = `
      <form id="ln-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: lang === 'ar' ? 'المبلغ الأصلي' : 'Original Amount', name: 'originalAmount', type: 'number', value: rec?.originalAmount, required: true, attrs: ' min="0" step="100"' })}
        ${UI.formField({ label: lang === 'ar' ? 'عدد الأقساط' : 'Number of Installments', name: 'installments', type: 'number', value: rec?.installments || 12, required: true, attrs: ' min="1" step="1"' })}
        ${UI.formField({ label: ZenI18n.t('common.date'), name: 'requestDate', type: 'date', value: rec?.requestDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ الموافقة' : 'Approval Date', name: 'approvalDate', type: 'date', value: rec?.approvalDate })}
        ${UI.formField({ label: lang === 'ar' ? 'القسط القادم' : 'Next Installment Date', name: 'nextInstallmentDate', type: 'date', value: rec?.nextInstallmentDate || U.today(), required: true })}
        ${UI.formField({ label: ZenI18n.t('common.status'), name: 'status', type: 'select', value: rec?.status || 'active', options: [
          { value: 'active', label: ZenI18n.t('status.active') },
          { value: 'completed', label: ZenI18n.t('status.completed') },
        ] })}
        <label class="field full"><span>${ZenI18n.t('common.notes')}</span><textarea name="notes" rows="2">${U.esc(rec?.notes || '')}</textarea></label>
      </form>
    `;
    const m = UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل سلفة' : 'Edit Loan') : (lang === 'ar' ? 'إضافة سلفة' : 'Add Loan'),
      body, size: 'lg',
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#ln-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          data.originalAmount = Number(data.originalAmount) || 0;
          data.installments = Number(data.installments) || 1;
          data.installmentAmount = Math.round(data.originalAmount / data.installments);
          // Preserve paidInstallments if editing
          if (rec) {
            data.paidInstallments = rec.paidInstallments || 0;
          } else {
            data.paidInstallments = 0;
          }
          data.remainingBalance = data.originalAmount - (data.paidInstallments * data.installmentAmount);
          if (data.remainingBalance < 0) data.remainingBalance = 0;
          if (data.remainingBalance === 0) data.status = 'completed';
          if (id) {
            S.update('loans', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'ln-' + Date.now().toString(36);
            S.insert('loans', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); renderTable();
        } }
      ]
    });
  }

  function payInstallment(id) {
    const lang = ZenI18n.lang;
    const loan = S.getById('loans', id);
    if (!loan) return;
    if (loan.remainingBalance <= 0) {
      UI.toast(lang === 'ar' ? 'لا توجد أقساط متبقية' : 'No remaining installments', 'warning');
      return;
    }
    UI.confirm({
      title: lang === 'ar' ? 'دفع قسط' : 'Pay Installment',
      message: lang === 'ar' ? `سيتم خصم قسط بقيمة ${U.money(loan.installmentAmount)} من راتب الموظف. المتبقي بعد الدفع: ${U.money(loan.remainingBalance - loan.installmentAmount)}` : `Installment of ${U.money(loan.installmentAmount)} will be deducted. Remaining: ${U.money(loan.remainingBalance - loan.installmentAmount)}`,
      kind: 'info',
      confirmLabel: lang === 'ar' ? 'دفع' : 'Pay',
      onConfirm: () => {
        const newPaid = loan.paidInstallments + 1;
        const newRemaining = Math.max(0, loan.remainingBalance - loan.installmentAmount);
        const newStatus = newRemaining <= 0 ? 'completed' : 'active';
        const nextDate = U.addDays(loan.nextInstallmentDate, 30);
        S.update('loans', id, {
          paidInstallments: newPaid,
          remainingBalance: newRemaining,
          status: newStatus,
          nextInstallmentDate: newStatus === 'completed' ? null : nextDate,
        });
        UI.toast(lang === 'ar' ? 'تم تسجيل الدفع' : 'Payment recorded', 'success');
        renderTable();
      }
    });
  }

  function del(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف السلفة؟' : 'Delete loan?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('loans', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); renderTable(); }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (l) => l.id },
      { label: ZenI18n.t('common.employee'), value: (l) => { const e = empMap[l.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : l.employeeId; } },
      { label: lang === 'ar' ? 'المبلغ الأصلي' : 'Original', value: (l) => l.originalAmount },
      { label: lang === 'ar' ? 'القسط' : 'Installment', value: (l) => l.installmentAmount },
      { label: lang === 'ar' ? 'عدد الأقساط' : 'Installments', value: (l) => l.installments },
      { label: lang === 'ar' ? 'المدفوع' : 'Paid', value: (l) => l.paidInstallments },
      { label: lang === 'ar' ? 'المتبقي' : 'Remaining', value: (l) => l.remainingBalance },
      { label: lang === 'ar' ? 'القسط القادم' : 'Next', value: (l) => l.nextInstallmentDate },
      { label: ZenI18n.t('common.status'), value: (l) => l.status },
    ], 'zenhr-loans.xls', 'Loans');
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
