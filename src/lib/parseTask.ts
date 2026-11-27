// Natural-language quick entry: "Call Ali tomorrow 14:00 45m #work !high every week".
// English and Turkish keywords are both understood regardless of the UI language.
import { addDays, addMonths, format } from 'date-fns';
import type { Priority, Recurrence } from '../types';

export type TokenKind = 'date' | 'time' | 'duration' | 'label' | 'priority' | 'repeat';

export interface ParsedToken {
  kind: TokenKind;
  text: string;
  /** Position in the original input, end exclusive. */
  start: number;
  end: number;
}

export interface ParsedTask {
  title: string;
  date: string | null;      // YYYY-MM-DD
  time: string | null;      // HH:MM
  minutes: number | null;
  labelName: string | null;
  priority: Priority | null;
  recurrence: Recurrence | null;
  tokens: ParsedToken[];
}

export interface ParseOptions {
  now?: Date;
  /** `MM/dd` instead of `dd/MM` for numeric dates. */
  monthFirst?: boolean;
}

// Word boundaries that also work for Turkish letters (JS `\b` doesn't).
const B = '(^|\\s)';
const E = '(?=\\s|$)';

const WEEKDAYS: [RegExp, number][] = [
  [/^(monday|mon|pazartesi)$/i, 1],
  [/^(tuesday|tues|tue|salı|sali)$/i, 2],
  [/^(wednesday|wed|çarşamba|carsamba)$/i, 3],
  [/^(thursday|thurs|thu|perşembe|persembe)$/i, 4],
  [/^(friday|fri|cuma)$/i, 5],
  [/^(saturday|cumartesi)$/i, 6],
  [/^(sunday|pazar)$/i, 0],
];
// Longest names first so "cumartesi" isn't read as "cuma".
const WEEKDAY_WORDS =
  'cumartesi|pazartesi|wednesday|thursday|saturday|çarşamba|carsamba|perşembe|persembe|tuesday|monday|friday|sunday|thurs|tues|pazar|cuma|salı|sali|mon|tue|wed|thu|fri';

const MONTHS: [RegExp, number][] = [
  [/^(jan|january|ocak|oca)$/i, 1], [/^(feb|february|şubat|subat|şub)$/i, 2], [/^(mar|march|mart)$/i, 3],
  [/^(apr|april|nisan|nis)$/i, 4], [/^(may|mayıs|mayis)$/i, 5], [/^(jun|june|haziran|haz)$/i, 6],
  [/^(jul|july|temmuz|tem)$/i, 7], [/^(aug|august|ağustos|agustos|ağu)$/i, 8], [/^(sep|sept|september|eylül|eylul|eyl)$/i, 9],
  [/^(oct|october|ekim|eki)$/i, 10], [/^(nov|november|kasım|kasim|kas)$/i, 11], [/^(dec|december|aralık|aralik|ara)$/i, 12],
];
const MONTH_WORDS =
  'january|february|march|april|june|july|august|september|october|november|december|ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik|jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const SMALL_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  bir: 1, iki: 2, üç: 3, uc: 3, dört: 4, dort: 4, beş: 5, bes: 5,
};
const NUMBER = '(\\d{1,3}|an?|one|two|three|four|five|bir|iki|üç|uc|dört|dort|beş|bes)';
const toNumber = (w: string) => SMALL_NUMBERS[w.toLocaleLowerCase('tr')] ?? Number(w);

/** `n` days / weeks / months from now. */
function shift(now: Date, n: number, unit: string): string | null {
  if (!n || n > 400) return null;
  const u = unit.toLocaleLowerCase('tr');
  if (/^(day|gün|gun)/.test(u)) return ymd(addDays(now, n));
  if (/^(week|hafta)/.test(u)) return ymd(addDays(now, 7 * n));
  if (/^(month|ay)/.test(u)) return ymd(addMonths(now, n));
  return null;
}

/** That weekday in the coming week (weeks start on Monday). */
function weekdayNextWeek(now: Date, day: number): string {
  const nextMonday = addDays(now, ((8 - now.getDay()) % 7) || 7);
  return ymd(addDays(nextMonday, (day + 6) % 7));
}
const pad = (n: number) => String(n).padStart(2, '0');

function weekdayNum(word: string): number | null {
  return WEEKDAYS.find(([re]) => re.test(word))?.[1] ?? null;
}
function monthNum(word: string): number | null {
  return MONTHS.find(([re]) => re.test(word))?.[1] ?? null;
}

/** Same weekday counts as today. */
function nextWeekday(now: Date, day: number): string {
  return ymd(addDays(now, (day - now.getDay() + 7) % 7));
}

/** A day/month without a year: this year, or next year once it has passed. */
function dayMonth(now: Date, day: number, month: number, year?: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let y = year ?? now.getFullYear();
  if (y < 100) y += 2000;
  const d = new Date(y, month - 1, day);
  if (d.getMonth() !== month - 1) return null; // 31.02
  if (year === undefined && ymd(d) < ymd(now)) d.setFullYear(y + 1);
  return ymd(d);
}

