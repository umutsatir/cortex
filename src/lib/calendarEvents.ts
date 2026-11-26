import { addDays, format, parseISO } from 'date-fns';

/** Event as returned by the Rust side (`events.rs`). */
export interface CalEvent {
  id: string;
  calendarId: string;
  title: string;
  /** RFC 3339: UTC (`…Z`) or naive local time for floating events. Empty when all-day. */
  start: string;
  end: string;
  allDay: boolean;
  /** `YYYY-MM-DD`, end exclusive. Only for all-day events. */
  startDate: string | null;
  endDate: string | null;
}

/** The slice of an event that falls on one local day. */
export interface DayEvent {
  key: string;
  accountId: string;
  calendarId: string;
  title: string;
  allDay: boolean;
  startMin: number; // minutes since local midnight
  endMin: number;   // 1440 when it runs past midnight
  continuesBefore: boolean;
  continuesAfter: boolean;
}

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/**
 * Returns the part of `ev` that falls on `date` (`YYYY-MM-DD`, local), or null.
 * Timed events are converted to local time here, so DST and zones come from the OS.
 */
export function sliceForDay(ev: CalEvent, accountId: string, date: string): DayEvent | null {
  const base = { key: `${accountId}|${ev.calendarId}|${ev.id}`, accountId, calendarId: ev.calendarId, title: ev.title };

  if (ev.allDay) {
    const s = ev.startDate ?? '';
    const e = ev.endDate && ev.endDate > s ? ev.endDate : format(addDays(parseISO(s), 1), 'yyyy-MM-dd');
    if (!(s <= date && date < e)) return null;
    return { ...base, allDay: true, startMin: 0, endMin: 1440, continuesBefore: s < date, continuesAfter: format(addDays(parseISO(date), 1), 'yyyy-MM-dd') < e };
  }

  const start = parseISO(ev.start);
  const end = parseISO(ev.end || ev.start);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const dayStart = parseISO(date);
  const dayEnd = addDays(dayStart, 1);

  const overlaps = start < dayEnd && (end > dayStart || (end.getTime() === start.getTime() && start >= dayStart));
  if (!overlaps) return null;

  const continuesBefore = start < dayStart;
  const continuesAfter = end > dayEnd;
  return {
    ...base,
    allDay: false,
    startMin: continuesBefore ? 0 : minutesOf(start),
    endMin: end >= dayEnd ? 1440 : minutesOf(end),
    continuesBefore,
    continuesAfter,
  };
}

/** All event slices for one day, timed ones sorted by start. */
export function eventsForDay(sources: { accountId: string; events: CalEvent[] }[], date: string): DayEvent[] {
  const seen = new Set<string>();
  const out: DayEvent[] = [];
  for (const { accountId, events } of sources) {
    for (const ev of events) {
      const slice = sliceForDay(ev, accountId, date);
      if (slice && !seen.has(slice.key)) {
        seen.add(slice.key);
        out.push(slice);
      }
    }
  }
  return out.sort((a, b) => a.startMin - b.startMin || a.title.localeCompare(b.title));
}

/** `YYYY-MM` → [local start of month, local start of next month) as UTC RFC 3339. */
export function monthBounds(yearMonth: string): { timeMin: string; timeMax: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  return {
    timeMin: new Date(y, m - 1, 1).toISOString(),
    timeMax: new Date(y, m, 1).toISOString(),
  };
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return format(new Date(y, m - 1 + delta, 1), 'yyyy-MM');
}
