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
import { MonthView } from '../monthly/MonthView';
import { Timebox } from '../timebox/Timebox';
import { TodayFocus } from '../today/TodayFocus';
import { TaskDetailPanel } from '../brain-dump/TaskDetailPanel';
import { TaskDragCard } from '../brain-dump/TaskItem';
import { useTaskStore } from '../../store/taskStore';
import { useIntegrationStore } from '../../store/integrationStore';
import { useDragDrop } from '../../hooks/useDragDrop';
import { UpdateBanner } from '../updater/UpdateBanner';
import { Toaster } from '../common/Toaster';
import { QuickOverlay } from '../quick/QuickOverlay';
import { openQuickOverlay } from '../../store/quickStore';
import { CommandPalette } from '../common/CommandPalette';
import { StatsDialog } from '../common/StatsDialog';
import { useBackground } from '../../hooks/useBackground';
import { planMyDay, undoLast } from '../../lib/actions';
import type { Task } from '../../types';

// @ts-expect-error Tauri injects this global in the webview
const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => { init(); }, [init]);
  useBackground();

  // "Quick add…" in the menu bar item opens the same box as C.
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    import('@tauri-apps/api/event').then(({ listen }) =>
      listen('open-quick-add', () => {
        const s = useTaskStore.getState();
        openQuickOverlay(s.currentView, s.today);
      }),
    ).then((fn) => { if (cancelled) fn(); else unlisten = fn; });
    return () => { cancelled = true; unlisten?.(); };
  }, []);

  useEffect(() => {
    const openStats = () => setStatsOpen(true);
    window.addEventListener('cortex:open-stats', openStats);
    return () => window.removeEventListener('cortex:open-stats', openStats);
  }, []);

  useEffect(() => {
    const refresh = () => {
      useTaskStore.getState().refreshDay();
      // Picks up calendar changes made elsewhere; a no-op while the cache is fresh.
      useIntegrationStore.getState().ensureEvents(useTaskStore.getState().timeboxDate);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      // Inputs keep their own text undo.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        void undoLast();
        return;
      }

      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const s = useTaskStore.getState();
        if (e.key === 'n') { e.preventDefault(); openQuickOverlay(s.currentView, s.today); }
        if (e.key === 'v') {
          e.preventDefault();
          s.setView(s.currentView === 'main' ? 'month' : s.currentView === 'month' ? 'today' : 'main');
        }
        if (e.key === 'b') { e.preventDefault(); s.toggleBrainDump(); }
        if (e.key === 't') { e.preventDefault(); s.toggleTimebox(); }
        if (e.key === ',') { e.preventDefault(); window.dispatchEvent(new Event('cortex:open-settings')); }
        if (e.key === 'p') { e.preventDefault(); void planMyDay(); }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const sensors = useSensors(
    // Small enough to feel immediate, large enough that a click still opens the task.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : rectIntersection(args);
  };

  function onDragStart(event: DragStartEvent) {
    document.body.classList.add('cx-dragging');
    window.getSelection()?.removeAllRanges();
    const rawId = event.active.id as string;
    const taskId = rawId.startsWith('tb::') ? rawId.slice(4)
                 : rawId.startsWith('eis::') ? rawId.slice(5)
                 : rawId;
    setActiveTask(tasks.find((t) => t.id === taskId) ?? null);
  }

  function endDragUi() {
    document.body.classList.remove('cx-dragging');
    setActiveTask(null);
  }

  function handleDragEnd(event: Parameters<typeof onDragEnd>[0]) {
    endDragUi();
    onDragEnd(event);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={endDragUi}
      // Handing focus back to the card after a drop shows a focus ring in WebKit.
      accessibility={{ restoreFocus: false }}
    >
      <div className="absolute inset-0 flex overflow-hidden" style={{ background: 'var(--bg)' }}>
        <AnimatePresence mode="wait" initial={false}>
          {currentView !== 'today' ? (
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
              {/* Week and month swap in place; the side panels stay put. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentView}
                  className="flex flex-1 min-w-0"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  {currentView === 'month' ? <MonthView /> : <WeeklyTimeline />}
                </motion.div>
              </AnimatePresence>
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
      <UpdateBanner />
      <QuickOverlay />
      <Toaster />
      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            key="palette"
            onClose={() => setPaletteOpen(false)}
            onOpenStats={() => setStatsOpen(true)}
          />
        )}
        {statsOpen && <StatsDialog key="stats" onClose={() => setStatsOpen(false)} />}
      </AnimatePresence>

      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' }}>
        {activeTask && <TaskDragCard title={activeTask.title} />}
      </DragOverlay>
    </DndContext>
  );
}
