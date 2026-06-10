import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { TaskItem } from '../brain-dump/TaskItem';

function InlineAdd({ dateStr }: { dateStr: string }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState('');
  const addTask = useTaskStore((s) => s.addTask);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!active) {
    return (
      <button
        className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] text-[#C4C9D4] hover:text-[#9CA3AF] transition-colors text-left"
        onClick={() => setActive(true)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Add a task
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <input
        ref={inputRef}
        autoFocus
        className="w-full text-[13px] text-[#111827] bg-transparent outline-none border-b border-[#6366F1] placeholder-[#9CA3AF] pb-0.5"
        placeholder="Task name…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const t = value.trim();
            if (t) addTask(t, { scheduled_date: dateStr });
            setValue('');
            setActive(false);
          }
          if (e.key === 'Escape') {
            setValue('');
            setActive(false);
          }
        }}
        onBlur={() => {
          setValue('');
          setActive(false);
        }}
      />
    </div>
  );
}

interface Props {
  date: Date;
  onFocusClick?: () => void;
}

export function DayColumn({ date, onFocusClick }: Props) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isCurrentDay = isToday(date);

  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === dateStr)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${dateStr}` });

  return (
    <div
      className="flex flex-col flex-shrink-0 border-r border-[#E5E7EB] last:border-r-0"
      style={{ width: 272 }}
    >
      {/* Day header */}
      <div
        className={`px-4 pt-4 pb-3 border-b border-[#F3F4F6] ${
          isCurrentDay ? 'bg-white' : 'bg-white'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-[20px] font-bold leading-none ${isCurrentDay ? 'text-[#111827]' : 'text-[#111827]'}`}>
              {format(date, 'EEE')}
            </span>
            <span className="text-[15px] text-[#9CA3AF] font-normal leading-none">
              {format(date, 'MMM d')}
            </span>
            {isCurrentDay && (
              <span className="ml-1 px-2 py-0.5 text-[11px] font-semibold bg-[#EEF2FF] text-[#6366F1] rounded-full leading-none">
                Today
              </span>
            )}
          </div>

          {isCurrentDay && onFocusClick && (
            <button
              className="text-[11px] text-[#9CA3AF] hover:text-[#6366F1] transition-colors ml-2 flex-shrink-0"
              onClick={onFocusClick}
            >
              Focus
            </button>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="mt-1.5 text-[11px] text-[#9CA3AF]">
            {tasks.filter((t) => t.is_completed).length}/{tasks.length} done
          </div>
        )}
      </div>

      {/* Tasks + drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto transition-colors ${isOver ? 'bg-[#F5F3FF]' : 'bg-white'}`}
      >
        <InlineAdd dateStr={dateStr} />

        <AnimatePresence>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
