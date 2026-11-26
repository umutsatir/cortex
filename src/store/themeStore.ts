import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'system' | 'light' | 'dark';

/** `strong` fills primary buttons, so white text on it must pass AA. */
type AccentVars = { accent: string; bg: string; border: string; text: string; strong: string };

export type AccentPreset = {
  id: string;
  label: string;
  color: string;
  light: AccentVars;
  dark:  AccentVars;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'indigo', label: 'Indigo', color: '#6366F1',
    light: { accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA', strong: '#4F46E5' },
    dark:  { accent: '#818CF8', bg: '#1E1B4B', border: '#312E81', text: '#A5B4FC', strong: '#4F46E5' },
  },
  {
    id: 'blue', label: 'Blue', color: '#3B82F6',
    light: { accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', strong: '#2563EB' },
    dark:  { accent: '#60A5FA', bg: '#0F2A4A', border: '#1E40AF', text: '#93C5FD', strong: '#2563EB' },
  },
  {
    id: 'cyan', label: 'Cyan', color: '#06B6D4',
    light: { accent: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', text: '#0E7490', strong: '#0E7490' },
    dark:  { accent: '#22D3EE', bg: '#0A2A30', border: '#155E75', text: '#67E8F9', strong: '#0E7490' },
  },
  {
    id: 'emerald', label: 'Emerald', color: '#10B981',
    light: { accent: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', strong: '#047857' },
    dark:  { accent: '#34D399', bg: '#022C22', border: '#065F46', text: '#6EE7B7', strong: '#047857' },
  },
  {
    id: 'rose', label: 'Rose', color: '#F43F5E',
    light: { accent: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', strong: '#E11D48' },
    dark:  { accent: '#FB7185', bg: '#4C0519', border: '#9F1239', text: '#FDA4AF', strong: '#E11D48' },
  },
  {
    id: 'orange', label: 'Orange', color: '#F97316',
    light: { accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', strong: '#C2410C' },
    dark:  { accent: '#FB923C', bg: '#3A1505', border: '#9A3412', text: '#FDBA74', strong: '#C2410C' },
  },
  {
    id: 'pink', label: 'Pink', color: '#EC4899',
    light: { accent: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8', text: '#BE185D', strong: '#DB2777' },
    dark:  { accent: '#F472B6', bg: '#3D0A24', border: '#9D174D', text: '#F9A8D4', strong: '#DB2777' },
  },
  {
    id: 'slate', label: 'Slate', color: '#64748B',
    light: { accent: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', text: '#334155', strong: '#475569' },
    dark:  { accent: '#94A3B8', bg: '#1E293B', border: '#334155', text: '#CBD5E1', strong: '#475569' },
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
  root.style.setProperty('--accent-soft',   vars.bg);
  root.style.setProperty('--accent-line',   vars.border);
  root.style.setProperty('--accent-hover',  vars.text);
  root.style.setProperty('--accent-strong', vars.strong);
}
