import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types';

const HOUR_PX = 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface Props {
  task: Task;
}

export function TimeboxBlock({ task }: Props) {
  const { toggleComplete, updateTask, selectTask } = useTaskStore(
    useShallow((s) => ({ toggleComplete: s.toggleComplete, updateTask: s.updateTask, selectTask: s.selectTask }))
  );

  // Prefix avoids duplicate draggable IDs when the same task appears in another panel
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tb::${task.id}`,
    data: { taskId: task.id },
  });

  if (!task.timebox_start || !task.timebox_end) return null;

  const startMin = timeToMinutes(task.timebox_start);
  const endMin = timeToMinutes(task.timebox_end);
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 24);

  const style = {
    height: `${height}px`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

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
      style={style}
      className={`relative rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing flex flex-col gap-0.5 overflow-hidden select-none ${
        task.is_completed
          ? 'bg-[#F3F4F6] border border-[#E5E7EB]'
          : 'bg-[#EEF2FF] border border-[#C7D2FE]'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <button
          className="flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-full border border-[#818CF8] transition-colors flex items-center justify-center"
          style={{ background: task.is_completed ? '#6366F1' : undefined }}
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
          className={`flex-1 text-[11px] font-medium leading-snug cursor-pointer hover:underline ${task.is_completed ? 'text-[#9CA3AF] line-through' : 'text-[#3730A3]'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); selectTask(task.id); }}
        >
          {task.title}
        </span>
      </div>

      {height > 40 && (
        <div className="flex items-center gap-1.5 pl-5">
          <span className="text-[10px] text-[#818CF8]">
            {task.timebox_start} – {task.timebox_end}
          </span>
          {task.estimated_minutes != null && task.estimated_minutes > 0 && (() => {
            const blockMin = timeToMinutes(task.timebox_end!) - timeToMinutes(task.timebox_start!);
            const match = blockMin === task.estimated_minutes;
            return (
              <span className={`text-[10px] ${match ? 'text-[#818CF8]' : 'text-[#F59E0B]'}`}>
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
        <div className="w-8 h-0.5 bg-[#818CF8] rounded-full opacity-40" />
      </div>
    </div>
  );
}
