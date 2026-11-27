import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface ToastStore {
  toasts: Toast[];
  show: (text: string, action?: Toast['action']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const TTL_MS = 4500;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (text, action) => {
    const id = nextId++;
    // At most three on screen; the newest replaces the oldest.
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, action }] }));
    setTimeout(() => get().dismiss(id), TTL_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (text: string, action?: Toast['action']) => useToastStore.getState().show(text, action);
