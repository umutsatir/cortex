export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';
export type Priority = 'low' | 'medium' | 'high';
export type Recurrence = 'daily' | 'weekdays' | 'weekly';

export interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  scheduled_date: string | null;
  timebox_start: string | null;
  timebox_end: string | null;
  eisenhower_quadrant: EisenhowerQuadrant | null;
  due_date: string | null;
  estimated_minutes: number | null;
  priority: Priority | null;
  label: string | null;
  notes: string | null;
  /** Set on the open occurrence of a repeating task; moves to the next one on completion. */
  recurrence: Recurrence | null;
  /** ISO time the task was last checked off. */
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at'>>;

/** 'main' is the week, 'today' the Focus view (ids kept for saved settings). */
export type AppView = 'main' | 'month' | 'today';

export type DropZoneType = 'braindump' | 'day' | 'timebox' | 'eisenhower';
