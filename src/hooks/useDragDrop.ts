import type { DragEndEvent } from '@dnd-kit/core';
import { format } from 'date-fns'; // used by todayStr()
import { useTaskStore } from '../store/taskStore';
import type { EisenhowerQuadrant } from '../types';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const clamped = Math.min(min, 24 * 60 - 1);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function useDragDrop() {
  const updateTask = useTaskStore((s) => s.updateTask);
  const timeboxDate = useTaskStore((s) => s.timeboxDate);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const rawId = active.id as string;
    // Strip timebox-block prefix so the same task ID is used regardless of drag origin
    const taskId = rawId.startsWith('tb::') ? rawId.slice(4) : rawId;
    const overId = over.id as string;

    if (overId === 'braindump') {
      updateTask(taskId, {
        scheduled_date: null,
        timebox_start: null,
        timebox_end: null,
        eisenhower_quadrant: null,
      });
      return;
    }

    if (overId.startsWith('day__')) {
      const date = overId.slice(5);
      updateTask(taskId, { scheduled_date: date });
      return;
    }

    if (overId.startsWith('timebox__')) {
      const newStart = overId.slice(9);
      const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);

      // Preserve existing timebox duration; fall back to estimated_minutes; then 60 min
      let durationMin = 60;
      if (task?.timebox_start && task?.timebox_end) {
        durationMin = timeToMinutes(task.timebox_end) - timeToMinutes(task.timebox_start);
      } else if (task?.estimated_minutes) {
        durationMin = task.estimated_minutes;
      }
      durationMin = Math.max(15, durationMin);

      const startMin = timeToMinutes(newStart);
      const newEnd = minutesToTime(startMin + durationMin);

      updateTask(taskId, {
        scheduled_date: timeboxDate,
        timebox_start: newStart,
        timebox_end: newEnd,
      });
      return;
    }

    if (overId.startsWith('eisenhower__')) {
      const quadrant = overId.slice(12) as EisenhowerQuadrant;
      updateTask(taskId, {
        scheduled_date: todayStr(),
        eisenhower_quadrant: quadrant,
      });
      return;
    }
  }

  return { onDragEnd };
}
