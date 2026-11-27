import { describe, expect, it } from 'vitest';
import { dateOnDrop, inScope, suggestQuadrant } from './eisenhower';
import type { Task } from '../types';

const base: Task = {
  id: 'x', title: 'x', is_completed: false, scheduled_date: '2026-11-26', timebox_start: null, timebox_end: null,
  eisenhower_quadrant: null, due_date: null, estimated_minutes: null, priority: null, label: null, notes: null,
  recurrence: null, completed_at: null, created_at: '', updated_at: '',
};
const q = (over: Partial<Task>) => suggestQuadrant({ ...base, ...over }, '2026-11-26');

describe('suggestQuadrant', () => {
  it('maps priority and due date to a quadrant', () => {
    expect(q({ priority: 'high', due_date: '2026-11-26' })).toBe('do_first');
    expect(q({ priority: 'medium', due_date: '2026-11-27' })).toBe('do_first');
    expect(q({ priority: 'high' })).toBe('schedule');
    expect(q({ priority: 'high', due_date: '2026-12-10' })).toBe('schedule');
    expect(q({ priority: 'low', due_date: '2026-11-20' })).toBe('delegate');
    expect(q({ priority: 'low' })).toBe('eliminate');
  });
  it('does not guess without information', () => {
    expect(q({})).toBe(null);
    expect(q({ due_date: '2026-12-10' })).toBe(null);
    expect(q({ due_date: '2026-11-26' })).toBe('do_first');
  });

  it('scopes tasks and keeps them visible when dropped', () => {
    // Thursday 2026-11-26, weeks start Monday 23rd
    const mon = { ...base, scheduled_date: '2026-11-23' };
    const next = { ...base, scheduled_date: '2026-12-01' };
    const dump = { ...base, scheduled_date: null };
    expect(inScope(mon, 'week', '2026-11-26', 1)).toBe(true);
    expect(inScope(next, 'week', '2026-11-26', 1)).toBe(false);
    expect(inScope(dump, 'all', '2026-11-26', 1)).toBe(true);
    expect(dateOnDrop(mon, 'week', '2026-11-26', 1)).toBe('2026-11-23');
    expect(dateOnDrop(dump, 'week', '2026-11-26', 1)).toBe('2026-11-26');
    expect(dateOnDrop(dump, 'all', '2026-11-26', 1)).toBe(null);
    expect(dateOnDrop(mon, 'today', '2026-11-26', 1)).toBe('2026-11-26');
  });
});
