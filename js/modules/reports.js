/* ============================================================
   ZenHR — Reports Module
   ============================================================ */
window.ZenReports = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const employees = S.getCollection('employees');
    const departments = S.getCollection('departments');

    const reports = [
      { id: 'employees', icon: '♙', color: 'brand', title: lang === 'ar' ? 'دليل الموظفين' : 'Employee Directory', desc: lang === 'ar' ? 'قائمة كاملة بكل الموظفين' : 'Complete employee list' },
      { id: 'active_inactive', icon: '✓', color: 'success', title: lang === 'ar' ? 'الموظفون النشطون وغير النشطين' : 'Active & Inactive', desc: lang === 'ar' ? 'تقرير بحالة التوظيف' : 'Employment status report' },
      { id: 'departments', icon: '▦', color: 'info', title: lang === 'ar' ? 'توزيع الأقسام' : 'Department Distribution', desc: lang === 'ar' ? 'عدد الموظفين في كل قسم' : 'Headcount per department' },
      { id: 'attendance', icon: '◷', color: 'info', title: lang === 'ar' ? 'تقرير الحضور' : 'Attendance Report', desc: lang === 'ar' ? 'سجلات الحضور والانصراف' : 'Attendance records' },
      { id: 'absence', icon: '✕', color: 'danger', title: lang === 'ar' ? 'تقرير الغياب' : 'Absence Report', desc: lang === 'ar' ? 'الغياب والتأخير' : 'Absences and lateness' },
      { id: 'overtime', icon: '+', color: 'warning', title: lang === 'ar' ? 'تقرير العمل الإضافي' : 'Overtime Report', desc: lang === 'ar' ? 'ساعات العمل الإضافي' : 'Overtime hours' },
      { id: 'leaves', icon: '▣', color: 'info', title: lang === 'ar' ? 'تقرير الإجازات' : 'Leave Report', desc: lang === 'ar' ? 'سجلات الإجازات' : 'Leave records' },
      { id: 'payroll', icon: 'ج.م', color: 'brand', title: lang === 'ar' ? 'تقرير المرتبات' : 'Payroll Report', desc: lang === 'ar' ? 'ملخص المرتبات الشهرية' : 'Monthly payroll summary' },
      { id: 'allowances', icon: '↗', color: 'success', title: lang === 'ar' ? 'تقرير البدلات' : 'Allowance Report', desc: lang === 'ar' ? 'البدلات الممنوحة' : 'Granted allowances' },
      { id: 'rewards', icon: '＋', color: 'info', title: lang === 'ar' ? 'تقرير المكافآت' : 'Reward Report', desc: lang === 'ar' ? 'المكافآت والحوافز' : 'Rewards and bonuses' },
      { id: 'penalties', icon: '!', color: 'danger', title: lang === 'ar' ? 'تقرير الجزاءات' : 'Penalty Report', desc: lang === 'ar' ? 'الجزاءات والخصومات' : 'Penalties and deductions' },
      { id: 'insurance', icon: '▤', color: 'info', title: lang === 'ar' ? 'تقرير التأمينات' : 'Insurance Report', desc: lang === 'ar' ? 'تقديرات التأمين والضرائب' : 'Insurance & tax estimates' },
      { id: 'loans', icon: '$', color: 'warning', title: lang === 'ar' ? 'تقرير السلف' : 'Loans Report', desc: lang === 'ar' ? 'السلف والأرصدة' : 'Loans and balances' },
      { id: 'contracts', icon: '📄', color: 'info', title: lang === 'ar' ? 'تقرير العقود' : 'Contract Report', desc: lang === 'ar' ? 'انتهاء العقود' : 'Contract expirations' },
      { id: 'hiring', icon: '↗', color: 'success', title: lang === 'ar' ? 'تقرير التوظيف' : 'Hiring Report', desc: lang === 'ar' ? 'التوظيف والاستقطاب' : 'Recruitment stats' },
      { id: 'performance', icon: '☆', color: 'brand', title: lang === 'ar' ? 'تقريم الأداء' : 'Performance Report', desc: lang === 'ar' ? 'نتائج التقييمات' : 'Evaluation results' },
    ];

    c.innerHTML = `
      <div class="toolbar">
        <h3 class="section-title" style="margin:0">${lang === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}</h3>
        <div class="spacer"></div>
      </div>
      <div class="grid-auto">
        ${reports.map((r) => `
          <div class="card" style="cursor:pointer" data-report="${r.id}">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div class="stat-icon ${r.color}" style="width:44px;height:44px;font-size:20px;flex-shrink:0">${r.icon}</div>
              <div style="flex:1">
                <h3 style="margin:0 0 4px;font-size:14px">${U.esc(r.title)}</h3>
                <p style="margin:0;font-size:12px;color:var(--text-muted)">${U.esc(r.desc)}</p>
              </div>
            </div>
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:6px">
              <button class="btn sm secondary" data-view="${r.id}" style="flex:1">${lang === 'ar' ? 'عرض' : 'View'}</button>
              <button class="btn sm ghost" data-export-report="${r.id}">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    c.querySelectorAll('[data-report], [data-view]').forEach((card) => {
      card.onclick = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        showReport(card.dataset.report || card.dataset.view);
      };
    });
    c.querySelectorAll('[data-view]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); showReport(b.dataset.view); });
    c.querySelectorAll('[data-export-report]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); exportReport(b.dataset.exportReport); });
  }

  function showReport(id) {
    const lang = ZenI18n.lang;
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    let title, columns, rows, summary;
    const today = new Date();

    if (id === 'employees') {
      title = lang === 'ar' ? 'دليل الموظفين' : 'Employee Directory';
      rows = S.getCollection('employees');
      columns = [
        { label: 'ID', key: 'id' },
        { label: ZenI18n.t('common.employee'), render: (e) => UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), e.id) },
        { label: ZenI18n.t('common.department'), render: (e) => U.esc(deptName(e.departmentId)) },
        { label: ZenI18n.t('emp.jobTitle'), render: (e) => U.esc(lang === 'ar' ? e.jobTitle : e.jobTitleEn) },
        { label: ZenI18n.t('emp.basicSalary'), render: (e) => U.money(e.basicSalary) },
        { label: ZenI18n.t('emp.hireDate'), render: (e) => U.date(e.hireDate) },
        { label: ZenI18n.t('common.status'), render: (e) => UI.statusBadge(e.employmentStatus) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الموظفين' : 'Total Employees', value: rows.length };
    } else if (id === 'active_inactive') {
      title = lang === 'ar' ? 'الموظفون النشطون وغير النشطين' : 'Active & Inactive Employees';
      rows = S.getCollection('employees');
      columns = [
        { label: 'ID', key: 'id' },
        { label: ZenI18n.t('common.employee'), render: (e) => U.esc(e.name) },
        { label: ZenI18n.t('common.status'), render: (e) => UI.statusBadge(e.employmentStatus) },
        { label: ZenI18n.t('emp.hireDate'), render: (e) => U.date(e.hireDate) },
      ];
      const active = rows.filter((r) => r.employmentStatus === 'active').length;
      summary = { label: lang === 'ar' ? 'نشط / إجمالي' : 'Active / Total', value: active + ' / ' + rows.length };
    } else if (id === 'departments') {
      title = lang === 'ar' ? 'توزيع الأقسام' : 'Department Distribution';
      const deps = S.getCollection('departments');
      const emps = S.getCollection('employees');
      rows = deps.map((d) => ({
        id: d.id,
        name: d.name,
        nameEn: d.nameEn,
        active: emps.filter((e) => e.departmentId === d.id && e.employmentStatus === 'active').length,
        total: emps.filter((e) => e.departmentId === d.id).length,
        manager: empMap[d.managerId]?.name || '—',
      }));
      columns = [
        { label: lang === 'ar' ? 'القسم' : 'Department', render: (d) => U.esc(lang === 'ar' ? d.name : d.nameEn) },
        { label: lang === 'ar' ? 'المدير' : 'Manager', render: (d) => U.esc(d.manager) },
        { label: lang === 'ar' ? 'نشط' : 'Active', key: 'active' },
        { label: lang === 'ar' ? 'إجمالي' : 'Total', key: 'total' },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الأقسام' : 'Total Departments', value: rows.length };
    } else if (id === 'attendance' || id === 'absence' || id === 'overtime') {
      const titleMap = {
        attendance: lang === 'ar' ? 'تقرير الحضور' : 'Attendance Report',
        absence: lang === 'ar' ? 'تقرير الغياب' : 'Absence Report',
        overtime: lang === 'ar' ? 'تقرير العمل الإضافي' : 'Overtime Report',
      };
      title = titleMap[id];
      let records = S.getCollection('attendance');
      if (id === 'absence') records = records.filter((a) => a.status === 'absent' || a.status === 'late');
      if (id === 'overtime') records = records.filter((a) => a.overtimeMinutes > 0);
      rows = records;
      columns = [
        { label: ZenI18n.t('common.employee'), render: (a) => { const e = empMap[a.employeeId]; return e ? U.esc(e.name) : a.employeeId; } },
        { label: ZenI18n.t('common.date'), render: (a) => U.date(a.date) },
        { label: ZenI18n.t('common.status'), render: (a) => UI.statusBadge(a.status) },
        { label: lang === 'ar' ? 'ساعات' : 'Hours', render: (a) => a.workMinutes ? (a.workMinutes / 60).toFixed(1) : '—' },
        { label: lang === 'ar' ? 'إضافي' : 'Overtime', render: (a) => a.overtimeMinutes ? a.overtimeMinutes + 'm' : '—' },
        { label: lang === 'ar' ? 'تأخير' : 'Late', render: (a) => a.lateMinutes ? a.lateMinutes + 'm' : '—' },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي السجلات' : 'Total Records', value: rows.length };
    } else if (id === 'leaves') {
      title = lang === 'ar' ? 'تقرير الإجازات' : 'Leave Report';
      rows = S.getCollection('leaves');
      columns = [
        { label: ZenI18n.t('common.employee'), render: (l) => { const e = empMap[l.employeeId]; return e ? U.esc(e.name) : l.employeeId; } },
        { label: ZenI18n.t('common.type'), render: (l) => ZenI18n.t('leave.' + l.type) },
        { label: ZenI18n.t('leave.startDate'), render: (l) => U.date(l.startDate) },
        { label: ZenI18n.t('leave.endDate'), render: (l) => U.date(l.endDate) },
        { label: ZenI18n.t('leave.days'), render: (l) => l.days },
        { label: ZenI18n.t('common.status'), render: (l) => UI.statusBadge(l.status) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', value: rows.length };
    } else if (id === 'payroll') {
      title = lang === 'ar' ? 'تقرير المرتبات' : 'Payroll Report';
      rows = S.getCollection('payroll');
      columns = [
        { label: ZenI18n.t('common.employee'), render: (p) => { const e = empMap[p.employeeId]; return e ? U.esc(e.name) : p.employeeId; } },
        { label: lang === 'ar' ? 'الشهر' : 'Period', render: (p) => U.monthLabel(p.period) },
        { label: lang === 'ar' ? 'الأساسي' : 'Basic', render: (p) => U.money(p.basicSalary) },
        { label: lang === 'ar' ? 'صافي' : 'Net', render: (p) => U.money(p.netSalary) },
        { label: ZenI18n.t('common.status'), render: (p) => UI.statusBadge(p.status) },
      ];
      summary = { label: lang === 'ar' ? 'صافي الإجمالي' : 'Net Total', value: U.money(rows.reduce((s, p) => s + p.netSalary, 0)) };
    } else if (id === 'allowances' || id === 'rewards' || id === 'penalties') {
      const colMap = { allowances: 'allowances', rewards: 'rewards', penalties: 'penalties' };
      const titleMap = { allowances: lang === 'ar' ? 'تقرير البدلات' : 'Allowance Report', rewards: lang === 'ar' ? 'تقرير المكافآت' : 'Reward Report', penalties: lang === 'ar' ? 'تقرير الجزاءات' : 'Penalty Report' };
      title = titleMap[id];
      rows = S.getCollection(colMap[id]);
      columns = [
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? U.esc(e.name) : r.employeeId; } },
        { label: ZenI18n.t('common.type'), render: (r) => U.esc(r.type) },
        { label: ZenI18n.t('common.amount'), render: (r) => U.money(r.amount) },
        { label: ZenI18n.t('common.date'), render: (r) => U.date(r.effectiveDate) },
      ];
      summary = { label: lang === 'ar' ? 'الإجمالي' : 'Total', value: U.money(rows.reduce((s, r) => s + r.amount, 0)) };
    } else if (id === 'insurance') {
      title = lang === 'ar' ? 'تقرير التأمينات والضرائب' : 'Insurance & Tax Report';
      rows = S.getCollection('insurance');
      columns = [
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? U.esc(e.name) : r.employeeId; } },
        { label: lang === 'ar' ? 'مساهمة الموظف' : 'Employee Part', render: (r) => U.money(r.employeeContribution) },
        { label: lang === 'ar' ? 'مساهمة صاحب العمل' : 'Employer Part', render: (r) => U.money(r.employerContribution) },
        { label: lang === 'ar' ? 'الإجمالي' : 'Total', render: (r) => U.money(r.employeeContribution + r.employerContribution) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي المساهمات' : 'Total Contributions', value: U.money(rows.reduce((s, r) => s + r.employeeContribution + r.employerContribution, 0)) };
    } else if (id === 'loans') {
      title = lang === 'ar' ? 'تقرير السلف' : 'Loans Report';
      rows = S.getCollection('loans');
      columns = [
        { label: ZenI18n.t('common.employee'), render: (l) => { const e = empMap[l.employeeId]; return e ? U.esc(e.name) : l.employeeId; } },
        { label: lang === 'ar' ? 'الأصلي' : 'Original', render: (l) => U.money(l.originalAmount) },
        { label: lang === 'ar' ? 'المدفوع' : 'Paid', render: (l) => l.paidInstallments + '/' + l.installments },
        { label: lang === 'ar' ? 'المتبقي' : 'Remaining', render: (l) => U.money(l.remainingBalance) },
        { label: ZenI18n.t('common.status'), render: (l) => UI.statusBadge(l.status) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي المتبقي' : 'Total Remaining', value: U.money(rows.reduce((s, l) => s + l.remainingBalance, 0)) };
    } else if (id === 'contracts') {
      title = lang === 'ar' ? 'تقرير العقود' : 'Contract Report';
      rows = S.getCollection('contracts');
      columns = [
        { label: ZenI18n.t('common.employee'), render: (c) => { const e = empMap[c.employeeId]; return e ? U.esc(e.name) : c.employeeId; } },
        { label: lang === 'ar' ? 'النوع' : 'Type', render: (c) => U.esc(c.type) },
        { label: lang === 'ar' ? 'النهاية' : 'End Date', render: (c) => U.date(c.endDate) },
        { label: lang === 'ar' ? 'الأيام المتبقية' : 'Days Left', render: (c) => { if (!c.endDate) return '—'; const d = Math.round((new Date(c.endDate) - today) / 86400000); return d < 0 ? 0 : d; } },
        { label: ZenI18n.t('common.status'), render: (c) => UI.statusBadge(c.status) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي العقود' : 'Total Contracts', value: rows.length };
    } else if (id === 'hiring') {
      title = lang === 'ar' ? 'تقرير التوظيف' : 'Hiring Report';
      const candidates = S.getCollection('candidates');
      const vacancies = S.getCollection('vacancies');
      rows = vacancies.map((v) => ({
        id: v.id,
        title: v.jobTitle,
        candidates: candidates.filter((c) => c.vacancyId === v.id).length,
        hired: candidates.filter((c) => c.vacancyId === v.id && c.stage === 'hired').length,
        status: v.status,
      }));
      columns = [
        { label: lang === 'ar' ? 'الوظيفة' : 'Job Title', render: (v) => U.esc(v.title) },
        { label: lang === 'ar' ? 'المرشحون' : 'Candidates', key: 'candidates' },
        { label: lang === 'ar' ? 'تم التعيين' : 'Hired', key: 'hired' },
        { label: ZenI18n.t('common.status'), render: (v) => v.status === 'open' ? UI.badge(lang === 'ar' ? 'مفتوحة' : 'Open', 'success') : UI.badge(lang === 'ar' ? 'مغلقة' : 'Closed', 'gray') },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الوظائف' : 'Total Vacancies', value: rows.length };
    } else if (id === 'performance') {
      title = lang === 'ar' ? 'تقرير تقييم الأداء' : 'Performance Report';
      rows = S.getCollection('performance');
      columns = [
        { label: ZenI18n.t('common.employee'), render: (p) => { const e = empMap[p.employeeId]; return e ? U.esc(e.name) : p.employeeId; } },
        { label: lang === 'ar' ? 'الفترة' : 'Period', render: (p) => U.esc(p.period) },
        { label: lang === 'ar' ? 'النتيجة' : 'Score', render: (p) => `<b>${p.overallScore}</b>` },
        { label: lang === 'ar' ? 'التاريخ' : 'Date', render: (p) => U.date(p.evaluationDate) },
      ];
      summary = { label: lang === 'ar' ? 'متوسط النتيجة' : 'Avg Score', value: rows.length ? Math.round(rows.reduce((s, p) => s + p.overallScore, 0) / rows.length) : 0 };
    }

    const body = `
      ${summary ? `<div class="card mb-16" style="background:var(--brand-50);border-color:var(--brand-100)"><b style="color:var(--brand-700);font-size:14px">${U.esc(summary.label)}:</b> <span style="font-size:16px;font-weight:700">${U.esc(summary.value)}</span></div>` : ''}
      <div class="table-wrap"><div class="table-scroll"><table class="data">
        <thead><tr>${columns.map((c) => `<th>${U.esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows.slice(0, 200).map((r) => `<tr>${columns.map((c) => `<td>${c.render ? c.render(r) : U.esc(r[c.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div></div>
      ${rows.length > 200 ? `<p style="text-align:center;color:var(--text-muted);padding:12px">${lang === 'ar' ? 'يتم عرض أول 200 سجل فقط. للعرض الكامل استخدم التصدير.' : 'Showing first 200 records only. Export for full data.'}</p>` : ''}
    `;

    UI.modal({
      title,
      body, size: 'lg',
      footer: [
        { label: ZenI18n.t('common.print'), kind: 'secondary', onClick: () => printReport(id, title, columns, rows, summary) },
        { label: ZenI18n.t('common.export'), kind: 'primary', onClick: () => exportReport(id) },
        { label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() },
      ]
    });
  }

  function deptName(id) {
    const d = S.getById('departments', id);
    return d ? (ZenI18n.lang === 'ar' ? d.name : d.nameEn) : '—';
  }

  function printReport(id, title, columns, rows, summary) {
    const lang = ZenI18n.lang;
    const headerCells = columns.map((c) => `<th>${U.esc(c.label)}</th>`).join('');
    const bodyRows = rows.slice(0, 500).map((r) => `<tr>${columns.map((c) => `<td>${c.render ? (typeof c.render(r) === 'string' ? c.render(r) : U.esc(JSON.stringify(c.render(r))) ) : U.esc(r[c.key] ?? '')}</td>`).join('')}</tr>`).join('');
    const summaryHtml = summary ? `<p style="margin:8px 0 16px"><b>${U.esc(summary.label)}:</b> ${U.esc(summary.value)}</p>` : '';
    U.printElement(`<h2 style="margin:0 0 4px">${U.esc(title)}</h2>${summaryHtml}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`, title);
  }

  function exportReport(id) {
    const lang = ZenI18n.lang;
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    const REPORTS = {
      employees: { collection: 'employees', columns: [
        { label: 'ID', value: (e) => e.id },
        { label: ZenI18n.t('common.employee'), value: (e) => lang === 'ar' ? e.name : (e.nameEn || e.name) },
        { label: ZenI18n.t('common.department'), value: (e) => deptName(e.departmentId) },
        { label: ZenI18n.t('emp.jobTitle'), value: (e) => e.jobTitle },
        { label: ZenI18n.t('emp.basicSalary'), value: (e) => e.basicSalary },
        { label: ZenI18n.t('emp.hireDate'), value: (e) => e.hireDate },
        { label: ZenI18n.t('common.status'), value: (e) => e.employmentStatus },
      ], filename: 'employees' },
      attendance: { collection: 'attendance', columns: [
        { label: ZenI18n.t('common.employee'), value: (a) => { const e = empMap[a.employeeId]; return e ? e.name : a.employeeId; } },
        { label: ZenI18n.t('common.date'), value: (a) => a.date },
        { label: ZenI18n.t('common.status'), value: (a) => a.status },
        { label: lang === 'ar' ? 'ساعات' : 'Hours', value: (a) => a.workMinutes ? (a.workMinutes / 60).toFixed(1) : 0 },
      ], filename: 'attendance' },
      leaves: { collection: 'leaves', columns: [
        { label: ZenI18n.t('common.employee'), value: (l) => { const e = empMap[l.employeeId]; return e ? e.name : l.employeeId; } },
        { label: ZenI18n.t('common.type'), value: (l) => l.type },
        { label: ZenI18n.t('leave.startDate'), value: (l) => l.startDate },
        { label: ZenI18n.t('leave.endDate'), value: (l) => l.endDate },
        { label: ZenI18n.t('leave.days'), value: (l) => l.days },
        { label: ZenI18n.t('common.status'), value: (l) => l.status },
      ], filename: 'leaves' },
      payroll: { collection: 'payroll', columns: [
        { label: ZenI18n.t('common.employee'), value: (p) => { const e = empMap[p.employeeId]; return e ? e.name : p.employeeId; } },
        { label: lang === 'ar' ? 'الشهر' : 'Period', value: (p) => p.period },
        { label: lang === 'ar' ? 'الأساسي' : 'Basic', value: (p) => p.basicSalary },
        { label: lang === 'ar' ? 'صافي' : 'Net', value: (p) => p.netSalary },
        { label: ZenI18n.t('common.status'), value: (p) => p.status },
      ], filename: 'payroll' },
    };
    const report = REPORTS[id];
    if (!report) {
      UI.toast(lang === 'ar' ? 'سيتم إعداد التصدير قريباً' : 'Export for this report type will be added', 'info');
      return;
    }
    const rows = S.getCollection(report.collection);
    ZenExport.toExcel(rows, report.columns, `zenhr-${report.filename}.xls`, report.filename);
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
