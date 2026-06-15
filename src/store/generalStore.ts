import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView } from '../types';

export type Lang = 'en' | 'tr';
export type TimeFormat = '12h' | '24h';
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday
export type DateFormat = 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';

interface GeneralStore {
  language: Lang;
  weekStartsOn: WeekStart;
  defaultView: AppView;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  setLanguage: (l: Lang) => void;
  setWeekStartsOn: (d: WeekStart) => void;
  setDefaultView: (v: AppView) => void;
  setTimeFormat: (f: TimeFormat) => void;
  setDateFormat: (f: DateFormat) => void;
}

export const useGeneralStore = create<GeneralStore>()(
  persist(
    (set) => ({
      language: 'en',
      weekStartsOn: 1,
      defaultView: 'main',
      timeFormat: '24h',
      dateFormat: 'dd/MM/yyyy',
      setLanguage:     (language)     => set({ language }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setDefaultView:  (defaultView)  => set({ defaultView }),
      setTimeFormat:   (timeFormat)   => set({ timeFormat }),
      setDateFormat:   (dateFormat)   => set({ dateFormat }),
    }),
    { name: 'cortex-general' }
  )
);
