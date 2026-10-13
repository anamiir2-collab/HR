/* ============================================================
   AGRIMASTERS HR — XLSX/CSV/TXT Import Service
   Generic file-reader + worksheet-to-rows converter using SheetJS.
   Provides:
   - readFile(file): Promise<{ rows, headers, filename, sheetNames }>
   - parseText(text, delimiter): { rows, headers }
   - preview(rows, limit): trimmed preview array
   - validate(rows, requiredFields, opts): { valid, errors, warnings, duplicates }
   ============================================================ */
window.ZenXlsxImport = (function () {
  'use strict';

  function hasSheetJS() {
    return typeof window.XLSX !== 'undefined' && XLSX.utils && XLSX.read;
  }

  /** Read a File object (xlsx/xls/csv/txt) and return rows.
   *  @returns Promise<{rows: Array, headers: Array, filename: string, sheetNames: Array}>
   */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      const name = file.name || 'import.dat';
      const ext = name.split('.').pop().toLowerCase();
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const data = e.target.result;
          if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
            if (!hasSheetJS()) return reject(new Error('SheetJS library not loaded. Cannot parse .xlsx files.'));
            const wb = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetNames = wb.SheetNames;
            const ws = wb.Sheets[sheetNames[0]];
            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
            const result = aoaToRows(aoa);
            resolve({ ...result, filename: name, sheetNames });
          } else if (ext === 'csv' || ext === 'txt') {
            // Text-based: detect delimiter
            const text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
            const delim = detectDelimiter(text);
            const result = parseText(text, delim);
            resolve({ ...result, filename: name, sheetNames: [name] });
          } else {
            reject(new Error('Unsupported file type: ' + ext));
          }
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('File read error'));

      // Read as ArrayBuffer for xlsx, text for csv/txt
      if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'utf-8');
      }
    });
  }

  /** Convert array-of-arrays (from SheetJS) to { rows, headers } */
  function aoaToRows(aoa) {
    if (!aoa || !aoa.length) return { rows: [], headers: [] };
    // Trim empty trailing rows
    const cleaned = aoa.filter((r) => r && r.some((c) => String(c).trim() !== ''));
    if (!cleaned.length) return { rows: [], headers: [] };
    const headers = cleaned[0].map((h) => String(h == null ? '' : h).trim());
    const rows = cleaned.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] == null ? '' : String(r[i]).trim();
      });
      // Also keep the raw array for access by index
      obj.__row = r;
      obj.__rowIndex = cleaned.indexOf(r);
      return obj;
    });
    return { rows, headers };
  }

  /** Parse a delimited text string to { rows, headers } */
  function parseText(text, delimiter) {
    delimiter = delimiter || detectDelimiter(text);
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
    if (!lines.length) return { rows: [], headers: [] };
    const headers = splitLine(lines[0], delimiter);
    const rows = lines.slice(1).map((line, idx) => {
      const cells = splitLine(line, delimiter);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
      obj.__row = cells;
      obj.__rowIndex = idx + 1;
      return obj;
    });
    return { rows, headers };
  }

  function splitLine(line, delim) {
    // Simple CSV-aware splitter (handles quoted fields)
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { out.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out.map((c) => c.trim());
  }

  function detectDelimiter(text) {
    const firstLine = (text.split(/\r\n|\n|\r/)[0] || '');
    const tabs = (firstLine.match(/\t/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const semis = (firstLine.match(/;/g) || []).length;
    if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
    if (semis > commas && semis > 0) return ';';
    return ',';
  }

  /** Validate rows against required fields + duplicate detection.
   *  @param rows       Array of row objects
   *  @param required   Array of header names that must be present and non-empty
   *  @param opts.fieldMap  Optional: { requiredHeader: rowFieldKey } to map headers to row keys
   *  @param opts.duplicateKey Optional: function(row) -> string for dedup; rows with same key counted as duplicate
   *  @param opts.enumFields   Optional: { fieldName: [allowed values] }
   *  @returns { valid: Array, errors: Array<{row, field, message}>, warnings: Array, duplicates: Array, stats: Object }
   */
  function validate(rows, required, opts) {
    opts = opts || {};
    const errors = [];
    const warnings = [];
    const duplicates = [];
    const valid = [];
    const seenKeys = new Map();

    rows.forEach((r, idx) => {
      let rowValid = true;
      required.forEach((field) => {
        const key = (opts.fieldMap && opts.fieldMap[field]) || field;
        const val = r[key];
        if (val == null || String(val).trim() === '') {
          errors.push({ row: idx + 2, field, message: `Missing required field: ${field}` });
          rowValid = false;
        }
      });

      if (opts.enumFields) {
        Object.entries(opts.enumFields).forEach(([field, allowed]) => {
          const key = (opts.fieldMap && opts.fieldMap[field]) || field;
          const val = r[key];
          if (val && !allowed.includes(String(val))) {
            warnings.push({ row: idx + 2, field, message: `Unknown value "${val}" for ${field}. Allowed: ${allowed.join(', ')}` });
          }
        });
      }

      if (opts.duplicateKey) {
        const k = opts.duplicateKey(r);
        if (k) {
          if (seenKeys.has(k)) {
            duplicates.push({ row: idx + 2, key: k, firstRow: seenKeys.get(k) });
            rowValid = false;
          } else {
            seenKeys.set(k, idx + 2);
          }
        }
      }

      if (rowValid) valid.push(r);
    });

    return {
      valid,
      errors,
      warnings,
      duplicates,
      stats: {
        total: rows.length,
        valid: valid.length,
        errors: errors.length,
        warnings: warnings.length,
        duplicates: duplicates.length,
      },
    };
  }

  return { readFile, parseText, validate, hasSheetJS, detectDelimiter };
})();
