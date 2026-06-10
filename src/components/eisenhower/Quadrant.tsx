import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { TaskItem } from '../brain-dump/TaskItem';
import type { EisenhowerQuadrant, Task } from '../../types';

interface QuadrantConfig {
  label: string;
  sublabel: string;
  bg: string;
  border: string;
  accent: string;
  badge: string;
}

const CONFIGS: Record<EisenhowerQuadrant, QuadrantConfig> = {
  do_first: {
    label: 'Do First',
    sublabel: 'Urgent & Important',
    bg: '#FEF2F2',
    border: '#FECACA',
    accent: '#DC2626',
    badge: '#FEE2E2',
  },
  schedule: {
    label: 'Schedule',
    sublabel: 'Important, Not Urgent',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    accent: '#2563EB',
    badge: '#DBEAFE',
  },
  delegate: {
    label: 'Delegate',
    sublabel: 'Urgent, Not Important',
    bg: '#FEFCE8',
    border: '#FDE68A',
    accent: '#CA8A04',
    badge: '#FEF3C7',
  },
  eliminate: {
    label: 'Eliminate',
    sublabel: 'Neither',
    bg: '#F9FAFB',
    border: '#E5E7EB',
    accent: '#6B7280',
    badge: '#F3F4F6',
  },
};

interface Props {
  quadrant: EisenhowerQuadrant;
  tasks: Task[];
}

export function Quadrant({ quadrant, tasks }: Props) {
  const config = CONFIGS[quadrant];
  const { setNodeRef, isOver } = useDroppable({ id: `eisenhower__${quadrant}` });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-xl overflow-hidden transition-all"
      style={{
        background: isOver ? '#F5F3FF' : config.bg,
        border: `1.5px solid ${isOver ? '#A5B4FC' : config.border}`,
      }}
    >
      <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${config.border}` }}>
        <div>
          <div className="text-[12px] font-semibold" style={{ color: config.accent }}>
            {config.label}
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{config.sublabel}</div>
        </div>
        {tasks.length > 0 && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: config.badge, color: config.accent }}
          >
            {tasks.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1 min-h-[60px]">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-[#D1D5DB]">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}
