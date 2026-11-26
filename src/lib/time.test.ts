import { describe, expect, it } from 'vitest';
import { layoutColumns, minutesToTime, timeToMinutes } from './time';

describe('time helpers', () => {
  it('round-trips HH:MM', () => {
    expect(timeToMinutes('09:45')).toBe(585);
    expect(minutesToTime(585)).toBe('09:45');
    expect(minutesToTime(24 * 60 + 30)).toBe('23:59');
  });
});

describe('layoutColumns', () => {
  const span = (item: string, start: number, end: number) => ({ item, start, end });

  it('keeps non-overlapping spans full width', () => {
    const out = layoutColumns([span('a', 60, 120), span('b', 120, 180)]);
    expect(out.map((p) => [p.item, p.col, p.totalCols])).toEqual([['a', 0, 1], ['b', 0, 1]]);
  });

  it('puts overlapping spans side by side', () => {
    const out = layoutColumns([span('a', 60, 180), span('b', 90, 120), span('c', 200, 260)]);
    const byItem = Object.fromEntries(out.map((p) => [p.item, [p.col, p.totalCols]]));
    expect(byItem).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] });
  });

  it('gives zero-length spans a visible slot', () => {
    const out = layoutColumns([span('a', 60, 60), span('b', 65, 90)]);
    expect(out.find((p) => p.item === 'b')?.col).toBe(1);
  });
});
