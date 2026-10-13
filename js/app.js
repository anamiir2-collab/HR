/* ============================================================
   AGRIMASTERS HR — Main Application Bootstrap
   ============================================================ */
(function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;
  const Auth = window.ZenAuth;
  const Router = window.ZenRouter;
  const I18n = window.ZenI18n;

  const NAV_GROUPS = [
    {
      caption: { ar: 'الرئيسية', en: 'Main' },
      items: [
        { page: 'dashboard', icon: '▦', labelKey: 'dashboard' },
        { page: 'employees', icon: '♙', labelKey: 'employees' },
        { page: 'attendance', icon: '◷', labelKey: 'attendance' },
        { page: 'fingerprint', icon: '◷', labelKey: 'fingerprint' },
        { page: 'leaves', icon: '▣', labelKey: 'leaves', badge: () => S.findBy('leaves', (l) => l.status === 'pending').length },
      ]
    },
    {
      caption: { ar: 'الشؤون المالية', en: 'Finance' },
      items: [
        { page: 'payroll', icon: 'ج.م', labelKey: 'payroll' },
        { page: 'rewards', icon: '＋', labelKey: 'rewards' },
        { page: 'allowances', icon: '↗', labelKey: 'allowances' },
        { page: 'penalties', icon: '!', labelKey: 'penalties' },
        { page: 'deductions', icon: '−', labelKey: 'deductions' },
        { page: 'insurance', icon: '▤', labelKey: 'insurance' },
        { page: 'loans', icon: '$', labelKey: 'loans' },
      ]
    },
    {
      caption: { ar: 'الموارد البشرية', en: 'Human Resources' },
      items: [
        { page: 'departments', icon: '▦', labelKey: 'departments' },
        { page: 'shifts', icon: '◷', labelKey: 'shifts' },
        { page: 'documents', icon: '▤', labelKey: 'documents' },
        { page: 'disciplinary', icon: '!', labelKey: 'disciplinary' },
        { page: 'offboarding', icon: '⏻', labelKey: 'offboarding' },
        { page: 'performance', icon: '☆', labelKey: 'performance' },
        { page: 'recruitment', icon: '♙', labelKey: 'recruitment' },
        { page: 'contracts', icon: '▤', labelKey: 'contracts' },
      ]
    },
    {
      caption: { ar: 'النظام', en: 'System' },
      items: [
        { page: 'reports', icon: '▥', labelKey: 'reports' },
        { page: 'audit', icon: '⟲', labelKey: 'audit' },
        { page: 'settings', icon: '⚙', labelKey: 'settings' },
      ]
    }
  ];

  // Module registry: page name -> render function
  const MODULES = {
    dashboard: () => ZenDashboard.render(),
    employees: () => ZenEmployees.render(),
    attendance: () => ZenAttendance.render(),
    fingerprint: () => ZenFingerprint.render(),
    leaves: (p) => ZenLeaves.render(p),
    payroll: () => ZenPayroll.render(),
    rewards: () => ZenRewards.render(),
    allowances: () => ZenAllowances.render(),
    penalties: () => ZenPenalties.render(),
    deductions: () => ZenDeductions.render(),
    insurance: () => ZenInsurance.render(),
    loans: () => ZenLoans.render(),
    departments: () => ZenDepartments.render(),
    shifts: () => ZenShifts.render(),
    documents: () => ZenDocuments.render(),
    disciplinary: () => ZenDisciplinary.render(),
    offboarding: () => ZenOffboarding.render(),
    performance: () => ZenPerformance.render(),
    recruitment: () => ZenRecruitment.render(),
    contracts: (p) => ZenContracts.render(p),
    reports: () => ZenReports.render(),
    audit: () => ZenAudit.render(),
    settings: () => ZenSettings.render(),
  };

  function buildNav() {
    const navList = document.getElementById('nav-list');
    if (!navList) return;
    navList.innerHTML = NAV_GROUPS.map((group) => {
      const caption = group.caption[I18n.lang] || group.caption.ar;
      return `<p class="nav-caption">${U.esc(caption)}</p>` +
        group.items.map((item) => {
          const label = I18n.t(item.labelKey);
          const badge = item.badge ? item.badge() : 0;
          return `<button class="nav-item" data-page="${item.page}">
            <span class="nav-icon">${item.icon}</span>
            <span>${U.esc(label)}</span>
            ${badge > 0 ? `<em>${badge}</em>` : ''}
          </button>`;
        }).join('');
    }).join('');

    navList.querySelectorAll('.nav-item').forEach((btn) => {
      btn.onclick = () => Router.go(btn.dataset.page);
    });
  }

  function showApp() {
    document.getElementById('gate-view').hidden = true;
    document.getElementById('app').hidden = false;
    buildNav();
    updateUserInfo();
    // Auto-initialize demo data on first run if not already initialized.
    // Safe: checks demoInitialized flag, only runs once, never overwrites user data.
    if (!S.settings.demoInitialized) {
      try {
        ZenDemoData.initialize(false);
      } catch (e) {
        console.error('Demo data initialization failed:', e);
      }
    }
    // Register modules
    Object.entries(MODULES).forEach(([name, fn]) => Router.register(name, fn));
    Router.start();
    updateNotifications();
    setInterval(updateNotifications, 60000);
  }

  function showGate() {
    document.getElementById('gate-view').hidden = false;
    document.getElementById('app').hidden = true;
    const form = document.getElementById('gate-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const pwd = document.getElementById('gate-password').value;
        if (Auth.login(pwd)) {
          showApp();
        } else {
          UI.toast(I18n.lang === 'ar' ? 'رمز الدخول غير صحيح' : 'Wrong access code', 'error');
        }
      };
    }
    const langBtn = document.getElementById('gate-lang');
    if (langBtn) langBtn.onclick = () => { I18n.toggle(); updateGateLang(); };
    updateGateLang();
  }

  function updateGateLang() {
    const langBtn = document.getElementById('gate-lang');
    if (langBtn) langBtn.textContent = I18n.lang === 'ar' ? 'English' : 'العربية';
    I18n.apply(document.getElementById('gate-view'));
  }

  function updateUserInfo() {
    const user = Auth.currentUser();
    if (user) {
      const nameEl = document.getElementById('user-name');
      const avatarEl = document.getElementById('user-avatar');
      const topAvatarEl = document.getElementById('top-avatar');
      const name = I18n.lang === 'ar' ? (user.name || 'مدير النظام') : (user.nameEn || 'Admin');
      if (nameEl) nameEl.textContent = name;
      const ini = U.initials(name);
      if (avatarEl) avatarEl.textContent = ini;
      if (topAvatarEl) topAvatarEl.textContent = ini;
    }
    // Update company name
    const cn = document.getElementById('company-name');
    if (cn) cn.textContent = I18n.lang === 'ar' ? (S.settings.companyName || 'أجريماسترز') : (S.settings.companyNameEn || 'AGRIMASTERS');
    const ca = document.getElementById('company-avatar');
    if (ca) ca.textContent = U.initials(I18n.lang === 'ar' ? (S.settings.companyName || 'أجريماسترز') : (S.settings.companyNameEn || 'AGRIMASTERS'));
  }

  function updateNotifications() {
    const today = new Date();
    const notifList = document.getElementById('notif-list');
    const dot = document.getElementById('notif-dot');
    if (!notifList) return;

    const notifs = [];
    // Pending leaves
    const pendingLeaves = S.findBy('leaves', (l) => l.status === 'pending');
    if (pendingLeaves.length) {
      notifs.push({
        icon: '▣', color: 'warning',
        title: I18n.lang === 'ar' ? 'طلبات إجازة معلقة' : 'Pending Leave Requests',
        body: I18n.lang === 'ar' ? `${pendingLeaves.length} طلب بانتظار المراجعة` : `${pendingLeaves.length} pending review`,
        action: () => Router.go('leaves'),
      });
    }
    // Contract expirations (next 30 days)
    const upcoming = S.findBy('contracts', (c) => {
      if (c.status !== 'active' || !c.endDate) return false;
      const days = (new Date(c.endDate) - today) / 86400000;
      return days >= 0 && days <= 30;
    });
    if (upcoming.length) {
      notifs.push({
        icon: '📄', color: 'info',
        title: I18n.lang === 'ar' ? 'عقود تنتهي قريباً' : 'Contracts Expiring',
        body: I18n.lang === 'ar' ? `${upcoming.length} عقد خلال 30 يوم` : `${upcoming.length} contracts within 30 days`,
        action: () => Router.go('contracts'),
      });
    }
    // Pending payroll drafts
    const draftPayroll = S.findBy('payroll', (p) => p.status === 'draft');
    if (draftPayroll.length) {
      notifs.push({
        icon: 'ج.م', color: 'success',
        title: I18n.lang === 'ar' ? 'مرتبات مسودة' : 'Draft Payroll',
        body: I18n.lang === 'ar' ? `${draftPayroll.length} سجل بانتظار المعالجة` : `${draftPayroll.length} records awaiting processing`,
        action: () => Router.go('payroll'),
      });
    }
    // Open vacancies with candidates
    const openVacancies = S.findBy('vacancies', (v) => v.status === 'open');
    if (openVacancies.length) {
      notifs.push({
        icon: '♙', color: 'brand',
        title: I18n.lang === 'ar' ? 'وظائف شاغرة' : 'Open Vacancies',
        body: I18n.lang === 'ar' ? `${openVacancies.length} وظيفة مفتوحة` : `${openVacancies.length} open vacancies`,
        action: () => Router.go('recruitment'),
      });
    }
    // Active loans with upcoming installments
    const upcomingLoans = S.findBy('loans', (l) => {
      if (l.status !== 'active') return false;
      const days = (new Date(l.nextInstallmentDate) - today) / 86400000;
      return days >= 0 && days <= 7;
    });
    if (upcomingLoans.length) {
      notifs.push({
        icon: '$', color: 'warning',
        title: I18n.lang === 'ar' ? 'أقساط قادمة' : 'Upcoming Installments',
        body: I18n.lang === 'ar' ? `${upcomingLoans.length} قسط خلال 7 أيام` : `${upcomingLoans.length} installments within 7 days`,
        action: () => Router.go('loans'),
      });
    }

    if (dot) dot.hidden = notifs.length === 0;
    notifList.innerHTML = notifs.length === 0 ?
      `<div class="empty-state" style="padding:30px 10px"><div class="empty-icon">✓</div><h3>${I18n.t('notifications.empty')}</h3></div>` :
      notifs.map((n) => `
        <div class="notif-item" data-notif="${notifs.indexOf(n)}">
          <div class="notif-icon" style="background:var(--${n.color}-100);color:var(--${n.color}-700)">${n.icon}</div>
          <div class="notif-body"><b>${U.esc(n.title)}</b><p>${U.esc(n.body)}</p></div>
        </div>
      `).join('');
    notifList.querySelectorAll('[data-notif]').forEach((el) => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.notif, 10);
        notifs[idx].action();
        closeNotifDrawer();
      };
    });
  }

  function openNotifDrawer() {
    document.getElementById('notif-drawer').hidden = false;
    document.getElementById('notif-scrim').hidden = false;
    document.getElementById('notif-scrim').classList.add('visible');
  }
  function closeNotifDrawer() {
    document.getElementById('notif-drawer').hidden = true;
    document.getElementById('notif-scrim').hidden = true;
    document.getElementById('notif-scrim').classList.remove('visible');
  }

  function openMenu() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('scrim').classList.add('visible');
  }
  function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('scrim').classList.remove('visible');
  }

  // Wire up global actions
  function wireGlobalActions() {
    document.querySelectorAll('[data-action]').forEach((el) => {
      if (el.__wired) return;
      el.__wired = true;
      el.addEventListener('click', () => {
        const action = el.dataset.action;
        if (action === 'open-menu') openMenu();
        else if (action === 'close-menu') closeMenu();
        else if (action === 'close-notif') closeNotifDrawer();
        else if (action === 'language') I18n.toggle();
        else if (action === 'notifications') openNotifDrawer();
        else if (action === 'logout') logout();
        else if (action === 'support') UI.toast(I18n.lang === 'ar' ? 'للدعم: support@zenhr.demo' : 'For support: support@zenhr.demo', 'info');
      });
    });

    // Global search
    const search = document.getElementById('global-search');
    if (search && !search.__wired) {
      search.__wired = true;
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = e.target.value.trim();
          if (!q) return;
          // Try to find employee by name or ID
          const matches = S.findBy('employees', (emp) =>
            emp.name.toLowerCase().includes(q.toLowerCase()) ||
            emp.id.toLowerCase().includes(q.toLowerCase())
          );
          if (matches.length > 0) {
            Router.go('employees');
            setTimeout(() => {
              ZenEmployees.state.search = q;
              const s = document.getElementById('emp-search');
              if (s) { s.value = q; ZenEmployees.render(); }
            }, 100);
          } else {
            UI.toast(I18n.lang === 'ar' ? 'لا توجد نتائج' : 'No results', 'info');
          }
        }
      });
    }
  }

  function logout() {
    UI.confirm({
      title: I18n.lang === 'ar' ? 'تسجيل الخروج' : 'Logout',
      message: I18n.lang === 'ar' ? 'هل تريد الخروج؟ ستبقى البيانات محفوظة.' : 'Log out? Your data will remain saved.',
      kind: 'warning',
      confirmLabel: I18n.lang === 'ar' ? 'خروج' : 'Logout',
      onConfirm: () => {
        Auth.logout();
        location.reload();
      }
    });
  }

  function onLangChange() {
    buildNav();
    updateUserInfo();
    updateGateLang();
    // Re-render current page
    if (Auth.isAuthed()) {
      Router.render();
    }
    // Update language button label
    const langBtn = document.getElementById('lang-button');
    if (langBtn) langBtn.textContent = I18n.lang === 'ar' ? 'EN' : 'ع';
    I18n.apply();
  }

  function init() {
    // Apply language
    I18n.apply();
    // Wire global actions
    wireGlobalActions();
    // Show gate or app
    if (Auth.isAuthed()) {
      showApp();
    } else {
      showGate();
    }
    // Set initial language button label
    const langBtn = document.getElementById('lang-button');
    if (langBtn) langBtn.textContent = I18n.lang === 'ar' ? 'EN' : 'ع';
  }

  // Public API
  window.ZenApp = {
    init,
    onLangChange,
    buildNav,
  };

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
