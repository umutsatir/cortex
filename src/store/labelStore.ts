import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export const PRESET_COLORS = [
  '#10B981', '#6366F1', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#F97316',
];

interface LabelStore {
  labels: Label[];
  addLabel: (name: string, color: string) => Label;
  deleteLabel: (id: string) => void;
}

export const useLabelStore = create<LabelStore>()(
  persist(
    (set) => ({
      labels: [],

      addLabel: (name, color) => {
        const label: Label = { id: crypto.randomUUID(), name, color };
        set((s) => ({ labels: [...s.labels, label] }));
        return label;
      },

      deleteLabel: (id) =>
        set((s) => ({ labels: s.labels.filter((l) => l.id !== id) })),
    }),
    { name: 'cortex-labels' }
  )
);

export function getLabelById(id: string | null): Label | null {
  if (!id) return null;
  return useLabelStore.getState().labels.find((l) => l.id === id) ?? null;
}
