import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { Quadrant } from './Quadrant';
import type { EisenhowerQuadrant } from '../../types';

const QUADRANTS: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];

export function EisenhowerMatrix() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === today && t.eisenhower_quadrant)
  ));

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">
          Eisenhower Matrix
        </span>
      </div>

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 px-4 pb-4 overflow-hidden">
        {QUADRANTS.map((q) => (
          <Quadrant
            key={q}
            quadrant={q}
            tasks={tasks.filter((t) => t.eisenhower_quadrant === q)}
          />
        ))}
      </div>
    </div>
  );
}
