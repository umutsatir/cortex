import { addDays, format, parseISO } from 'date-fns';
import type { Recurrence } from '../types';

function step(rule: Recurrence, d: Date): Date {
  if (rule === 'weekly') return addDays(d, 7);
  let next = addDays(d, 1);
  if (rule === 'weekdays') while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
  return next;
}

/**
 * The date of the next occurrence after `base` (`YYYY-MM-DD`) that is not in the past:
 * completing today's daily task gives tomorrow, completing an overdue one gives today.
 */
export function nextOccurrence(rule: Recurrence, base: string, today: string): string {
  let d = step(rule, parseISO(base));
  while (format(d, 'yyyy-MM-dd') < today) d = step(rule, d);
  return format(d, 'yyyy-MM-dd');
}
