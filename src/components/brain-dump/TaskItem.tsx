import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { differenceInCalendarDays } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types';

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const diff = differenceInCalendarDays(new Date(dueDate + 'T00:00:00'), new Date());
  let text: string;
  let color: string;

  if (diff < 0) { text = `${Math.abs(diff)}d overdue`; color = '#EF4444'; }
  else if (diff === 0) { text = 'Due today'; color = '#F59E0B'; }
  else if (diff <= 2) { text = `Due in ${diff}d`; color = '#F59E0B'; }
  else { text = `Due in ${diff} days`; color = '#9CA3AF'; }

  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1" />
        <path d="M1 4h8M3.5 1v2M6.5 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
      {text}
    </span>
  );
}

interface Props {
  task: Task;
  showDate?: boolean;
}

export function TaskItem({ task }: Props) {
  const { toggleComplete, deleteTask, selectTask } = useTaskStore(
    useShallow((s) => ({ toggleComplete: s.toggleComplete, deleteTask: s.deleteTask, selectTask: s.selectTask }))
  );

  const [showActions, setShowActions] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { taskId: task.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  const hasSubInfo = task.label || task.due_date || task.estimated_minutes || task.priority;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="group flex items-start gap-2 px-3 py-2 hover:bg-[#F9FAFB] rounded-lg mx-1 cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      {...attributes}
      {...listeners}
    >
      <button
        className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center"
        style={{ borderColor: task.is_completed ? '#6366F1' : '#D1D5DB', background: task.is_completed ? '#6366F1' : undefined }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
      >
        {task.is_completed && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[13px] leading-snug flex-1 min-w-0 ${task.is_completed ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); selectTask(task.id); }}
            style={{ cursor: 'pointer' }}
          >
            {task.title}
          </span>

          {task.estimated_minutes != null && task.estimated_minutes > 0 && (
            <span className="text-[11px] text-[#9CA3AF] flex-shrink-0 tabular-nums">
              {formatMinutes(task.estimated_minutes)}
            </span>
          )}
        </div>

        {hasSubInfo && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.label && (
              <span className="flex items-center gap-1 text-[11px] text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
                {task.label}
              </span>
            )}
            {task.priority && (
              <span
                className="text-[11px]"
                style={{
                  color: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981',
                }}
              >
                {'▲'.repeat(task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1)}
              </span>
            )}
            {task.due_date && <DueBadge dueDate={task.due_date} />}
          </div>
        )}
      </div>

      {showActions && (
        <button
          className="flex-shrink-0 p-0.5 rounded text-[#9CA3AF] hover:text-[#EF4444] hover:bg-red-50 transition-colors mt-0.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}
