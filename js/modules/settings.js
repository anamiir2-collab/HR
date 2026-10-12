/* ============================================================
   ZenHR — Settings Module
   Includes: General, Company, Rules, Backup/Restore, Demo Data, About
   ============================================================ */
window.ZenSettings = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { tab: 'general' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const tabs = [
      { id: 'general', label: lang === 'ar' ? 'عام' : 'General' },
      { id: 'company', label: lang === 'ar' ? 'الشركة' : 'Company' },
      { id: 'rules', label: lang === 'ar' ? 'القواعد' : 'Rules' },
      { id: 'backup', label: lang === 'ar' ? 'النسخ الاحتياطي' : 'Backup' },
      { id: 'demo', label: lang === 'ar' ? 'البيانات التجريبية' : 'Demo Data' },
      { id: 'about', label: lang === 'ar' ? 'حول' : 'About' },
    ];

    c.innerHTML = `
      <div class="tabs mb-16">
        ${tabs.map((t) => `<div class="tab ${state.tab === t.id ? 'active' : ''}" data-tab="${t.id}">${U.esc(t.label)}</div>`).join('')}
      </div>
      <div id="settings-content"></div>
    `;

    c.querySelectorAll('.tab').forEach((t) => t.onclick = () => { state.tab = t.dataset.tab; render(); });
    const target = c.querySelector('#settings-content');
    if (state.tab === 'general') renderGeneral(target);
    else if (state.tab === 'company') renderCompany(target);
    else if (state.tab === 'rules') renderRules(target);
    else if (state.tab === 'backup') renderBackup(target);
    else if (state.tab === 'demo') renderDemo(target);
    else renderAbout(target);
  }

  function renderGeneral(c) {
    const lang = ZenI18n.lang;
    const s = S.settings;
    c.innerHTML = `
      <div class="card">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'الإعدادات العامة' : 'General Settings'}</h3></div></div>
        <form id="gen-form" class="form-grid">
          ${UI.formField({ label: ZenI18n.t('settings.language'), name: 'language', type: 'select', value: ZenI18n.lang, options: [{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }] })}
          ${UI.formField({ label: ZenI18n.t('settings.currency'), name: 'currency', type: 'select', value: s.currency, options: [
            { value: 'EGP', label: 'جنيه مصري (EGP)' },
            { value: 'SAR', label: 'ريال سعودي (SAR)' },
            { value: 'USD', label: 'دولار أمريكي (USD)' },
            { value: 'AED', label: 'درهم إماراتي (AED)' },
          ] })}
          ${UI.formField({ label: lang === 'ar' ? 'رمز الدخول' : 'Access Code', name: 'accessPassword', value: s.accessPassword })}
          ${UI.formField({ label: lang === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications', name: 'notificationsEnabled', type: 'select', value: s.notificationsEnabled ? 'true' : 'false', options: [{ value: 'true', label: lang === 'ar' ? 'نعم' : 'Yes' }, { value: 'false', label: lang === 'ar' ? 'لا' : 'No' }] })}
        </form>
        <div class="form-actions">
          <button class="btn primary" id="gen-save">${ZenI18n.t('common.save')}</button>
        </div>
      </div>
    `;
    document.getElementById('gen-save').onclick = () => {
      const form = document.getElementById('gen-form');
      const data = UI.readForm(form);
      S.settings.currency = data.currency;
      S.settings.accessPassword = data.accessPassword || 'admin';
      S.settings.notificationsEnabled = data.notificationsEnabled === 'true';
      S.saveSettings();
      if (data.language !== ZenI18n.lang) ZenI18n.setLang(data.language);
      UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
    };
  }

  function renderCompany(c) {
    const lang = ZenI18n.lang;
    const s = S.settings;
    c.innerHTML = `
      <div class="card">
        <div class="card-head"><div><h3>${ZenI18n.t('settings.company')}</h3></div></div>
        <form id="co-form" class="form-grid">
          ${UI.formField({ label: lang === 'ar' ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)', name: 'companyName', value: s.companyName, required: true })}
          ${UI.formField({ label: lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)', name: 'companyNameEn', value: s.companyNameEn })}
        </form>
        <div class="form-actions"><button class="btn primary" id="co-save">${ZenI18n.t('common.save')}</button></div>
      </div>
    `;
    document.getElementById('co-save').onclick = () => {
      const form = document.getElementById('co-form');
      const data = UI.readForm(form);
      S.settings.companyName = data.companyName;
      S.settings.companyNameEn = data.companyNameEn;
      S.saveSettings();
      UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
      // Update header
      const cn = document.getElementById('company-name');
      if (cn) cn.textContent = data.companyName;
    };
  }

  function renderRules(c) {
    const lang = ZenI18n.lang;
    const s = S.settings;
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    c.innerHTML = `
      <div class="card mb-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'قواعد العمل والحضور' : 'Work & Attendance Rules'}</h3></div></div>
        <form id="rules-form" class="form-grid">
          ${UI.formField({ label: lang === 'ar' ? 'وقت بداية العمل' : 'Work Start Time', name: 'workStartTime', type: 'time', value: s.workStartTime })}
          ${UI.formField({ label: lang === 'ar' ? 'وقت نهاية العمل' : 'Work End Time', name: 'workEndTime', type: 'time', value: s.workEndTime })}
          ${UI.formField({ label: lang === 'ar' ? 'سماح التأخير (دقيقة)' : 'Grace Period (min)', name: 'graceMinutes', type: 'number', value: s.graceMinutes, attrs: ' min="0" step="5"' })}
          ${UI.formField({ label: lang === 'ar' ? 'استراحة (دقيقة)' : 'Break (min)', name: 'breakMinutes', type: 'number', value: s.breakMinutes, attrs: ' min="0" step="5"' })}
          ${UI.formField({ label: lang === 'ar' ? 'ساعات العمل الشهرية' : 'Monthly Work Hours', name: 'monthlyWorkingHours', type: 'number', value: s.monthlyWorkingHours, attrs: ' min="0"' })}
          ${UI.formField({ label: lang === 'ar' ? 'معامل العمل الإضافي' : 'Overtime Rate', name: 'overtimeRate', type: 'number', value: s.overtimeRate, attrs: ' min="1" step="0.1"' })}
          ${UI.formField({ label: lang === 'ar' ? 'رصيد الإجازة السنوية' : 'Annual Leave Balance', name: 'leaveAnnualBalance', type: 'number', value: s.leaveAnnualBalance, attrs: ' min="0"' })}
          ${UI.formField({ label: lang === 'ar' ? 'رصيد الإجازة المرضية' : 'Sick Leave Balance', name: 'leaveSickBalance', type: 'number', value: s.leaveSickBalance, attrs: ' min="0"' })}
          <div class="full">
            <span style="font-size:12px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">${lang === 'ar' ? 'أيام العمل الافتراضية' : 'Default Working Days'}</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${allDays.map((d) => `
                <label style="display:flex;align-items:center;gap:4px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px">
                  <input type="checkbox" name="day-${d}" ${s.workingDays?.includes(d) ? 'checked' : ''}>${U.dayName(d, lang).substring(0, 3)}
                </label>`).join('')}
            </div>
          </div>
        </form>
        <div class="form-actions"><button class="btn primary" id="rules-save">${ZenI18n.t('common.save')}</button></div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px">⚠ ${lang === 'ar' ? 'لا تقم بتثبيت قواعد قانونية كأنها مطبقة عالمياً.' : 'Do not hardcode legal rules as universally applicable.'}</p>
      </div>
    `;
    document.getElementById('rules-save').onclick = () => {
      const form = document.getElementById('rules-form');
      const data = UI.readForm(form);
      const workingDays = allDays.filter((d) => data['day-' + d]);
      S.settings.workStartTime = data.workStartTime;
      S.settings.workEndTime = data.workEndTime;
      S.settings.graceMinutes = Number(data.graceMinutes);
      S.settings.breakMinutes = Number(data.breakMinutes);
      S.settings.monthlyWorkingHours = Number(data.monthlyWorkingHours);
      S.settings.overtimeRate = Number(data.overtimeRate);
      S.settings.leaveAnnualBalance = Number(data.leaveAnnualBalance);
      S.settings.leaveSickBalance = Number(data.leaveSickBalance);
      S.settings.workingDays = workingDays;
      S.saveSettings();
      UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
    };
  }

  function renderBackup(c) {
    const lang = ZenI18n.lang;
    const info = S.storageInfo();
    c.innerHTML = `
      <div class="card mb-16">
        <div class="card-head"><div><h3>${ZenI18n.t('settings.backup')}</h3></div></div>
        <div class="detail-grid mb-16">
          <div class="detail-item"><span class="label">${lang === 'ar' ? 'الحجم التقريبي' : 'Approx Size'}</span><span class="value">${info.approxMB} MB</span></div>
          <div class="detail-item"><span class="label">${lang === 'ar' ? 'آخر نسخة' : 'Last Backup'}</span><span class="value">${S.settings.lastBackup ? U.date(S.settings.lastBackup) : '—'}</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" id="bk-create">${lang === 'ar' ? 'تصدير نسخة احتياطية' : 'Create Backup'}</button>
          <button class="btn secondary" id="bk-restore">${lang === 'ar' ? 'استعادة نسخة' : 'Restore Backup'}</button>
        </div>
        <input type="file" id="bk-file" accept=".json" hidden>
        <p style="font-size:11px;color:var(--text-muted);margin-top:12px">⚠ ${lang === 'ar' ? 'استعادة نسخة قد تستبدل البيانات الحالية.' : 'Restoring may replace current data.'}</p>
      </div>

      <div class="card">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'تخزين البيانات' : 'Storage Usage'}</h3></div></div>
        <div class="table-wrap"><div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'المجموعة' : 'Collection'}</th><th>${lang === 'ar' ? 'السجلات' : 'Records'}</th></tr></thead>
          <tbody>${info.collections.map((c) => `<tr><td>${U.esc(c.name)}</td><td>${U.num(c.count)}</td></tr>`).join('')}</tbody>
        </table></div></div>
      </div>
    `;
    document.getElementById('bk-create').onclick = () => {
      const fn = ZenBackup.create();
      UI.toast(lang === 'ar' ? 'تم إنشاء نسخة احتياطية: ' + fn : 'Backup created: ' + fn, 'success');
      render();
    };
    document.getElementById('bk-restore').onclick = () => document.getElementById('bk-file').click();
    document.getElementById('bk-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      UI.confirm({
        title: lang === 'ar' ? 'استعادة بيانات' : 'Restore Data',
        message: lang === 'ar' ? 'سيتم استبدال البيانات الحالية بالكامل بالنسخة المحددة. هل تريد المتابعة؟' : 'This will replace all current data with the selected backup. Continue?',
        kind: 'danger',
        confirmLabel: lang === 'ar' ? 'استعادة' : 'Restore',
        onConfirm: async () => {
          try {
            await ZenBackup.restore(file, 'replace');
            UI.toast(lang === 'ar' ? 'تمت الاستعادة' : 'Restored', 'success');
            render();
            // re-render current page
            ZenRouter.render();
          } catch (err) {
            UI.toast(err.message || 'فشل الاستعادة', 'error');
          }
        }
      });
    };
  }

  function renderDemo(c) {
    const lang = ZenI18n.lang;
    const stats = ZenDemoData.stats();
    c.innerHTML = `
      <div class="card mb-16">
        <div class="card-head"><div><h3>${ZenI18n.t('settings.demoData')}</h3><p>${lang === 'ar' ? 'بيانات تجريبية لاختبار النظام - كل البيانات خيالية' : 'Demo data for testing - all data is fictional'}</p></div></div>
        <div class="detail-grid mb-16">
          ${Object.entries(stats).map(([k, v]) => `<div class="detail-item"><span class="label">${U.esc(k)}</span><span class="value">${U.num(v)}</span></div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" id="dm-init">${lang === 'ar' ? 'تهيئة بيانات تجريبية' : 'Initialize Demo Data'}</button>
          <button class="btn secondary" id="dm-reset">${lang === 'ar' ? 'إعادة التهيئة' : 'Reset to Original'}</button>
          <button class="btn danger" id="dm-delete">${lang === 'ar' ? 'حذف البيانات التجريبية' : 'Delete Demo Data'}</button>
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:12px">⚠ ${lang === 'ar' ? 'حذف البيانات التجريبية لن يحذف بياناتك الحقيقية.' : 'Deleting demo data will NOT delete your real records.'}</p>
      </div>
    `;
    document.getElementById('dm-init').onclick = () => {
      if (S.settings.demoInitialized) {
        UI.toast(lang === 'ar' ? 'البيانات التجريبية موجودة بالفعل' : 'Demo data already exists', 'info');
        return;
      }
      ZenDemoData.initialize(false);
      UI.toast(lang === 'ar' ? 'تمت التهيئة' : 'Initialized', 'success');
      render();
    };
    document.getElementById('dm-reset').onclick = () => {
      UI.confirm({
        title: lang === 'ar' ? 'إعادة التهيئة' : 'Reset Demo Data',
        message: lang === 'ar' ? 'سيتم حذف جميع البيانات التجريبية وإعادة إنشائها. سيتم الحفاظ على بياناتك الحقيقية.' : 'Demo data will be deleted and re-created. Your real data will be preserved.',
        kind: 'warning', confirmLabel: lang === 'ar' ? 'إعادة' : 'Reset',
        onConfirm: () => {
          ZenDemoData.reset();
          UI.toast(lang === 'ar' ? 'تمت إعادة التهيئة' : 'Reset complete', 'success');
          render();
          ZenRouter.render();
        }
      });
    };
    document.getElementById('dm-delete').onclick = () => {
      UI.confirm({
        title: lang === 'ar' ? 'حذف البيانات التجريبية' : 'Delete Demo Data',
        message: lang === 'ar' ? 'سيتم حذف جميع السجلات المعلّمة كـ "تجريبية". لن تتأثر بياناتك الحقيقية.' : 'All records marked as "demo" will be deleted. Your real data is unaffected.',
        kind: 'danger', confirmLabel: ZenI18n.t('common.delete'),
        onConfirm: () => {
          S.clearAllDemo();
          UI.toast(lang === 'ar' ? 'تم حذف البيانات التجريبية' : 'Demo data deleted', 'success');
          render();
          ZenRouter.render();
        }
      });
    };
  }

  function renderAbout(c) {
    const lang = ZenI18n.lang;
    c.innerHTML = `
      <div class="card">
        <div style="text-align:center;padding:20px 0">
          <div class="brand-mark" style="margin:0 auto 12px;width:72px;height:72px;font-size:36px;border-radius:18px">Z</div>
          <h2 style="margin:0 0 4px">ZenHR</h2>
          <p style="color:var(--text-muted)">${lang === 'ar' ? 'نظام إدارة الموارد البشرية' : 'Human Resources Management System'}</p>
          <p style="color:var(--text-muted);font-size:13px;margin-top:8px">v1.0.0</p>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
        <h4>${lang === 'ar' ? 'ملاحظات أمنية مهمة' : 'Important Security Notes'}</h4>
        <ul style="padding-inline-start:20px;color:var(--text-muted);font-size:13px;line-height:1.8">
          <li>${lang === 'ar' ? 'هذا التطبيق يعمل بدون خادم خلفي. المصادقة المحلية هي للسهولة فقط وليست حماية أمنية فعلية.' : 'This app runs without a backend. Local authentication is a convenience feature, not real security.'}</li>
          <li>${lang === 'ar' ? 'البيانات محفوظة محلياً على جهازك (localStorage) ولا تتم مز擅ننها بين الأجهزة.' : 'Data is stored locally (localStorage) and is NOT synchronized across devices.'}</li>
          <li>${lang === 'ar' ? 'حسابات الضرائب والتأمين تقديرية للأغراض التوضيحية فقط - راجع المعدلات القانونية الحالية.' : 'Tax and insurance calculations are estimates for demo only — verify against current legal rates.'}</li>
          <li>${lang === 'ar' ? 'جميع بيانات الموظفين الـ 350+ خيالية لأغراض العرض.' : 'All 350+ employee records are fictional for demonstration purposes.'}</li>
          <li>${lang === 'ar' ? 'لا توجد بوابة دخول للموظفين أو حسابات موظفين.' : 'No employee login portal or employee accounts exist.'}</li>
        </ul>
      </div>
    `;
  }

  return { render };
})();
