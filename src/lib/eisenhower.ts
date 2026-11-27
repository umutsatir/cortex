import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import type { EisenhowerQuadrant, Task } from '../types';

/**
 * Where a task would sit in the Eisenhower matrix, from what we know about it:
 * important = high or medium priority, urgent = due by tomorrow (or overdue).
 * Without a priority and without a due date we don't guess: missing data isn't "unimportant".
 */
export function suggestQuadrant(task: Task, today: string): EisenhowerQuadrant | null {
  const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
  const urgent = task.due_date !== null && task.due_date <= tomorrow;
  if (task.priority === null) return urgent ? 'do_first' : null;
  const important = task.priority === 'high' || task.priority === 'medium';
  if (important) return urgent ? 'do_first' : 'schedule';
  return urgent ? 'delegate' : 'eliminate';
}

export type MatrixScope = 'today' | 'week' | 'all';

/** First and last day (`YYYY-MM-DD`) of the week containing `today`. */
export function weekRange(today: string, weekStartsOn: 0 | 1): [string, string] {
  const start = startOfWeek(parseISO(today), { weekStartsOn });
  return [format(start, 'yyyy-MM-dd'), format(addDays(start, 6), 'yyyy-MM-dd')];
}

/** The tasks the matrix shows: today's, this week's, or every open task (brain dump included). */
export function inScope(task: Task, scope: MatrixScope, today: string, weekStartsOn: 0 | 1): boolean {
  if (scope === 'today') return task.scheduled_date === today;
  if (scope === 'week') {
    const [from, to] = weekRange(today, weekStartsOn);
    return task.scheduled_date !== null && task.scheduled_date >= from && task.scheduled_date <= to;
  }
  return !task.is_completed;
}

/**
 * The date a task gets when it's dropped on the matrix, so it stays visible there:
 * Today pulls it to today, Week only when it isn't already this week, All never moves it.
 */
export function dateOnDrop(task: Task, scope: MatrixScope, today: string, weekStartsOn: 0 | 1): string | null {
  if (scope === 'all') return task.scheduled_date;
  if (scope === 'today') return today;
  return inScope(task, 'week', today, weekStartsOn) ? task.scheduled_date : today;
}
