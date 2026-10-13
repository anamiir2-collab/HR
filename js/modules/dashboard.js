/* ============================================================
   AGRIMASTERS HR — Dashboard Module
   Real statistics computed from stored records.
   ============================================================ */
window.ZenDashboard = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;

    const today = U.today();
    const todayDate = new Date();
    const cm = U.currentMonth();
    const lang = ZenI18n.lang;

    const employees = S.getCollection('employees');
    const attendance = S.getCollection('attendance');
    const leaves = S.getCollection('leaves');
    const payroll = S.getCollection('payroll');
    const contracts = S.getCollection('contracts');
    const vacancies = S.getCollection('vacancies');
    const candidates = S.getCollection('candidates');
    const documents = S.getCollection('documents');
    const disciplinary = S.getCollection('disciplinary');
    const offboarding = S.getCollection('offboarding');
    const corrections = S.getCollection('attendanceCorrections');

    const active = employees.filter((e) => e.employmentStatus === 'active');
    const onLeave = employees.filter((e) => e.employmentStatus === 'on_leave');
    const inactive = employees.filter((e) => e.employmentStatus === 'inactive');
    const archived = employees.filter((e) => e.employmentStatus === 'resigned' || e.employmentStatus === 'terminated');

    const todayAtt = attendance.filter((a) => a.date === today);
    const presentToday = todayAtt.filter((a) => a.status === 'present' || a.status === 'remote').length;
    const lateToday = todayAtt.filter((a) => a.status === 'late').length;
    const absentToday = todayAtt.filter((a) => a.status === 'absent').length;
    // Missing punches: present/late but no check-out
    const missingPunches = todayAtt.filter((a) => (a.status === 'present' || a.status === 'late') && !a.checkOut).length;
    // Active employees without attendance today
    const empIdsToday = new Set(todayAtt.map((a) => a.employeeId));
    const onLeaveIds = new Set(onLeave.map((e) => e.id));
    const missingToday = active.filter((e) => !empIdsToday.has(e.id) && !onLeaveIds.has(e.id)).length;
    // Overtime hours today
    const overtimeTodayMin = todayAtt.reduce((s, a) => s + (a.overtimeMinutes || 0), 0);
    const overtimeTodayHrs = (overtimeTodayMin / 60).toFixed(1);

    const pendingLeaves = leaves.filter((l) => l.status === 'pending');
    const pendingCorrections = corrections.filter((cc) => cc.status === 'pending');
    const upcomingContracts = contracts.filter((cc) => {
      if (cc.status !== 'active' || !cc.endDate) return false;
      const days = (new Date(cc.endDate) - todayDate) / 86400000;
      return days >= 0 && days <= 60;
    });

    // Upcoming document expirations (next 30 days)
    const upcomingDocs = documents.filter((d) => {
      if (!d.expiryDate) return false;
      const days = (new Date(d.expiryDate) - todayDate) / 86400000;
      return days >= 0 && days <= 30;
    });

    // Open disciplinary cases
    const openDisciplinary = disciplinary.filter((d) => d.status === 'open' || d.status === 'under_investigation' || d.status === 'pending_decision').length;

    // Offboarding in progress
    const offboardingInProgress = offboarding.filter((o) => o.status === 'pending' || o.status === 'approved' || o.status === 'in_progress').length;

    const monthPayroll = payroll.filter((p) => p.period === cm);
    const totalPayroll = monthPayroll.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalAllowances = monthPayroll.reduce((s, p) => s + (p.allowances || 0), 0);
    const totalRewards = monthPayroll.reduce((s, p) => s + (p.rewards || 0), 0);
    const totalDeductions = monthPayroll.reduce((s, p) => s + (p.totalDeductions || 0), 0);
    const payrollStatus = monthPayroll.length === 0 ? (lang === 'ar' ? 'لم يُعالج' : 'Not processed') :
      monthPayroll.some((p) => p.status === 'draft') ? (lang === 'ar' ? 'مسودة' : 'Draft') :
      monthPayroll.some((p) => p.status === 'approved' || p.status === 'paid') ? (lang === 'ar' ? 'معتمد' : 'Approved') :
      (lang === 'ar' ? 'تمت المعالجة' : 'Processed');

    const openVacancies = vacancies.filter((v) => v.status === 'open');

    // Welcome header
    const hour = todayDate.getHours();
    const greeting = hour < 12 ? (lang === 'ar' ? 'صباح الخير' : 'Good morning') : (hour < 18 ? (lang === 'ar' ? 'مساء الخير' : 'Good afternoon') : (lang === 'ar' ? 'مساء الخير' : 'Good evening'));
    const userName = (window.ZenAuth && ZenAuth.currentUser() && ZenAuth.currentUser().name) || (lang === 'ar' ? 'مدير الموارد البشرية' : 'HR Manager');
    document.getElementById('welcome-title').textContent = greeting + '، ' + userName;
    document.getElementById('welcome-subtitle').textContent = lang === 'ar' ? 'إليك ملخصًا سريعًا لكل ما يحدث في فريقك اليوم.' : 'Here is a quick summary of what is happening with your team today.';
    document.getElementById('today-date').textContent = U.date(todayDate, { weekday: 'long' }) + ' · ' + U.monthName(todayDate.getMonth(), lang) + ' ' + todayDate.getFullYear();

    const wa = document.getElementById('welcome-actions');
    if (wa) {
      wa.innerHTML = `
        <button class="btn secondary" data-nav="fingerprint"><span>⇩</span> <span>${lang === 'ar' ? 'استيراد البصمات' : 'Import Punches'}</span></button>
        <button class="btn primary" data-nav="employees"><span>＋</span> <span>${lang === 'ar' ? 'إدارة الموظفين' : 'Manage Employees'}</span></button>
      `;
      wa.querySelector('[data-nav="fingerprint"]').onclick = () => ZenRouter.go('fingerprint');
      wa.querySelector('[data-nav="employees"]').onclick = () => ZenRouter.go('employees');
    }

    // Department distribution
    const depCounts = {};
    S.getCollection('departments').forEach((d) => depCounts[d.id] = 0);
    active.forEach((e) => { if (depCounts[e.departmentId] != null) depCounts[e.departmentId]++; });
    const depData = S.getCollection('departments').map((d) => ({
      label: lang === 'ar' ? d.name : d.nameEn,
      value: depCounts[d.id] || 0,
      color: ['#15803d', '#166534', '#14532d', '#16a34a', '#22c55e', '#b45309', '#7e22ce', '#be185d', '#c2410c', '#4338ca', '#0e7490', '#334155', '#92400e', '#581c87', '#0c4a6e'][Math.abs(d.id.length) % 15]
    })).filter((d) => d.value > 0);

    // Attendance trend (last 7 days)
    const attTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const count = attendance.filter((a) => a.date === ds && (a.status === 'present' || a.status === 'remote' || a.status === 'late')).length;
      attTrend.push({ label: U.dayName(d.getDay(), lang).substring(0, 3), value: count });
    }

    // Monthly payroll trend (last 6 months)
    const payTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const total = payroll.filter((p) => p.period === ym).reduce((s, p) => s + (p.netSalary || 0), 0);
      payTrend.push({ label: U.monthName(d.getMonth(), lang).substring(0, 3), value: Math.round(total / 1000) });
    }

    // Hiring trend (last 6 months)
    const hiringTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const count = employees.filter((e) => e.hireDate && e.hireDate.startsWith(ym)).length;
      hiringTrend.push({ label: U.monthName(d.getMonth(), lang).substring(0, 3), value: count });
    }

    // Status distribution
    const statusData = [
      { label: ZenI18n.t('status.active'), value: active.length, color: '#22c55e' },
      { label: ZenI18n.t('status.on_leave'), value: onLeave.length, color: '#3b82f6' },
      { label: ZenI18n.t('status.inactive'), value: inactive.length, color: '#94a3b8' },
      { label: ZenI18n.t('status.resigned'), value: archived.length, color: '#ef4444' },
    ];

    // Leave distribution
    const leaveByType = {};
    ['annual', 'sick', 'emergency', 'unpaid', 'other'].forEach((t) => leaveByType[t] = 0);
    leaves.forEach((l) => { if (leaveByType[l.type] != null) leaveByType[l.type]++; });
    const leaveData = Object.entries(leaveByType).map(([k, v]) => ({
      label: ZenI18n.t('leave.' + k),
      value: v,
      color: { annual: '#15803d', sick: '#ef4444', emergency: '#f59e0b', unpaid: '#94a3b8', other: '#3b82f6' }[k]
    }));

    c.innerHTML = `
      <!-- KPI Cards — Row 1: Workforce -->
      <div class="stat-grid">
        ${statCard('♙', 'brand', ZenI18n.t('employees'), U.num(employees.length), `${active.length} ${lang === 'ar' ? 'نشط' : 'active'} · ${archived.length} ${lang === 'ar' ? 'منتهي' : 'archived'}`, '')}
        ${statCard('✓', 'success', lang === 'ar' ? 'حاضر اليوم' : 'Present Today', U.num(presentToday), `${lateToday} ${lang === 'ar' ? 'متأخر' : 'late'} · ${absentToday} ${lang === 'ar' ? 'غائب' : 'absent'}`, '')}
        ${statCard('?', 'warning', lang === 'ar' ? 'لم يسجل حضورًا' : 'Missing Attendance', U.num(missingToday), lang === 'ar' ? 'موظف نشط بدون سجل' : 'active employees without record', '')}
        ${statCard('!', 'danger', lang === 'ar' ? 'بصمة خروج مفقودة' : 'Missing Check-Out', U.num(missingPunches), lang === 'ar' ? 'سجل اليوم' : "today's records", '')}
      </div>

      <!-- KPI Cards — Row 2: Leaves & Corrections -->
      <div class="stat-grid">
        ${statCard('▣', 'warning', lang === 'ar' ? 'إجازات قيد المراجعة' : 'Pending Leaves', U.num(pendingLeaves.length), `${leaves.length} ${lang === 'ar' ? 'إجمالي الطلبات' : 'total requests'}`, '')}
        ${statCard('⌥', 'info', lang === 'ar' ? 'تصحيحات حضور معلقة' : 'Pending Corrections', U.num(pendingCorrections.length), lang === 'ar' ? 'بانتظار المراجعة' : 'awaiting review', '')}
        ${statCard('▣', 'info', lang === 'ar' ? 'في إجازة' : 'On Leave', U.num(onLeave.length), '', '')}
        ${statCard('◷', 'success', lang === 'ar' ? 'ساعات إضافية اليوم' : "Today's Overtime", overtimeTodayHrs, lang === 'ar' ? 'ساعة' : 'hours', '')}
      </div>

      <!-- KPI Cards — Row 3: Payroll -->
      <div class="stat-grid">
        ${statCard('ج.م', 'brand', lang === 'ar' ? 'مرتبات الشهر' : 'Month Payroll', U.money(totalPayroll), `${monthPayroll.length} ${lang === 'ar' ? 'موظف' : 'employees'} · ${payrollStatus}`, '')}
        ${statCard('↗', 'success', lang === 'ar' ? 'البدلات' : 'Allowances', U.money(totalAllowances), '', '')}
        ${statCard('＋', 'info', lang === 'ar' ? 'المكافآت' : 'Rewards', U.money(totalRewards), '', '')}
        ${statCard('−', 'danger', lang === 'ar' ? 'الخصومات' : 'Deductions', U.money(totalDeductions), '', '')}
      </div>

      <!-- KPI Cards — Row 4: Compliance -->
      <div class="stat-grid">
        ${statCard('▤', 'warning', lang === 'ar' ? 'عقود تنتهي قريبًا' : 'Contracts Expiring', U.num(upcomingContracts.length), lang === 'ar' ? 'خلال 60 يوم' : 'next 60 days', '')}
        ${statCard('▤', 'danger', lang === 'ar' ? 'مستندات تنتهي' : 'Documents Expiring', U.num(upcomingDocs.length), lang === 'ar' ? 'خلال 30 يوم' : 'next 30 days', '')}
        ${statCard('!', 'danger', lang === 'ar' ? 'واقعات تأديبية مفتوحة' : 'Open Disciplinary', U.num(openDisciplinary), '', '')}
        ${statCard('⏻', 'warning', lang === 'ar' ? 'حالات إنهاء قيد المعالجة' : 'Offboarding In Progress', U.num(offboardingInProgress), '', '')}
      </div>

      <!-- Quick Actions -->
      <div class="card mb-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</h3></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
          ${quickAction('employees', '＋', lang === 'ar' ? 'تسجيل موظف' : 'Register Employee')}
          ${quickAction('attendance', '◷', lang === 'ar' ? 'تسجيل حضور' : 'Record Attendance')}
          ${quickAction('fingerprint', '⇩', lang === 'ar' ? 'استيراد بصمات' : 'Import Punches')}
          ${quickAction('leaves', '▣', lang === 'ar' ? 'اعتماد إجازة' : 'Approve Leave')}
          ${quickAction('payroll', 'ج.م', lang === 'ar' ? 'معالجة المرتبات' : 'Process Payroll')}
          ${quickAction('reports', '▥', lang === 'ar' ? 'تصدير التقارير' : 'Export Reports')}
        </div>
      </div>

      <!-- Charts -->
      <div class="grid-2 mb-16">
        <div class="chart-card">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'توزيع الموظفين حسب القسم' : 'Employees by Department'}</h3><p>${lang === 'ar' ? 'الموظفون النشطون' : 'Active employees'}</p></div></div>
          ${UI.barChart(depData)}
        </div>
        <div class="chart-card">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution'}</h3><p>${lang === 'ar' ? 'كل الموظفين' : 'All employees'}</p></div></div>
          <div class="donut-chart">
            ${UI.donutSvg(statusData, 160)}
            <div class="donut-legend">
              ${statusData.map((d) => `<div class="donut-legend-item"><span class="swatch" style="background:${d.color}"></span> ${U.esc(d.label)}: <b>${d.value}</b></div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2 mb-16">
        <div class="chart-card">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'اتجاه الحضور (7 أيام)' : 'Attendance Trend (7 days)'}</h3></div></div>
          ${UI.barChart(attTrend)}
        </div>
        <div class="chart-card">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'مرتبات شهرية (6 أشهر، بالألف)' : 'Monthly Payroll (6 months, in thousands)'}</h3></div></div>
          ${UI.barChart(payTrend)}
        </div>
      </div>

      <div class="grid-2 mb-16">
        <div class="chart-card">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'اتجاه التوظيف (6 أشهر)' : 'Hiring Trend (6 months)'}</h3></div></div>
          ${UI.barChart(hiringTrend)}
        </div>
        <div class="chart-card">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'توزيع الإجازات' : 'Leave Distribution'}</h3></div></div>
          <div class="donut-chart">
            ${UI.donutSvg(leaveData, 160)}
            <div class="donut-legend">
              ${leaveData.map((d) => `<div class="donut-legend-item"><span class="swatch" style="background:${d.color}"></span> ${U.esc(d.label)}: <b>${d.value}</b></div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Pending items lists -->
      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div><h3>${lang === 'ar' ? 'إجازات قيد المراجعة' : 'Pending Leaves'}</h3><p>${pendingLeaves.length} ${lang === 'ar' ? 'طلب' : 'requests'}</p></div>
            <button class="btn sm secondary" data-nav="leaves">${lang === 'ar' ? 'عرض الكل' : 'View all'}</button>
          </div>
          ${pendingLeaves.length === 0 ? UI.empty('∅', ZenI18n.t('common.empty'), '') : `<div class="table-scroll"><table class="data">
            <thead><tr><th>${ZenI18n.t('common.employee')}</th><th>${ZenI18n.t('common.type')}</th><th>${ZenI18n.t('leave.startDate')}</th><th>${ZenI18n.t('leave.days')}</th></tr></thead>
            <tbody>${pendingLeaves.slice(0, 5).map((l) => {
              const emp = S.getById('employees', l.employeeId);
              return `<tr style="cursor:pointer" data-leave="${l.id}"><td>${emp ? UI.avatarCell(emp.name, emp.id) : U.esc(l.employeeId)}</td><td>${ZenI18n.t('leave.' + l.type)}</td><td>${U.date(l.startDate)}</td><td>${l.days}</td></tr>`;
            }).join('')}</tbody>
          </table></div>`}
        </div>

        <div class="card">
          <div class="card-head">
            <div><h3>${lang === 'ar' ? 'عقود تنتهي قريباً' : 'Upcoming Contract Expirations'}</h3><p>${upcomingContracts.length} ${lang === 'ar' ? 'عقد' : 'contracts'}</p></div>
            <button class="btn sm secondary" data-nav="contracts">${lang === 'ar' ? 'عرض الكل' : 'View all'}</button>
          </div>
          ${upcomingContracts.length === 0 ? UI.empty('∅', ZenI18n.t('common.empty'), '') : `<div class="table-scroll"><table class="data">
            <thead><tr><th>${ZenI18n.t('common.employee')}</th><th>${lang === 'ar' ? 'نهاية العقد' : 'End Date'}</th><th>${lang === 'ar' ? 'الأيام المتبقية' : 'Days left'}</th></tr></thead>
            <tbody>${upcomingContracts.slice(0, 5).map((cc) => {
              const emp = S.getById('employees', cc.employeeId);
              const days = Math.round((new Date(cc.endDate) - todayDate) / 86400000);
              return `<tr style="cursor:pointer" data-contract="${cc.id}"><td>${emp ? UI.avatarCell(emp.name, emp.id) : U.esc(cc.employeeId)}</td><td>${U.date(cc.endDate)}</td><td>${days > 0 ? days : 0}</td></tr>`;
            }).join('')}</tbody>
          </table></div>`}
        </div>
      </div>
    `;

    // Wire up clicks
    c.querySelectorAll('[data-leave]').forEach((tr) => {
      tr.onclick = () => ZenRouter.go('leaves', { id: tr.dataset.leave });
    });
    c.querySelectorAll('[data-contract]').forEach((tr) => {
      tr.onclick = () => ZenRouter.go('contracts', { id: tr.dataset.contract });
    });
    c.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.onclick = () => ZenRouter.go(btn.dataset.nav);
    });
  }

  function statCard(icon, color, label, value, sub, trend) {
    const trendCls = (trend || '').startsWith('+') ? 'trend-pos' : '';
    return `<div class="stat-card">
      <div class="stat-icon ${color}">${icon}</div>
      <div class="stat-label">${U.esc(label)}</div>
      <div class="stat-value">${U.esc(value)}</div>
      <div class="stat-foot"><span class="${trendCls}">${U.esc(trend || '')}</span><small>${U.esc(sub || '')}</small></div>
    </div>`;
  }

  function quickAction(page, icon, label) {
    return `<button class="btn secondary" data-nav="${page}" style="display:flex;flex-direction:column;gap:6px;padding:14px 10px;height:auto">
      <span style="font-size:24px">${icon}</span>
      <span style="font-size:12px;font-weight:600">${U.esc(label)}</span>
    </button>`;
  }

  return { render };
})();
