export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';
export type Priority = 'low' | 'medium' | 'high';

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
  created_at: string;
  updated_at: string;
}

export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at'>>;

export type AppView = 'main' | 'today';

export type DropZoneType = 'braindump' | 'day' | 'timebox' | 'eisenhower';
