import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { TaskItem } from '../brain-dump/TaskItem';
import { TaskInput } from '../brain-dump/TaskInput';

export function TodayTaskList() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === today)
  ));

  const { setNodeRef, isOver } = useDroppable({ id: `day__${today}` });
  const t = useT();
  const locale = useDateLocale();
  const completedCount = tasks.filter((task) => task.is_completed).length;

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col border-r h-full"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div
        data-tauri-drag-region
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button, input, a, [role="button"]')) {
            e.stopPropagation();
            getCurrentWindow().startDragging();
          }
        }}
        className="flex flex-col justify-center border-b flex-shrink-0"
        style={{ height: 52, paddingLeft: 80, paddingRight: 16, borderColor: 'var(--border)' }}
      >
        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
          {format(new Date(), 'EEEE, MMM d', { locale })}
        </div>
        {tasks.length > 0 && (
          <div className="text-[11px]" style={{ color: 'var(--text-4)' }}>
            {completedCount} {t('of')} {tasks.length} {t('done')}
          </div>
        )}
      </div>

      <TaskInput placeholder={t('Add to today…')} scheduledDate={today} />

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
            <p className="text-[12px]" style={{ color: 'var(--text-4)' }}>{t('No tasks for today yet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
