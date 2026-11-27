import type { Task } from '../types';
import { SLOT_MIN } from './time';

export const DEFAULT_TASK_MINUTES = 30;
/** Longest task that counts as a warm-up. */
export const WARM_UP_MAX_MINUTES = 30;

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const QUADRANT_RANK: Record<string, number> = { do_first: 0, schedule: 1, delegate: 2, eliminate: 3 };

export interface PlanInput {
  /** Unscheduled tasks to place. */
  tasks: Task[];
  /** Busy [start, end) ranges in minutes since midnight: events and already timeboxed tasks. */
  busy: [number, number][];
  /** Window to fill, minutes since midnight. */
  from: number;
  to: number;
  /** Free minutes kept between a placed task and anything next to it. */
  gap?: number;
  /** Start the day with one short task before the most important one. */
  warmUp?: boolean;
}

export interface PlanResult {
  placed: { id: string; start: number; end: number }[];
  unplaced: string[];
}

const taskLength = (t: Task) => Math.max(SLOT_MIN, t.estimated_minutes ?? DEFAULT_TASK_MINUTES);

/**
 * Priority first; within the same priority the shorter task goes first, so more work
 * gets done early. Then Eisenhower quadrant, then the order they were added.
 */
export function planOrder(a: Task, b: Task): number {
  return (PRIORITY_RANK[a.priority ?? ''] ?? 3) - (PRIORITY_RANK[b.priority ?? ''] ?? 3)
    || taskLength(a) - taskLength(b)
    || (QUADRANT_RANK[a.eisenhower_quadrant ?? ''] ?? 4) - (QUADRANT_RANK[b.eisenhower_quadrant ?? ''] ?? 4)
    || a.created_at.localeCompare(b.created_at);
}

const ceilSlot = (m: number) => Math.ceil(m / SLOT_MIN) * SLOT_MIN;

/**
 * Puts each task into the earliest free gap that fits it (on the 15-minute grid), with
 * `gap` minutes of breathing room around it, most important task first (see `placementOrder`). Tasks that fit
 * nowhere are returned in `unplaced`.
 */
/**
 * Placement order. With `warmUp`, the most important short task goes first, so the day
 * opens with a quick win and the big task follows (delayed by one short task at most).
 */
export function placementOrder(tasks: Task[], warmUp: boolean): Task[] {
  const ordered = [...tasks].sort(planOrder);
  if (!warmUp) return ordered;
  const i = ordered.findIndex((t) => taskLength(t) <= WARM_UP_MAX_MINUTES);
  if (i <= 0) return ordered; // none, or it's already first
  return [ordered[i], ...ordered.slice(0, i), ...ordered.slice(i + 1)];
}

export function planDay({ tasks, busy, from, to, gap = 0, warmUp = false }: PlanInput): PlanResult {
  const taken = busy.filter(([s, e]) => e > s).map(([s, e]) => [s, e] as [number, number]);
  const placed: PlanResult['placed'] = [];
  const unplaced: string[] = [];

  for (const task of placementOrder(tasks, warmUp)) {
    const len = taskLength(task);
    let start = ceilSlot(from);
    let found = false;
    while (start + len <= to) {
      // A break is kept on both sides, so work never runs straight into the next thing.
      const clash = taken.find(([s, e]) => s < start + len + gap && e + gap > start);
      if (!clash) { found = true; break; }
      start = ceilSlot(clash[1] + gap);
    }
    if (found) {
      placed.push({ id: task.id, start, end: start + len });
      taken.push([start, start + len]);
    } else {
      unplaced.push(task.id);
    }
  }
  return { placed, unplaced };
}
