import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView } from '../types';

export type Lang = 'en' | 'tr';
export type TimeFormat = '12h' | '24h';
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

interface GeneralStore {
  language: Lang;
  weekStartsOn: WeekStart;
  defaultView: AppView;
  timeFormat: TimeFormat;
  setLanguage: (l: Lang) => void;
  setWeekStartsOn: (d: WeekStart) => void;
  setDefaultView: (v: AppView) => void;
  setTimeFormat: (f: TimeFormat) => void;
}

export const useGeneralStore = create<GeneralStore>()(
  persist(
    (set) => ({
      language: 'en',
      weekStartsOn: 1,
      defaultView: 'main',
      timeFormat: '24h',
      setLanguage:     (language)     => set({ language }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setDefaultView:  (defaultView)  => set({ defaultView }),
      setTimeFormat:   (timeFormat)   => set({ timeFormat }),
    }),
    { name: 'cortex-general' }
  )
);
