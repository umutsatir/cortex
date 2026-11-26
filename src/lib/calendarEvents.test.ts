// Runs with TZ=Europe/Berlin (see the "test" script): UTC+1 in winter, UTC+2 from 29 March 2026.
import { describe, expect, it } from 'vitest';
import { eventsForDay, monthBounds, shiftMonth, sliceForDay, type CalEvent } from './calendarEvents';

const timed = (id: string, start: string, end: string): CalEvent => ({
  id, calendarId: 'c', title: id, start, end, allDay: false, startDate: null, endDate: null,
});
const allDay = (id: string, startDate: string, endDate: string): CalEvent => ({
  id, calendarId: 'c', title: id, start: '', end: '', allDay: true, startDate, endDate,
});

describe('sliceForDay', () => {
  it('converts UTC to local time, honouring DST', () => {
    const winter = sliceForDay(timed('w', '2026-03-25T09:00:00Z', '2026-03-25T10:00:00Z'), 'a', '2026-03-25');
    const summer = sliceForDay(timed('s', '2026-04-01T08:00:00Z', '2026-04-01T09:00:00Z'), 'a', '2026-04-01');
    expect(winter?.startMin).toBe(10 * 60);
    expect(summer?.startMin).toBe(10 * 60);
  });

  it('splits events that cross midnight', () => {
    const ev = timed('late', '2026-01-10T21:00:00Z', '2026-01-11T01:00:00Z'); // 22:00 → 02:00 local
    const first = sliceForDay(ev, 'a', '2026-01-10');
    const second = sliceForDay(ev, 'a', '2026-01-11');
    expect(first).toMatchObject({ startMin: 22 * 60, endMin: 1440, continuesAfter: true });
    expect(second).toMatchObject({ startMin: 0, endMin: 2 * 60, continuesBefore: true });
    expect(sliceForDay(ev, 'a', '2026-01-12')).toBeNull();
  });

  it('keeps floating times as local wall-clock time', () => {
    expect(sliceForDay(timed('f', '2026-03-10T09:00:00', '2026-03-10T09:30:00'), 'a', '2026-03-10')?.startMin).toBe(9 * 60);
  });

  it('treats all-day end dates as exclusive', () => {
    const ev = allDay('h', '2026-04-23', '2026-04-25');
    expect(sliceForDay(ev, 'a', '2026-04-22')).toBeNull();
    expect(sliceForDay(ev, 'a', '2026-04-23')?.allDay).toBe(true);
    expect(sliceForDay(ev, 'a', '2026-04-24')?.continuesBefore).toBe(true);
    expect(sliceForDay(ev, 'a', '2026-04-25')).toBeNull();
  });

  it('an event ending exactly at midnight does not leak into the next day', () => {
    const ev = timed('e', '2026-01-10T22:00:00Z', '2026-01-10T23:00:00Z'); // 23:00 → 00:00 local
    expect(sliceForDay(ev, 'a', '2026-01-10')?.endMin).toBe(1440);
    expect(sliceForDay(ev, 'a', '2026-01-11')).toBeNull();
  });
});

describe('eventsForDay', () => {
  it('merges accounts, dedupes and sorts', () => {
    const a = timed('x', '2026-01-10T10:00:00Z', '2026-01-10T11:00:00Z');
    const b = timed('y', '2026-01-10T08:00:00Z', '2026-01-10T09:00:00Z');
    const out = eventsForDay([{ accountId: 'g', events: [a, a] }, { accountId: 'p', events: [b] }], '2026-01-10');
    expect(out.map((e) => e.title)).toEqual(['y', 'x']);
  });
});

describe('month helpers', () => {
  it('uses local month boundaries', () => {
    expect(monthBounds('2026-01')).toEqual({ timeMin: '2025-12-31T23:00:00.000Z', timeMax: '2026-01-31T23:00:00.000Z' });
  });
  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