export function parseTask(input: string, opts: ParseOptions = {}): ParsedTask {
  const now = opts.now ?? new Date();
  const out: ParsedTask = {
    title: '', date: null, time: null, minutes: null, labelName: null, priority: null, recurrence: null, tokens: [],
  };
  let s = ` ${input} `;

  /**
   * Removes one match of `pattern` (wrapped in word boundaries) once `fn` accepts its groups.
   * The last match wins: "Pazar alışverişi pazartesi" is about Monday, keywords go at the end.
   */
  const take = (pattern: string, kind: TokenKind, fn: (m: RegExpMatchArray) => boolean | void) => {
    const matches = [...s.matchAll(new RegExp(B + pattern + E, 'gi'))];
    for (const m of matches.reverse()) {
      if (m.index === undefined || fn(m) === false) continue;
      // Blank the match out instead of cutting it, so positions keep lining up with the input.
      const start = m.index + m[1].length;
      const end = m.index + m[0].length;
      out.tokens.push({ kind, text: m[0].slice(m[1].length), start: start - 1, end: end - 1 });
      s = s.slice(0, start) + ' '.repeat(end - start) + s.slice(end);
      return;
    }
  };

  // Repeat — "every monday" also sets the first date.
  take(`(?:every|her)\\s+(${WEEKDAY_WORDS})`, 'repeat', (m) => {
    const wd = weekdayNum(m[2]);
    if (wd === null) return false;
    out.recurrence = 'weekly';
    out.date = nextWeekday(now, wd);
  });
  if (!out.recurrence) {
    take('(every\\s+weekday|weekdays|hafta\\s*içi(?:\\s+her\\s+gün)?|hafta\\s*ici)', 'repeat', () => { out.recurrence = 'weekdays'; });
  }
  if (!out.recurrence) {
    take('(every\\s*day|daily|her\\s*gün|her\\s*gun)', 'repeat', () => { out.recurrence = 'daily'; });
  }
  if (!out.recurrence) {
    take('(every\\s+week|weekly|her\\s+hafta|haftalık|haftalik)', 'repeat', () => { out.recurrence = 'weekly'; });
  }

  // Duration first, so "1.5 saat" isn't read as the 1st of May. Duration: 1h, 1h30m, 1.5h, 90m, 45dk, 2 saat
  take('(\\d+(?:[.,]\\d+)?)\\s?(?:h|hr|hrs|hours?|sa|saat)(?:\\s?(\\d{1,2})\\s?(?:m|min|mins|dk)?)?', 'duration', (m) => {
    const total = Math.round(parseFloat(m[2].replace(',', '.')) * 60) + Number(m[3] ?? 0);
    if (!total || total > 24 * 60) return false;
    out.minutes = total;
  });
  if (out.minutes === null) {
    take('(\\d+)\\s?(?:m|min|mins|minutes?|dk|dakika)', 'duration', (m) => {
      const total = Number(m[2]);
      if (!total || total > 24 * 60) return false;
      out.minutes = total;
    });
  }

  // Time with am/pm or a part of the day goes before dates, so "10.11pm" isn't the 10th of November.
  const setTime = (h: number, min: number) => {
    if (h > 23 || min > 59) return false;
    out.time = `${pad(h)}:${pad(min)}`;
  };
  // 10pm, 10:30pm, 10.30 pm, 10 p.m.
  take('(?:at\\s+|saat\\s+|@)?(\\d{1,2})(?:[:.](\\d{2}))?\\s?([ap])\\.?m\\.?', 'time', (m) => {
    let h = Number(m[2]);
    if (h < 1 || h > 12) return false;
    const pm = m[4].toLowerCase() === 'p';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return setTime(h, Number(m[3] ?? 0));
  });
  // sabah 9, öğlen 1, akşam 8, gece 11:30, öğleden sonra 3
  if (!out.time) {
    take('(sabah|öğle(?:n|den\\s+sonra)?|ogle(?:n|den\\s+sonra)?|akşam|aksam|gece)\\s+(?:saat\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?', 'time', (m) => {
      let h = Number(m[3]);
      const part = m[2].toLocaleLowerCase('tr');
      if (h > 12) return setTime(h, Number(m[4] ?? 0));
      const noon = part.startsWith('öğle') || part.startsWith('ogle');
      const afternoon = /akşam|aksam|sonra/.test(part) || (noon && h < 6);
      if (afternoon && h < 12) h += 12;
      if (part === 'gece' && h >= 7 && h < 12) h += 12;
      if (part === 'gece' && h === 12) h = 0;
      return setTime(h, Number(m[4] ?? 0));
    });
  }

  // Date
  // Relative: "in 3 days", "3 days later", "3 gün sonra", "2 hafta sonra", "in a month"
  take(`in\\s+${NUMBER}\\s+(days?|weeks?|months?)`, 'date', (m) => {
    const d = shift(now, toNumber(m[2]), m[3]);
    if (!d) return false;
    out.date = d;
  });
  if (!out.date) {
    take(`${NUMBER}\\s+(days?|weeks?|months?|gün|gun|hafta|ay)\\s+(?:later|from\\s+now|sonra)`, 'date', (m) => {
      const d = shift(now, toNumber(m[2]), m[3]);
      if (!d) return false;
      out.date = d;
    });
  }
  // "next friday", "gelecek cuma", "haftaya salı"
  if (!out.date) {
    take(`(?:next|gelecek|haftaya|önümüzdeki|onumuzdeki)\\s+(${WEEKDAY_WORDS})`, 'date', (m) => {
      const wd = weekdayNum(m[2]);
      if (wd === null) return false;
      out.date = weekdayNextWeek(now, wd);
    });
  }
  // "next week" / "haftaya": a week from today; "next month" / "gelecek ay": a month from today
  if (!out.date) {
    take('(next\\s+week|haftaya(?:\\s+bugün)?|gelecek\\s+hafta|önümüzdeki\\s+hafta|onumuzdeki\\s+hafta)', 'date', () => { out.date = ymd(addDays(now, 7)); });
  }
  if (!out.date) {
    take('(next\\s+month|gelecek\\s+ay|önümüzdeki\\s+ay|onumuzdeki\\s+ay)', 'date', () => { out.date = ymd(addMonths(now, 1)); });
  }
  if (!out.date) {
    take('(day\\s+after\\s+tomorrow|öbür\\s*gün|obur\\s*gun|ertesi\\s+gün)', 'date', () => { out.date = ymd(addDays(now, 2)); });
  }
  if (!out.date) take('(today|bugün|bugun)', 'date', () => { out.date = ymd(now); });
  if (!out.date) take('(tomorrow|tmrw|tmr|yarın|yarin)', 'date', () => { out.date = ymd(addDays(now, 1)); });
  if (!out.date) {
    take(`(${WEEKDAY_WORDS})`, 'date', (m) => {
      const wd = weekdayNum(m[2]);
      if (wd === null) return false;
      out.date = nextWeekday(now, wd);
    });
  }
  if (!out.date) {
    // "3 dec", "3 aralık"
    take(`(\\d{1,2})\\s+(${MONTH_WORDS})`, 'date', (m) => {
      const mo = monthNum(m[3]);
      const d = mo ? dayMonth(now, Number(m[2]), mo) : null;
      if (!d) return false;
      out.date = d;
    });
  }
  if (!out.date) {
    // "dec 3"
    take(`(${MONTH_WORDS})\\s+(\\d{1,2})`, 'date', (m) => {
      const mo = monthNum(m[2]);
      const d = mo ? dayMonth(now, Number(m[3]), mo) : null;
      if (!d) return false;
      out.date = d;
    });
  }
  if (!out.date) {
    // 12/05, 12.05, 12/05/2027 — a dotted pair that can't be a date may still be a time (14.30).
    take('(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?', 'date', (m) => {
      const a = Number(m[2]);
      const b = Number(m[3]);
      const [day, month] = opts.monthFirst && m[0].includes('/') ? [b, a] : [a, b];
      const d = dayMonth(now, day, month, m[4] ? Number(m[4]) : undefined);
      if (!d) return false;
      out.date = d;
    });
  }

  // Other times
  if (!out.time) take('(?:at\\s+|saat\\s+|@)?(\\d{1,2})[:.](\\d{2})', 'time', (m) => setTime(Number(m[2]), Number(m[3])));
  if (!out.time) {
    // "at 3" / "saat 3": a bare hour before 8 means the afternoon.
    take('(?:at|saat)\\s+(\\d{1,2})', 'time', (m) => {
      const h = Number(m[2]);
      return setTime(h >= 1 && h < 8 ? h + 12 : h, 0);
    });
  }

  // Priority
  take('(p1|!high|!h|!1|!!!|!yüksek|!yuksek|!acil)', 'priority', () => { out.priority = 'high'; });
  if (!out.priority) take('(p2|!medium|!med|!m|!2|!!|!orta)', 'priority', () => { out.priority = 'medium'; });
  if (!out.priority) take('(p3|!low|!l|!3|!düşük|!dusuk)', 'priority', () => { out.priority = 'low'; });

  // Label
  take('#([^\\s#]+)', 'label', (m) => { out.labelName = m[2]; });

  out.title = s.replace(/\s+/g, ' ').trim();
  if (!out.title) {
    // Everything looked like a keyword: keep the text as the title instead.
    return { ...out, title: input.trim(), date: null, time: null, minutes: null, labelName: null, priority: null, recurrence: null, tokens: [] };
  }
  return out;
}
