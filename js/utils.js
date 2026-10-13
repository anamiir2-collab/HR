/* ============================================================
   ZenHR — Utilities
   ============================================================ */
window.ZenUtils = (function () {
  'use strict';

  /** Escape HTML */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Generate stable IDs */
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /** Format money according to locale */
  function money(n, opts) {
    opts = opts || {};
    const lang = opts.lang || (window.ZenI18n && ZenI18n.lang) || 'ar';
    const currency = opts.currency || (window.ZenStore && ZenStore.settings && ZenStore.settings.currency) || 'EGP';
    const num = Number(n || 0);
    const formatted = num.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const symbols = { EGP: 'ج.م', SAR: 'ر.س', USD: '$', AED: 'د.إ' };
    const sym = symbols[currency] || currency;
    return lang === 'ar' ? formatted + ' ' + sym : sym + ' ' + formatted;
  }

  /** Format number */
  function num(n, lang) {
    lang = lang || (window.ZenI18n && ZenI18n.lang) || 'ar';
    return Number(n || 0).toLocaleNumber ? Number(n).toLocaleNumber(lang) : Number(n || 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  }

  /** Format date */
  function date(d, opts) {
    if (!d) return '—';
    opts = opts || {};
    const lang = opts.lang || (window.ZenI18n && ZenI18n.lang) || 'ar';
    try {
      const dt = (d instanceof Date) ? d : new Date(d);
      if (isNaN(dt.getTime())) return '—';
      return dt.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        ...opts,
      });
    } catch (e) { return String(d); }
  }

  /** Format time */
  function time(d) {
    if (!d) return '—';
    try {
      const dt = (d instanceof Date) ? d : new Date(d);
      if (isNaN(dt.getTime())) return '—';
      return dt.toLocaleTimeString((window.ZenI18n && ZenI18n.lang) || 'ar', {
        hour: '2-digit', minute: '2-digit',
      });
    } catch (e) { return String(d); }
  }

  /** Parse "HH:MM" to minutes */
  function timeToMinutes(t) {
    if (!t || typeof t !== 'string') return null;
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  /** Minutes between two "HH:MM" times; supports overnight */
  function diffMinutes(start, end) {
    const s = timeToMinutes(start);
    let e = timeToMinutes(end);
    if (s == null || e == null) return 0;
    if (e < s) e += 24 * 60; // overnight
    return e - s;
  }

  /** Add days to ISO date */
  function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /** Today as YYYY-MM-DD */
  function today() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  /** Current month YYYY-MM */
  function currentMonth() {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  }

  /** Days between two YYYY-MM-DD dates (inclusive) */
  function daysInclusive(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) return 0;
    return Math.floor((e - s) / 86400000) + 1;
  }

  /** Build avatar initials */
  function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0] || '').join('').toUpperCase();
  }

  /** Avatar color variant based on name */
  function avatarColor(name) {
    const colors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return colors[Math.abs(h) % colors.length];
  }

  /** Debounce */
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms || 250);
    };
  }

  /** Localized day name */
  function dayName(idx, lang) {
    lang = lang || (window.ZenI18n && ZenI18n.lang) || 'ar';
    const ar = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (lang === 'ar' ? ar : en)[idx];
  }

  /** Localized month name */
  function monthName(idx, lang) {
    lang = lang || (window.ZenI18n && ZenI18n.lang) || 'ar';
    const ar = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (lang === 'ar' ? ar : en)[idx];
  }

  /** Format month YYYY-MM to localized label */
  function monthLabel(ym, lang) {
    if (!ym) return '—';
    const [y, m] = ym.split('-').map(Number);
    return (monthName(m - 1, lang) || '') + ' ' + y;
  }

  /** Seeded RNG (mulberry32) for deterministic demo data */
  function seededRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Pick random element with rng */
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  /** Random int in [min, max] using rng */
  function randInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  /** Deep clone via JSON */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /** Sort comparator */
  function by(field, asc) {
    const dir = asc ? 1 : -1;
    return (a, b) => {
      const av = (typeof a === 'object' && a ? a[field] : a);
      const bv = (typeof b === 'object' && b ? b[field] : b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    };
  }

  /** Detect Arabic characters */
  function hasArabic(s) {
    return /[\u0600-\u06FF]/.test(String(s || ''));
  }

  /** CSV escape */
  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** Download a blob */
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Print a DOM element by ID */
  function printElement(html, title) {
    const w = window.open('', '_blank');
    if (!w) return;
    const lang = (window.ZenI18n && ZenI18n.lang) || 'ar';
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const fontFamily = lang === 'ar' ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', sans-serif";
    const companyName = (window.ZenStore && ZenStore.settings && (lang === 'ar' ? ZenStore.settings.companyName : ZenStore.settings.companyNameEn)) || 'AGRIMASTERS HR';
    w.document.write(`<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title || 'AGRIMASTERS HR Report')}</title>
      <style>
        body { font-family: ${fontFamily}; padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.5; }
        h1, h2, h3 { color: #14532d; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-size: 12px; }
        th { background: #f0fdf4; font-weight: 700; color: #14532d; }
        tr:nth-child(even) td { background: #fafbfa; }
        .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #14532d; padding-bottom: 12px; margin-bottom: 20px; }
        .brand { font-size: 22px; font-weight: 800; color: #14532d; }
        .brand-sub { font-size: 11px; color: #475569; font-weight: 500; }
        .meta { color: #64748b; font-size: 11px; text-align: ${dir === 'rtl' ? 'left' : 'right'}; }
        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>
      <div class="head">
        <div>
          <div class="brand">AGRIMASTERS HR</div>
          <div class="brand-sub">${esc(companyName)} · ${lang === 'ar' ? 'نظام إدارة الموارد البشرية' : 'Human Resources Management System'}</div>
        </div>
        <div class="meta">${esc(title || 'Report')}<br>${date(new Date())}</div>
      </div>
      ${html}
      <div class="footer">AGRIMASTERS HR · ${esc(companyName)} · ${date(new Date())}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 350);
  }

  return {
    esc, uid, money, num, date, time, timeToMinutes, diffMinutes,
    addDays, today, currentMonth, daysInclusive, initials, avatarColor,
    debounce, dayName, monthName, monthLabel, seededRng, pick, randInt,
    clone, by, hasArabic, csvEscape, download, printElement,
  };
})();
