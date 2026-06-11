import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'system' | 'light' | 'dark';

export type AccentPreset = {
  id: string;
  label: string;
  color: string;
  light: { accent: string; bg: string; border: string; text: string };
  dark:  { accent: string; bg: string; border: string; text: string };
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'indigo', label: 'Indigo', color: '#6366F1',
    light: { accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
    dark:  { accent: '#818CF8', bg: '#1E1B4B', border: '#312E81', text: '#A5B4FC' },
  },
  {
    id: 'blue', label: 'Blue', color: '#3B82F6',
    light: { accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    dark:  { accent: '#60A5FA', bg: '#0F2A4A', border: '#1E40AF', text: '#93C5FD' },
  },
  {
    id: 'cyan', label: 'Cyan', color: '#06B6D4',
    light: { accent: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', text: '#0E7490' },
    dark:  { accent: '#22D3EE', bg: '#0A2A30', border: '#155E75', text: '#67E8F9' },
  },
  {
    id: 'emerald', label: 'Emerald', color: '#10B981',
    light: { accent: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
    dark:  { accent: '#34D399', bg: '#022C22', border: '#065F46', text: '#6EE7B7' },
  },
  {
    id: 'rose', label: 'Rose', color: '#F43F5E',
    light: { accent: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' },
    dark:  { accent: '#FB7185', bg: '#4C0519', border: '#9F1239', text: '#FDA4AF' },
  },
  {
    id: 'orange', label: 'Orange', color: '#F97316',
    light: { accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
    dark:  { accent: '#FB923C', bg: '#3A1505', border: '#9A3412', text: '#FDBA74' },
  },
  {
    id: 'pink', label: 'Pink', color: '#EC4899',
    light: { accent: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8', text: '#BE185D' },
    dark:  { accent: '#F472B6', bg: '#3D0A24', border: '#9D174D', text: '#F9A8D4' },
  },
  {
    id: 'slate', label: 'Slate', color: '#64748B',
    light: { accent: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', text: '#334155' },
    dark:  { accent: '#94A3B8', bg: '#1E293B', border: '#334155', text: '#CBD5E1' },
  },
];

interface ThemeStore {
  theme: Theme;
  accent: string;
  setTheme: (t: Theme) => void;
  setAccent: (id: string) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'indigo',
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: 'cortex-theme' }
  )
);

export function applyTheme(theme: Theme, accentId?: string) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);

  const id = accentId ?? useThemeStore.getState().accent;
  const preset = ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
  const vars = isDark ? preset.dark : preset.light;
  root.style.setProperty('--accent',        vars.accent);
  root.style.setProperty('--accent-bg',     vars.bg);
  root.style.setProperty('--accent-border', vars.border);
  root.style.setProperty('--accent-text',   vars.text);
}
