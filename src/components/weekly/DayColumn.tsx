import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { TaskItem } from '../brain-dump/TaskItem';

function InlineAdd({ dateStr }: { dateStr: string }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState('');
  const addTask = useTaskStore((s) => s.addTask);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  if (!active) {
    return (
      <button
        className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] transition-colors text-left"
        style={{ color: 'var(--text-5)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-5)'; }}
        onClick={() => setActive(true)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {t('Add a task')}
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <input
        ref={inputRef}
        autoFocus
        className="w-full text-[13px] bg-transparent outline-none border-b pb-0.5"
        style={{ color: 'var(--text-1)', borderBottomColor: 'var(--accent)' }}
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
  const t = useT();
  const locale = useDateLocale();

  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((task) => task.scheduled_date === dateStr)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${dateStr}` });

  return (
    <div
      className="flex flex-col flex-shrink-0 border-r last:border-r-0"
      style={{ width: 272, borderColor: 'var(--border)' }}
    >
      {/* Day header */}
      <div
        className="px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>
              {format(date, 'EEE', { locale })}
            </span>
            <span className="text-[15px] font-normal leading-none" style={{ color: 'var(--text-4)' }}>
              {format(date, 'MMM d', { locale })}
            </span>
            {isCurrentDay && (
              <span className="ml-1 px-2 py-0.5 text-[11px] font-semibold rounded-full leading-none" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                {t('Today')}
              </span>
            )}
          </div>

          {isCurrentDay && onFocusClick && (
            <button
              className="text-[11px] transition-colors ml-2 flex-shrink-0"
              style={{ color: 'var(--text-4)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; }}
              onClick={onFocusClick}
            >
              {t('Focus')}
            </button>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="mt-1.5 text-[11px]" style={{ color: 'var(--text-4)' }}>
            {tasks.filter((task) => task.is_completed).length}/{tasks.length} {t('done')}
          </div>
        )}
      </div>

      {/* Tasks + drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto transition-colors"
        style={{ background: isOver ? 'var(--accent-bg)' : 'var(--surface)' }}
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
