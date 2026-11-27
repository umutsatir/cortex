import type { DragEndEvent } from '@dnd-kit/core';
import { format } from 'date-fns'; // used by todayStr()
import { useTaskStore } from '../store/taskStore';
import { minutesToTime, timeToMinutes } from '../lib/time';
import type { EisenhowerQuadrant } from '../types';
import { useGeneralStore } from '../store/generalStore';
import { dateOnDrop } from '../lib/eisenhower';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export function useDragDrop() {
  const updateTask = useTaskStore((s) => s.updateTask);
  const timeboxDate = useTaskStore((s) => s.timeboxDate);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const rawId = active.id as string;
    const overId = over.id as string;

    // Timebox blocks (tb::) can only move between timebox slots
    if (rawId.startsWith('tb::')) {
      if (!overId.startsWith('timebox__')) return;
    }

    // Eisenhower copies (eis::) can only move between eisenhower quadrants
    if (rawId.startsWith('eis::')) {
      if (!overId.startsWith('eisenhower__')) return;
    }

    const taskId = rawId.startsWith('tb::') ? rawId.slice(4)
                 : rawId.startsWith('eis::') ? rawId.slice(5)
                 : rawId;

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
      const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
      if (!task) return;
      const { matrixScope, weekStartsOn } = useGeneralStore.getState();
      updateTask(taskId, {
        scheduled_date: dateOnDrop(task, matrixScope, todayStr(), weekStartsOn),
        eisenhower_quadrant: quadrant,
      });
      return;
    }
  }

  return { onDragEnd };
}
