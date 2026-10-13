/* ============================================================
   AGRIMASTERS HR — Fingerprint Import Module
   Imports raw fingerprint punches from CSV / XLSX / TXT files.
   Features:
   - File preview (first 10 rows)
   - Column mapping (device ID, employee ID, punch date, punch time, in/out)
   - Employee ID mapping (recognition of unknown employees)
   - Duplicate punch detection
   - Rejected-record report
   - Import history (batches)
   - Reconciliation: convert raw punches into attendance records
   - Manual review of ambiguous records
   - Adapter interface for direct device integration (declared but not
     enabled without confirmed vendor SDK + tested connectivity)
   ============================================================ */
window.ZenFingerprint = (function () {
  'use strict';

  const U = window.ZenUtils;
  const UI = window.ZenUI;
  const S = window.ZenStore;

  let state = {
    tab: 'import',          // 'import' | 'history' | 'reconcile' | 'adapter'
    pendingFile: null,      // { rows, headers, filename, sheetNames }
    mapping: {              // header -> logical field
      deviceId: '',
      employeeId: '',
      punchDate: '',
      punchTime: '',
      punchDateTime: '',
      direction: '',         // optional: 'in'/'out' column
    },
    preview: [],             // validated preview rows
    validation: null,        // result of ZenXlsxImport.validate
    historyPage: 1,
    historyPageSize: 20,
  };

  function render() {
    const c = document.getElementById('page-content');
    if (!c) return;
    const lang = ZenI18n.lang;

    c.innerHTML = `
      <div class="tabs mb-16">
        <button class="tab ${state.tab === 'import' ? 'active' : ''}" data-tab="import">${lang === 'ar' ? 'استيراد البصمات' : 'Import Punches'}</button>
        <button class="tab ${state.tab === 'history' ? 'active' : ''}" data-tab="history">${lang === 'ar' ? 'سجل الاستيراد' : 'Import History'}</button>
        <button class="tab ${state.tab === 'reconcile' ? 'active' : ''}" data-tab="reconcile">${lang === 'ar' ? 'مطابقة الحضور' : 'Reconcile'}</button>
        <button class="tab ${state.tab === 'adapter' ? 'active' : ''}" data-tab="adapter">${lang === 'ar' ? 'محولات الأجهزة' : 'Device Adapters'}</button>
      </div>
      <div id="fp-content"></div>
    `;

    c.querySelectorAll('.tab').forEach((btn) => {
      btn.onclick = () => { state.tab = btn.dataset.tab; render(); };
    });

    if (state.tab === 'import') renderImport();
    else if (state.tab === 'history') renderHistory();
    else if (state.tab === 'reconcile') renderReconcile();
    else if (state.tab === 'adapter') renderAdapter();
  }

  /* -------- Import tab -------- */
  function renderImport() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('fp-content');
    if (!wrap) return;

    if (!state.pendingFile) {
      wrap.innerHTML = `
        <div class="card">
          <div class="card-head">
            <div><h3>${lang === 'ar' ? 'استيراد ملف البصمات' : 'Import Punches File'}</h3>
            <p>${lang === 'ar' ? 'يدعم: CSV، XLSX، TXT (مفصول بأ_Tab أو فاصلة أو منقوطة)' : 'Supports: CSV, XLSX, TXT (tab/comma/semicolon delimited)'}</p></div>
          </div>
          <div class="upload-zone" id="fp-drop">
            <div class="upload-icon">⇩</div>
            <h3>${lang === 'ar' ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag file here or click to select'}</h3>
            <p class="muted">${lang === 'ar' ? 'CSV / XLSX / TXT — الحد الأقصى 10MB' : 'CSV / XLSX / TXT — max 10MB'}</p>
            <input type="file" id="fp-file" accept=".csv,.xlsx,.xls,.txt" hidden>
          </div>
          <div class="alert info mt-16">
            <b>${lang === 'ar' ? 'ملاحظة:' : 'Note:'}</b>
            ${lang === 'ar' ? 'لن يتم حفظ أي بيانات حتى تتحقق من المعاينة وتؤكد الاستيراد.' : 'Nothing is saved until you review the preview and confirm the import.'}
          </div>
          <div class="alert warning mt-8">
            <b>${lang === 'ar' ? 'تنبيه أمني:' : 'Security notice:'}</b>
            ${lang === 'ar' ? 'لا يتم تخزين بيانات اعتماد الأجهزة في الواجهة الأمامية. الاتصال المباشر بالجهاز يتطلب SDK من المورد وخدمة محلية.' : 'Device credentials are never stored in the frontend. Direct device connection requires a vendor SDK and local service.'}
          </div>
        </div>
        <div class="card mt-16">
          <div class="card-head"><div><h3>${lang === 'ar' ? 'الحقول المتوقعة' : 'Expected Fields'}</h3></div></div>
          <div class="table-scroll"><table class="data">
            <thead><tr><th>${lang === 'ar' ? 'الحقل' : 'Field'}</th><th>${lang === 'ar' ? 'مطلوب' : 'Required'}</th><th>${lang === 'ar' ? 'الوصف' : 'Description'}</th><th>${lang === 'ar' ? 'مثال' : 'Example'}</th></tr></thead>
            <tbody>
              <tr><td><b>Employee ID / Device ID</b></td><td>${UI.badge(lang === 'ar' ? 'مطلوب' : 'Required', 'danger')}</td><td>${lang === 'ar' ? 'معرّف الموظف أو معرّف الجهاز' : 'Employee or device identifier'}</td><td><code>EMP-0001</code> أو <code>10042</code></td></tr>
              <tr><td><b>Punch Date</b></td><td>${UI.badge(lang === 'ar' ? 'مطلوب' : 'Required', 'danger')}</td><td>${lang === 'ar' ? 'تاريخ البصمة (YYYY-MM-DD أو DD/MM/YYYY)' : 'Punch date'}</td><td><code>2026-10-13</code></td></tr>
              <tr><td><b>Punch Time</b></td><td>${UI.badge(lang === 'ar' ? 'مطلوب' : 'Required', 'danger')}</td><td>${lang === 'ar' ? 'وقت البصمة (HH:MM)' : 'Punch time'}</td><td><code>08:02</code></td></tr>
              <tr><td><b>Direction</b></td><td>${UI.badge(lang === 'ar' ? 'اختياري' : 'Optional', 'gray')}</td><td>${lang === 'ar' ? 'دخول/خروج (in/out)' : 'In/out direction'}</td><td><code>in</code> أو <code>out</code></td></tr>
            </tbody>
          </table></div>
          <p class="muted mt-8">${lang === 'ar' ? 'يمكن أيضًا استخدام عمود واحد بتاريخ ووقت مدمجين (مثل 2026-10-13 08:02:45).' : 'A single combined date-time column is also supported (e.g. 2026-10-13 08:02:45).'}</p>
        </div>
      `;

      const dropZone = document.getElementById('fp-drop');
      const fileInput = document.getElementById('fp-file');
      dropZone.onclick = () => fileInput.click();
      dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
      dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      };
      fileInput.onchange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); };
      return;
    }

    // File loaded — show mapping + preview
    const empMap = {};
    S.getCollection('employees').forEach((e) => {
      empMap[e.id] = e;
      // also map by alt IDs if present
      if (e.deviceId) empMap[e.deviceId] = e;
    });

    wrap.innerHTML = `
      <div class="card mb-16">
        <div class="card-head">
          <div><h3>${lang === 'ar' ? 'تعيين الأعمدة' : 'Column Mapping'}</h3>
          <p>${U.esc(state.pendingFile.filename)} · ${state.pendingFile.rows.length} ${lang === 'ar' ? 'صف' : 'rows'} · ${state.pendingFile.headers.length} ${lang === 'ar' ? 'أعمدة' : 'columns'}</p></div>
          <button class="btn ghost" id="fp-reset">${lang === 'ar' ? 'إعادة تعيين' : 'Reset'}</button>
        </div>
        <div class="form-grid">
          ${mappingSelect('employeeId', lang === 'ar' ? 'معرّف الموظف / الجهاز' : 'Employee / Device ID', true)}
          ${mappingSelect('punchDate', lang === 'ar' ? 'تاريخ البصمة' : 'Punch Date', true)}
          ${mappingSelect('punchTime', lang === 'ar' ? 'وقت البصمة' : 'Punch Time', false)}
          ${mappingSelect('punchDateTime', lang === 'ar' ? 'تاريخ ووقت مدمجان (بديل)' : 'Combined DateTime (alternative)', false)}
          ${mappingSelect('direction', lang === 'ar' ? 'الاتجاه (دخول/خروج)' : 'Direction (in/out)', false)}
        </div>
        <div class="mt-16" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" id="fp-validate">${lang === 'ar' ? 'تحقق ومعاينة' : 'Validate & Preview'}</button>
          <button class="btn secondary" id="fp-repick">${lang === 'ar' ? 'اختيار ملف آخر' : 'Pick another file'}</button>
        </div>
      </div>

      <div id="fp-preview-wrap"></div>
    `;

    document.getElementById('fp-reset').onclick = () => { state.pendingFile = null; state.preview = []; state.validation = null; render(); };
    document.getElementById('fp-repick').onclick = () => { state.pendingFile = null; state.preview = []; state.validation = null; render(); };
    document.getElementById('fp-validate').onclick = () => validateAndPreview();

    // auto-guess mapping
    autoGuessMapping();
  }

  function mappingSelect(field, label, required) {
    const headers = state.pendingFile.headers;
    const current = state.mapping[field];
    return `<label class="field">
      <span>${label} ${required ? '<span style="color:var(--danger-500)">*</span>' : ''}</span>
      <select data-map="${field}">
        <option value="">—</option>
        ${headers.map((h) => `<option value="${U.esc(h)}" ${current === h ? 'selected' : ''}>${U.esc(h)}</option>`).join('')}
      </select>
    </label>`;
  }

  function autoGuessMapping() {
    const headers = state.pendingFile.headers.map((h) => ({ h, lc: h.toLowerCase() }));
    const guess = (patterns) => {
      for (const p of patterns) {
        const match = headers.find((x) => p.test(x.lc));
        if (match) return match.h;
      }
      return '';
    };
    if (!state.mapping.employeeId) state.mapping.employeeId = guess([/emp.*id/, /employee/, /^id$/, /device.*id/, /user.*id/, /بطاقة/, /موظف/, /رقم/]);
    if (!state.mapping.punchDate) state.mapping.punchDate = guess([/date/, /تاريخ/, / يوم/]);
    if (!state.mapping.punchTime) state.mapping.punchTime = guess([/time/, /وقت/, /ساعة/]);
    if (!state.mapping.punchDateTime) state.mapping.punchDateTime = guess([/datetime/, /timestamp/, /تاريخ ووقت/, /طابع زمني/]);
    if (!state.mapping.direction) state.mapping.direction = guess([/direction/, /type/, /in.*out/, /اتجاه/, /نوع/]);
    // Re-render selects with guessed values
    document.querySelectorAll('[data-map]').forEach((sel) => {
      const field = sel.dataset.map;
      sel.value = state.mapping[field] || '';
      sel.onchange = (e) => { state.mapping[field] = e.target.value; };
    });
  }

  function validateAndPreview() {
    const lang = ZenI18n.lang;
    // Read current select values
    document.querySelectorAll('[data-map]').forEach((sel) => {
      state.mapping[sel.dataset.map] = sel.value;
    });

    if (!state.mapping.employeeId || (!state.mapping.punchDate && !state.mapping.punchDateTime)) {
      UI.toast(lang === 'ar' ? 'يرجى تعيين الحقول المطلوبة' : 'Please map required fields', 'warning');
      return;
    }

    // Build normalized punch rows
    const empMap = {};
    S.getCollection('employees').forEach((e) => {
      empMap[e.id] = e;
      if (e.deviceId) empMap[String(e.deviceId)] = e;
    });

    const normalized = [];
    const errors = [];
    const unknown = [];
    const duplicates = [];
    const seenKeys = new Map();

    state.pendingFile.rows.forEach((r, idx) => {
      const empIdRaw = (r[state.mapping.employeeId] || '').toString().trim();
      let dateStr = '', timeStr = '';
      if (state.mapping.punchDateTime) {
        const dt = (r[state.mapping.punchDateTime] || '').toString().trim();
        // Try parsing common formats
        const m = dt.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/) || dt.match(/(\d{2}\/\d{2}\/\d{4})[ T](\d{2}:\d{2})/);
        if (m) { dateStr = normalizeDate(m[1]); timeStr = m[2]; }
        else { errors.push({ row: idx + 2, message: `Invalid datetime: ${dt}` }); return; }
      } else {
        dateStr = normalizeDate((r[state.mapping.punchDate] || '').toString().trim());
        timeStr = (r[state.mapping.punchTime] || '').toString().trim();
        if (timeStr && !/^\d{1,2}:\d{2}/.test(timeStr)) {
          // try to extract time from a longer string
          const m = timeStr.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
          timeStr = m ? m[1] : '';
        }
      }

      if (!empIdRaw) { errors.push({ row: idx + 2, message: 'Missing employee ID' }); return; }
      if (!dateStr) { errors.push({ row: idx + 2, message: `Invalid date for employee ${empIdRaw}` }); return; }
      if (!timeStr) { errors.push({ row: idx + 2, message: `Invalid time for employee ${empIdRaw}` }); return; }

      const emp = empMap[empIdRaw];
      const employeeId = emp ? emp.id : null;
      if (!emp) unknown.push({ row: idx + 2, rawId: empIdRaw, date: dateStr, time: timeStr });

      const dedupKey = (employeeId || empIdRaw) + '|' + dateStr + '|' + timeStr;
      if (seenKeys.has(dedupKey)) {
        duplicates.push({ row: idx + 2, key: dedupKey, firstRow: seenKeys.get(dedupKey) });
        return; // skip duplicate
      }
      seenKeys.set(dedupKey, idx + 2);

      const direction = state.mapping.direction ? (r[state.mapping.direction] || '').toString().trim().toLowerCase() : '';

      normalized.push({
        id: 'fp-' + Date.now().toString(36) + '-' + idx,
        employeeId,
        rawEmployeeId: empIdRaw,
        date: dateStr,
        time: timeStr,
        direction,
        recognized: !!emp,
        sourceRow: idx + 2,
        status: emp ? 'recognized' : 'unknown',
      });
    });

    state.preview = normalized;
    state.validation = {
      stats: {
        total: state.pendingFile.rows.length,
        normalized: normalized.length,
        recognized: normalized.filter((n) => n.recognized).length,
        unknown: unknown.length,
        duplicates: duplicates.length,
        errors: errors.length,
      },
      errors, unknown, duplicates,
    };

    renderPreview();
  }

  function normalizeDate(s) {
    if (!s) return '';
    // Already ISO YYYY-MM-DD
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    // DD/MM/YYYY or DD-MM-YYYY
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    // MM/DD/YYYY (US)
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/);
    if (m) {
      const year = '20' + m[3];
      return year + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
    }
    // Excel date number?
    const n = Number(s);
    if (!isNaN(n) && n > 30000 && n < 80000) {
      // Excel serial date
      const dt = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return dt.toISOString().slice(0, 10);
    }
    return '';
  }

  function renderPreview() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('fp-preview-wrap');
    if (!wrap) return;
    const v = state.validation;
    if (!v) return;

    const showRows = state.preview.slice(0, 100);

    wrap.innerHTML = `
      <div class="stat-grid mb-16">
        ${miniStat('▢', 'brand', lang === 'ar' ? 'إجمالي الصفوف' : 'Total Rows', v.stats.total)}
        ${miniStat('✓', 'success', lang === 'ar' ? 'موظفون معروفون' : 'Recognized', v.stats.recognized)}
        ${miniStat('?', 'warning', lang === 'ar' ? 'موظفون غير معروفين' : 'Unknown', v.stats.unknown)}
        ${miniStat('⎘', 'info', lang === 'ar' ? 'تكرارات' : 'Duplicates', v.stats.duplicates)}
        ${miniStat('✕', 'danger', lang === 'ar' ? 'أخطاء' : 'Errors', v.stats.errors)}
      </div>

      ${v.errors.length ? `<div class="card mb-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'الأخطاء' : 'Errors'} (${v.errors.length})</h3></div></div>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'الصف' : 'Row'}</th><th>${lang === 'ar' ? 'الرسالة' : 'Message'}</th></tr></thead>
          <tbody>${v.errors.slice(0, 50).map((e) => `<tr><td>${e.row}</td><td>${U.esc(e.message)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>` : ''}

      ${v.unknown.length ? `<div class="card mb-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'موظفون غير معروفين' : 'Unknown Employees'} (${v.unknown.length})</h3>
        <p>${lang === 'ar' ? 'هذه المعرّفات غير موجودة في قاعدة بيانات الموظفين. يمكن ربطها يدويًا أو تجاهلها.' : 'These IDs are not in the employee database. You can manually link or ignore them.'}</p></div></div>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'الصف' : 'Row'}</th><th>${lang === 'ar' ? 'المعرّف الخام' : 'Raw ID'}</th><th>${lang === 'ar' ? 'التاريخ' : 'Date'}</th><th>${lang === 'ar' ? 'الوقت' : 'Time'}</th><th>${lang === 'ar' ? 'ربط بموظف' : 'Link to employee'}</th></tr></thead>
          <tbody>${v.unknown.slice(0, 50).map((u, i) => {
            return `<tr><td>${u.row}</td><td><b>${U.esc(u.rawId)}</b></td><td>${U.esc(u.date)}</td><td>${U.esc(u.time)}</td>
              <td><select data-link="${i}">
                <option value="">${lang === 'ar' ? '— تجاهل —' : '— ignore —'}</option>
                ${S.getCollection('employees').slice(0, 200).map((e) => `<option value="${e.id}">${U.esc(e.id + ' - ' + (lang === 'ar' ? e.name : (e.nameEn || e.name)))}</option>`).join('')}
              </select></td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>` : ''}

      ${v.duplicates.length ? `<div class="card mb-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'البصمات المكررة' : 'Duplicate Punches'} (${v.duplicates.length})</h3>
        <p>${lang === 'ar' ? 'تم تجاهلها تلقائيًا.' : 'Automatically skipped.'}</p></div></div>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'الصف' : 'Row'}</th><th>${lang === 'ar' ? 'الصف الأول' : 'First Row'}</th><th>${lang === 'ar' ? 'المفتاح' : 'Key'}</th></tr></thead>
          <tbody>${v.duplicates.slice(0, 50).map((d) => `<tr><td>${d.row}</td><td>${d.firstRow}</td><td><code>${U.esc(d.key)}</code></td></tr>`).join('')}</tbody>
        </table></div>
      </div>` : ''}

      <div class="card">
        <div class="card-head">
          <div><h3>${lang === 'ar' ? 'معاينة البصمات' : 'Punches Preview'} (${state.preview.length})</h3>
          <p>${lang === 'ar' ? 'عرض أول 100 صف' : 'Showing first 100 rows'}</p></div>
          <div style="display:flex;gap:8px">
            <button class="btn secondary" id="fp-export-rejected">${lang === 'ar' ? 'تصدير المرفوضة' : 'Export Rejected'}</button>
            <button class="btn primary" id="fp-confirm" ${v.stats.recognized === 0 ? 'disabled' : ''}>${lang === 'ar' ? 'تأكيد الاستيراد' : 'Confirm Import'}</button>
          </div>
        </div>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'الصف' : 'Row'}</th><th>${lang === 'ar' ? 'الموظف' : 'Employee'}</th><th>${lang === 'ar' ? 'المعرّف الخام' : 'Raw ID'}</th><th>${lang === 'ar' ? 'التاريخ' : 'Date'}</th><th>${lang === 'ar' ? 'الوقت' : 'Time'}</th><th>${lang === 'ar' ? 'الاتجاه' : 'Direction'}</th><th>${lang === 'ar' ? 'الحالة' : 'Status'}</th></tr></thead>
          <tbody>${showRows.map((p) => {
            const emp = p.employeeId ? S.getById('employees', p.employeeId) : null;
            return `<tr>
              <td>${p.sourceRow}</td>
              <td>${emp ? UI.avatarCell(lang === 'ar' ? emp.name : (emp.nameEn || emp.name), emp.id) : '<span class="muted">—</span>'}</td>
              <td><code>${U.esc(p.rawEmployeeId)}</code></td>
              <td>${U.esc(p.date)}</td>
              <td>${U.esc(p.time)}</td>
              <td>${p.direction ? UI.badge(p.direction, 'info') : '—'}</td>
              <td>${p.recognized ? UI.badge(lang === 'ar' ? 'معروف' : 'Recognized', 'success') : UI.badge(lang === 'ar' ? 'غير معروف' : 'Unknown', 'warning')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    `;

    // Wire up manual linking
    document.querySelectorAll('[data-link]').forEach((sel) => {
      sel.onchange = (e) => {
        const idx = parseInt(sel.dataset.link, 10);
        const u = v.unknown[idx];
        const newEmpId = e.target.value;
        if (newEmpId) {
          // Update all preview rows with this rawEmployeeId
          state.preview.forEach((p) => {
            if (p.rawEmployeeId === u.rawId) {
              p.employeeId = newEmpId;
              p.recognized = true;
              p.status = 'linked';
            }
          });
          v.stats.recognized = state.preview.filter((p) => p.recognized).length;
          v.stats.unknown = state.preview.filter((p) => !p.recognized).length;
          renderPreview();
        }
      };
    });

    document.getElementById('fp-export-rejected').onclick = () => exportRejected();
    document.getElementById('fp-confirm').onclick = () => confirmImport();
  }

  function miniStat(icon, color, label, value) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div><div class="stat-label">${U.esc(label)}</div><div class="stat-value" style="font-size:20px">${U.esc(U.num(value))}</div></div>`;
  }

  function exportRejected() {
    const lang = ZenI18n.lang;
    const rejected = [];
    (state.validation.errors || []).forEach((e) => rejected.push({ type: 'error', row: e.row, message: e.message }));
    (state.validation.duplicates || []).forEach((d) => rejected.push({ type: 'duplicate', row: d.row, message: 'Duplicate of row ' + d.firstRow }));
    (state.validation.unknown || []).forEach((u) => rejected.push({ type: 'unknown', row: u.row, message: 'Unknown employee ID: ' + u.rawId }));
    if (!rejected.length) { UI.toast(lang === 'ar' ? 'لا توجد سجلات مرفوضة' : 'No rejected records', 'info'); return; }
    ZenExport.toXLSX(rejected, [
      { label: lang === 'ar' ? 'النوع' : 'Type', value: (r) => r.type },
      { label: lang === 'ar' ? 'الصف' : 'Row', value: (r) => r.row, type: 'number' },
      { label: lang === 'ar' ? 'الرسالة' : 'Message', value: (r) => r.message, wrap: true },
    ], `rejected-punches-${U.today()}.xlsx`, 'Rejected');
    UI.toast(lang === 'ar' ? 'تم تصدير السجلات المرفوضة' : 'Rejected records exported', 'success');
  }

  function confirmImport() {
    const lang = ZenI18n.lang;
    const recognized = state.preview.filter((p) => p.recognized);
    if (!recognized.length) {
      UI.toast(lang === 'ar' ? 'لا توجد بصمات صالحة للاستيراد' : 'No valid punches to import', 'warning');
      return;
    }
    UI.confirm({
      title: lang === 'ar' ? 'تأكيد الاستيراد' : 'Confirm Import',
      message: lang === 'ar' ? `سيتم استيراد ${recognized.length} بصمة. سيتم تخزينها كسجل خام ويمكن مطابقتها لاحقًا مع الحضور.` : `Import ${recognized.length} punches? They will be stored as raw records and can be reconciled to attendance later.`,
      confirmLabel: lang === 'ar' ? 'استيراد' : 'Import',
      onConfirm: () => {
        const batchId = 'fpbatch-' + Date.now().toString(36);
        const batch = {
          id: batchId,
          filename: state.pendingFile.filename,
          importedAt: new Date().toISOString(),
          totalRows: state.pendingFile.rows.length,
          recognized: recognized.length,
          unknown: state.validation.stats.unknown,
          duplicates: state.validation.stats.duplicates,
          errors: state.validation.stats.errors,
          mapping: { ...state.mapping },
        };
        S.insert('fingerprintImports', batch);
        recognized.forEach((p) => {
          p.batchId = batchId;
          p.importedAt = batch.importedAt;
          S.insert('fingerprints', p);
        });
        ZenAudit.logImport('fingerprints', { batchId, count: recognized.length, filename: state.pendingFile.filename });
        UI.toast(lang === 'ar' ? `تم استيراد ${recognized.length} بصمة بنجاح` : `${recognized.length} punches imported successfully`, 'success');
        state.pendingFile = null;
        state.preview = [];
        state.validation = null;
        state.tab = 'history';
        render();
      }
    });
  }

  /* -------- History tab -------- */
  function renderHistory() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('fp-content');
    if (!wrap) return;
    const batches = S.getCollection('fingerprintImports').sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1));

    wrap.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h3>${lang === 'ar' ? 'سجل الاستيراد' : 'Import History'}</h3>
          <p>${batches.length} ${lang === 'ar' ? 'دفعة استيراد' : 'import batches'}</p></div>
          <button class="btn secondary" id="fp-new-import">${lang === 'ar' ? 'استيراد جديد' : 'New Import'}</button>
        </div>
        ${batches.length === 0 ? UI.empty('⇩', lang === 'ar' ? 'لا توجد استيرادات بعد' : 'No imports yet', lang === 'ar' ? 'ابدأ باستيراد ملف بصمات' : 'Start by importing a punches file') : `
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'التاريخ' : 'Date'}</th><th>${lang === 'ar' ? 'الملف' : 'File'}</th><th>${lang === 'ar' ? 'الإجمالي' : 'Total'}</th><th>${lang === 'ar' ? 'معترف بها' : 'Recognized'}</th><th>${lang === 'ar' ? 'غير معروفة' : 'Unknown'}</th><th>${lang === 'ar' ? 'مكررة' : 'Duplicates'}</th><th>${lang === 'ar' ? 'أخطاء' : 'Errors'}</th><th>${lang === 'ar' ? 'إجراءات' : 'Actions'}</th></tr></thead>
          <tbody>${batches.map((b) => `<tr>
            <td>${U.date(b.importedAt)} ${U.time(b.importedAt)}</td>
            <td><b>${U.esc(b.filename)}</b></td>
            <td>${b.totalRows}</td>
            <td><span class="badge success">${b.recognized}</span></td>
            <td>${b.unknown ? `<span class="badge warning">${b.unknown}</span>` : '0'}</td>
            <td>${b.duplicates || 0}</td>
            <td>${b.errors || 0}</td>
            <td><div class="row-actions">
              <button class="btn sm ghost" data-view="${b.id}" title="${lang === 'ar' ? 'عرض' : 'View'}">👁</button>
              <button class="btn sm ghost" data-reconcile="${b.id}" title="${lang === 'ar' ? 'مطابقة' : 'Reconcile'}">⟲</button>
              <button class="btn sm ghost" data-del="${b.id}" title="${lang === 'ar' ? 'حذف' : 'Delete'}">🗑</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    `;

    const newBtn = document.getElementById('fp-new-import');
    if (newBtn) newBtn.onclick = () => { state.tab = 'import'; state.pendingFile = null; render(); };
    wrap.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => viewBatch(b.dataset.view));
    wrap.querySelectorAll('[data-reconcile]').forEach((b) => b.onclick = () => { state.tab = 'reconcile'; state.pendingBatch = b.dataset.reconcile; render(); });
    wrap.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => deleteBatch(b.dataset.del));
  }

  function viewBatch(id) {
    const lang = ZenI18n.lang;
    const batch = S.getById('fingerprintImports', id);
    if (!batch) return;
    const punches = S.findBy('fingerprints', (p) => p.batchId === id);
    UI.modal({
      title: lang === 'ar' ? 'تفاصيل الدفعة' : 'Batch Details',
      subtitle: batch.filename,
      size: 'lg',
      body: `
        <div class="stat-grid mb-16">
          ${miniStat('▢', 'brand', lang === 'ar' ? 'الإجمالي' : 'Total', batch.totalRows)}
          ${miniStat('✓', 'success', lang === 'ar' ? 'معترف بها' : 'Recognized', batch.recognized)}
          ${miniStat('?', 'warning', lang === 'ar' ? 'غير معروفة' : 'Unknown', batch.unknown)}
          ${miniStat('⎘', 'info', lang === 'ar' ? 'مكررة' : 'Duplicates', batch.duplicates)}
        </div>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'الموظف' : 'Employee'}</th><th>${lang === 'ar' ? 'التاريخ' : 'Date'}</th><th>${lang === 'ar' ? 'الوقت' : 'Time'}</th><th>${lang === 'ar' ? 'الاتجاه' : 'Direction'}</th></tr></thead>
          <tbody>${punches.slice(0, 200).map((p) => {
            const emp = p.employeeId ? S.getById('employees', p.employeeId) : null;
            return `<tr><td>${emp ? U.esc(lang === 'ar' ? emp.name : (emp.nameEn || emp.name)) : '<span class="muted">' + U.esc(p.rawEmployeeId) + '</span>'}</td><td>${p.date}</td><td>${p.time}</td><td>${p.direction || '—'}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
      `,
    });
  }

  function deleteBatch(id) {
    UI.confirm({
      title: ZenI18n.lang === 'ar' ? 'حذف الدفعة' : 'Delete Batch',
      message: ZenI18n.lang === 'ar' ? 'سيتم حذف الدفعة وجميع بصماتها الخام. لا يمكن التراجع.' : 'This will delete the batch and all its raw punches. Cannot be undone.',
      kind: 'danger',
      confirmLabel: ZenI18n.t('common.delete'),
      onConfirm: () => {
        S.remove('fingerprintImports', id);
        // Remove all punches with this batchId
        const remaining = S.getCollection('fingerprints').filter((p) => p.batchId !== id);
        S.setCollection('fingerprints', remaining);
        ZenAudit.logDelete('fingerprintImports', id, { batchId: id });
        UI.toast(ZenI18n.lang === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
        render();
      }
    });
  }

  /* -------- Reconcile tab -------- */
  function renderReconcile() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('fp-content');
    if (!wrap) return;
    const punches = S.getCollection('fingerprints').sort((a, b) => (a.date < b.date ? -1 : 1));

    // Group by employee + date → take earliest as check-in, latest as check-out
    const groups = {};
    punches.forEach((p) => {
      if (!p.employeeId) return;
      const k = p.employeeId + '|' + p.date;
      if (!groups[k]) groups[k] = { employeeId: p.employeeId, date: p.date, punches: [] };
      groups[k].punches.push(p);
    });
    const reconciled = Object.values(groups).map((g) => {
      g.punches.sort((a, b) => (a.time < b.time ? -1 : 1));
      g.checkIn = g.punches[0].time;
      g.checkOut = g.punches.length > 1 ? g.punches[g.punches.length - 1].time : null;
      g.punchCount = g.punches.length;
      return g;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));

    wrap.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h3>${lang === 'ar' ? 'مطابقة البصمات مع الحضور' : 'Reconcile Punches to Attendance'}</h3>
          <p>${lang === 'ar' ? 'تحويل البصمات الخام إلى سجلات حضور (أول بصمة = دخول، آخر بصمة = خروج)' : 'Convert raw punches into attendance records (first = check-in, last = check-out)'}</p></div>
          <button class="btn primary" id="fp-reconcile-run" ${reconciled.length === 0 ? 'disabled' : ''}>${lang === 'ar' ? 'إنشاء سجلات الحضور' : 'Generate Attendance'}</button>
        </div>
        ${reconciled.length === 0 ? UI.empty('∅', lang === 'ar' ? 'لا توجد بصمات للمطابقة' : 'No punches to reconcile', '') : `
        <div class="table-scroll"><table class="data">
          <thead><tr><th>${lang === 'ar' ? 'الموظف' : 'Employee'}</th><th>${lang === 'ar' ? 'التاريخ' : 'Date'}</th><th>${lang === 'ar' ? 'عدد البصمات' : 'Punch Count'}</th><th>${lang === 'ar' ? 'الدخول' : 'Check In'}</th><th>${lang === 'ar' ? 'الخروج' : 'Check Out'}</th><th>${lang === 'ar' ? 'الحالة' : 'Status'}</th></tr></thead>
          <tbody>${reconciled.slice(0, 200).map((r) => {
            const emp = S.getById('employees', r.employeeId);
            // Check if attendance already exists
            const existing = S.findBy('attendance', (a) => a.employeeId === r.employeeId && a.date === r.date);
            return `<tr>
              <td>${emp ? UI.avatarCell(lang === 'ar' ? emp.name : (emp.nameEn || emp.name), emp.id) : U.esc(r.employeeId)}</td>
              <td>${U.date(r.date)}</td>
              <td>${r.punchCount}</td>
              <td><b>${r.checkIn}</b></td>
              <td>${r.checkOut ? `<b>${r.checkOut}</b>` : '<span class="muted">—</span>'}</td>
              <td>${existing.length ? UI.badge(lang === 'ar' ? 'موجود' : 'Exists', 'info') : UI.badge(lang === 'ar' ? 'جديد' : 'New', 'success')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`}
      </div>
    `;

    const runBtn = document.getElementById('fp-reconcile-run');
    if (runBtn) runBtn.onclick = () => runReconcile(reconciled);
  }

  function runReconcile(reconciled) {
    const lang = ZenI18n.lang;
    let created = 0, skipped = 0;
    reconciled.forEach((r) => {
      // Skip if attendance already exists for this employee/date
      const existing = S.findBy('attendance', (a) => a.employeeId === r.employeeId && a.date === r.date);
      if (existing.length) { skipped++; return; }
      const emp = S.getById('employees', r.employeeId);
      if (!emp) { skipped++; return; }
      const shift = emp.shiftId ? S.getById('shifts', emp.shiftId) : null;
      const shiftStart = shift ? shift.startTime : (S.settings.workStartTime || '08:00');
      const shiftEnd = shift ? shift.endTime : (S.settings.workEndTime || '17:00');
      const grace = shift ? shift.graceMinutes : (S.settings.graceMinutes || 15);
      // Compute status
      let status = 'present';
      const checkInMin = U.timeToMinutes(r.checkIn);
      const shiftStartMin = U.timeToMinutes(shiftStart);
      if (checkInMin > shiftStartMin + grace) status = 'late';
      // Compute worked minutes (handle overnight)
      const checkOutMin = r.checkOut ? U.timeToMinutes(r.checkOut) : null;
      let workedMin = 0;
      if (checkOutMin != null) {
        workedMin = checkOutMin < checkInMin ? (checkOutMin + 24 * 60 - checkInMin) : (checkOutMin - checkInMin);
      }
      const breakMin = shift ? shift.breakMinutes : (S.settings.breakMinutes || 60);
      const netMin = Math.max(0, workedMin - breakMin);
      const standardMin = U.diffMinutes(shiftStart, shiftEnd) - breakMin;
      const overtimeMin = Math.max(0, netMin - standardMin);

      S.insert('attendance', {
        id: 'att-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        employeeId: r.employeeId,
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut || '',
        shiftId: emp.shiftId || '',
        status,
        workedMinutes: workedMin,
        overtimeMinutes: overtimeMin,
        source: 'fingerprint',
        sourceBatch: r.punches[0]?.batchId || '',
        notes: '',
        isDemo: false,
        createdAt: new Date().toISOString(),
      });
      created++;
    });
    ZenAudit.logCreate('attendance', null, { source: 'fingerprint', created, skipped });
    UI.toast(lang === 'ar' ? `تم إنشاء ${created} سجل حضور، تخطي ${skipped} موجود مسبقًا` : `Created ${created} attendance records, skipped ${skipped} existing`, 'success');
  }

  /* -------- Adapter tab -------- */
  function renderAdapter() {
    const lang = ZenI18n.lang;
    const wrap = document.getElementById('fp-content');
    if (!wrap) return;
    const dev = S.settings.fingerprintDevice || {};

    wrap.innerHTML = `
      <div class="card mb-16">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'محولات أجهزة البصمة' : 'Fingerprint Device Adapters'}</h3>
        <p>${lang === 'ar' ? 'واجهة لإدارة تكامل أجهزة البصمة. لا يتم تفعيل أي اتصال مباشر إلا بعد تأكيد الموديل وSDK الخاص بالمورد.' : 'Interface for managing fingerprint device integration. No direct connection is enabled until the model and vendor SDK are confirmed.'}</p></div></div>
        <div class="alert warning">
          <b>${lang === 'ar' ? 'تنبيه:' : 'Notice:'}</b>
          ${lang === 'ar' ? 'الاتصال المباشر بالأجهزة يتطلب خدمة محلية (Local Service) بسبب قيود المتصفح الأمنية. لا يمكن تنفيذه من GitHub Pages وحده.' : 'Direct device communication requires a local service due to browser security restrictions. It cannot run from GitHub Pages alone.'}
        </div>
        <div class="form-grid mt-16">
          <label class="field"><span>${lang === 'ar' ? 'المورد' : 'Vendor'}</span>
            <input type="text" id="fp-vendor" value="${U.esc(dev.vendor || '')}" placeholder="${lang === 'ar' ? 'مثال: ZKTeco, Suprema' : 'e.g. ZKTeco, Suprema'}">
          </label>
          <label class="field"><span>${lang === 'ar' ? 'الموديل' : 'Model'}</span>
            <input type="text" id="fp-model" value="${U.esc(dev.model || '')}" placeholder="${lang === 'ar' ? 'مثال: SpeedFace V5L' : 'e.g. SpeedFace V5L'}">
          </label>
          <label class="field"><span>${lang === 'ar' ? 'نوع المحول' : 'Adapter Type'}</span>
            <select id="fp-adapter">
              <option value="csv" ${dev.adapter === 'csv' ? 'selected' : ''}>${lang === 'ar' ? 'استيراد CSV / XLSX' : 'CSV / XLSX Import'}</option>
              <option value="http" ${dev.adapter === 'http' ? 'selected' : ''} disabled>${lang === 'ar' ? 'HTTP API (يتطلب خدمة محلية)' : 'HTTP API (requires local service)'}</option>
              <option value="ws" ${dev.adapter === 'ws' ? 'selected' : ''} disabled>${lang === 'ar' ? 'WebSocket (يتطلب خدمة محلية)' : 'WebSocket (requires local service)'}</option>
              <option value="sdk" ${dev.adapter === 'sdk' ? 'selected' : ''} disabled>${lang === 'ar' ? 'Native SDK (يتطلب تطبيق سطح مكتب)' : 'Native SDK (requires desktop app)'}</option>
            </select>
          </label>
          <label class="field"><span>${lang === 'ar' ? 'آخر اتصال' : 'Last Connected'}</span>
            <input type="text" value="${dev.lastConnected ? U.date(dev.lastConnected) + ' ' + U.time(dev.lastConnected) : (lang === 'ar' ? 'لا يوجد' : 'Never')}" readonly>
          </label>
        </div>
        <div class="mt-16">
          <button class="btn primary" id="fp-save-adapter">${lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}</button>
          <button class="btn ghost" id="fp-test-connection" disabled>${lang === 'ar' ? 'اختبار الاتصال (يتطلب خدمة محلية)' : 'Test Connection (requires local service)'}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h3>${lang === 'ar' ? 'متطلبات الاتصال المباشر' : 'Direct Connection Requirements'}</h3></div></div>
        <div class="alert info">
          <p><b>${lang === 'ar' ? 'لتفعيل الاتصال المباشر بجهاز بصمة، يجب توفر:' : 'To enable direct fingerprint device connection, the following are required:'}</b></p>
          <ol style="padding-${lang === 'ar' ? 'right' : 'left'}: 20px; margin: 8px 0">
            <li>${lang === 'ar' ? 'موديل الجهاز ورقم الإصدار' : 'Device model and version number'}</li>
            <li>${lang === 'ar' ? 'SDK أو API من المورد (مع الترخيص إن لزم)' : 'Vendor SDK or API (with licensing if required)'}</li>
            <li>${lang === 'ar' ? 'خدمة محلية على جهاز في نفس شبكة الجهاز' : 'Local service on a machine in the same network as the device'}</li>
            <li>${lang === 'ar' ? 'بيانات اعتماد الجهاز (تُخزَّن في الخادم فقط، وليس في الواجهة الأمامية)' : 'Device credentials (stored server-side only, never in frontend)'}</li>
            <li>${lang === 'ar' ? 'اختبار اتصال ناجح في بيئة معزولة قبل الإنتاج' : 'Successful connection test in a staging environment before production'}</li>
          </ol>
          <p style="margin: 8px 0 0">${lang === 'ar' ? 'لا تُزعَم أي اتصالات ناجحة دون اختبار فعلي.' : 'No successful connections are claimed without actual testing.'}</p>
        </div>
      </div>
    `;

    document.getElementById('fp-save-adapter').onclick = () => {
      S.settings.fingerprintDevice = {
        vendor: document.getElementById('fp-vendor').value.trim(),
        model: document.getElementById('fp-model').value.trim(),
        adapter: document.getElementById('fp-adapter').value,
        lastConnected: dev.lastConnected,
      };
      S.saveSettings();
      ZenAudit.logUpdate('settings', 'fingerprintDevice', { vendor: S.settings.fingerprintDevice.vendor, model: S.settings.fingerprintDevice.model });
      UI.toast(lang === 'ar' ? 'تم حفظ إعدادات المحول' : 'Adapter settings saved', 'success');
    };
  }

  return { render };
})();
