import { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { differenceInCalendarDays } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { LabelPicker } from '../common/LabelPicker';
import { PriorityPicker } from '../common/PriorityPicker';
import type { Task } from '../../types';
import { deleteWithUndo } from '../../lib/actions';
import { useT } from '../../hooks/useT';

function DueBadge({ dueDate }: { dueDate: string }) {
  const diff = differenceInCalendarDays(new Date(dueDate + 'T00:00:00'), new Date());
  let text: string;
  let color: string;
  if (diff < 0)      { text = `${Math.abs(diff)}d overdue`; color = 'var(--danger)'; }
  else if (diff === 0) { text = 'Due today';                 color = 'var(--warn)'; }
  else if (diff <= 2)  { text = `Due in ${diff}d`;           color = 'var(--warn)'; }
  else                 { text = `Due in ${diff} days`;       color = 'var(--ink-secondary)'; }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium tabular-nums" style={{ color }}>
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
  dragIdPrefix?: string;
  onRemove?: () => void;
  /** Checkbox ring color; quadrants pass their own. */
  checkColor?: string;
  /** Placed by a suggestion (Eisenhower), not by the user. */
  auto?: boolean;
  /** Which day the task is on, when the list mixes days (Eisenhower week / all). */
  dateHint?: string;
}

/** The look of a task being dragged (DragOverlay). */
export function TaskDragCard({ title }: { title: string }) {
  return (
    // Picked up: tilts and grows slightly (design system "hero drag": tilt -2°, shadow-drag).
    <motion.div
      className="flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium max-w-[240px] cursor-grabbing"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--ink)',
        boxShadow: 'var(--shadow-drag)',
      }}
      initial={{ rotate: 0, scale: 1 }}
      animate={{ rotate: -2, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
    >
      <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: '1.5px solid var(--border-strong)' }} />
      <span className="truncate">{title}</span>
    </motion.div>
  );
}

