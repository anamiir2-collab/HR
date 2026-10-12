/* ============================================================
   ZenHR — Performance Evaluations Module
   ============================================================ */
window.ZenPerformance = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = { page: 1, pageSize: 20, search: '', periodFilter: '' };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;
    const records = S.getCollection('performance');
    const periods = [...new Set(records.map((r) => r.period))].sort().reverse();

    c.innerHTML = `
      <div class="toolbar">
        <label class="field search-field">
          <input type="text" id="pf-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" value="${U.esc(state.search)}">
        </label>
        <label class="field">
          <select id="pf-period-filter">
            <option value="">${lang === 'ar' ? 'كل الفترات' : 'All periods'}</option>
            ${periods.map((p) => `<option value="${U.esc(p)}" ${state.periodFilter === p ? 'selected' : ''}>${U.esc(p)}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <button class="btn secondary" id="pf-export">${lang === 'ar' ? 'تصدير' : 'Export'}</button>
          <button class="btn primary" id="pf-add">${lang === 'ar' ? 'تقييم جديد' : 'New Evaluation'}</button>
        </div>
      </div>
      <div id="pf-summary" class="stat-grid mb-16"></div>
      <div id="pf-table-wrap"></div>
      <div id="pf-pagination"></div>
    `;

    document.getElementById('pf-search').oninput = U.debounce((e) => { state.search = e.target.value; state.page = 1; renderTable(); }, 200);
    document.getElementById('pf-period-filter').onchange = (e) => { state.periodFilter = e.target.value; state.page = 1; renderTable(); };
    document.getElementById('pf-add').onclick = () => showForm();
    document.getElementById('pf-export').onclick = () => exportData();

    renderTable();
  }

  function getFiltered() {
    let rows = S.getCollection('performance');
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    if (state.periodFilter) rows = rows.filter((r) => r.period === state.periodFilter);
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      rows = rows.filter((r) => { const e = empMap[r.employeeId]; return e && (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)); });
    }
    rows.sort((a, b) => (a.evaluationDate < b.evaluationDate ? 1 : -1));
    return rows;
  }

  function renderTable() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('pf-table-wrap');
    const pageWrap = document.getElementById('pf-pagination');
    const summary = document.getElementById('pf-summary');
    if (!wrap) return;
    const filtered = getFiltered();
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);

    if (summary) {
      const avg = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.overallScore, 0) / filtered.length) : 0;
      const excellent = filtered.filter((r) => r.overallScore >= 85).length;
      const good = filtered.filter((r) => r.overallScore >= 70 && r.overallScore < 85).length;
      const needImprovement = filtered.filter((r) => r.overallScore < 70).length;
      summary.innerHTML = `
        ${miniStat('☆', 'brand', lang === 'ar' ? 'متوسط الأداء' : 'Avg Score', avg)}
        ${miniStat('✓', 'success', lang === 'ar' ? 'ممتاز (85+)' : 'Excellent', excellent)}
        ${miniStat('=', 'info', lang === 'ar' ? 'جيد (70-84)' : 'Good', good)}
        ${miniStat('!', 'warning', lang === 'ar' ? 'يحتاج تطوير' : 'Needs Improvement', needImprovement)}
      `;
    }

    wrap.innerHTML = UI.buildTable({
      columns: [
        { label: ZenI18n.t('common.employee'), render: (r) => { const e = empMap[r.employeeId]; return e ? UI.avatarCell(lang === 'ar' ? e.name : (e.nameEn || e.name), r.employeeId) : U.esc(r.employeeId); } },
        { label: lang === 'ar' ? 'الفترة' : 'Period', render: (r) => U.esc(r.period) },
        { label: lang === 'ar' ? 'المقيّم' : 'Evaluator', render: (r) => U.esc(r.evaluator) },
        { label: lang === 'ar' ? 'النتيجة' : 'Score', render: (r) => {
          const cls = r.overallScore >= 85 ? 'success' : r.overallScore >= 70 ? 'info' : 'warning';
          return `<span class="badge ${cls}"><b>${r.overallScore}</b></span>`;
        } },
        { label: lang === 'ar' ? 'تاريخ التقييم' : 'Eval Date', render: (r) => U.date(r.evaluationDate) },
        { label: lang === 'ar' ? 'متابعة' : 'Follow-up', render: (r) => U.date(r.followUpDate) },
        { label: ZenI18n.t('common.actions'), sortable: false, render: (r) => `<div class="row-actions">
          <button class="btn sm ghost" data-view="${r.id}">👁</button>
          <button class="btn sm ghost" data-edit="${r.id}">✎</button>
          <button class="btn sm ghost" data-del="${r.id}">🗑</button>
        </div>` }
      ],
      rows: pageRows,
    });

    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => showDetail(b.dataset.view));
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showForm(b.dataset.edit));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => del(b.dataset.del));

    UI.pagination(pageWrap, state.page, state.pageSize, filtered.length, (p, ps) => { state.page = p; state.pageSize = ps; renderTable(); });
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value">${U.num(value)}</div></div>`;
  }

  function showDetail(id) {
    const lang = ZenI18n.lang;
    const r = S.getById('performance', id);
    if (!r) return;
    const emp = S.getById('employees', r.employeeId);
    const body = `
      <h3 style="margin:0 0 4px">${U.esc(emp ? emp.name : r.employeeId)}</h3>
      <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px">${U.esc(r.period)} · ${U.esc(r.evaluator)}</p>
      <div class="card mb-16" style="background:var(--brand-50);text-align:center">
        <div style="font-size:48px;font-weight:800;color:var(--brand-700);line-height:1">${r.overallScore}</div>
        <div style="font-size:13px;color:var(--brand-700)">${lang === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}</div>
      </div>
      <h4 style="margin:16px 0 8px">${lang === 'ar' ? 'معايير التقييم' : 'Criteria'}</h4>
      <div class="table-wrap mb-16"><div class="table-scroll"><table class="data">
        <thead><tr><th>${lang === 'ar' ? 'المعيار' : 'Criterion'}</th><th>${lang === 'ar' ? 'النتيجة' : 'Score'}</th><th>${lang === 'ar' ? 'النسبة' : '%'}</th></tr></thead>
        <tbody>${r.criteria.map((c) => `<tr><td>${U.esc(c.name)}</td><td><b>${c.score}</b></td><td><div class="progress"><div class="bar" style="width:${c.score}%"></div></div></td></tr>`).join('')}</tbody>
      </table></div></div>
      <div class="detail-grid">
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'التقييم' : 'Feedback'}</span><span class="value">${U.esc(r.feedback)}</span></div>
        <div class="detail-item"><span class="label">${lang === 'ar' ? 'التوصيات' : 'Recommendations'}</span><span class="value">${U.esc(r.recommendations)}</span></div>
      </div>
    `;
    UI.modal({
      title: lang === 'ar' ? 'تفاصيل التقييم' : 'Evaluation Detail',
      body, size: 'lg',
      footer: [{ label: ZenI18n.t('common.close'), kind: 'secondary', onClick: (mm) => mm.close() }],
    });
  }

  function showForm(id) {
    const lang = ZenI18n.lang;
    const rec = id ? S.getById('performance', id) : null;
    const employees = S.getCollection('employees').filter((e) => e.employmentStatus === 'active');
    const DEFAULT_CRITERIA = [
      { name: 'جودة العمل', nameEn: 'Quality of Work' },
      { name: 'الإنتاجية', nameEn: 'Productivity' },
      { name: 'العمل الجماعي', nameEn: 'Teamwork' },
      { name: 'الالتزام', nameEn: 'Commitment' },
      { name: 'المبادرة', nameEn: 'Initiative' },
    ];
    const criteria = rec?.criteria || DEFAULT_CRITERIA.map((c) => ({ name: c.name, score: 75 }));
    const body = `
      <form id="pf-form" class="form-grid">
        ${UI.formField({ label: ZenI18n.t('common.employee'), name: 'employeeId', type: 'select', value: rec?.employeeId, required: true, options: [{ value: '', label: '—' }, ...employees.map((e) => ({ value: e.id, label: e.id + ' - ' + e.name }))] })}
        ${UI.formField({ label: lang === 'ar' ? 'الفترة' : 'Period', name: 'period', value: rec?.period || (new Date().getFullYear() + '-Q' + (Math.ceil((new Date().getMonth() + 1) / 3))), required: true, placeholder: '2026-Q1' })}
        ${UI.formField({ label: lang === 'ar' ? 'المقيّم' : 'Evaluator', name: 'evaluator', value: rec?.evaluator || 'أمير أنور', required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ التقييم' : 'Evaluation Date', name: 'evaluationDate', type: 'date', value: rec?.evaluationDate || U.today(), required: true })}
        ${UI.formField({ label: lang === 'ar' ? 'تاريخ المتابعة' : 'Follow-up Date', name: 'followUpDate', type: 'date', value: rec?.followUpDate })}
        <div class="full">
          <span style="font-size:12px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">${lang === 'ar' ? 'معايير التقييم' : 'Evaluation Criteria'}</span>
          <div id="pf-criteria">
            ${criteria.map((c, i) => `
              <div style="display:flex;gap:8px;margin-bottom:6px">
                <input type="text" name="crit-name-${i}" value="${U.esc(c.name)}" placeholder="${lang === 'ar' ? 'المعيار' : 'Criterion'}" style="flex:1">
                <input type="number" name="crit-score-${i}" value="${c.score}" min="0" max="100" style="width:80px">
              </div>
            `).join('')}
          </div>
        </div>
        ${UI.formField({ label: lang === 'ar' ? 'التقييم الكتابي' : 'Feedback', name: 'feedback', type: 'textarea', value: rec?.feedback })}
        ${UI.formField({ label: lang === 'ar' ? 'التوصيات' : 'Recommendations', name: 'recommendations', type: 'textarea', value: rec?.recommendations })}
      </form>
    `;
    const m = UI.modal({
      title: rec ? (lang === 'ar' ? 'تعديل تقييم' : 'Edit Evaluation') : (lang === 'ar' ? 'تقييم أداء جديد' : 'New Evaluation'),
      body, size: 'lg',
      footer: [
        { label: ZenI18n.t('common.cancel'), kind: 'secondary', onClick: (mm) => mm.close() },
        { label: ZenI18n.t('common.save'), kind: 'primary', onClick: (mm, body) => {
          const form = body.querySelector('#pf-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }
          const data = UI.readForm(form);
          if (!data.employeeId) { UI.toast(ZenI18n.t('common.required'), 'warning'); return; }
          const criteria = [];
          let i = 0;
          while (data['crit-name-' + i] !== undefined) {
            if (data['crit-name-' + i]) criteria.push({ name: data['crit-name-' + i], score: Number(data['crit-score-' + i]) || 0 });
            delete data['crit-name-' + i]; delete data['crit-score-' + i];
            i++;
          }
          data.criteria = criteria;
          data.overallScore = criteria.length ? Math.round(criteria.reduce((s, c) => s + c.score, 0) / criteria.length) : 0;
          if (id) {
            S.update('performance', id, data);
            UI.toast(lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
          } else {
            const newId = 'pf-' + Date.now().toString(36);
            S.insert('performance', { id: newId, ...data, isDemo: false, createdAt: new Date().toISOString() });
            UI.toast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
          }
          mm.close(); renderTable();
        } }
      ]
    });
  }

  function del(id) {
    UI.confirm({
      title: ZenI18n.t('common.delete'),
      message: ZenI18n.lang === 'ar' ? 'حذف التقييم؟' : 'Delete evaluation?',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => { S.remove('performance', id); UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success'); renderTable(); }
    });
  }

  function exportData() {
    const lang = ZenI18n.lang;
    const rows = getFiltered();
    const empMap = {};
    S.getCollection('employees').forEach((e) => empMap[e.id] = e);
    ZenExport.toExcel(rows, [
      { label: 'ID', value: (r) => r.id },
      { label: ZenI18n.t('common.employee'), value: (r) => { const e = empMap[r.employeeId]; return e ? (lang === 'ar' ? e.name : (e.nameEn || e.name)) : r.employeeId; } },
      { label: lang === 'ar' ? 'الفترة' : 'Period', value: (r) => r.period },
      { label: lang === 'ar' ? 'المقيّم' : 'Evaluator', value: (r) => r.evaluator },
      { label: lang === 'ar' ? 'النتيجة' : 'Score', value: (r) => r.overallScore },
      { label: lang === 'ar' ? 'التقييم' : 'Feedback', value: (r) => r.feedback },
    ], 'zenhr-performance.xls', 'Performance');
    UI.toast(ZenI18n.lang === 'ar' ? 'تم التصدير' : 'Exported', 'success');
  }

  return { render };
})();
