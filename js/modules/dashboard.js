/* ============================================================
   ZenHR — Dashboard Module
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

    const active = employees.filter((e) => e.employmentStatus === 'active');
    const onLeave = employees.filter((e) => e.employmentStatus === 'on_leave');
    const inactive = employees.filter((e) => e.employmentStatus === 'inactive');
    const resigned = employees.filter((e) => e.employmentStatus === 'resigned' || e.employmentStatus === 'terminated');

    const todayAtt = attendance.filter((a) => a.date === today);
    const presentToday = todayAtt.filter((a) => a.status === 'present' || a.status === 'remote').length;
    const lateToday = todayAtt.filter((a) => a.status === 'late').length;
    const absentToday = todayAtt.filter((a) => a.status === 'absent').length;

    const pendingLeaves = leaves.filter((l) => l.status === 'pending');
    const upcomingContracts = contracts.filter((c) => {
      if (c.status !== 'active') return false;
      const days = (new Date(c.endDate) - todayDate) / 86400000;
      return days >= 0 && days <= 60;
    });

    const monthPayroll = payroll.filter((p) => p.period === cm);
    const totalPayroll = monthPayroll.reduce((s, p) => s + p.netSalary, 0);
    const totalAllowances = monthPayroll.reduce((s, p) => s + p.allowances, 0);
    const totalRewards = monthPayroll.reduce((s, p) => s + p.rewards, 0);
    const totalDeductions = monthPayroll.reduce((s, p) => s + p.totalDeductions, 0);

    const openVacancies = vacancies.filter((v) => v.status === 'open');

    // Welcome header
    const hour = todayDate.getHours();
    const greeting = hour < 12 ? (lang === 'ar' ? 'صباح الخير' : 'Good morning') : (hour < 18 ? (lang === 'ar' ? 'مساء الخير' : 'Good afternoon') : (lang === 'ar' ? 'مساء الخير' : 'Good evening'));
    const userName = (window.ZenAuth && ZenAuth.currentUser() && ZenAuth.currentUser().name) || (lang === 'ar' ? 'مدير النظام' : 'Admin');
    document.getElementById('welcome-title').textContent = greeting + '، ' + userName;
    document.getElementById('welcome-subtitle').textContent = lang === 'ar' ? 'إليك ملخصًا سريعًا لكل ما يحدث في فريقك اليوم.' : 'Here is a quick summary of what is happening with your team today.';
    document.getElementById('today-date').textContent = U.date(todayDate, { weekday: 'long' }) + ' · ' + U.monthName(todayDate.getMonth(), lang) + ' ' + todayDate.getFullYear();

    const wa = document.getElementById('welcome-actions');
    if (wa) {
      wa.innerHTML = `
        <button class="btn secondary" data-action="export-data"><span>⇩</span> <span data-i18n="common.export">${ZenI18n.t('common.export')}</span></button>
        <button class="btn primary" data-nav="employees"><span>＋</span> <span>${lang === 'ar' ? 'إدارة الموظفين' : 'Manage Employees'}</span></button>
      `;
      wa.querySelector('[data-action="export-data"]').onclick = () => ZenRouter.go('reports');
      wa.querySelector('[data-nav="employees"]').onclick = () => ZenRouter.go('employees');
    }

    // Department distribution
    const depCounts = {};
    S.getCollection('departments').forEach((d) => depCounts[d.id] = 0);
    active.forEach((e) => { if (depCounts[e.departmentId] != null) depCounts[e.departmentId]++; });
    const depData = S.getCollection('departments').map((d) => ({
      label: lang === 'ar' ? d.name : d.nameEn,
      value: depCounts[d.id] || 0,
      color: ['#0f766e', '#1d4ed8', '#15803d', '#b45309', '#7e22ce', '#be185d', '#c2410c', '#4338ca', '#0e7490', '#334155', '#92400e', '#581c87', '#0c4a6e'][Math.abs(d.id.hashCode ? d.id.hashCode() : d.id.length) % 13]
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
      const total = payroll.filter((p) => p.period === ym).reduce((s, p) => s + p.netSalary, 0);
      payTrend.push({ label: U.monthName(d.getMonth(), lang).substring(0, 3), value: Math.round(total / 1000) });
    }

    // Hiring trend (last 6 months)
    const hiringTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const count = employees.filter((e) => e.hireDate.startsWith(ym)).length;
      hiringTrend.push({ label: U.monthName(d.getMonth(), lang).substring(0, 3), value: count });
    }

    // Status distribution
    const statusData = [
      { label: ZenI18n.t('status.active'), value: active.length, color: '#22c55e' },
      { label: ZenI18n.t('status.on_leave'), value: onLeave.length, color: '#3b82f6' },
      { label: ZenI18n.t('status.inactive'), value: inactive.length, color: '#94a3b8' },
      { label: ZenI18n.t('status.resigned'), value: resigned.length, color: '#ef4444' },
    ];

    // Leave distribution
    const leaveByType = {};
    ['annual', 'sick', 'emergency', 'unpaid', 'other'].forEach((t) => leaveByType[t] = 0);
    leaves.forEach((l) => { if (leaveByType[l.type] != null) leaveByType[l.type]++; });
    const leaveData = Object.entries(leaveByType).map(([k, v]) => ({
      label: ZenI18n.t('leave.' + k),
      value: v,
      color: { annual: '#0f766e', sick: '#ef4444', emergency: '#f59e0b', unpaid: '#94a3b8', other: '#3b82f6' }[k]
    }));

    c.innerHTML = `
      <!-- KPI Cards -->
      <div class="stat-grid">
        ${statCard('emp', 'brand', ZenI18n.t('employees'), U.num(employees.length), `${active.length} ${lang === 'ar' ? 'نشط' : 'active'}`, '+2.4%')}
        ${statCard('emp', 'success', lang === 'ar' ? 'حضور اليوم' : 'Present Today', U.num(presentToday), `${lateToday} ${lang === 'ar' ? 'متأخر' : 'late'}`, 'live')}
        ${statCard('!', 'danger', lang === 'ar' ? 'غياب اليوم' : 'Absent Today', U.num(absentToday), `${todayAtt.length} ${lang === 'ar' ? 'إجمالي السجلات' : 'records'}`, '')}
        ${statCard('▢', 'warning', lang === 'ar' ? 'إجازات قيد المراجعة' : 'Pending Leaves', U.num(pendingLeaves.length), `${leaves.length} ${lang === 'ar' ? 'إجمالي الطلبات' : 'total requests'}`, '')}
      </div>

      <div class="stat-grid">
        ${statCard('ج.م', 'info', lang === 'ar' ? 'مرتبات الشهر' : 'Month Payroll', U.money(totalPayroll), `${monthPayroll.length} ${lang === 'ar' ? 'موظف' : 'employees'}`, '')}
        ${statCard('↗', 'success', lang === 'ar' ? 'البدلات' : 'Allowances', U.money(totalAllowances), '', '')}
        ${statCard('＋', 'info', lang === 'ar' ? 'المكافآت' : 'Rewards', U.money(totalRewards), '', '')}
        ${statCard('−', 'danger', lang === 'ar' ? 'الخصومات' : 'Deductions', U.money(totalDeductions), '', '')}
      </div>

      <div class="stat-grid">
        ${statCard('◷', 'info', lang === 'ar' ? 'عقود تنتهي قريباً' : 'Contracts Expiring', U.num(upcomingContracts.length), lang === 'ar' ? 'خلال 60 يوم' : 'next 60 days', '')}
        ${statCard('♙', 'brand', lang === 'ar' ? 'وظائف شاغرة' : 'Open Vacancies', U.num(openVacancies.length), `${candidates.length} ${lang === 'ar' ? 'مرشح' : 'candidates'}`, '')}
        ${statCard('⊥', 'gray', lang === 'ar' ? 'منتهية الخدمة' : 'Resigned/Terminated', U.num(resigned.length), '', '')}
        ${statCard('▣', 'warning', lang === 'ar' ? 'في إجازة' : 'On Leave', U.num(onLeave.length), '', '')}
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
            <tbody>${upcomingContracts.slice(0, 5).map((c) => {
              const emp = S.getById('employees', c.employeeId);
              const days = Math.round((new Date(c.endDate) - todayDate) / 86400000);
              return `<tr style="cursor:pointer" data-contract="${c.id}"><td>${emp ? UI.avatarCell(emp.name, emp.id) : U.esc(c.employeeId)}</td><td>${U.date(c.endDate)}</td><td>${days > 0 ? days : 0}</td></tr>`;
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

  return { render };
})();
