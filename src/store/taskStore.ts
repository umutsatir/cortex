import { create } from 'zustand';
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';
import type { Task, TaskUpdate, AppView } from '../types';
import { dbGetAllTasks, dbCreateTask, dbUpdateTask, dbDeleteTask } from '../lib/db';

interface TaskStore {
  tasks: Task[];
  currentView: AppView;
  currentWeekStart: Date;
  initialized: boolean;
  selectedTaskId: string | null;

  init: () => Promise<void>;
  addTask: (title: string, extras?: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => Promise<Task>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  setView: (view: AppView) => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  navigateToToday: () => void;
  selectTask: (id: string | null) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentView: 'main',
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
  initialized: false,
  selectedTaskId: null,

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

  setView: (view) => set({ currentView: view }),

  navigateWeek: (direction) =>
    set((s) => ({
      currentWeekStart:
        direction === 'next'
          ? addWeeks(s.currentWeekStart, 1)
          : subWeeks(s.currentWeekStart, 1),
    })),

  navigateToToday: () =>
    set({ currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }) }),

  selectTask: (id) => set({ selectedTaskId: id }),
}));
