import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { Toolbar, TRAFFIC_LIGHTS_W } from '../ui/Toolbar';
import { TaskInput } from './TaskInput';
import { TaskItem } from './TaskItem';

export function BrainDump() {
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => !t.scheduled_date)
  ));
  const { setNodeRef, isOver } = useDroppable({ id: 'braindump' });
  const t = useT();

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col h-full"
      style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-sunken)' }}
    >
      <Toolbar paddingLeft={TRAFFIC_LIGHTS_W + 8}>
        <span className="cx-section">{t('Brain Dump')}</span>
        {tasks.length > 0 && (
          <span className="ml-auto text-[11px] font-medium tabular-nums" style={{ color: 'var(--ink-secondary)' }}>
            {tasks.length}
          </span>
        )}
      </Toolbar>

      <TaskInput placeholder={t('Capture a thought…')} captureNewTaskShortcut />

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 transition-colors"
        style={{ background: isOver ? 'var(--accent-soft)' : 'transparent' }}
      >
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="cx-rise-in px-4 py-10 text-center">
            <p className="text-[12px] leading-[18px]" style={{ color: 'var(--ink-secondary)' }}>{t('Drop tasks here or type above')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
