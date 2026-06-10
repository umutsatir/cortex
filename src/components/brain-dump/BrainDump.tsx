import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { TaskInput } from './TaskInput';
import { TaskItem } from './TaskItem';

export function BrainDump() {
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => !t.scheduled_date)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: 'braindump' });

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-[#E5E7EB] bg-white h-full">
      <div className="px-4 pt-4 pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">
          Brain Dump
        </span>
      </div>

      <TaskInput placeholder="Capture a thought…" />

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
            <p className="text-[12px] text-[#9CA3AF]">Drop tasks here or type above</p>
          </div>
        )}
      </div>
    </div>
  );
}
