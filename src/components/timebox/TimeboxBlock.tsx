import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useGeneralStore } from '../../store/generalStore';
import { formatTimeStr } from './Timebox';
import type { Task } from '../../types';

const HOUR_PX = 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface ColorScheme { bg: string; border: string; text: string }

interface Props {
  task: Task;
  color: ColorScheme;
}

export function TimeboxBlock({ task, color }: Props) {
  const { toggleComplete, updateTask, selectTask } = useTaskStore(
    useShallow((s) => ({ toggleComplete: s.toggleComplete, updateTask: s.updateTask, selectTask: s.selectTask }))
  );
  const timeFormat = useGeneralStore((s) => s.timeFormat);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tb::${task.id}`,
    data: { taskId: task.id },
  });

  if (!task.timebox_start || !task.timebox_end) return null;

  const startMin = timeToMinutes(task.timebox_start);
  const endMin = timeToMinutes(task.timebox_end);
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 24);

  const completedStyle: ColorScheme = task.is_completed
    ? { bg: 'var(--surface-3)', border: 'var(--border)', text: 'var(--text-4)' }
    : color;

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startEndMin = endMin;

    function onMouseMove(ev: MouseEvent) {
      const delta = Math.round(((ev.clientY - startY) / HOUR_PX) * 60 / 15) * 15;
      const newEndMin = Math.max(startMin + 15, Math.min(startEndMin + delta, 24 * 60));
      const h = Math.floor(newEndMin / 60);
      const m = newEndMin % 60;
      updateTask(task.id, { timebox_end: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` });
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
        borderColor: completedStyle.border,
      }}
      className="relative rounded-lg border px-2 py-1 cursor-grab active:cursor-grabbing flex flex-col gap-0.5 overflow-hidden select-none group/block"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <button
          className="flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-full border transition-colors flex items-center justify-center"
          style={{
            borderColor: task.is_completed ? completedStyle.text : completedStyle.border,
            background: task.is_completed ? completedStyle.text : undefined,
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
          className={`flex-1 text-[11px] font-medium leading-snug cursor-pointer hover:underline ${task.is_completed ? 'line-through' : ''}`}
          style={{ color: completedStyle.text }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); selectTask(task.id); }}
        >
          {task.title}
        </span>
        {/* Remove from timebox */}
        <button
          className="flex-shrink-0 opacity-0 group-hover/block:opacity-100 transition-opacity rounded"
          style={{ color: completedStyle.text }}
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
        <div className="flex items-center gap-1.5 pl-5">
          <span className="text-[10px]" style={{ color: completedStyle.text + 'BB' }}>
            {formatTimeStr(task.timebox_start!, timeFormat)} – {formatTimeStr(task.timebox_end!, timeFormat)}
          </span>
          {task.estimated_minutes != null && task.estimated_minutes > 0 && (() => {
            const blockMin = endMin - startMin;
            const match = blockMin === task.estimated_minutes;
            return (
              <span className="text-[10px]" style={{ color: match ? completedStyle.text + 'BB' : '#F59E0B' }}>
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
        <div className="w-8 h-0.5 rounded-full opacity-30" style={{ background: completedStyle.text }} />
      </div>
    </div>
  );
}
