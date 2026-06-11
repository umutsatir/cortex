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
import { BrainDump } from '../brain-dump/BrainDump';
import { WeeklyTimeline } from '../weekly/WeeklyTimeline';
import { Timebox } from '../timebox/Timebox';
import { TodayFocus } from '../today/TodayFocus';
import { TaskDetailPanel } from '../brain-dump/TaskDetailPanel';
import { useTaskStore } from '../../store/taskStore';
import { useDragDrop } from '../../hooks/useDragDrop';
import type { Task } from '../../types';

export function AppShell() {
  const { tasks, currentView, init, showBrainDump, showTimebox } = useTaskStore(
    useShallow((s) => ({
      tasks: s.tasks,
      currentView: s.currentView,
      init: s.init,
      showBrainDump: s.showBrainDump,
      showTimebox: s.showTimebox,
    }))
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
    const taskId = rawId.startsWith('tb::') ? rawId.slice(4)
                 : rawId.startsWith('eis::') ? rawId.slice(5)
                 : rawId;
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
      <div className="absolute inset-0 flex overflow-hidden" style={{ background: 'var(--bg)' }}>
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
              <AnimatePresence initial={false}>
                {showBrainDump && (
                  <motion.div
                    key="braindump"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden flex-shrink-0 h-full"
                  >
                    <BrainDump />
                  </motion.div>
                )}
              </AnimatePresence>
              <WeeklyTimeline />
              <AnimatePresence initial={false}>
                {showTimebox && (
                  <motion.div
                    key="timebox"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden flex-shrink-0 h-full"
                  >
                    <Timebox />
                  </motion.div>
                )}
              </AnimatePresence>
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

      <TaskDetailPanel />

      <DragOverlay>
        {activeTask && (
          <div className="rounded-lg px-3 py-2 shadow-lg text-[13px] opacity-90 max-w-[220px] truncate" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
            {activeTask.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
