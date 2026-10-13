/* AGRIMASTERS HR — Employee shift plans, monthly schedule and assignment orders */
window.ZenShiftPlanner = (function () {
  'use strict';
  const S = window.ZenStore;
  const UI = window.ZenUI;
  const U = window.ZenUtils;
  let selectedEmployee = '';
  let selectedMonth = monthKey(new Date());

  function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function localDate(value) { const p = String(value || '').split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function shiftLabel(s, lang) { return s ? (lang === 'ar' ? (s.name || s.nameEn) : (s.nameEn || s.name)) : (lang === 'ar' ? 'غير محددة' : 'Unassigned'); }
  function planFor(employeeId) { return S.getCollection('shiftPlans').find(p => p.employeeId === employeeId) || null; }
  function effectivePlanFor(employeeId) { const saved=planFor(employeeId); if(saved)return saved; const emp=S.getById('employees',employeeId); return emp&&emp.shiftId?{employeeId,mode:'fixed',fixedShiftId:emp.shiftId,anchorDate:dateKey(new Date())}:null; }
  function shiftById(id) { return S.getById('shifts', id); }
  function employeeRestDay(employeeId, date) {
    const emp = S.getById('employees', employeeId);
    if (!emp) return false;
    const mode = emp.restDaysMode || 'default';
    const key = dateKey(date);
    if (window.ZenRestDays && ZenRestDays.isRestDate(employeeId, key)) return true;
    if (mode === 'none') return false;
    if (mode === 'dates') return (Array.isArray(emp.restDates) ? emp.restDates : String(emp.restDates || '').split(/[\\n,;]+/)).includes(key);
    if (mode === 'monthlyDays') return (Array.isArray(emp.recurringRestDays) ? emp.recurringRestDays : String(emp.recurringRestDays || '').split(/[\\s,;]+/).map(Number)).includes(date.getDate());
    if (mode === 'weekly') return (Array.isArray(emp.recurringRestDays) ? emp.recurringRestDays : String(emp.recurringRestDays || '').split(/[\\s,;]+/).map(Number)).includes(date.getDay());
    return false;
  }
  function hasCustomRest(employeeId) { const emp=S.getById('employees',employeeId); return !!emp && !!emp.restDaysMode && emp.restDaysMode !== 'default'; }
  function isFixedWorkday(shift, date) { const rest=(S.settings.shiftRules && S.settings.shiftRules.weeklyRestDays)||[]; return !!(shift && shift.workingDays && shift.workingDays.includes(date.getDay()) && !rest.includes(date.getDay())); }

  function expectedFor(plan, date, employeeId) {
    if (employeeId && window.ZenRestDays && ZenRestDays.isRestDate(employeeId, dateKey(date))) return { type: 'off', shift: null, label: ZenI18n.lang === 'ar' ? 'راحة شهرية' : 'Monthly rest' };
    if (employeeId && employeeRestDay(employeeId, date)) return { type: 'off', shift: null, label: ZenI18n.lang === 'ar' ? 'راحة مخصصة' : 'Custom rest day' };
    if (!plan) return { type: 'unassigned', shift: null, label: ZenI18n.lang === 'ar' ? 'غير محدد' : 'Unassigned' };
    if (plan.mode === 'fixed') {
      const shift = shiftById(plan.fixedShiftId);
      const emp=S.getById('employees',employeeId);
      const custom=!!(emp && emp.restDaysMode && emp.restDaysMode !== 'default');
      const works = custom ? (emp.restDaysMode === 'none' || !!shift) : isFixedWorkday(shift, date);
      return works
        ? { type: 'work', shift, label: shiftLabel(shift, ZenI18n.lang) }
        : { type: 'off', shift: null, label: ZenI18n.lang === 'ar' ? 'إجازة أسبوعية' : 'Weekly off' };
    }
    const start = localDate(plan.anchorDate || dateKey(date));
    const offset = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
    const defaults=Object.assign({dayCount:3,nightCount:3,offCount:3},S.settings.shiftRules||{});
    const dayCount = Math.max(1, Number(plan.dayCount) || Number(defaults.dayCount) || 3);
    const nightCount = Math.max(1, Number(plan.nightCount) || Number(defaults.nightCount) || 3);
    const offCount = Math.max(1, Number(plan.offCount) || Number(defaults.offCount) || 3);
    const cycleLength = dayCount + nightCount + offCount;
    const index = ((offset % cycleLength) + cycleLength) % cycleLength;
    if (index < dayCount) return { type: 'work', shift: shiftById(plan.dayShiftId), label: ZenI18n.lang === 'ar' ? 'نهاري' : 'Day' };
    if (index < dayCount + nightCount) return { type: 'work', shift: shiftById(plan.nightShiftId), label: ZenI18n.lang === 'ar' ? 'ليلي' : 'Night' };
    return { type: 'off', shift: null, label: ZenI18n.lang === 'ar' ? 'إجازة دورة' : 'Cycle off' };
  }

  function render() {
    const root = document.getElementById('shift-planner');
    if (!root) return;
    const lang = ZenI18n.lang;
    const employees = S.getCollection('employees').filter(e => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    const shifts = S.getCollection('shifts').filter(s => s.active !== false);
    const plans = S.getCollection('shiftPlans');
    const orders = S.getCollection('assignmentOrders').slice().sort((a,b) => String(b.date).localeCompare(String(a.date)));
    const defaultRules = Object.assign({dayCount:3,nightCount:3,offCount:3}, S.settings.shiftRules || {});
    if (!selectedEmployee || !employees.some(e => e.id === selectedEmployee)) selectedEmployee = employees[0]?.id || '';
    const plan = effectivePlanFor(selectedEmployee);
    const emp = employees.find(e => e.id === selectedEmployee);
    const isAr = lang === 'ar';
    const text = (ar, en) => isAr ? ar : en;
    const empOptions = employees.map(e => '<option value="' + U.esc(e.id) + '" ' + (e.id === selectedEmployee ? 'selected' : '') + '>' + U.esc((isAr ? e.name : (e.nameEn || e.name)) + ' — ' + e.id) + '</option>').join('');
    const shiftOptions = (selected, emptyLabel) => '<option value="">' + emptyLabel + '</option>' + shifts.map(sh => '<option value="' + U.esc(sh.id) + '" ' + (sh.id === selected ? 'selected' : '') + '>' + U.esc(shiftLabel(sh, lang)) + '</option>').join('');
    root.innerHTML = `
      <section class="card shift-planner-card">
        <div class="card-head"><div><h3>${text('تخطيط الورديات للموظفين','Employee shift planning')}</h3><p class="muted">${text('أنشئ ورديات ثابتة أو دورة نهاري/ليلي/إجازة لكل موظف.','Assign fixed shifts or a custom day/night/off rotation per employee.')}</p></div></div>
        <form id="sp-plan-form" class="form-grid">
          <label class="field"><span>${text('الموظف','Employee')}</span><select name="employeeId" id="sp-employee" required>${empOptions}</select></label>
          <label class="field"><span>${text('نوع الجدول','Schedule type')}</span><select name="mode" id="sp-mode"><option value="rotating" ${plan?.mode !== 'fixed' ? 'selected' : ''}>${text('دورة متغيرة','Rotating cycle')}</option><option value="fixed" ${plan?.mode === 'fixed' ? 'selected' : ''}>${text('وردية ثابتة','Fixed shift')}</option></select></label>
          <label class="field sp-fixed"><span>${text('الوردية الثابتة','Fixed shift')}</span><select name="fixedShiftId">${shiftOptions(plan?.fixedShiftId, text('اختر وردية','Select shift'))}</select></label>
          <label class="field sp-rotating"><span>${text('وردية النهار','Day shift')}</span><select name="dayShiftId">${shiftOptions(plan?.dayShiftId || shifts.find(s => /نهار|صباح|day|morning/i.test((s.name||'')+' '+(s.nameEn||'')) )?.id, text('اختر وردية النهار','Select day shift'))}</select></label>
          <label class="field sp-rotating"><span>${text('وردية الليل','Night shift')}</span><select name="nightShiftId">${shiftOptions(plan?.nightShiftId || shifts.find(s => /ليل|مساء|night|evening/i.test((s.name||'')+' '+(s.nameEn||'')) )?.id, text('اختر وردية الليل','Select night shift'))}</select></label>
          <label class="field sp-rotating"><span>${text('أيام النهار','Day-shift days')}</span><input type="number" min="1" max="31" name="dayCount" value="${plan?.dayCount || defaultRules.dayCount}"></label>
          <label class="field sp-rotating"><span>${text('أيام الليل','Night-shift days')}</span><input type="number" min="1" max="31" name="nightCount" value="${plan?.nightCount || defaultRules.nightCount}"></label>
          <label class="field sp-rotating"><span>${text('أيام الإجازة في الدورة','Cycle off days')}</span><input type="number" min="1" max="31" name="offCount" value="${plan?.offCount || defaultRules.offCount}"></label>
          <label class="field"><span>${text('تاريخ بداية الدورة','Cycle anchor date')}</span><input type="date" name="anchorDate" value="${plan?.anchorDate || dateKey(new Date())}" required></label>
          <div class="full actions"><button class="btn primary" type="submit">${text('حفظ جدول الموظف','Save employee schedule')}</button><button class="btn secondary" type="button" id="sp-clear">${text('إزالة الجدول','Remove schedule')}</button></div>
        </form>
      </section>
      <section class="card shift-planner-card mt-16">
        <div class="card-head"><div><h3>${text('التقويم الشهري','Monthly shift calendar')}</h3><p class="muted">${text('أيام الجمعة والعطلات يمكن تكليف الموظف بالعمل فيها بأمر تكليف موثق.','Fridays and holidays can be worked through a documented assignment order.')}</p></div></div>
        <div class="toolbar"><label class="field"><span>${text('الشهر','Month')}</span><input id="sp-month" type="month" value="${selectedMonth}"></label><div class="spacer"></div><button class="btn secondary" id="sp-order">${text('＋ أمر تكليف','＋ Assignment order')}</button></div>
        <div id="sp-calendar" class="sp-calendar-wrap"></div>
        <div class="toolbar mt-16"><label class="field"><span>${text('بحث عن موظف في الورديات','Search employee shifts')}</span><input id="sp-roster-search" type="search" placeholder="${text('اسم الموظف أو الرقم الوظيفي','Employee name or ID')}"></label><label class="field"><span>${text('التاريخ','Date')}</span><input id="sp-roster-date" type="date" value="${dateKey(new Date())}"></label></div>
        <div id="sp-roster-results"></div>
      </section>
      <section class="card shift-planner-card mt-16">
        <div class="card-head"><div><h3>${text('أوامر التكليف','Assignment orders')}</h3><p class="muted">${text('تظهر هنا الوردية البديلة والسبب والتاريخ لكل تكليف.','Alternative shift, date and reason are recorded for each order.')}</p></div></div>
        <div class="table-scroll"><table class="data"><thead><tr><th>${text('الموظف','Employee')}</th><th>${text('التاريخ','Date')}</th><th>${text('الوردية البديلة','Alternative shift')}</th><th>${text('السبب','Reason')}</th><th>${text('إجراء','Action')}</th></tr></thead><tbody id="sp-orders"></tbody></table></div>
      </section>`;
    const form = root.querySelector('#sp-plan-form');
    const modeSelect = root.querySelector('#sp-mode');
    function modeVisibility() {
      root.querySelectorAll('.sp-fixed').forEach(el => el.hidden = modeSelect.value !== 'fixed');
      root.querySelectorAll('.sp-rotating').forEach(el => el.hidden = modeSelect.value !== 'rotating');
    }
    modeVisibility();
    modeSelect.onchange = modeVisibility;
    root.querySelector('#sp-employee').onchange = e => { selectedEmployee = e.target.value; render(); };
    root.querySelector('#sp-month').onchange = e => { selectedMonth = e.target.value || monthKey(new Date()); renderCalendar(); renderSearchRoster(); };
    root.querySelector('#sp-roster-search').oninput = renderSearchRoster;
    root.querySelector('#sp-roster-date').onchange = renderSearchRoster;
    form.onsubmit = e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const existing = planFor(data.employeeId);
      data.dayCount = Math.max(1, Number(data.dayCount) || 3);
      data.nightCount = Math.max(1, Number(data.nightCount) || 3);
      data.offCount = Math.max(1, Number(data.offCount) || 3);
      if (data.mode === 'fixed' && !data.fixedShiftId) { UI.toast(text('اختر الوردية الثابتة','Choose a fixed shift'), 'warning'); return; }
      if (data.mode === 'rotating' && (!data.dayShiftId || !data.nightShiftId)) { UI.toast(text('اختر ورديتي النهار والليل','Choose both day and night shifts'), 'warning'); return; }
      if (existing) S.update('shiftPlans', existing.id, data);
      else S.insert('shiftPlans', { id: 'sp-' + Date.now().toString(36), ...data, createdAt: new Date().toISOString() });
      selectedEmployee = data.employeeId;
      UI.toast(text('تم حفظ جدول الورديات','Shift schedule saved'), 'success');
      render();
    };
    root.querySelector('#sp-clear').onclick = () => {
      const existing = planFor(selectedEmployee);
      if (!existing) return;
      UI.confirm({ title: text('إزالة الجدول','Remove schedule'), message: text('هل تريد إزالة خطة الورديات لهذا الموظف؟','Remove this employee schedule?'), kind: 'warning', confirmLabel: text('إزالة','Remove'), onConfirm: () => { S.remove('shiftPlans', existing.id); render(); } });
    };
    root.querySelector('#sp-order').onclick = () => showOrderForm();
    renderCalendar();
    renderSearchRoster();
    const tbody = root.querySelector('#sp-orders');
    tbody.innerHTML = orders.length ? orders.map(o => {
      const e = employees.find(x => x.id === o.employeeId);
      const sh = shiftById(o.shiftId);
      return '<tr><td>' + U.esc(e ? (isAr ? e.name : (e.nameEn || e.name)) : o.employeeId) + '</td><td>' + U.esc(o.date) + (o.holiday ? ' · ' + text('عطلة','Holiday') : '') + '</td><td>' + U.esc(shiftLabel(sh, lang)) + '</td><td>' + U.esc(o.reason) + '</td><td><button class="btn sm ghost" data-sp-delete="' + U.esc(o.id) + '">' + text('حذف','Delete') + '</button></td></tr>';
    }).join('') : '<tr><td colspan="5">' + text('لا توجد أوامر تكليف','No assignment orders yet') + '</td></tr>';
    tbody.querySelectorAll('[data-sp-delete]').forEach(b => b.onclick = () => UI.confirm({ title: text('حذف أمر التكليف','Delete assignment order'), message: text('تأكيد حذف أمر التكليف؟','Delete this order?'), kind: 'danger', confirmLabel: text('حذف','Delete'), onConfirm: () => { S.remove('assignmentOrders', b.dataset.spDelete); render(); } }));
  }

  function renderCalendar() {
    const root = document.getElementById('sp-calendar');
    if (!root) return;
    const lang = ZenI18n.lang;
    const ar = lang === 'ar';
    const text = (a,e) => ar ? a : e;
    const first = localDate(selectedMonth + '-01');
    if (isNaN(first.getTime())) return;
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const startDow = first.getDay();
    const plan = effectivePlanFor(selectedEmployee);
    const orders = S.getCollection('assignmentOrders');
    const weekdayNames = ar ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let cells = weekdayNames.map(d => '<div class="sp-day-head">' + d + '</div>').join('');
    for (let i=0; i<startDow; i++) cells += '<div class="sp-day empty"></div>';
    for (let d=1; d<=daysInMonth; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      const key = dateKey(date);
      const base = expectedFor(plan, date, selectedEmployee);
      const order = orders.find(o => o.employeeId === selectedEmployee && o.date === key);
      const actualShift = order ? shiftById(order.shiftId) : base.shift;
      const isOff = order ? false : base.type === 'off';
      const isFriday = date.getDay() === 5;
      const cls = order ? 'assigned' : (isOff ? 'off' : (isFriday ? 'friday' : 'work'));
      const title = order ? text('أمر تكليف','Assignment order') : (isOff ? base.label : base.label);
      const shiftName = order ? shiftLabel(actualShift, lang) : (isOff ? base.label : (actualShift ? shiftLabel(actualShift, lang) : base.label));
      cells += '<button type="button" class="sp-day ' + cls + '" data-sp-date="' + key + '" title="' + U.esc(title) + '"><b>' + d + '</b><span>' + U.esc(shiftName) + '</span>' + (order ? '<small>' + text('تكليف','Assigned') + '</small>' : (isFriday && !isOff ? '<small>' + text('جمعة','Friday') + '</small>' : '')) + '</button>';
    }
    root.innerHTML = '<div class="sp-calendar">' + cells + '</div><div class="sp-legend"><span class="work">● ' + text('عمل','Work') + '</span><span class="off">● ' + text('إجازة','Off') + '</span><span class="assigned">● ' + text('أمر تكليف / عطلة','Assignment / holiday') + '</span></div>';
    root.querySelectorAll('[data-sp-date]').forEach(b => b.onclick = () => showShiftRoster(b.dataset.spDate));
  }


  function actualFor(employeeId, date) {
    const key = dateKey(date);
    if (window.ZenRestDays && ZenRestDays.isRestDate(employeeId, key)) return { type:'off', shift:null, order:null, mode:'monthly-rest' };
    const order = S.getCollection('assignmentOrders').find(o => o.employeeId === employeeId && o.date === key);
    const plan = effectivePlanFor(employeeId);
    const base = expectedFor(plan, date, employeeId);
    if (order) return { type:'order', shift:shiftById(order.shiftId), order, mode:'assignment' };
    return { type:base.type, shift:base.shift, order:null, mode:plan ? plan.mode : 'none' };
  }

  function showShiftRoster(dateValue) {
    const lang=ZenI18n.lang, ar=lang==='ar', t=(a,e)=>ar?a:e, date=localDate(dateValue);
    const employees=S.getCollection('employees').filter(e=>e.employmentStatus==='active'||e.employmentStatus==='on_leave');
    const selected=actualFor(selectedEmployee,date);
    const roster=employees.map(e=>({employee:e,...actualFor(e.id,date)})).filter(x=>
      selected.shift ? x.shift && x.shift.id===selected.shift.id : !x.shift && x.type==='off'
    );
    const rows=roster.map(x=>'<tr><td><span class="employee-roster-cell">'+(x.employee.profileImage?'<img class="employee-mini-photo" src="'+U.esc(x.employee.profileImage)+'" alt="">':'<span class="employee-mini-photo employee-mini-placeholder">'+U.esc(U.initials(x.employee.name))+'</span>')+'<span>'+U.esc(ar?x.employee.name:(x.employee.nameEn||x.employee.name))+'</span></span></td><td>'+U.esc(x.employee.id)+'</td><td>'+U.esc(x.shift?shiftLabel(x.shift,lang):(ar?'إجازة':'Off'))+'</td><td><span class="badge '+(x.mode==='fixed'?'info':x.mode==='rotating'?'success':'warning')+'">'+U.esc(x.order?t('أمر تكليف','Assignment order'):x.mode==='fixed'?t('ثابتة','Fixed'):x.mode==='rotating'?t('دورية','Rotating'):t('غير محددة','Unassigned'))+'</span></td></tr>').join('');
    UI.modal({title:t('كشف الوردية — ','Shift roster — ')+dateValue,size:'lg',body:'<div class="table-scroll"><table class="data"><thead><tr><th>'+t('الموظف','Employee')+'</th><th>'+t('الرقم','ID')+'</th><th>'+t('الوردية','Shift')+'</th><th>'+t('نوع التخصيص','Assignment type')+'</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">'+t('لا يوجد موظفون في هذه الوردية','No employees assigned to this shift')+'</td></tr>')+'</tbody></table></div>',footer:[
      {label:t('إغلاق','Close'),kind:'secondary',onClick:m=>m.close()},
      {label:t('إنشاء أمر تكليف','Create assignment order'),kind:'primary',onClick:m=>{m.close();showOrderForm(dateValue);}}
    ]});
  }

  function renderSearchRoster() {
    const root=document.getElementById('sp-roster-results'); if(!root)return;
    const lang=ZenI18n.lang, ar=lang==='ar', t=(a,e)=>ar?a:e;
    const q=(document.getElementById('sp-roster-search')?.value||'').trim().toLowerCase();
    const dateValue=document.getElementById('sp-roster-date')?.value||dateKey(new Date());
    const date=localDate(dateValue);
    const rows=S.getCollection('employees').filter(e=>(e.employmentStatus==='active'||e.employmentStatus==='on_leave')&&(!q||String(e.name||'').toLowerCase().includes(q)||String(e.nameEn||'').toLowerCase().includes(q)||String(e.id||'').toLowerCase().includes(q))).map(e=>{
      const a=actualFor(e.id,date);
      return '<tr><td><span class="employee-roster-cell">'+(e.profileImage?'<img class="employee-mini-photo" src="'+U.esc(e.profileImage)+'" alt="">':'<span class="employee-mini-photo employee-mini-placeholder">'+U.esc(U.initials(e.name))+'</span>')+'<span>'+U.esc(ar?e.name:(e.nameEn||e.name))+'</span></span></td><td>'+U.esc(e.id)+'</td><td>'+U.esc(a.shift?shiftLabel(a.shift,lang):(a.type==='off'?t('إجازة','Off'):t('غير محددة','Unassigned')) )+'</td><td>'+t(a.mode==='fixed'?'ثابتة':a.mode==='rotating'?'دورية':a.mode==='assignment'?'أمر تكليف':'غير محددة',a.mode==='fixed'?'Fixed':a.mode==='rotating'?'Rotating':a.mode==='assignment'?'Assignment order':'Unassigned')+'</td></tr>';
    }).join('');
    root.innerHTML='<div class="table-scroll"><table class="data"><thead><tr><th>'+t('الموظف','Employee')+'</th><th>'+t('الرقم','ID')+'</th><th>'+t('الوردية في التاريخ المحدد','Shift on selected date')+'</th><th>'+t('المصدر','Source')+'</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">'+t('لا توجد نتائج','No results')+'</td></tr>')+'</tbody></table></div>';
  }

  function showOrderForm(dateValue) {
    const lang = ZenI18n.lang;
    const ar = lang === 'ar';
    const text = (a,e) => ar ? a : e;
    const employees = S.getCollection('employees').filter(e => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    const shifts = S.getCollection('shifts').filter(s => s.active !== false);
    if (!employees.length || !shifts.length) { UI.toast(text('أضف موظفًا ووردية أولًا','Add an employee and a shift first'), 'warning'); return; }
    const body = '<form id="sp-order-form" class="form-grid">' +
      '<label class="field"><span>' + text('الموظف','Employee') + '</span><select name="employeeId" required>' + employees.map(e => '<option value="' + U.esc(e.id) + '" ' + (e.id === selectedEmployee ? 'selected' : '') + '>' + U.esc(ar ? e.name : (e.nameEn || e.name)) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>' + text('تاريخ التكليف','Assignment date') + '</span><input type="date" name="date" value="' + U.esc(dateValue || dateKey(new Date())) + '" required></label>' +
      '<label class="field"><span>' + text('الوردية البديلة','Alternative shift') + '</span><select name="shiftId" required>' + shifts.map(sh => '<option value="' + U.esc(sh.id) + '">' + U.esc(shiftLabel(sh, lang)) + '</option>').join('') + '</select></label>' +
      '<label class="field full"><span>' + text('سبب التكليف (إلزامي)','Reason (required)') + '</span><textarea name="reason" rows="3" required minlength="3" placeholder="' + text('اذكر سبب تغيير الوردية أو العمل في الإجازة','Explain the shift change or holiday work') + '"></textarea></label>' +
      '<label class="field full"><span><input type="checkbox" name="holiday"> ' + text('تكليف في يوم إجازة أسبوعية أو عطلة رسمية','Work on weekly rest day or public holiday') + '</span></label>' +
      '</form>';
    UI.modal({ title: text('إنشاء أمر تكليف','Create assignment order'), size: 'md', body, footer: [
      { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: m => m.close() },
      { label: text('حفظ أمر التكليف','Save assignment order'), kind: 'primary', onClick: (m, modalBody) => {
        const form = modalBody.querySelector('#sp-order-form');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const data = Object.fromEntries(new FormData(form).entries());
        const orderDate = localDate(data.date);
        const restDays = (S.settings.shiftRules && S.settings.shiftRules.weeklyRestDays) || [];
        data.holiday = form.elements.holiday.checked || restDays.includes(orderDate.getDay());
        data.restDay = restDays.includes(orderDate.getDay());
        const previous = S.getCollection('assignmentOrders').find(o => o.employeeId === data.employeeId && o.date === data.date);
        if (previous) { UI.toast(text('يوجد أمر تكليف لهذا الموظف في هذا التاريخ','An order already exists for this employee and date'), 'warning'); return; }
        S.insert('assignmentOrders', { id: 'ao-' + Date.now().toString(36), ...data, createdAt: new Date().toISOString() });
        selectedEmployee = data.employeeId;
        selectedMonth = data.date.slice(0,7);
        m.close();
        UI.toast(text('تم حفظ أمر التكليف','Assignment order saved'), 'success');
        render();
      }}
    ]});
  }

  return { render, renderCalendar, expectedFor };
})();
