import { create } from 'zustand';
import { startOfWeek, addWeeks, subWeeks, format, addDays, subDays, parseISO, addMonths } from 'date-fns';
import type { Task, TaskUpdate, AppView } from '../types';
import { dbGetAllTasks, dbCreateTask, dbUpdateTask, dbDeleteTask, dbReplaceTask } from '../lib/db';
import { nextOccurrence } from '../lib/recurrence';
import { useGeneralStore } from './generalStore';

const ws = () => useGeneralStore.getState().weekStartsOn;
const todayStr = () => format(new Date(), 'yyyy-MM-dd');

/** How a set of tasks looked before a change; `null` means the task didn't exist. */
type Snapshot = Map<string, Task | null>;
interface UndoEntry {
  label: string;
  before: Snapshot;
  at: number;
  coalesceKey?: string;
  /** Extra state to restore that isn't on tasks (e.g. hidden suggestions). */
  onUndo?: () => void;
}

const UNDO_LIMIT = 50;
/** Edits to the same field of the same task within this window undo as one step. */
const COALESCE_MS = 1500;

// The batch being recorded (see `batch`), so several changes undo in one step.
let openBatch: UndoEntry | null = null;

interface TaskStore {
  tasks: Task[];
  currentView: AppView;
  currentWeekStart: Date;
  /** Month shown in the month view, `YYYY-MM`. */
  monthCursor: string;
  today: string;
  initialized: boolean;
  selectedTaskId: string | null;
  timeboxDate: string;
  showBrainDump: boolean;
  showTimebox: boolean;
  undoStack: UndoEntry[];

