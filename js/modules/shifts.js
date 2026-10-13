/* ============================================================
   ZenHR — Shifts Module
   ============================================================ */
window.ZenShifts = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const shifts = S.getCollection('shifts');
    const employees = S.getCollection('employees');

    c.innerHTML = `
      <div class="toolbar">
        <h3 class="section-title" style="margin:0">${lang === 'ar' ? 'الورديات وجداول العمل' : 'Work Shifts & Schedules'}</h3>
        <div class="spacer"></div>
        <div class="actions">
          <button class="btn primary" id="sh-add">${lang === 'ar' ? 'إضافة وردية' : 'Add Shift'}</button>
        </div>
      </div>
      <div class="grid-auto" id="sh-grid"></div>
      <div id="shift-planner" class="mt-16"></div>
    `;

    document.getElementById('sh-add').onclick = () => showForm();

    const grid = document.getElementById('sh-grid');
    if (shifts.length === 0) {
      grid.innerHTML = UI.empty('∅', ZenI18n.t('common.empty'), '');
    } else {
    grid.innerHTML = shifts.map((s) => {
      const count = employees.filter((e) => e.shiftId === s.id && (e.employmentStatus === 'active' || e.employmentStatus === 'on_leave')).length;
      const days = s.workingDays.map((d) => U.dayName(d, lang).substring(0, 3)).join('، ');
      return `<div class="card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div>
            <h3 style="margin:0 0 4px">${U.esc(lang === 'ar' ? s.name : s.nameEn)}</h3>
            <p style="margin:0;font-size:12px;color:var(--text-muted)">${U.esc(lang === 'ar' ? s.nameEn : s.name)}</p>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn sm ghost" data-edit="${s.id}">✎</button>
            <button class="btn sm ghost" data-del="${s.id}">🗑</button>
          </div>
        </div>
        <div class="detail-grid mt-16">
          <div class="detail-item"><span class="label">${lang === 'ar' ? 'البداية' : 'Start'}</span><span class="value">${s.startTime}</span></div>
          <div class="detail-item"><span class="label">${lang === 'ar' ? 'النهاية' : 'End'}</span><span class="value">${s.endTime}</span></div>
          <div class="detail-item"><span class="label">${lang === 'ar' ? 'استراحة' : 'Break'}</span><span class="value">${s.breakMinutes} ${lang === 'ar' ? 'دقيقة' : 'min'}</span></div>
          <div class="detail-item"><span class="label">${lang === 'ar' ? 'سماح' : 'Grace'}</span><span class="value">${s.graceMinutes} ${lang === 'ar' ? 'دقيقة' : 'min'}</span></div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">${lang === 'ar' ? 'أيام العمل:' : 'Working days:'} <b>${U.esc(days)}</b></div>
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--border)">
          <div><small style="color:var(--text-muted);font-size:11px">${lang === 'ar' ? 'الموظفون' : 'Employees'}</small><div style="font-size:18px;font-weight:700;color:var(--brand-700)">${count}</div></div>
          ${s.active ? UI.badge(ZenI18n.t('status.active'), 'success') : UI.badge(ZenI18n.t('status.inactive'), 'gray')}
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    grid.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));
    }
    if (window.ZenShiftPlanner) ZenShiftPlanner.render();
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const sh = id ? S.getById('shifts', id) : null;
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const body = `
      <form id="sh-form" class="form-grid">
        ${UI.formField({ label: lang === 'ar' ? 'اسم الوردية (عربي)' : 'Shift Name (Arabic)', name: 'name', value: sh?.name, required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)', name: 'nameEn', value: sh?.nameEn })}
        ${UI.formField({ label: lang === 'ar' ? 'وقت البداية' : 'Start Time', name: 'startTime', type: 'time', value: sh?.startTime || '09:00', required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'وقت النهاية' : 'End Time', name: 'endTime', type: 'time', value: sh?.endTime || '17:00', required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'استراحة (دقيقة)' : 'Break (minutes)', name: 'breakMinutes', type: 'number', value: sh?.breakMinutes ?? 60, attrs: ' min="0" step="5"' })}
        ${UI.formField({ label: lang === 'ar' ? 'سماح التأخير (دقيقة)' : 'Grace (minutes)', name: 'graceMinutes', type: 'number', value: sh?.graceMinutes ?? 15, attrs: ' min="0" step="5"' })}
        <div class="full">
          <span style="font-size:12px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">${lang === 'ar' ? 'أيام العمل' : 'Working Days'}</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${allDays.map((d) => `
              <label style="display:flex;align-items:center;gap:4px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px">
                <input type="checkbox" name="day-${d}" ${sh?.workingDays?.includes(d) ? 'checked' : ''}>${U.dayName(d, lang).substring(0, 3)}
              </label>`).join('')}
          </div>
        </div>
        <label class="field full"><span>${lang === 'ar' ? 'الحالة' : 'Status'}</span><select name="active"><option value="true" ${sh?.active !== false ? 'selected' : ''}>${ZenI18n.t('status.active')}</option><option value="false" ${sh?.active === false ? 'selected' : ''}>${ZenI18n.t('status.inactive')}</option></select></label>
      </form>
    `;
    const m = UI.modal({
      title: sh ? (lang === 'ar' ? 'تعديل وردية' : 'Edit Shift') : (lang === 'ar' ? 'إضافة وردية' : 'Add Shift'),
      body,
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#sh-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          const workingDays = allDays.filter((d) => data['day-' + d]);
          if (workingDays.length === 0) { UI.toast(lang === 'ar' ? 'اختر يوماً واحداً على الأقل' : 'Select at least one day', 'warning'); return; }
          delete data['day-0']; delete data['day-1']; delete data['day-2']; delete data['day-3']; delete data['day-4']; delete data['day-5']; delete data['day-6'];
          data.workingDays = workingDays;
          data.breakMinutes = Number(data.breakMinutes);
          data.graceMinutes = Number(data.graceMinutes);
          data.active = data.active === 'true';
          if (id) {
            S.update('shifts', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'shift-' + Date.now().toString(36);
            S.insert('shifts', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تمت الإضافة' : 'Added', 'success');
          }
          mm.close(); render();
        } }
      ]
    });
  }

  function del(id) {
    const employees = S.getCollection('employees');
    const hasEmps = employees.some((e) => e.shiftId === id);
    if (hasEmps) {
      UI.toast(ZenI18n.lang === 'ar' ? 'لا يمكن حذف وردية مرتبطة بموظفين' : 'Cannot delete shift with employees', 'warning');
      return;
    }
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف الوردية؟' : 'Delete shift?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('shifts', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); render(); }
    });
  }

  return { render };
})();
