import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useGeneralStore } from '../../store/generalStore';
import { formatTimeStr, type BlockColor } from './Timebox';
import { HOUR_PX, SLOT_MIN, minutesToTime, timeToMinutes } from '../../lib/time';
import type { Task } from '../../types';

interface Props {
  task: Task;
  color: BlockColor;
  lang?: string;
}

export function TimeboxBlock({ task, color, lang = 'en' }: Props) {
  const { toggleComplete, updateTask, selectTask } = useTaskStore(
    useShallow((s) => ({ toggleComplete: s.toggleComplete, updateTask: s.updateTask, selectTask: s.selectTask }))
  );
  const timeFormat = useGeneralStore((s) => s.timeFormat);
  // End time while the resize handle is being dragged; saved once on mouseup.
  const [resizeEnd, setResizeEnd] = useState<number | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tb::${task.id}`,
    data: { taskId: task.id },
  });

  if (!task.timebox_start || !task.timebox_end) return null;

  const startMin = timeToMinutes(task.timebox_start);
  const endMin = resizeEnd ?? timeToMinutes(task.timebox_end);
  const endStr = minutesToTime(endMin);
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 24);

  const completedStyle: BlockColor = task.is_completed
    ? { bg: 'var(--surface-hover)', border: 'var(--border)', text: 'var(--ink-secondary)', meta: 'var(--ink-secondary)' }
    : color;

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startEndMin = endMin;
    let latest = startEndMin;

    function onMouseMove(ev: MouseEvent) {
      const delta = Math.round(((ev.clientY - startY) / HOUR_PX) * 60 / SLOT_MIN) * SLOT_MIN;
      latest = Math.max(startMin + SLOT_MIN, Math.min(startEndMin + delta, 24 * 60));
      setResizeEnd(latest);
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizeEnd(null);
      if (latest !== startEndMin) updateTask(task.id, { timebox_end: minutesToTime(latest) });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        height: `${height}px`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        background: completedStyle.bg,
        border: `1px solid ${completedStyle.border}`,
        borderRadius: 'var(--radius-md)',
      }}
      className="cx-lift cx-rise-in relative px-3 py-1.5 cursor-grab hover:shadow-[var(--shadow-hover)] active:cursor-grabbing flex flex-col gap-0.5 overflow-hidden select-none touch-none group/block"
      onDragStart={(e) => e.preventDefault()}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <button
          className="flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-full border transition-colors flex items-center justify-center"
          style={{
            borderColor: task.is_completed ? 'var(--accent)' : completedStyle.meta,
            background: task.is_completed ? 'var(--accent)' : undefined,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
        >
          {task.is_completed && (
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
              <path d="M1 3.5L3 5.5L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span
          className={`flex-1 min-w-0 text-[13px] font-semibold leading-[18px] cursor-pointer hover:underline ${task.is_completed ? 'line-through' : ''}`}
          style={{ color: completedStyle.text }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); selectTask(task.id); }}
        >
          {task.title}
        </span>
        {/* Remove from timebox */}
        <button
          className="flex-shrink-0 opacity-0 group-hover/block:opacity-100 transition-opacity rounded"
          style={{ color: completedStyle.meta }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            updateTask(task.id, { timebox_start: null, timebox_end: null });
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {height > 40 && (
        <div className="flex items-center gap-1.5 pl-5 mt-0.5">
          <span className="text-[12px] font-medium tabular-nums" style={{ color: completedStyle.meta }}>
            {formatTimeStr(task.timebox_start!, timeFormat, lang)} – {formatTimeStr(endStr, timeFormat, lang)}
          </span>
          {task.estimated_minutes != null && task.estimated_minutes > 0 && (() => {
            const blockMin = endMin - startMin;
            const match = blockMin === task.estimated_minutes;
            return (
              <span className="text-[12px] font-medium tabular-nums" style={{ color: match ? completedStyle.meta : 'var(--warn)' }}>
                · est {task.estimated_minutes < 60 ? `${task.estimated_minutes}m` : `${Math.floor(task.estimated_minutes / 60)}h${task.estimated_minutes % 60 ? (task.estimated_minutes % 60) + 'm' : ''}`}
              </span>
            );
          })()}
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize flex items-end justify-center pb-0.5"
        onMouseDown={handleResizeMouseDown}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="w-[22px] h-[3px] rounded-full opacity-0 group-hover/block:opacity-60 transition-opacity" style={{ background: 'var(--accent)' }} />
      </div>
    </div>
  );
}
