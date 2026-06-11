import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { useIsDark } from '../../hooks/useIsDark';
import { TaskItem } from '../brain-dump/TaskItem';
import type { EisenhowerQuadrant, Task } from '../../types';

interface QuadrantConfig {
  label: string;
  sublabel: string;
  bg: string; border: string; accent: string; badge: string;
  darkBg: string; darkBorder: string; darkBadge: string;
}

const CONFIGS: Record<EisenhowerQuadrant, QuadrantConfig> = {
  do_first: {
    label: 'Do First', sublabel: 'Urgent & Important',
    bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', badge: '#FEE2E2',
    darkBg: '#2D1515', darkBorder: '#5C2626', darkBadge: 'rgba(220,38,38,0.28)',
  },
  schedule: {
    label: 'Schedule', sublabel: 'Important, Not Urgent',
    bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB', badge: '#DBEAFE',
    darkBg: '#131D2D', darkBorder: '#1E3A5C', darkBadge: 'rgba(37,99,235,0.28)',
  },
  delegate: {
    label: 'Delegate', sublabel: 'Urgent, Not Important',
    bg: '#FEFCE8', border: '#FDE68A', accent: '#CA8A04', badge: '#FEF3C7',
    darkBg: '#2D2510', darkBorder: '#5C4A10', darkBadge: 'rgba(202,138,4,0.28)',
  },
  eliminate: {
    label: 'Eliminate', sublabel: 'Neither',
    bg: 'var(--surface-2)', border: 'var(--border)', accent: 'var(--text-3)', badge: 'var(--surface-3)',
    darkBg: 'var(--surface-2)', darkBorder: 'var(--border)', darkBadge: 'var(--surface-3)',
  },
};

interface Props {
  quadrant: EisenhowerQuadrant;
  tasks: Task[];
}

export function Quadrant({ quadrant, tasks }: Props) {
  const config = CONFIGS[quadrant];
  const { setNodeRef, isOver } = useDroppable({ id: `eisenhower__${quadrant}` });
  const updateTask = useTaskStore((s) => s.updateTask);
  const isDark = useIsDark();

  const bg     = isDark ? config.darkBg    : config.bg;
  const border = isDark ? config.darkBorder : config.border;
  const badge  = isDark ? config.darkBadge  : config.badge;

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-xl overflow-hidden transition-all"
      style={{
        background: isOver ? 'var(--accent-bg)' : bg,
        border: `1.5px solid ${isOver ? 'var(--accent-border)' : border}`,
      }}
    >
      <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
        <div>
          <div className="text-[12px] font-semibold" style={{ color: config.accent }}>
            {config.label}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-4)' }}>{config.sublabel}</div>
        </div>
        {tasks.length > 0 && (
          <span
            className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={
              isDark
                ? { background: config.accent, color: '#fff' }
                : { background: badge, color: config.accent }
            }
          >
            {tasks.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1 min-h-[60px]">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              dragIdPrefix="eis::"
              onRemove={() => updateTask(task.id, { eisenhower_quadrant: null })}
            />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px]" style={{ color: 'var(--text-5)' }}>Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}
