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
        { page: 'central-settings', icon: '◷', labelKey: 'centralSettings' },
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
    'central-settings': () => ZenCentralSettings.render(),
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

  function setVisibleView(view) {
    const gate = document.getElementById('gate-view');
    const app = document.getElementById('app');
    // Hide both first so no intermediate frame can show both screens.
    if (gate) gate.hidden = true;
    if (app) app.hidden = true;
    if (view === 'app' && app) app.hidden = false;
    if (view === 'gate' && gate) gate.hidden = false;
  }

  function showApp() {
    closeNotifDrawer();
    closeMenu();
    setVisibleView('app');
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
    closeNotifDrawer();
    closeMenu();
    setVisibleView('gate');
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

    // Load read-state (persistent set of notification keys)
    let readKeys = [];
    try { readKeys = JSON.parse(localStorage.getItem('agrimasters:notif-read') || '[]'); } catch (e) { readKeys = []; }
    const readSet = new Set(readKeys);

    const notifs = [];
    // Pending leaves
    const pendingLeaves = S.findBy('leaves', (l) => l.status === 'pending');
    if (pendingLeaves.length) {
      notifs.push({
        key: 'pending-leaves',
        icon: '▣', color: 'warning',
        title: I18n.lang === 'ar' ? 'طلبات إجازة معلقة' : 'Pending Leave Requests',
        body: I18n.lang === 'ar' ? `${pendingLeaves.length} طلب بانتظار المراجعة` : `${pendingLeaves.length} pending review`,
        timestamp: new Date().toISOString(),
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
        key: 'contracts-expiring',
        icon: '▤', color: 'info',
        title: I18n.lang === 'ar' ? 'عقود تنتهي قريباً' : 'Contracts Expiring',
        body: I18n.lang === 'ar' ? `${upcoming.length} عقد خلال 30 يوم` : `${upcoming.length} contracts within 30 days`,
        timestamp: new Date().toISOString(),
        action: () => Router.go('contracts'),
      });
    }
    // Document expirations (next 30 days)
    const upcomingDocs = S.findBy('documents', (d) => {
      if (!d.expiryDate) return false;
      const days = (new Date(d.expiryDate) - today) / 86400000;
      return days >= 0 && days <= 30;
    });
    if (upcomingDocs.length) {
      notifs.push({
        key: 'docs-expiring',
        icon: '▤', color: 'warning',
        title: I18n.lang === 'ar' ? 'مستندات تنتهي قريباً' : 'Documents Expiring',
        body: I18n.lang === 'ar' ? `${upcomingDocs.length} مستند خلال 30 يوم` : `${upcomingDocs.length} documents within 30 days`,
        timestamp: new Date().toISOString(),
        action: () => Router.go('documents'),
      });
    }
    // Pending payroll drafts
    const draftPayroll = S.findBy('payroll', (p) => p.status === 'draft');
    if (draftPayroll.length) {
      notifs.push({
        key: 'draft-payroll',
        icon: 'ج.م', color: 'success',
        title: I18n.lang === 'ar' ? 'مرتبات مسودة' : 'Draft Payroll',
        body: I18n.lang === 'ar' ? `${draftPayroll.length} سجل بانتظار المعالجة` : `${draftPayroll.length} records awaiting processing`,
        timestamp: new Date().toISOString(),
        action: () => Router.go('payroll'),
      });
    }
    // Open disciplinary cases
    const openDisciplinary = S.findBy('disciplinary', (d) => d.status === 'open' || d.status === 'under_investigation' || d.status === 'pending_decision');
    if (openDisciplinary.length) {
      notifs.push({
        key: 'open-disciplinary',
        icon: '!', color: 'danger',
        title: I18n.lang === 'ar' ? 'واقعات تأديبية مفتوحة' : 'Open Disciplinary Cases',
        body: I18n.lang === 'ar' ? `${openDisciplinary.length} حالة قيد المعالجة` : `${openDisciplinary.length} cases in progress`,
        timestamp: new Date().toISOString(),
        action: () => Router.go('disciplinary'),
      });
    }
    // Offboarding in progress
    const offboardingInProgress = S.findBy('offboarding', (o) => o.status === 'pending' || o.status === 'approved' || o.status === 'in_progress');
    if (offboardingInProgress.length) {
      notifs.push({
        key: 'offboarding-progress',
        icon: '⏻', color: 'warning',
        title: I18n.lang === 'ar' ? 'حالات إنهاء قيد المعالجة' : 'Offboarding In Progress',
        body: I18n.lang === 'ar' ? `${offboardingInProgress.length} حالة` : `${offboardingInProgress.length} cases`,
        timestamp: new Date().toISOString(),
        action: () => Router.go('offboarding'),
      });
    }
    // Open vacancies
    const openVacancies = S.findBy('vacancies', (v) => v.status === 'open');
    if (openVacancies.length) {
      notifs.push({
        key: 'open-vacancies',
        icon: '♙', color: 'brand',
        title: I18n.lang === 'ar' ? 'وظائف شاغرة' : 'Open Vacancies',
        body: I18n.lang === 'ar' ? `${openVacancies.length} وظيفة مفتوحة` : `${openVacancies.length} open vacancies`,
        timestamp: new Date().toISOString(),
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
        key: 'upcoming-loans',
        icon: '$', color: 'warning',
        title: I18n.lang === 'ar' ? 'أقساط قادمة' : 'Upcoming Installments',
        body: I18n.lang === 'ar' ? `${upcomingLoans.length} قسط خلال 7 أيام` : `${upcomingLoans.length} installments within 7 days`,
        timestamp: new Date().toISOString(),
        action: () => Router.go('loans'),
      });
    }

    const unreadCount = notifs.filter((n) => !readSet.has(n.key)).length;
    if (dot) dot.hidden = unreadCount === 0;
    // Update the bell badge
    const bell = document.getElementById('notif-button');
    if (bell) {
      let badge = bell.querySelector('.notif-badge');
      if (unreadCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notif-badge';
          bell.appendChild(badge);
        }
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      } else if (badge) {
        badge.remove();
      }
    }

    notifList.innerHTML = notifs.length === 0 ?
      `<div class="empty-state" style="padding:30px 10px"><div class="empty-icon">✓</div><h3>${I18n.t('notifications.empty')}</h3><p style="color:var(--text-muted);font-size:12px">${I18n.lang === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications at this time'}</p></div>` :
      `<div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;color:var(--text-muted)">${notifs.length} ${I18n.lang === 'ar' ? 'إشعار' : 'notifications'} · ${unreadCount} ${I18n.lang === 'ar' ? 'غير مقروء' : 'unread'}</span>
        ${unreadCount > 0 ? `<button class="btn sm ghost" id="notif-mark-all" style="font-size:11px">${I18n.lang === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all read'}</button>` : ''}
      </div>` +
      notifs.map((n) => {
        const isRead = readSet.has(n.key);
        return `
          <div class="notif-item ${isRead ? 'read' : 'unread'}" data-notif-key="${U.esc(n.key)}">
            <div class="notif-icon" style="background:var(--${n.color}-100);color:var(--${n.color}-700)">${n.icon}</div>
            <div class="notif-body">
              <b>${U.esc(n.title)}</b>
              <p>${U.esc(n.body)}</p>
              <small style="color:var(--text-muted);font-size:10px">${U.date(n.timestamp)} ${U.time(n.timestamp)}</small>
            </div>
            ${!isRead ? '<span class="notif-unread-dot" style="width:8px;height:8px;border-radius:50%;background:var(--brand-500);flex-shrink:0"></span>' : ''}
          </div>
        `;
      }).join('');

    // Wire mark-all-read
    const markAllBtn = document.getElementById('notif-mark-all');
    if (markAllBtn) {
      markAllBtn.onclick = () => {
        const allKeys = notifs.map((n) => n.key);
        const newRead = Array.from(new Set([...readKeys, ...allKeys]));
        localStorage.setItem('agrimasters:notif-read', JSON.stringify(newRead));
        updateNotifications();
      };
    }
    // Wire individual click — mark as read AND navigate
    notifList.querySelectorAll('[data-notif-key]').forEach((el) => {
      el.onclick = () => {
        const key = el.dataset.notifKey;
        const notif = notifs.find((n) => n.key === key);
        if (!notif) return;
        // Mark as read
        if (!readSet.has(key)) {
          readSet.add(key);
          localStorage.setItem('agrimasters:notif-read', JSON.stringify(Array.from(readSet)));
        }
        // Navigate
        notif.action();
        closeNotifDrawer();
      };
    });
  }

  function openNotifDrawer() {
    closeMenu();
    const drawer = document.getElementById('notif-drawer');
    const scrim = document.getElementById('notif-scrim');
    if (!drawer || !scrim) return;
    drawer.hidden = false;
    scrim.hidden = false;
    scrim.classList.add('visible');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeNotifDrawer() {
    const drawer = document.getElementById('notif-drawer');
    const scrim = document.getElementById('notif-scrim');
    if (drawer) {
      drawer.hidden = true;
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (scrim) {
      scrim.classList.remove('visible');
      scrim.hidden = true;
    }
  }

  function openMenu() {
    closeNotifDrawer();
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('scrim');
    if (sidebar) sidebar.classList.add('open');
    if (scrim) {
      scrim.hidden = false;
      scrim.classList.add('visible');
    }
  }
  function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('scrim');
    if (sidebar) sidebar.classList.remove('open');
    if (scrim) {
      scrim.classList.remove('visible');
      scrim.hidden = true;
    }
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
        else if (action === 'notifications') {
          // Toggle: if open, close; if closed, open
          const drawer = document.getElementById('notif-drawer');
          if (drawer && !drawer.hidden) closeNotifDrawer();
          else openNotifDrawer();
        }
        else if (action === 'logout') logout();
      });
    });

    // Escape key closes notification drawer and mobile menu
    if (!window.__escapeWired) {
      window.__escapeWired = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const notifDrawer = document.getElementById('notif-drawer');
          if (notifDrawer && !notifDrawer.hidden) {
            closeNotifDrawer();
            return;
          }
          const sidebar = document.getElementById('sidebar');
          if (sidebar && sidebar.classList.contains('open')) {
            closeMenu();
            return;
          }
          // Close any open modal
          const modalBackdrop = document.querySelector('.modal-backdrop');
          if (modalBackdrop) {
            const closeBtn = modalBackdrop.querySelector('[data-close]');
            if (closeBtn) closeBtn.click();
            return;
          }
        }
      });
    }

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
    // Fail closed during startup: never render the gate and dashboard together.
    setVisibleView('none');
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
