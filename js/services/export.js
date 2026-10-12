/* ============================================================
   ZenHR — Export Service (CSV/Excel-compatible, Arabic-safe)
   ============================================================ */
window.ZenExport = (function () {
  'use strict';

  const U = window.ZenUtils;
  const BOM = '\uFEFF'; // ensures Arabic renders correctly in Excel

  function toCSV(rows, columns, filename) {
    if (!rows || !rows.length) {
      ZenUI.toast('لا توجد بيانات للتصدير', 'warning');
      return;
    }
    const header = columns.map((c) => U.csvEscape(c.label)).join(',');
    const body = rows.map((r) =>
      columns.map((c) => {
        let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
        if (v == null) v = '';
        if (typeof v === 'object') v = JSON.stringify(v);
        return U.csvEscape(v);
      }).join(',')
    ).join('\r\n');
    const csv = BOM + header + '\r\n' + body;
    U.download(filename || 'export.csv', csv, 'text/csv;charset=utf-8');
  }

  // Excel-compatible HTML table (opens in Excel directly with Arabic support)
  function toExcel(rows, columns, filename, sheetName) {
    if (!rows || !rows.length) {
      ZenUI.toast('لا توجد بيانات للتصدير', 'warning');
      return;
    }
    const headerCells = columns.map((c) => `<th>${U.esc(c.label)}</th>`).join('');
    const bodyRows = rows.map((r) =>
      `<tr>${columns.map((c) => {
        let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
        if (v == null) v = '';
        if (typeof v === 'object') v = JSON.stringify(v);
        return `<td>${U.esc(v)}</td>`;
      }).join('')}</tr>`
    ).join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${U.esc(sheetName || 'Sheet1')}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body dir="${(ZenI18n && ZenI18n.lang === 'ar') ? 'rtl' : 'ltr'}">
<table border="1" style="font-family:'Cairo',Arial,sans-serif;font-size:11pt;border-collapse:collapse">
<thead><tr style="background:#0f766e;color:white;font-weight:bold">${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table></body></html>`;
    U.download(filename || 'export.xls', html, 'application/vnd.ms-excel;charset=utf-8');
  }

  function toJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    U.download(filename || 'export.json', json, 'application/json;charset=utf-8');
  }

  function toHTMLPrint(rows, columns, title, options) {
    options = options || {};
    const headerCells = columns.map((c) => `<th>${U.esc(c.label)}</th>`).join('');
    const bodyRows = rows.map((r) =>
      `<tr>${columns.map((c) => {
        let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
        if (v == null) v = '';
        return `<td>${typeof v === 'string' ? v : U.esc(JSON.stringify(v))}</td>`;
      }).join('')}</tr>`
    ).join('');
    const summaryHtml = options.summary ? `<div style="margin-bottom:12px"><b>${U.esc(options.summary.label || '')}:</b> ${U.esc(options.summary.value || '')}</div>` : '';
    U.printElement(`<h2 style="color:#0f766e;margin:0 0 8px">${U.esc(title)}</h2>${summaryHtml}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`, title);
  }

  return { toCSV, toExcel, toJSON, toHTMLPrint };
})();
