import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './Header';
import { BrainDump } from '../brain-dump/BrainDump';
import { WeeklyTimeline } from '../weekly/WeeklyTimeline';
import { Timebox } from '../timebox/Timebox';
import { TodayFocus } from '../today/TodayFocus';
import { TaskDetailPanel } from '../brain-dump/TaskDetailPanel';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { useDragDrop } from '../../hooks/useDragDrop';
import { getBlockColor, HOUR_PX } from '../timebox/Timebox';
import type { Task } from '../../types';

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function TimeboxOverlay({ task }: { task: Task }) {
  const labels = useLabelStore((s) => s.labels);
  const labelColor = labels.find((l) => l.id === task.label)?.color ?? null;
  const color = getBlockColor(task.id, labelColor);

  const startMin = timeToMinutes(task.timebox_start!);
  const endMin   = timeToMinutes(task.timebox_end!);
  const height   = Math.max(((endMin - startMin) / 60) * HOUR_PX, 24);

  return (
    <div
      className="rounded-lg border px-2 py-1 shadow-lg flex flex-col gap-0.5 overflow-hidden"
      style={{ width: 220, height, background: color.bg, borderColor: color.border, opacity: 0.9 }}
    >
      <span className="text-[11px] font-medium truncate" style={{ color: color.text }}>
        {task.title}
      </span>
      {height > 36 && (
        <span className="text-[10px]" style={{ color: color.text + 'AA' }}>
          {task.timebox_start} – {task.timebox_end}
        </span>
      )}
    </div>
  );
}

export function AppShell() {
  const { tasks, currentView, init } = useTaskStore(
    useShallow((s) => ({ tasks: s.tasks, currentView: s.currentView, init: s.init }))
  );

  const { onDragEnd } = useDragDrop();
  const [activeTask, setActiveTask]             = useState<Task | null>(null);
  const [fromTimebox, setFromTimebox]           = useState(false);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === 't') {
        e.preventDefault();
        const s = useTaskStore.getState();
        s.setView(s.currentView === 'main' ? 'today' : 'main');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : rectIntersection(args);
  };

  function onDragStart(event: DragStartEvent) {
    const rawId = event.active.id as string;
    const isTimebox = rawId.startsWith('tb::');
    const taskId = isTimebox ? rawId.slice(4) : rawId;
    setFromTimebox(isTimebox);
    setActiveTask(tasks.find((t) => t.id === taskId) ?? null);
  }

  function handleDragEnd(event: Parameters<typeof onDragEnd>[0]) {
    setActiveTask(null);
    setFromTimebox(false);
    onDragEnd(event);
  }

  const showTimeboxOverlay =
    fromTimebox &&
    activeTask?.timebox_start != null &&
    activeTask?.timebox_end != null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-[#FAFAFA] overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {currentView === 'main' ? (
              <motion.div
                key="main"
                className="flex flex-1 overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <BrainDump />
                <WeeklyTimeline />
                <Timebox />
              </motion.div>
            ) : (
              <motion.div
                key="today"
                className="flex flex-1 overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <TodayFocus />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <TaskDetailPanel />

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          showTimeboxOverlay ? (
            <TimeboxOverlay task={activeTask} />
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 shadow-lg text-[13px] text-[#111827] opacity-90 max-w-[220px] truncate">
              {activeTask.title}
            </div>
          )
        )}
      </DragOverlay>
    </DndContext>
  );
}
