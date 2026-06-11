import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
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
      className="w-[280px] flex-shrink-0 flex flex-col border-r h-full"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div
        data-tauri-drag-region
        className="flex items-center border-b flex-shrink-0"
        style={{ height: 52, paddingLeft: 80, paddingRight: 16, borderColor: 'var(--border)' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{t('Brain Dump')}</span>
      </div>

      <TaskInput placeholder={t('Capture a thought…')} />

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto py-1 transition-colors"
        style={{ background: isOver ? 'var(--accent-bg)' : 'transparent' }}
      >
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px]" style={{ color: 'var(--text-4)' }}>{t('Drop tasks here or type above')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
