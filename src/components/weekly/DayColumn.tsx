import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { TaskItem } from '../brain-dump/TaskItem';

interface Props {
  date: Date;
  onDayClick?: (date: Date) => void;
}

export function DayColumn({ date, onDayClick }: Props) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isCurrentDay = isToday(date);

  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === dateStr)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${dateStr}` });

  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 border-r border-[#E5E7EB] last:border-r-0 ${
        isCurrentDay ? 'bg-[#FAFBFF]' : 'bg-white'
      }`}
    >
      <div
        className={`px-3 py-2.5 border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F5F3FF] transition-colors ${
          isCurrentDay ? 'bg-[#F5F3FF]' : ''
        }`}
        onClick={() => onDayClick?.(date)}
      >
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-[14px] font-semibold ${
              isCurrentDay ? 'text-[#6366F1]' : 'text-[#111827]'
            }`}
          >
            {format(date, 'EEE')}
          </span>
          <span
            className={`text-[12px] ${
              isCurrentDay ? 'text-[#6366F1]' : 'text-[#9CA3AF]'
            }`}
          >
            {format(date, 'd')}
          </span>
        </div>
        {tasks.length > 0 && (
          <div className="mt-0.5 text-[10px] text-[#9CA3AF]">
            {completedCount}/{tasks.length}
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto py-1 min-h-[60px] transition-colors ${
          isOver ? 'bg-[#F5F3FF]' : ''
        }`}
      >
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
