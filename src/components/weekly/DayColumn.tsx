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
        className="cx-press flex items-center gap-2 w-full h-9 px-2.5 text-[13px] text-left hover:bg-[var(--surface-hover)] hover:text-[var(--ink-body)]"
        style={{ color: 'var(--ink-secondary)', borderRadius: 'var(--radius-sm)' }}
        onClick={() => setActive(true)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        {t('Add a task')}
      </button>
    );
  }

  return (
    <div
      className="cx-pop-in flex items-center h-9 px-2.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 0 3px var(--accent-soft)' }}
    >
      <input
        ref={inputRef}
        autoFocus
        className="w-full text-[13px] bg-transparent outline-none placeholder:text-[var(--ink-secondary)]"
        style={{ color: 'var(--ink)' }}
        placeholder={t('Task name…')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const title = value.trim();
            if (title) addTask(title, { scheduled_date: dateStr });
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
  last?: boolean;
}

export function DayColumn({ date, last = false }: Props) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isCurrentDay = isToday(date);
  const locale = useDateLocale();

  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((task) => task.scheduled_date === dateStr)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${dateStr}` });
  const doneCount = tasks.filter((task) => task.is_completed).length;

  return (
    <div
      className="group/day flex flex-col min-w-0 min-h-0"
      style={{ borderRight: last ? undefined : '1px solid var(--border)' }}
    >
      {/* Day header */}
      <div
        className="relative flex flex-col items-center justify-center py-3 flex-shrink-0 transition-colors"
        style={{
          background: isCurrentDay ? 'var(--accent-soft)' : 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="text-[13px] font-medium leading-4" style={{ color: isCurrentDay ? 'var(--accent-hover)' : 'var(--ink-secondary)' }}>
          {format(date, 'EEE', { locale })}
        </span>
        <span className="mt-1 text-[22px] font-semibold leading-7 tracking-[-0.02em] tabular-nums" style={{ color: isCurrentDay ? 'var(--accent-hover)' : 'var(--ink)' }}>
          {format(date, 'd')}
        </span>
        {tasks.length > 0 && (
          <span
            className="absolute top-2 right-2.5 text-[11px] font-medium tabular-nums"
            style={{ color: isCurrentDay ? 'var(--accent-hover)' : 'var(--ink-secondary)' }}
            title={`${doneCount}/${tasks.length}`}
          >
            {doneCount}/{tasks.length}
          </span>
        )}
        {/* Progress hairline */}
        <div className="absolute left-0 right-0 bottom-[-1px] h-[2px]">
          <div
            className="h-full transition-[width] duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : 0, background: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Tasks + drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 transition-[background-color,box-shadow] duration-200"
        style={{
          background: isOver
            ? 'var(--accent-soft)'
            : isCurrentDay ? 'color-mix(in srgb, var(--accent-soft) 45%, var(--surface))' : 'var(--surface)',
          boxShadow: isOver ? 'inset 0 0 0 1.5px var(--accent)' : undefined,
        }}
      >
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>
        <div className={`transition-opacity duration-200 ${tasks.length ? 'opacity-0 group-hover/day:opacity-100 focus-within:opacity-100' : 'opacity-60 group-hover/day:opacity-100'}`}>
          <InlineAdd dateStr={dateStr} />
        </div>
      </div>
    </div>
  );
}
