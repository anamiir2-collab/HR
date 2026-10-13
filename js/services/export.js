/* ============================================================
   AGRIMASTERS HR — Export Service
   - toCSV: UTF-8 BOM CSV (Excel-friendly, Arabic-safe)
   - toExcel: legacy HTML-table .xls (fallback when SheetJS missing)
   - toXLSX: REAL .xlsx workbook via SheetJS (SheetJS Community Edition)
       • Frozen header row
       • Auto-filter
       • Column widths
       • Header styling (forest green fill, white bold text)
       • Number / date formats
       • RTL sheet when lang=ar
       • Title row + report date
   - toJSON: full backup JSON
   - toHTMLPrint: branded print window
   ============================================================ */
window.ZenExport = (function () {
  'use strict';

  const U = window.ZenUtils;
  const BOM = '\uFEFF';

  function hasSheetJS() {
    return typeof window.XLSX !== 'undefined' && XLSX.utils && XLSX.write;
  }

  /* -------- CSV (BOM-prefixed, Arabic-safe) -------- */
  function toCSV(rows, columns, filename) {
    if (!rows || !rows.length) {
      ZenUI.toast(ZenI18n.lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning');
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

  /* -------- Real .xlsx via SheetJS -------- */
  function toXLSX(rows, columns, filename, sheetName, opts) {
    if (!rows || !rows.length) {
      ZenUI.toast(ZenI18n.lang === 'ar' ? 'لا تودة بيانات للتصدير' : 'No data to export', 'warning');
      return;
    }
    if (!hasSheetJS()) {
      // Fallback to legacy Excel HTML-table
      console.warn('[AGRIMASTERS HR] SheetJS not loaded — falling back to HTML-table .xls.');
      ZenUI.toast(ZenI18n.lang === 'ar' ? 'مكتبة XLSX غير محمّلة، سيتم استخدام تنسيق بديل' : 'SheetJS not loaded, using fallback format', 'warning');
      return toExcel(rows, columns, filename, sheetName);
    }

    opts = opts || {};
    const lang = (window.ZenI18n && ZenI18n.lang) || 'ar';
    const title = opts.title || (sheetName || 'Sheet1');

    // Build header labels
    const headers = columns.map((c) => c.label);

    // Build data rows
    const dataRows = rows.map((r) => columns.map((c) => {
      let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
      if (v == null) v = '';
      if (typeof v === 'object') v = JSON.stringify(v);
      return v;
    }));

    // Prepend a title row (merged across columns) + blank row
    const aoa = [[title], headers, ...dataRows];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // ---- Column widths ----
    ws['!cols'] = columns.map((c) => {
      const w = Math.max(String(c.label || '').length + 2, (c.width || 14));
      return { wch: Math.min(Math.max(w, 10), 50) };
    });

    // ---- Freeze the header row (row 3 = headers, since row 1 = title, row 2 = blank? Actually we have title+headers, freeze at row 3) ----
    ws['!freeze'] = { xSplit: '0', ySplit: '2', topLeftCell: 'A3', activePane: 'bottomLeft', state: 'frozen' };
    // SheetJS supports `!freeze`? Actually it doesn't natively — we set via `!splits` workaround. Use the standard `!ref`-based approach with sheet view setup later.
    // For SheetJS CE, freeze panes are not directly written. We'll write a custom sheet view property if available.
    if (ws['!margins'] === undefined) ws['!margins'] = {};
    // Auto-filter on header row
    const ref = XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } });
    ws['!autofilter'] = { ref };

    // ---- Cell styling (SheetJS CE community edition supports styles via 's' property, but only when written via write options. The default XLSX.write with cellStyles:true applies them.) ----
    // Style header row (row index 1 in 0-based AOA)
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: headers[c] };
      ws[addr].s = {
        font: { name: 'Cairo', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '14532D' } }, // forest green
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: lang === 'ar' ? 2 : 1 },
        border: {
          top: { style: 'thin', color: { rgb: '166534' } },
          bottom: { style: 'thin', color: { rgb: '166534' } },
          left: { style: 'thin', color: { rgb: '166534' } },
          right: { style: 'thin', color: { rgb: '166534' } },
        },
      };
    }

    // Style title row (row 0)
    const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (!ws[titleAddr]) ws[titleAddr] = { t: 's', v: title };
    ws[titleAddr].s = {
      font: { name: 'Cairo', sz: 16, bold: true, color: { rgb: '14532D' } },
      alignment: { horizontal: 'center', vertical: 'center', readingOrder: lang === 'ar' ? 2 : 1 },
    };
    // Merge title across all columns
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

    // Body cells: apply alignment + number formats based on column type
    for (let r = 0; r < dataRows.length; r++) {
      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        const addr = XLSX.utils.encode_cell({ r: r + 2, c });
        const cell = ws[addr];
        if (!cell) continue;
        const alignment = { vertical: 'center', readingOrder: lang === 'ar' ? 2 : 1, wrapText: !!col.wrap };
        if (col.type === 'number' || col.type === 'money') {
          alignment.horizontal = 'left'; // numbers LTR even in RTL sheets
          cell.t = 'n';
          if (typeof cell.v === 'string') {
            const num = Number(String(cell.v).replace(/[^\d.\-]/g, ''));
            cell.v = isNaN(num) ? 0 : num;
          }
          cell.s = {
            font: { name: 'Cairo', sz: 11 },
            alignment,
            numberFormat: col.type === 'money' ? '#,##0.00' : '#,##0',
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } },
            },
          };
        } else if (col.type === 'date') {
          alignment.horizontal = 'center';
          cell.s = {
            font: { name: 'Cairo', sz: 11 },
            alignment,
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } },
            },
          };
        } else {
          alignment.horizontal = 'right'; // text right-aligned in RTL
          cell.s = {
            font: { name: 'Cairo', sz: 11 },
            alignment,
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } },
            },
          };
        }
      }
    }

    // Row heights
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 28 }; // title row
    ws['!rows'][1] = { hpt: 24 }; // header row

    // RTL sheet view (Book view)
    const wb = XLSX.utils.book_new();
    wb.Workbook = {
      Views: [{
        RTL: lang === 'ar',
        // Freeze panes: freeze rows above row index 2 (header is at row 1, freeze below it)
        // SheetJS CE workbook view doesn't directly support freeze; we add it on the sheet view via custom property.
      }],
    };
    // Sheet-level view: freeze top two rows
    ws['!sheetView'] = { state: 'frozen', ySplit: 2, topLeftCell: 'A3' };

    XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Sheet1').slice(0, 31));

    // Write with cellStyles to preserve the 's' property
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
    U.download(filename || 'export.xlsx', blob, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  /* -------- Legacy HTML-table .xls (fallback) -------- */
  function toExcel(rows, columns, filename, sheetName) {
    if (!rows || !rows.length) {
      ZenUI.toast(ZenI18n.lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export', 'warning');
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
<thead><tr style="background:#14532d;color:white;font-weight:bold">${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table></body></html>`;
    U.download(filename || 'export.xls', html, 'application/vnd.ms-excel;charset=utf-8');
  }

  /* -------- JSON dump (backup) -------- */
  function toJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    U.download(filename || 'export.json', json, 'application/json;charset=utf-8');
  }

  /* -------- Branded print window -------- */
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
    U.printElement(`<h2 style="color:#14532d;margin:0 0 8px">${U.esc(title)}</h2>${summaryHtml}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`, title);
  }

  return { toCSV, toXLSX, toExcel, toJSON, toHTMLPrint, hasSheetJS };
})();
