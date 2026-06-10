import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { TaskItem } from '../brain-dump/TaskItem';
import { TaskInput } from '../brain-dump/TaskInput';

export function TodayTaskList() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === today)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${today}` });

  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-[#E5E7EB] bg-white h-full">
      <div
        data-tauri-drag-region
        className="flex flex-col justify-center border-b border-[#E5E7EB] flex-shrink-0"
        style={{ height: 52, paddingLeft: 80, paddingRight: 16 }}
      >
        <div className="text-[13px] font-semibold text-[#111827]">
          {format(new Date(), 'EEEE, MMM d')}
        </div>
        {tasks.length > 0 && (
          <div className="text-[11px] text-[#9CA3AF]">
            {completedCount} of {tasks.length} done
          </div>
        )}
      </div>

      <TaskInput placeholder="Add to today…" scheduledDate={today} />

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto py-1 transition-colors ${isOver ? 'bg-[#F5F3FF]' : ''}`}
      >
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[#9CA3AF]">No tasks for today yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
