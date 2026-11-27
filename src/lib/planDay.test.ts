import { describe, expect, it } from 'vitest';
import { planDay } from './planDay';
import type { Task } from '../types';

let n = 0;
const task = (over: Partial<Task>): Task => ({
  id: over.id ?? `t${++n}`, title: 'x', is_completed: false, scheduled_date: '2026-11-26',
  timebox_start: null, timebox_end: null, eisenhower_quadrant: null, due_date: null,
  estimated_minutes: null, priority: null, label: null, notes: null, recurrence: null, completed_at: null,
  created_at: `2026-11-26T00:00:0${n % 10}Z`, updated_at: '', ...over,
});
const h = (x: number) => x * 60;

describe('planDay', () => {
  it('fills gaps around busy ranges, most important first', () => {
    const r = planDay({
      tasks: [task({ id: 'low', estimated_minutes: 60 }), task({ id: 'hi', estimated_minutes: 45, priority: 'high' })],
      busy: [[h(9), h(10)]],
      from: h(9), to: h(18),
    });
    expect(r.placed).toEqual([
      { id: 'hi', start: h(10), end: h(10) + 45 },
      { id: 'low', start: h(10) + 45, end: h(11) + 45 },
    ]);
    expect(r.unplaced).toEqual([]);
  });

  it('uses a gap only when the task fits and snaps to 15 minutes', () => {
    const r = planDay({
      tasks: [task({ id: 'a', estimated_minutes: 60 })],
      busy: [[h(9), h(9) + 10], [h(9) + 50, h(11)]],
      from: h(9), to: h(18),
    });
    expect(r.placed).toEqual([{ id: 'a', start: h(11), end: h(12) }]);
  });

  it('defaults to 30 minutes and reports what does not fit', () => {
    const r = planDay({
      tasks: [task({ id: 'a' }), task({ id: 'b', estimated_minutes: 120 })],
      busy: [],
      from: h(17), to: h(18),
    });
    expect(r.placed).toEqual([{ id: 'a', start: h(17), end: h(17) + 30 }]);
    expect(r.unplaced).toEqual(['b']);
  });

  it('keeps a break between tasks and around events', () => {
    const r = planDay({
      tasks: [task({ id: 'a', estimated_minutes: 60, priority: 'high' }), task({ id: 'b', estimated_minutes: 30 })],
      busy: [[h(11), h(12)]],
      from: h(9), to: h(18), gap: 30,
    });
    // a 9–10, break, b would be 10:30–11:00 but needs 30 min before the 11:00 event → after it.
    expect(r.placed).toEqual([
      { id: 'a', start: h(9), end: h(10) },
      { id: 'b', start: h(12) + 30, end: h(13) },
    ]);
  });

  it('opens the day with a short warm-up task', () => {
    const r = planDay({
      tasks: [
        task({ id: 'report', estimated_minutes: 180, priority: 'high' }),
        task({ id: 'email', estimated_minutes: 30, priority: 'medium' }),
        task({ id: 'call', estimated_minutes: 30, priority: 'low' }),
      ],
      busy: [],
      from: h(9), to: h(18), gap: 30, warmUp: true,
    });
    expect(r.placed).toEqual([
      { id: 'email', start: h(9), end: h(9) + 30 },
      { id: 'report', start: h(10), end: h(13) },
      { id: 'call', start: h(13) + 30, end: h(14) },
    ]);
  });

  it('puts the shorter task first within the same priority', () => {
    const r = planDay({
      tasks: [
        task({ id: 'long', estimated_minutes: 120, priority: 'high' }),
        task({ id: 'short', estimated_minutes: 30, priority: 'high' }),
        task({ id: 'low', estimated_minutes: 15, priority: 'low' }),
      ],
      busy: [],
      from: h(9), to: h(18),
    });
    expect(r.placed.map((p) => p.id)).toEqual(['short', 'long', 'low']);
  });
});
