import { create } from 'zustand';
import type { AppView } from '../types';

export interface Rect { left: number; top: number; width: number; height: number }

/** The in-app quick-add overlay (N): the panel's input grows into a centered box. */
interface QuickStore {
  open: boolean;
  scheduledDate: string | null;
  /** Where the input sat when the overlay opened; null when it isn't on screen. */
  from: Rect | null;
  show: (scheduledDate: string | null) => void;
  hide: () => void;
}

/** DOM id of the input the overlay grows out of (and shrinks back into). */
export const QUICK_SOURCE_ID = 'quick-source';

export function sourceRect(): Rect | null {
  const r = document.getElementById(QUICK_SOURCE_ID)?.getBoundingClientRect();
  return r && r.width > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
}

export const useQuickStore = create<QuickStore>((set, get) => ({
  open: false,
  scheduledDate: null,
  from: null,
  show: (scheduledDate) => { if (!get().open) set({ open: true, scheduledDate, from: sourceRect() }); },
  hide: () => set({ open: false }),
}));

/** Opens the overlay for the current view: today's list in Today, the brain dump otherwise. */
export function openQuickOverlay(view: AppView, today: string) {
  useQuickStore.getState().show(view === 'today' ? today : null);
}
