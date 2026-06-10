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
import { useDragDrop } from '../../hooks/useDragDrop';
import type { Task } from '../../types';

export function AppShell() {
  const { tasks, currentView, init } = useTaskStore(
    useShallow((s) => ({ tasks: s.tasks, currentView: s.currentView, init: s.init }))
  );

  const { onDragEnd } = useDragDrop();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    const taskId = rawId.startsWith('tb::') ? rawId.slice(4) : rawId;
    setActiveTask(tasks.find((t) => t.id === taskId) ?? null);
  }

  function handleDragEnd(event: Parameters<typeof onDragEnd>[0]) {
    setActiveTask(null);
    onDragEnd(event);
  }

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

      <DragOverlay>
        {activeTask && (
          <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 shadow-lg text-[13px] text-[#111827] opacity-90 max-w-[220px] truncate">
            {activeTask.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
