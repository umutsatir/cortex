import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { Toolbar, TRAFFIC_LIGHTS_W } from '../ui/Toolbar';
import { TaskItem } from '../brain-dump/TaskItem';
import { RolloverBanner } from '../common/RolloverBanner';
import { TaskInput } from '../brain-dump/TaskInput';

export function TodayTaskList() {
  const today = useTaskStore((s) => s.today);
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === s.today)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${today}` });
  const t = useT();
  const completedCount = tasks.filter((task) => task.is_completed).length;

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col h-full"
      style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-sunken)' }}
    >
      <Toolbar paddingLeft={TRAFFIC_LIGHTS_W + 8}>
        <span className="cx-section">{t('Today')}</span>
        {tasks.length > 0 && (
          <span className="ml-auto text-[11px] font-medium tabular-nums" style={{ color: 'var(--ink-secondary)' }}>
            {completedCount}/{tasks.length} {t('done')}
          </span>
        )}
      </Toolbar>

      {tasks.length > 0 && (
        <div className="mx-3 mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(completedCount / tasks.length) * 100}%`, background: 'var(--accent)' }}
          />
        </div>
      )}

      <RolloverBanner className="mx-3 mt-3" />

      <TaskInput placeholder={t('Add to today…')} scheduledDate={today} quickSource />

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-3 pt-1 pb-3 flex flex-col gap-2 transition-colors"
        style={{ background: isOver ? 'var(--accent-soft)' : 'transparent' }}
      >
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="cx-rise-in px-4 py-10 text-center">
            <p className="text-[12px]" style={{ color: 'var(--ink-secondary)' }}>{t('No tasks for today yet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
