/* ============================================================
   AGRIMASTERS HR — Reports Module
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
      { id: 'contracts', icon: '▤', color: 'info', title: lang === 'ar' ? 'تقرير العقود' : 'Contract Report', desc: lang === 'ar' ? 'انتهاء العقود' : 'Contract expirations' },
      { id: 'documents', icon: '▤', color: 'warning', title: lang === 'ar' ? 'تقرير المستندات' : 'Documents Report', desc: lang === 'ar' ? 'المستندات المنتهية والمنتهية قريبًا' : 'Expiring and expired documents' },
      { id: 'disciplinary', icon: '!', color: 'danger', title: lang === 'ar' ? 'تقرير التأديب' : 'Disciplinary Report', desc: lang === 'ar' ? 'الواقعات والقرارات' : 'Incidents and decisions' },
      { id: 'offboarding', icon: '⏻', color: 'gray', title: lang === 'ar' ? 'تقرير إنهاء الخدمة' : 'Offboarding Report', desc: lang === 'ar' ? 'عمليات إنهاء الخدمة' : 'Employment terminations' },
      { id: 'fingerprint_imports', icon: '⇩', color: 'info', title: lang === 'ar' ? 'نتائج استيراد البصمات' : 'Fingerprint Import Results', desc: lang === 'ar' ? 'سجل دفعات الاستيراد' : 'Import batch history' },
      { id: 'audit', icon: '⟲', color: 'gray', title: lang === 'ar' ? 'سجل التدقيق' : 'Audit Log', desc: lang === 'ar' ? 'تاريخ الإجراءات' : 'Action history' },
      { id: 'rounding', icon: '≈', color: 'warning', title: lang === 'ar' ? 'مقارنة التقريب' : 'Rounding Comparison', desc: lang === 'ar' ? 'الأصلية مقابل المُقرّبة' : 'Original vs rounded amounts' },
      { id: 'hiring', icon: '↗', color: 'success', title: lang === 'ar' ? 'تقرير التوظيف' : 'Hiring Report', desc: lang === 'ar' ? 'التوظيف والاستقطاب' : 'Recruitment stats' },
      { id: 'performance', icon: '☆', color: 'brand', title: lang === 'ar' ? 'تقييم الأداء' : 'Performance Report', desc: lang === 'ar' ? 'نتائج التقييمات' : 'Evaluation results' },
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
    } else if (id === 'documents') {
      title = lang === 'ar' ? 'تقرير المستندات' : 'Documents Report';
      const docs = S.getCollection('documents');
      rows = docs.map((d) => {
        let status = 'valid';
        if (!d.issueDate && !d.expiryDate) status = 'missing';
        else if (d.expiryDate && new Date(d.expiryDate) < today) status = 'expired';
        else if (d.expiryDate) {
          const days = (new Date(d.expiryDate) - today) / 86400000;
          if (days >= 0 && days <= 30) status = 'expiring';
        }
        return { ...d, _status: status };
      });
      columns = [
        { label: ZenI18n.t('common.employee'), render: (d) => { const e = empMap[d.employeeId]; return e ? U.esc(e.name) : d.employeeId; } },
        { label: lang === 'ar' ? 'الفئة' : 'Category', render: (d) => U.esc(d.category) },
        { label: lang === 'ar' ? 'العنوان' : 'Title', render: (d) => U.esc(d.title) },
        { label: lang === 'ar' ? 'الانتهاء' : 'Expiry', render: (d) => U.date(d.expiryDate) },
        { label: ZenI18n.t('common.status'), render: (d) => UI.badge(d._status, d._status === 'valid' ? 'success' : (d._status === 'expired' ? 'danger' : (d._status === 'missing' ? 'gray' : 'warning'))) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي المستندات' : 'Total Documents', value: rows.length };
    } else if (id === 'disciplinary') {
      title = lang === 'ar' ? 'تقرير التأديب' : 'Disciplinary Report';
      rows = S.getCollection('disciplinary');
      columns = [
        { label: lang === 'ar' ? 'المرجع' : 'Reference', render: (r) => U.esc(r.id) },
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? U.esc(e.name) : r.employeeId; } },
        { label: ZenI18n.t('common.type'), render: (r) => U.esc(r.type) },
        { label: lang === 'ar' ? 'تاريخ الواقعة' : 'Incident Date', render: (r) => U.date(r.incidentDate) },
        { label: ZenI18n.t('common.status'), render: (r) => UI.badge(r.status, 'gray') },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الواقعات' : 'Total Incidents', value: rows.length };
    } else if (id === 'offboarding') {
      title = lang === 'ar' ? 'تقرير إنهاء الخدمة' : 'Offboarding Report';
      rows = S.getCollection('offboarding');
      columns = [
        { label: lang === 'ar' ? 'المرجع' : 'Reference', render: (r) => U.esc(r.id) },
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? U.esc(e.name) : r.employeeId; } },
        { label: ZenI18n.t('common.type'), render: (r) => U.esc(r.type) },
        { label: lang === 'ar' ? 'آخر يوم' : 'Last Day', render: (r) => U.date(r.lastWorkingDay) },
        { label: ZenI18n.t('common.status'), render: (r) => UI.badge(r.status, 'gray') },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الحالات' : 'Total Cases', value: rows.length };
    } else if (id === 'fingerprint_imports') {
      title = lang === 'ar' ? 'نتائج استيراد البصمات' : 'Fingerprint Import Results';
      rows = S.getCollection('fingerprintImports');
      columns = [
        { label: lang === 'ar' ? 'التاريخ' : 'Date', render: (r) => U.date(r.importedAt) + ' ' + U.time(r.importedAt) },
        { label: lang === 'ar' ? 'الملف' : 'File', render: (r) => U.esc(r.filename) },
        { label: lang === 'ar' ? 'الإجمالي' : 'Total', render: (r) => r.totalRows },
        { label: lang === 'ar' ? 'معترف بها' : 'Recognized', render: (r) => `<b style="color:var(--success-700)">${r.recognized}</b>` },
        { label: lang === 'ar' ? 'غير معروفة' : 'Unknown', render: (r) => r.unknown || 0 },
        { label: lang === 'ar' ? 'مكررة' : 'Duplicates', render: (r) => r.duplicates || 0 },
        { label: lang === 'ar' ? 'أخطاء' : 'Errors', render: (r) => r.errors || 0 },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي الدفعات' : 'Total Batches', value: rows.length };
    } else if (id === 'audit') {
      title = lang === 'ar' ? 'سجل التدقيق' : 'Audit Log';
      rows = S.getCollection('auditLog').sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 500);
      columns = [
        { label: lang === 'ar' ? 'التاريخ' : 'Timestamp', render: (r) => U.date(r.timestamp) + ' ' + U.time(r.timestamp) },
        { label: lang === 'ar' ? 'الإجراء' : 'Action', render: (r) => U.esc(r.action) },
        { label: lang === 'ar' ? 'الكيان' : 'Entity', render: (r) => U.esc(r.entity) },
        { label: lang === 'ar' ? 'المعرف' : 'ID', render: (r) => U.esc(r.entityId || '—') },
        { label: lang === 'ar' ? 'المستخدم' : 'User', render: (r) => U.esc(r.userName || r.user) },
      ];
      summary = { label: lang === 'ar' ? 'إجمالي السجلات' : 'Total Entries', value: S.getCollection('auditLog').length };
    } else if (id === 'rounding') {
      title = lang === 'ar' ? 'مقارنة التقريب (الأصلي مقابل المُقرّب)' : 'Rounding Comparison (Original vs Rounded)';
      const cfg = ZenRounding.getSettings();
      if (!cfg.enabled) {
        UI.modal({
          title,
          body: `<div class="alert info"><b>${lang === 'ar' ? 'التقريب معطّل حالياً.' : 'Rounding is currently OFF.'}</b><br>${lang === 'ar' ? 'فعّل التقريب من الإعدادات → تقريب المبالغ لعرض جدول المقارنة.' : 'Enable rounding in Settings → Rounding to see the comparison table.'}</div>`,
          footer: [{ label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() }],
        });
        return;
      }
      // Build per-employee rounding comparison from current payroll period
      const payrollRecords = S.getCollection('payroll');
      const comparisonRows = [];
      payrollRecords.forEach((p) => {
        const emp = empMap[p.employeeId];
        const items = [
          { category: 'basicSalary', label: lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary', amount: p.basicSalary },
          { category: 'allowances', label: lang === 'ar' ? 'البدلات' : 'Allowances', amount: p.allowances },
          { category: 'bonuses', label: lang === 'ar' ? 'المكافآت' : 'Bonuses', amount: p.rewards },
          { category: 'overtime', label: lang === 'ar' ? 'العمل الإضافي' : 'Overtime', amount: p.overtime },
          { category: 'deductions', label: lang === 'ar' ? 'الخصومات' : 'Deductions', amount: p.deductions },
          { category: 'penalties', label: lang === 'ar' ? 'الجزاءات' : 'Penalties', amount: p.penalties },
          { category: 'insurance', label: lang === 'ar' ? 'تأمين' : 'Insurance', amount: p.insuranceEmployee },
          { category: 'advances', label: lang === 'ar' ? 'قسط سلفة' : 'Loan', amount: p.loanInstallment },
        ].filter((it) => it.amount > 0);
        const r = ZenRounding.applyToItems(items);
        r.items.filter((it) => it.applied).forEach((it) => {
          comparisonRows.push({
            employeeId: p.employeeId,
            employeeName: emp ? (lang === 'ar' ? emp.name : (emp.nameEn || emp.name)) : p.employeeId,
            item: it.label,
            original: it.original,
            rounded: it.rounded,
            difference: it.difference,
            period: p.period,
          });
        });
      });
      rows = comparisonRows;
      columns = [
        { label: 'Employee ID', render: (r) => U.esc(r.employeeId) },
        { label: ZenI18n.t('common.employee'), render: (r) => U.esc(r.employeeName) },
        { label: lang === 'ar' ? 'الشهر' : 'Period', render: (r) => U.esc(r.period) },
        { label: lang === 'ar' ? 'البند' : 'Financial Item', render: (r) => U.esc(r.item) },
        { label: lang === 'ar' ? 'المبلغ الأصلي' : 'Original', render: (r) => U.num(r.original) },
        { label: lang === 'ar' ? 'بعد التقريب' : 'Rounded', render: (r) => '<b>' + U.num(r.rounded) + '</b>' },
        { label: lang === 'ar' ? 'الفرق' : 'Difference', render: (r) => '<span style="color:' + (r.difference < 0 ? 'var(--danger-700)' : 'var(--success-700)') + '">' + (r.difference > 0 ? '+' : '') + U.num(r.difference) + '</span>' },
      ];
      const totalDiff = comparisonRows.reduce((s, r) => s + r.difference, 0);
      summary = { label: lang === 'ar' ? 'إجمالي فرق التقريب' : 'Total Rounding Difference', value: U.num(totalDiff) + ' EGP' };
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
      employees: { collection: 'employees', filename: 'employees', sheetName: lang === 'ar' ? 'الموظفون' : 'Employees', columns: [
        { label: 'ID', value: (e) => e.id },
        { label: ZenI18n.t('common.employee'), value: (e) => lang === 'ar' ? e.name : (e.nameEn || e.name), type: 'text' },
        { label: ZenI18n.t('common.department'), value: (e) => deptName(e.departmentId) },
        { label: ZenI18n.t('emp.jobTitle'), value: (e) => e.jobTitle },
        { label: ZenI18n.t('emp.basicSalary'), value: (e) => e.basicSalary, type: 'money' },
        { label: ZenI18n.t('emp.hireDate'), value: (e) => e.hireDate, type: 'date' },
        { label: ZenI18n.t('common.status'), value: (e) => e.employmentStatus },
      ] },
      attendance: { collection: 'attendance', filename: 'attendance', sheetName: lang === 'ar' ? 'الحضور' : 'Attendance', columns: [
        { label: 'Employee ID', value: (a) => a.employeeId },
        { label: ZenI18n.t('common.employee'), value: (a) => { const e = empMap[a.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : a.employeeId; } },
        { label: ZenI18n.t('common.date'), value: (a) => a.date, type: 'date' },
        { label: lang === 'ar' ? 'الدخول' : 'Check In', value: (a) => a.checkIn || '' },
        { label: lang === 'ar' ? 'الخروج' : 'Check Out', value: (a) => a.checkOut || '' },
        { label: ZenI18n.t('common.status'), value: (a) => a.status },
        { label: lang === 'ar' ? 'ساعات' : 'Hours', value: (a) => a.workedMinutes ? +(a.workedMinutes / 60).toFixed(2) : 0, type: 'number' },
        { label: lang === 'ar' ? 'إضافي' : 'Overtime (min)', value: (a) => a.overtimeMinutes || 0, type: 'number' },
      ] },
      leaves: { collection: 'leaves', filename: 'leaves', sheetName: lang === 'ar' ? 'الإجازات' : 'Leaves', columns: [
        { label: 'Employee ID', value: (l) => l.employeeId },
        { label: ZenI18n.t('common.employee'), value: (l) => { const e = empMap[l.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : l.employeeId; } },
        { label: ZenI18n.t('common.type'), value: (l) => l.type },
        { label: ZenI18n.t('leave.startDate'), value: (l) => l.startDate, type: 'date' },
        { label: ZenI18n.t('leave.endDate'), value: (l) => l.endDate, type: 'date' },
        { label: ZenI18n.t('leave.days'), value: (l) => l.days, type: 'number' },
        { label: ZenI18n.t('common.status'), value: (l) => l.status },
        { label: ZenI18n.t('common.reason'), value: (l) => l.reason || '', wrap: true },
      ] },
      payroll: { collection: 'payroll', filename: 'payroll', sheetName: lang === 'ar' ? 'المرتبات' : 'Payroll', columns: [
        { label: 'Employee ID', value: (p) => p.employeeId },
        { label: ZenI18n.t('common.employee'), value: (p) => { const e = empMap[p.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : p.employeeId; } },
        { label: lang === 'ar' ? 'الشهر' : 'Period', value: (p) => p.period },
        { label: lang === 'ar' ? 'الأساسي' : 'Basic', value: (p) => p.basicSalary, type: 'money' },
        { label: lang === 'ar' ? 'البدلات' : 'Allowances', value: (p) => p.allowances || 0, type: 'money' },
        { label: lang === 'ar' ? 'المكافآت' : 'Rewards', value: (p) => p.rewards || 0, type: 'money' },
        { label: lang === 'ar' ? 'الخصومات' : 'Deductions', value: (p) => p.totalDeductions || 0, type: 'money' },
        { label: lang === 'ar' ? 'صافي' : 'Net', value: (p) => p.netSalary, type: 'money' },
        { label: ZenI18n.t('common.status'), value: (p) => p.status },
      ] },
      documents: { collection: 'documents', filename: 'documents', sheetName: lang === 'ar' ? 'المستندات' : 'Documents', columns: [
        { label: 'Document ID', value: (d) => d.id },
        { label: 'Employee ID', value: (d) => d.employeeId },
        { label: ZenI18n.t('common.employee'), value: (d) => { const e = empMap[d.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : d.employeeId; } },
        { label: lang === 'ar' ? 'الفئة' : 'Category', value: (d) => d.category },
        { label: lang === 'ar' ? 'العنوان' : 'Title', value: (d) => d.title || '' },
        { label: lang === 'ar' ? 'رقم المستند' : 'Number', value: (d) => d.number || '' },
        { label: lang === 'ar' ? 'الإصدار' : 'Issue Date', value: (d) => d.issueDate || '', type: 'date' },
        { label: lang === 'ar' ? 'الانتهاء' : 'Expiry Date', value: (d) => d.expiryDate || '', type: 'date' },
      ] },
      disciplinary: { collection: 'disciplinary', filename: 'disciplinary', sheetName: lang === 'ar' ? 'التأديب' : 'Disciplinary', columns: [
        { label: lang === 'ar' ? 'المرجع' : 'Reference', value: (r) => r.id },
        { label: 'Employee ID', value: (r) => r.employeeId },
        { label: ZenI18n.t('common.employee'), value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
        { label: ZenI18n.t('common.type'), value: (r) => r.type },
        { label: lang === 'ar' ? 'تاريخ الواقعة' : 'Incident Date', value: (r) => r.incidentDate, type: 'date' },
        { label: ZenI18n.t('common.status'), value: (r) => r.status },
        { label: lang === 'ar' ? 'الوصف' : 'Description', value: (r) => r.incidentDescription || '', wrap: true },
        { label: lang === 'ar' ? 'القرار' : 'Decision', value: (r) => r.decision || '', wrap: true },
      ] },
      offboarding: { collection: 'offboarding', filename: 'offboarding', sheetName: lang === 'ar' ? 'إنهاء الخدمة' : 'Offboarding', columns: [
        { label: lang === 'ar' ? 'المرجع' : 'Reference', value: (r) => r.id },
        { label: 'Employee ID', value: (r) => r.employeeId },
        { label: ZenI18n.t('common.employee'), value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
        { label: ZenI18n.t('common.type'), value: (r) => r.type },
        { label: lang === 'ar' ? 'تاريخ الإخطار' : 'Notice Date', value: (r) => r.noticeDate, type: 'date' },
        { label: lang === 'ar' ? 'آخر يوم' : 'Last Day', value: (r) => r.lastWorkingDay, type: 'date' },
        { label: ZenI18n.t('common.status'), value: (r) => r.status },
        { label: lang === 'ar' ? 'المستحقات النهائية' : 'Final Settlement', value: (r) => r.finalSettlement || 0, type: 'money' },
      ] },
      fingerprint_imports: { collection: 'fingerprintImports', filename: 'fingerprint-imports', sheetName: lang === 'ar' ? 'استيراد البصمات' : 'Fingerprint Imports', columns: [
        { label: lang === 'ar' ? 'التاريخ' : 'Date', value: (r) => r.importedAt, type: 'date' },
        { label: lang === 'ar' ? 'الملف' : 'File', value: (r) => r.filename },
        { label: lang === 'ar' ? 'الإجمالي' : 'Total', value: (r) => r.totalRows, type: 'number' },
        { label: lang === 'ar' ? 'معترف بها' : 'Recognized', value: (r) => r.recognized, type: 'number' },
        { label: lang === 'ar' ? 'غير معروفة' : 'Unknown', value: (r) => r.unknown || 0, type: 'number' },
        { label: lang === 'ar' ? 'مكررة' : 'Duplicates', value: (r) => r.duplicates || 0, type: 'number' },
        { label: lang === 'ar' ? 'أخطاء' : 'Errors', value: (r) => r.errors || 0, type: 'number' },
      ] },
      audit: { collection: 'auditLog', filename: 'audit-trail', sheetName: lang === 'ar' ? 'سجل التدقيق' : 'Audit Trail', columns: [
        { label: lang === 'ar' ? 'التاريخ' : 'Timestamp', value: (r) => r.timestamp, type: 'date' },
        { label: lang === 'ar' ? 'الإجراء' : 'Action', value: (r) => r.action },
        { label: lang === 'ar' ? 'الكيان' : 'Entity', value: (r) => r.entity },
        { label: lang === 'ar' ? 'المعرف' : 'ID', value: (r) => r.entityId || '' },
        { label: lang === 'ar' ? 'المستخدم' : 'User', value: (r) => r.userName || r.user },
        { label: lang === 'ar' ? 'التفاصيل' : 'Details', value: (r) => JSON.stringify(r.detail || {}), wrap: true },
      ] },
      rounding: { collection: '__rounding__', filename: 'rounding-comparison', sheetName: lang === 'ar' ? 'مقارنة التقريب' : 'Rounding Comparison', columns: null },
    };
    const report = REPORTS[id];
    if (!report) {
      UI.toast(lang === 'ar' ? 'سيتم إعداد التصدير قريباً' : 'Export for this report type will be added', 'info');
      return;
    }

    // Special case: rounding report builds rows dynamically
    if (id === 'rounding') {
      const cfg = ZenRounding.getSettings();
      if (!cfg.enabled) { UI.toast(lang === 'ar' ? 'التقريب معطّل' : 'Rounding is OFF', 'warning'); return; }
      const payrollRecords = S.getCollection('payroll');
      const comparisonRows = [];
      payrollRecords.forEach((p) => {
        const emp = empMap[p.employeeId];
        const items = [
          { category: 'basicSalary', label: lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary', amount: p.basicSalary },
          { category: 'allowances', label: lang === 'ar' ? 'البدلات' : 'Allowances', amount: p.allowances },
          { category: 'bonuses', label: lang === 'ar' ? 'المكافآت' : 'Bonuses', amount: p.rewards },
          { category: 'overtime', label: lang === 'ar' ? 'العمل الإضافي' : 'Overtime', amount: p.overtime },
          { category: 'deductions', label: lang === 'ar' ? 'الخصومات' : 'Deductions', amount: p.deductions },
          { category: 'penalties', label: lang === 'ar' ? 'الجزاءات' : 'Penalties', amount: p.penalties },
          { category: 'insurance', label: lang === 'ar' ? 'تأمين' : 'Insurance', amount: p.insuranceEmployee },
          { category: 'advances', label: lang === 'ar' ? 'قسط سلفة' : 'Loan', amount: p.loanInstallment },
        ].filter((it) => it.amount > 0);
        const r = ZenRounding.applyToItems(items);
        r.items.filter((it) => it.applied).forEach((it) => {
          comparisonRows.push({
            employeeId: p.employeeId,
            employeeName: emp ? (lang === 'ar' ? emp.name : (emp.nameEn || emp.name)) : p.employeeId,
            period: p.period,
            item: it.label,
            original: it.original,
            rounded: it.rounded,
            difference: it.difference,
          });
        });
      });
      if (!comparisonRows.length) { UI.toast(lang === 'ar' ? 'لا توجد فروق تقريب' : 'No rounding differences', 'info'); return; }
      const cols = [
        { label: 'Employee ID', value: (r) => r.employeeId },
        { label: ZenI18n.t('common.employee'), value: (r) => r.employeeName },
        { label: lang === 'ar' ? 'الشهر' : 'Period', value: (r) => r.period },
        { label: lang === 'ar' ? 'البند' : 'Financial Item', value: (r) => r.item },
        { label: lang === 'ar' ? 'المبلغ الأصلي' : 'Original', value: (r) => r.original, type: 'money' },
        { label: lang === 'ar' ? 'بعد التقريب' : 'Rounded', value: (r) => r.rounded, type: 'money' },
        { label: lang === 'ar' ? 'الفرق' : 'Difference', value: (r) => r.difference, type: 'money' },
      ];
      const filename = `agrimasters-rounding-comparison-${U.today()}.xlsx`;
      ZenExport.toXLSX(comparisonRows, cols, filename, report.sheetName, { title: 'AGRIMASTERS HR — ' + report.sheetName });
      if (window.ZenAudit) ZenAudit.logExport('rounding', { count: comparisonRows.length });
      UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير بصيغة XLSX' : 'Exported as XLSX', 'success');
      return;
    }

    const rows = S.getCollection(report.collection);
    if (!rows.length) { UI.toast(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning'); return; }
    const filename = `agrimasters-${report.filename}-${U.today()}.xlsx`;
    ZenExport.toXLSX(rows, report.columns, filename, report.sheetName, { title: 'AGRIMASTERS HR — ' + report.sheetName });
    if (window.ZenAudit) ZenAudit.logExport(report.collection, { count: rows.length, filename });
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير بصيغة XLSX' : 'Exported as XLSX', 'success');
  }

  return { render };
})();
