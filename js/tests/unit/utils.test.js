/**
 * Unit tests for ZenUtils — formatting, dates, money, escape, IDs, etc.
 */
import { describe, it, expect } from 'vitest';

const U = window.ZenUtils;

describe('ZenUtils.esc — HTML escaping', () => {
  it('escapes the five dangerous characters', () => {
    expect(U.esc('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(U.esc("a'b&c")).toBe('a&#39;b&amp;c');
  });
  it('returns empty string for null / undefined', () => {
    expect(U.esc(null)).toBe('');
    expect(U.esc(undefined)).toBe('');
  });
  it('coerces non-strings to string', () => {
    expect(U.esc(123)).toBe('123');
    expect(U.esc(true)).toBe('true');
  });
});

describe('ZenUtils.uid — ID generation', () => {
  it('produces unique IDs across rapid calls', () => {
    const ids = new Set();
    for (let i = 0; i < 200; i++) ids.add(U.uid('emp'));
    expect(ids.size).toBe(200);
  });
  it('honors the prefix argument', () => {
    expect(U.uid('doc').startsWith('doc-')).toBe(true);
    expect(U.uid().startsWith('id-')).toBe(true);
  });
});

describe('ZenUtils.money — currency formatting', () => {
  it('formats a number with the EGP symbol in Arabic', () => {
    const out = U.money(5000, { lang: 'ar', currency: 'EGP' });
    expect(out).toContain('ج.م');
    expect(out).toContain('٥٬٠٠٠'); // Arabic-Indic digits in ar-EG locale
  });
  it('formats the same number with $ in English', () => {
    const out = U.money(1234.5, { lang: 'en', currency: 'USD' });
    expect(out).toContain('$');
    expect(out).toContain('1,234.5');
  });
  it('returns "0" formatted for null / undefined input', () => {
    // Note: in ar-EG locale, the digit "0" renders as Arabic-Indic "٠".
    // Match either form.
    expect(U.money(null, { lang: 'en' })).toMatch(/[0٠]/);
    expect(U.money(undefined, { lang: 'ar' })).toMatch(/[0٠]/);
  });
});

describe('ZenUtils.timeToMinutes / diffMinutes', () => {
  it('parses HH:MM into minutes', () => {
    expect(U.timeToMinutes('00:00')).toBe(0);
    expect(U.timeToMinutes('08:30')).toBe(510);
    expect(U.timeToMinutes('23:59')).toBe(1439);
  });
  it('returns null for invalid input', () => {
    expect(U.timeToMinutes('')).toBeNull();
    expect(U.timeToMinutes(null)).toBeNull();
    expect(U.timeToMinutes('noon')).toBeNull();
  });
  it('diffMinutes handles overnight shifts', () => {
    expect(U.diffMinutes('08:00', '17:00')).toBe(540); // 9h day
    expect(U.diffMinutes('22:00', '06:00')).toBe(480); // 8h overnight
    expect(U.diffMinutes('00:00', '00:00')).toBe(0);
  });
  it('diffMinutes returns 0 when either side is invalid', () => {
    expect(U.diffMinutes('', '17:00')).toBe(0);
    expect(U.diffMinutes('08:00', null)).toBe(0);
  });
});

describe('ZenUtils.date / time / dayName / monthName', () => {
  it('date formats an ISO string', () => {
    const out = U.date('2026-10-13', { lang: 'en' });
    expect(out).toContain('2026');
    expect(out).toContain('Oct');
  });
  it('date returns "—" for null / invalid', () => {
    expect(U.date(null)).toBe('—');
    expect(U.date('not-a-date')).toBe('—');
  });
  it('dayName returns localized names', () => {
    expect(U.dayName(0, 'ar')).toBe('الأحد');
    expect(U.dayName(0, 'en')).toBe('Sun');
    expect(U.dayName(5, 'ar')).toBe('الجمعة');
    expect(U.dayName(5, 'en')).toBe('Fri');
  });
  it('monthName returns localized names', () => {
    expect(U.monthName(0, 'ar')).toBe('يناير');
    expect(U.monthName(0, 'en')).toBe('Jan');
  });
  it('monthLabel formats YYYY-MM', () => {
    expect(U.monthLabel('2026-03', 'en')).toBe('Mar 2026');
    expect(U.monthLabel('2026-03', 'ar')).toContain('2026');
  });
});

describe('ZenUtils.initials / avatarColor', () => {
  it('builds initials from the first two name parts', () => {
    expect(U.initials('Ahmed Ali')).toBe('AA');
    expect(U.initials('سارة محمود إبراهيم')).toBe('سم');
    expect(U.initials('Single')).toBe('S');
    expect(U.initials('')).toBe('?');
  });
  it('avatarColor returns a stable c1..c8 variant', () => {
    const c1 = U.avatarColor('Ahmed');
    const c2 = U.avatarColor('Ahmed');
    expect(c1).toBe(c2); // stable
    expect(c1).toMatch(/^c[1-8]$/);
    const c3 = U.avatarColor('محمود');
    expect(c3).toMatch(/^c[1-8]$/);
  });
});

describe('ZenUtils.daysInclusive / addDays / today / currentMonth', () => {
  it('daysInclusive counts both endpoints', () => {
    expect(U.daysInclusive('2026-10-01', '2026-10-01')).toBe(1);
    expect(U.daysInclusive('2026-10-01', '2026-10-07')).toBe(7);
    expect(U.daysInclusive('2026-10-01', '2026-11-01')).toBe(32);
  });
  it('daysInclusive returns 0 for missing input', () => {
    expect(U.daysInclusive('', '2026-10-01')).toBe(0);
    expect(U.daysInclusive('2026-10-01', '')).toBe(0);
  });
  it('addDays advances the date correctly', () => {
    expect(U.addDays('2026-10-01', 5)).toBe('2026-10-06');
    expect(U.addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(U.addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('today and currentMonth return YYYY-MM-DD / YYYY-MM', () => {
    expect(U.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(U.currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('ZenUtils.csvEscape', () => {
  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(U.csvEscape('hello')).toBe('hello');
    expect(U.csvEscape('a,b')).toBe('"a,b"');
    expect(U.csvEscape('a"b')).toBe('"a""b"');
    expect(U.csvEscape('a\nb')).toBe('"a\nb"');
  });
  it('returns empty string for null / undefined', () => {
    expect(U.csvEscape(null)).toBe('');
    expect(U.csvEscape(undefined)).toBe('');
  });
});

describe('ZenUtils.clone / by', () => {
  it('clone deep-clones via JSON', () => {
    const a = { x: [1, 2, { y: 'z' }] };
    const b = U.clone(a);
    expect(b).toEqual(a);
    expect(b).not.toBe(a);
    expect(b.x).not.toBe(a.x);
    // Mutating b.x should not affect a.x
    b.x.push(3);
    expect(a.x.length).toBe(3); // a unchanged: [1, 2, {y:'z'}] = length 3
    expect(b.x.length).toBe(4); // b now has the extra element
  });
  it('by builds a comparator that sorts ascending or descending', () => {
    const arr = [{ n: 3 }, { n: 1 }, { n: 2 }];
    const asc = [...arr].sort(U.by('n', true));
    const desc = [...arr].sort(U.by('n', false));
    expect(asc.map((x) => x.n)).toEqual([1, 2, 3]);
    expect(desc.map((x) => x.n)).toEqual([3, 2, 1]);
  });
});

describe('ZenUtils.hasArabic', () => {
  it('detects Arabic characters', () => {
    expect(U.hasArabic('مرحبا')).toBe(true);
    expect(U.hasArabic('Hello مرحبا')).toBe(true);
    expect(U.hasArabic('Hello')).toBe(false);
    expect(U.hasArabic('')).toBe(false);
    expect(U.hasArabic(null)).toBe(false);
  });
});

describe('ZenUtils.debounce', () => {
  it('collapses rapid calls into a single trailing invocation', async () => {
    const fn = vi.fn();
    const debounced = U.debounce(fn, 30);
    debounced(); debounced(); debounced();
    expect(fn).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 60));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