export function TaskItem({ task, dragIdPrefix = '', onRemove, checkColor, auto = false, dateHint }: Props) {
  const t = useT();
  const { toggleComplete, updateTask, selectTask } = useTaskStore(
    useShallow((s) => ({
      toggleComplete: s.toggleComplete,
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

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${dragIdPrefix}${task.id}`,
    data: { taskId: task.id },
  });

  // The DragOverlay follows the pointer; the original stays put as a placeholder.
  const active = hovered && !isDragging;

  const hasSubInfo = label || task.due_date || task.priority || task.recurrence || auto || dateHint;

  return (
    <>
      <motion.div
        ref={setNodeRef}
        layout="position"
        style={{
          background: isDragging ? 'var(--accent-soft)' : task.is_completed && !active ? 'var(--surface-sunken)' : 'var(--surface)',
          border: isDragging ? '1.5px dashed var(--accent)' : `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: isDragging ? 'none' : active ? 'var(--shadow-hover)' : 'var(--shadow-card)',
        }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.14 } }}
        transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
        className={`group relative flex items-start gap-2.5 px-3 py-2.5 cursor-grab active:cursor-grabbing select-none touch-none ${isDragging ? '' : 'cx-lift'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { if (!showLabelPicker && !showPriorityPicker) setHovered(false); }}
        {...attributes}
        {...listeners}
      >
        {/* Checkbox */}
        <motion.button
          aria-label={task.is_completed ? 'Mark as not done' : 'Mark as done'}
          className="flex-shrink-0 mt-[2px] w-4 h-4 rounded-full flex items-center justify-center transition-[border-color,background-color] duration-150 hover:!border-[var(--accent)]"
          style={{
            visibility: isDragging ? 'hidden' : undefined,
            border: `1.5px solid ${task.is_completed ? 'var(--accent)' : checkColor ?? 'var(--border-strong)'}`,
            background: task.is_completed ? 'var(--accent)' : undefined,
          }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.8 }}
          animate={task.is_completed ? { scale: [1, 1.28, 1] } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
        >
          {task.is_completed ? (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <motion.path
                d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.22, delay: 0.05, ease: 'easeOut' }}
              />
            </svg>
          ) : (
            // Hint of the check on hover.
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-0 group-hover:opacity-40 transition-opacity">
              <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </motion.button>

        <div className="flex-1 min-w-0" style={{ visibility: isDragging ? 'hidden' : undefined }}>
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[14px] leading-5 flex-1 min-w-0 break-words transition-colors duration-200 cursor-pointer"
              style={{ color: task.is_completed ? 'var(--ink-secondary)' : 'var(--ink)' }}
              onClick={() => selectTask(task.id)}
            >
              <span
                className="cx-strike"
                data-done={task.is_completed}
                style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
              >
                {task.title}
              </span>
            </span>
            <span className="relative flex-shrink-0 flex items-center justify-end min-w-[16px] h-5">
              {task.estimated_minutes != null && task.estimated_minutes > 0 && (
                <span
                  className="text-[11px] font-medium tabular-nums transition-opacity duration-150"
                  style={{ color: 'var(--ink-secondary)', opacity: active ? 0 : 1 }}
                >
                  {task.estimated_minutes < 60 ? `${task.estimated_minutes}m` : `${Math.floor(task.estimated_minutes / 60)}:${String(task.estimated_minutes % 60).padStart(2, '0')}`}
                </span>
              )}
              <button
                tabIndex={active ? 0 : -1}
                className="absolute right-0 top-1/2 p-0.5 rounded transition-[color,opacity,rotate,scale] duration-200 hover:rotate-90 hover:text-[var(--danger)]"
                style={{
                  color: 'var(--ink-muted)',
                  opacity: active ? 1 : 0,
                  scale: active ? '1' : '0.6',
                  translate: '0 -50%',
                  pointerEvents: active ? undefined : 'none',
                }}
                title={onRemove ? 'Remove' : 'Delete'}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove ? onRemove() : void deleteWithUndo(task.id); }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          </div>

          {/* Meta row and hover actions share one grid cell and cross-fade; the row
              itself opens with a grid-rows transition, so the card never jumps in size. */}
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{ gridTemplateRows: active || hasSubInfo ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden grid">
              <div
                className="[grid-area:1/1] flex items-center gap-2 pt-1 flex-wrap transition-[opacity,translate] duration-150"
                style={{ opacity: active ? 0 : 1, translate: active ? '0 2px' : '0 0', pointerEvents: active ? 'none' : undefined }}
                aria-hidden={active}
              >
                {dateHint && (
                  <span className="text-[11px] font-medium" style={{ color: 'var(--ink-secondary)' }}>{dateHint}</span>
                )}
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
                {auto && (
                  <span
                    className="flex items-center gap-1 text-[11px] font-medium"
                    style={{ color: 'var(--ink-secondary)' }}
                    title={t('Placed automatically from priority and due date. Drag it to keep it somewhere.')}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5l1.6 4.9L14.5 8l-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z" fill="currentColor" />
                    </svg>
                    {t('Auto')}
                  </span>
                )}
                {task.recurrence && (
                  <span className="flex items-center" style={{ color: 'var(--ink-secondary)' }} title={task.recurrence}>
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                      <path d="M8.5 4A3.6 3.6 0 0 0 2 3M1.5 6A3.6 3.6 0 0 0 8 7" stroke="currentColor" strokeLinecap="round" />
                      <path d="M2 1v2h2M8 9V7H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>

              <div
                className="[grid-area:1/1] flex items-center gap-1 pt-1 transition-[opacity,translate] duration-200"
                style={{ opacity: active ? 1 : 0, translate: active ? '0 0' : '0 -3px', pointerEvents: active ? undefined : 'none' }}
                aria-hidden={!active}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  ref={labelBtnRef}
                  tabIndex={active ? 0 : -1}
                  className="cx-press flex items-center gap-1.5 text-[11px] rounded-md px-1.5 py-0.5 -ml-1.5 hover:bg-[var(--surface-hover)]"
                  style={{ color: label ? label.color : 'var(--ink-secondary)' }}
                  onClick={(e) => { e.stopPropagation(); setShowLabelPicker(true); }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block border"
                    style={{
                      background: label ? label.color : 'transparent',
                      borderColor: label ? label.color : 'var(--border-strong)',
                    }}
                  />
                  {label ? label.name : 'Select Label'}
                </button>

                <button
                  ref={priorityBtnRef}
                  tabIndex={active ? 0 : -1}
                  className="cx-press flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-hover)]"
                  title="Priority"
                  onClick={(e) => { e.stopPropagation(); setShowPriorityPicker(true); }}
                >
                  <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                    <path
                      d="M1 10V1l7 4-7 4z"
                      fill={task.priority ? PRIORITY_COLOR[task.priority] : 'none'}
                      stroke={task.priority ? PRIORITY_COLOR[task.priority] : 'var(--border-strong)'}
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
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
