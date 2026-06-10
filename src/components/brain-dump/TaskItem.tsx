import { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { differenceInCalendarDays } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { LabelPicker } from '../common/LabelPicker';
import { PriorityPicker } from '../common/PriorityPicker';
import type { Task } from '../../types';

function DueBadge({ dueDate }: { dueDate: string }) {
  const diff = differenceInCalendarDays(new Date(dueDate + 'T00:00:00'), new Date());
  let text: string;
  let color: string;
  if (diff < 0)      { text = `${Math.abs(diff)}d overdue`; color = '#EF4444'; }
  else if (diff === 0) { text = 'Due today';                 color = '#F59E0B'; }
  else if (diff <= 2)  { text = `Due in ${diff}d`;           color = '#F59E0B'; }
  else                 { text = `Due in ${diff} days`;       color = '#9CA3AF'; }
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

const PRIORITY_COLOR: Record<string, string> = {
  high: '#EF4444', medium: '#F59E0B', low: '#10B981',
};

interface Props {
  task: Task;
}

export function TaskItem({ task }: Props) {
  const { toggleComplete, deleteTask, updateTask, selectTask } = useTaskStore(
    useShallow((s) => ({
      toggleComplete: s.toggleComplete,
      deleteTask: s.deleteTask,
      updateTask: s.updateTask,
      selectTask: s.selectTask,
    }))
  );
  const labels = useLabelStore((s) => s.labels);
  const label = labels.find((l) => l.id === task.label) ?? null;

  const [hovered, setHovered] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const labelBtnRef = useRef<HTMLButtonElement>(null);
  const priorityBtnRef = useRef<HTMLButtonElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { taskId: task.id },
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  const hasSubInfo = label || task.due_date || task.priority;

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={{ ...dragStyle, backgroundColor: hovered ? '#F9FAFB' : 'transparent', transition: 'background-color 0.15s' }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.12 }}
        className="group flex items-start gap-2 px-3 py-2 rounded-lg mx-1 cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { if (!showLabelPicker && !showPriorityPicker) setHovered(false); }}
        {...attributes}
        {...listeners}
      >
        {/* Checkbox */}
        <button
          className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center"
          style={{
            borderColor: task.is_completed ? '#6366F1' : '#D1D5DB',
            background: task.is_completed ? '#6366F1' : undefined,
          }}
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
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[13px] leading-snug flex-1 min-w-0 ${task.is_completed ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'}`}
              onClick={() => selectTask(task.id)}
              style={{ cursor: 'pointer' }}
            >
              {task.title}
            </span>
            {task.estimated_minutes != null && task.estimated_minutes > 0 && !hovered && (
              <span className="text-[11px] text-[#9CA3AF] flex-shrink-0 tabular-nums">
                {task.estimated_minutes < 60 ? `${task.estimated_minutes}m` : `${Math.floor(task.estimated_minutes / 60)}:${String(task.estimated_minutes % 60).padStart(2, '0')}`}
              </span>
            )}
            {hovered && (
              <button
                className="flex-shrink-0 p-0.5 rounded text-[#C4C9D4] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Sub-info or action bar — only one rendered at a time, no AnimatePresence */}
          {hasSubInfo && !hovered && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {label && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: label.color }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: label.color }} />
                  {label.name}
                </span>
              )}
              {task.priority && (
                <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                  <path d="M1 10V1l7 4-7 4z" fill={PRIORITY_COLOR[task.priority]} stroke={PRIORITY_COLOR[task.priority]} strokeWidth="1" strokeLinejoin="round" />
                </svg>
              )}
              {task.due_date && <DueBadge dueDate={task.due_date} />}
            </div>
          )}

          {hovered && (
            <div
              className="inline-flex items-center gap-1.5 mt-1.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Label quick-pick */}
              <button
                ref={labelBtnRef}
                className="flex items-center gap-1.5 text-[11px] rounded-md px-1.5 py-0.5 hover:bg-[#F3F4F6] transition-colors"
                style={{ color: label ? label.color : '#9CA3AF' }}
                onClick={(e) => { e.stopPropagation(); setShowLabelPicker(true); }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block border"
                  style={{
                    background: label ? label.color : 'transparent',
                    borderColor: label ? label.color : '#D1D5DB',
                  }}
                />
                {label ? label.name : 'Select Label'}
              </button>

              {/* Priority quick-pick */}
              <button
                ref={priorityBtnRef}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-[#F3F4F6] transition-colors"
                title="Priority"
                onClick={(e) => { e.stopPropagation(); setShowPriorityPicker(true); }}
              >
                <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                  <path
                    d="M1 10V1l7 4-7 4z"
                    fill={task.priority ? PRIORITY_COLOR[task.priority] : 'none'}
                    stroke={task.priority ? PRIORITY_COLOR[task.priority] : '#D1D5DB'}
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {showLabelPicker && labelBtnRef.current && (
        <LabelPicker
          anchorEl={labelBtnRef.current}
          selectedId={task.label}
          onSelect={(id) => updateTask(task.id, { label: id })}
          onClose={() => { setShowLabelPicker(false); setHovered(false); }}
        />
      )}
      {showPriorityPicker && priorityBtnRef.current && (
        <PriorityPicker
          anchorEl={priorityBtnRef.current}
          selected={task.priority}
          onSelect={(p) => updateTask(task.id, { priority: p })}
          onClose={() => { setShowPriorityPicker(false); setHovered(false); }}
        />
      )}
    </>
  );
}
