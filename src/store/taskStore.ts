import { create } from 'zustand';
import { startOfWeek, addWeeks, subWeeks, format, addDays, subDays } from 'date-fns';
import type { Task, TaskUpdate, AppView } from '../types';
import { dbGetAllTasks, dbCreateTask, dbUpdateTask, dbDeleteTask } from '../lib/db';
import { useGeneralStore } from './generalStore';

const ws = () => useGeneralStore.getState().weekStartsOn;

interface TaskStore {
  tasks: Task[];
  currentView: AppView;
  currentWeekStart: Date;
  today: string;
  initialized: boolean;
  selectedTaskId: string | null;
  timeboxDate: string;
  showBrainDump: boolean;
  showTimebox: boolean;

  init: () => Promise<void>;
  refreshDay: () => void;
  addTask: (title: string, extras?: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => Promise<Task>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  setView: (view: AppView) => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  navigateToToday: () => void;
  selectTask: (id: string | null) => void;
  navigateTimeboxDate: (direction: 'prev' | 'next' | 'today') => void;
  toggleBrainDump: () => void;
  toggleTimebox: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentView: useGeneralStore.getState().defaultView,
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn: useGeneralStore.getState().weekStartsOn }),
  today: format(new Date(), 'yyyy-MM-dd'),
  initialized: false,
  selectedTaskId: null,
  timeboxDate: format(new Date(), 'yyyy-MM-dd'),
  showBrainDump: true,
  showTimebox: true,

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
      created_at: now,
      updated_at: now,
      ...extras,
    };
    try { await dbCreateTask(task); } catch { /* non-Tauri */ }
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, updates) => {
    const now = new Date().toISOString();
    try { await dbUpdateTask(id, updates); } catch { /* non-Tauri */ }
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: now } : t
      ),
    }));
  },

  deleteTask: async (id) => {
    try { await dbDeleteTask(id); } catch { /* non-Tauri */ }
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
    }));
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const updates = { is_completed: !task.is_completed };
    try { await dbUpdateTask(id, updates); } catch { /* non-Tauri */ }
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  setView: (view) => set((s) => ({
    currentView: view,
    timeboxDate: view === 'today' ? format(new Date(), 'yyyy-MM-dd') : s.timeboxDate,
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
    const newToday = format(new Date(), 'yyyy-MM-dd');
    set((s) => ({
      today: newToday,
      // only snap timeboxDate to today if it was already on today before
      timeboxDate: s.timeboxDate === s.today ? newToday : s.timeboxDate,
      // snap week to current week only if user hasn't navigated away
      currentWeekStart: startOfWeek(new Date(), { weekStartsOn: ws() }),
    }));
  },
}));