  init: () => Promise<void>;
  refreshDay: () => void;
  addTask: (title: string, extras?: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => Promise<Task>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  /** Runs `fn` so that all its changes undo together. */
  batch: (label: string, fn: () => Promise<void>, onUndo?: () => void) => Promise<void>;
  /** Reverts the last change; returns its label, or null when there's nothing to undo. */
  undo: () => Promise<string | null>;
  setView: (view: AppView) => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  navigateToToday: () => void;
  navigateMonth: (direction: 'prev' | 'next' | 'today') => void;
  /** Shows the week containing `date` and puts the timebox on it. */
  goToDate: (date: string) => void;
  selectTask: (id: string | null) => void;
  navigateTimeboxDate: (direction: 'prev' | 'next' | 'today') => void;
  toggleBrainDump: () => void;
  toggleTimebox: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => {
  /** Records the state of `ids` before a change, unless this change merges into the last step. */
  const record = (label: string, ids: string[], coalesceKey?: string) => {
    const snap = (id: string) => get().tasks.find((t) => t.id === id) ?? null;
    if (openBatch) {
      for (const id of ids) if (!openBatch.before.has(id)) openBatch.before.set(id, snap(id));
      return;
    }
    const last = get().undoStack[get().undoStack.length - 1];
    if (coalesceKey && last?.coalesceKey === coalesceKey && Date.now() - last.at < COALESCE_MS) {
      last.at = Date.now();
      return;
    }
    const entry: UndoEntry = { label, before: new Map(ids.map((id) => [id, snap(id)])), at: Date.now(), coalesceKey };
    set((s) => ({ undoStack: [...s.undoStack.slice(-(UNDO_LIMIT - 1)), entry] }));
  };

  const insert = async (task: Task) => {
    try { await dbCreateTask(task); } catch { /* non-Tauri */ }
    set((s) => ({ tasks: [...s.tasks, task] }));
  };

  const patch = async (id: string, updates: TaskUpdate) => {
    const now = new Date().toISOString();
    try { await dbUpdateTask(id, updates); } catch { /* non-Tauri */ }
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates, updated_at: now } : t)) }));
  };

  const remove = async (id: string) => {
    try { await dbDeleteTask(id); } catch { /* non-Tauri */ }
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
    }));
  };

  return {
    tasks: [],
    currentView: useGeneralStore.getState().defaultView,
    currentWeekStart: startOfWeek(new Date(), { weekStartsOn: useGeneralStore.getState().weekStartsOn }),
    monthCursor: todayStr().slice(0, 7),
    today: todayStr(),
    initialized: false,
    selectedTaskId: null,
    timeboxDate: todayStr(),
    showBrainDump: true,
    showTimebox: true,
    undoStack: [],

    init: async () => {
      if (get().initialized) return;
      try {
        const tasks = await dbGetAllTasks();
        set({ tasks, initialized: true });
      } catch {
        set({ initialized: true });
      }
    },

    addTask: async (title, extras = {}) => {
      const now = new Date().toISOString();
      const task: Task = {
        id: crypto.randomUUID(),
        title,
        is_completed: false,
        scheduled_date: null,
        timebox_start: null,
        timebox_end: null,
        eisenhower_quadrant: null,
        due_date: null,
        estimated_minutes: null,
        priority: null,
        label: null,
        notes: null,
        recurrence: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
        ...extras,
      };
      record('Add task', [task.id]);
      await insert(task);
      return task;
    },

    updateTask: async (id, updates) => {
      const fields = Object.keys(updates).sort().join(',');
      record('Edit task', [id], `${id}|${fields}`);
      await patch(id, updates);
    },

    deleteTask: async (id) => {
      record('Delete task', [id]);
      await remove(id);
    },

    toggleComplete: async (id) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      const done = !task.is_completed;

      // A repeating task hands its rule to the next occurrence when it's checked off.
      if (done && task.recurrence) {
        await get().batch('Complete task', async () => {
          const today = todayStr();
          const next = nextOccurrence(task.recurrence!, task.scheduled_date ?? today, today);
          await patch(id, { is_completed: true, completed_at: new Date().toISOString(), recurrence: null });
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = task;
          await get().addTask(task.title, {
            ...rest,
            is_completed: false,
            completed_at: null,
            scheduled_date: next,
            due_date: null,
          });
        });
        return;
      }

      record(done ? 'Complete task' : 'Reopen task', [id]);
      await patch(id, { is_completed: done, completed_at: done ? new Date().toISOString() : null });
    },

    batch: async (label, fn, onUndo) => {
      if (openBatch) { await fn(); return; } // nested: join the outer batch
      const entry: UndoEntry = { label, before: new Map(), at: Date.now(), onUndo };
      openBatch = entry;
      try {
        await fn();
      } finally {
        openBatch = null;
        if (entry.before.size > 0 || onUndo) set((s) => ({ undoStack: [...s.undoStack.slice(-(UNDO_LIMIT - 1)), entry] }));
      }
    },

    undo: async () => {
      const entry = get().undoStack[get().undoStack.length - 1];
      if (!entry) return null;
      set((s) => ({ undoStack: s.undoStack.slice(0, -1) }));
      for (const [id, before] of entry.before) {
        const exists = get().tasks.some((t) => t.id === id);
        if (before === null) {
          if (exists) await remove(id);
        } else if (exists) {
          try { await dbReplaceTask(before); } catch { /* non-Tauri */ }
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? before : t)) }));
        } else {
          await insert(before);
        }
      }
      entry.onUndo?.();
      return entry.label;
    },

    setView: (view) => set((s) => ({
      currentView: view,
      timeboxDate: view === 'today' ? todayStr() : s.timeboxDate,
      // The month view opens on the month of the day in the timebox.
      monthCursor: view === 'month' ? s.timeboxDate.slice(0, 7) : s.monthCursor,
    })),

    navigateWeek: (direction) =>
      set((s) => ({
        currentWeekStart:
          direction === 'next'
            ? addWeeks(s.currentWeekStart, 1)
            : subWeeks(s.currentWeekStart, 1),
      })),

    navigateToToday: () =>
      set({ currentWeekStart: startOfWeek(new Date(), { weekStartsOn: ws() }) }),

    goToDate: (date) =>
      set({ currentWeekStart: startOfWeek(parseISO(date), { weekStartsOn: ws() }), timeboxDate: date, monthCursor: date.slice(0, 7) }),

    navigateMonth: (direction) =>
      set((s) => ({
        monthCursor: direction === 'today'
          ? todayStr().slice(0, 7)
          : format(addMonths(parseISO(`${s.monthCursor}-01`), direction === 'next' ? 1 : -1), 'yyyy-MM'),
      })),

    selectTask: (id) => set({ selectedTaskId: id }),

    navigateTimeboxDate: (direction) =>
      set((s) => {
        const cur = new Date(s.timeboxDate + 'T00:00:00');
        const next =
          direction === 'today' ? new Date()
          : direction === 'next' ? addDays(cur, 1)
          : subDays(cur, 1);
        return { timeboxDate: format(next, 'yyyy-MM-dd') };
      }),

    toggleBrainDump: () => set((s) => ({ showBrainDump: !s.showBrainDump })),
    toggleTimebox:   () => set((s) => ({ showTimebox:   !s.showTimebox   })),

    refreshDay: () => {
      const newToday = todayStr();
      set((s) => ({
        today: newToday,
        // only snap timeboxDate to today if it was already on today before
        timeboxDate: s.timeboxDate === s.today ? newToday : s.timeboxDate,
        // snap week to current week only if user hasn't navigated away
        currentWeekStart: startOfWeek(new Date(), { weekStartsOn: ws() }),
      }));
    },
  };
});
