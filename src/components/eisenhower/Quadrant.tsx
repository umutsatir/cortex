import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { TaskItem } from '../brain-dump/TaskItem';
import type { EisenhowerQuadrant, Task } from '../../types';

// The four quadrant colors live only here (design system rule). Values are CSS tokens
// with light and dark variants in index.css.
const CONFIGS: Record<EisenhowerQuadrant, { label: string; sublabel: string; token: string }> = {
  do_first:  { label: 'Do First',  sublabel: 'Urgent & Important',    token: 'q-do' },
  schedule:  { label: 'Schedule',  sublabel: 'Important, Not Urgent', token: 'q-schedule' },
  delegate:  { label: 'Delegate',  sublabel: 'Urgent, Not Important', token: 'q-delegate' },
  eliminate: { label: 'Eliminate', sublabel: 'Neither',               token: 'q-eliminate' },
};

interface Props {
  quadrant: EisenhowerQuadrant;
  tasks: Task[];
}

export function Quadrant({ quadrant, tasks }: Props) {
  const config = CONFIGS[quadrant];
  const { setNodeRef, isOver } = useDroppable({ id: `eisenhower__${quadrant}` });
  const updateTask = useTaskStore((s) => s.updateTask);
  const t = useT();
  const q = `var(--${config.token})`;

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col min-h-0 overflow-hidden transition-[background-color,border-color,box-shadow,scale] duration-200 ease-[cubic-bezier(.2,.7,.2,1)]"
      style={{
        borderRadius: 'var(--radius-lg)',
        background: isOver ? 'var(--accent-soft)' : `var(--${config.token}-bg)`,
        border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
        borderTop: `3px solid ${isOver ? 'var(--accent)' : q}`,
        boxShadow: isOver ? '0 0 0 3px var(--accent-soft)' : 'var(--shadow-card)',
        scale: isOver ? '1.01' : '1',
      }}
    >
      <div className="px-3 pt-2.5 pb-2 flex items-center gap-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: q }} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-[18px]" style={{ color: 'var(--ink)' }}>
            {t(config.label)}
          </div>
          <div className="text-[11px] leading-[14px]" style={{ color: 'var(--ink-secondary)' }}>{t(config.sublabel)}</div>
        </div>
        {tasks.length > 0 && (
          <span className="ml-auto text-[11px] font-medium tabular-nums" style={{ color: 'var(--ink-body)' }}>
            {tasks.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1.5 min-h-[60px]">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              dragIdPrefix="eis::"
              checkColor={q}
              onRemove={() => updateTask(task.id, { eisenhower_quadrant: null })}
            />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div
            className="cx-rise-in flex-1 flex items-center justify-center text-[12px] m-1"
            style={{ color: 'var(--ink-secondary)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }}
          >
            {t('Drop tasks here')}
          </div>
        )}
      </div>
    </div>
  );
}
