import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView } from '../types';
import type { MatrixScope } from '../lib/eisenhower';

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
  /** "Plan my day" fills this window (minutes since midnight). */
  workStart: number;
  workEnd: number;
  /** Break "Plan my day" leaves between tasks and around events, in minutes. */
  breakMinutes: number;
  /** "Plan my day" starts with one short task before the most important one. */
  warmUp: boolean;
  /** macOS notification before a timebox starts. The menu bar item is separate. */
  notifyEnabled: boolean;
  /** Minutes before a timebox to notify. */
  notifyLead: number;
  showMenuBar: boolean;
  /** Day the "unfinished tasks" banner was dismissed. */
  rolloverDismissed: string | null;
  /** Tasks whose suggested Eisenhower quadrant was dismissed (×). */
  hiddenSuggestions: string[];
  /** Which tasks the Eisenhower matrix shows. */
  matrixScope: MatrixScope;
  setLanguage: (l: Lang) => void;
  setWeekStartsOn: (d: WeekStart) => void;
  setDefaultView: (v: AppView) => void;
  setTimeFormat: (f: TimeFormat) => void;
  setDateFormat: (f: DateFormat) => void;
  setWorkHours: (start: number, end: number) => void;
  setBreakMinutes: (m: number) => void;
  setWarmUp: (v: boolean) => void;
  setNotifyEnabled: (v: boolean) => void;
  setNotifyLead: (m: number) => void;
  setShowMenuBar: (v: boolean) => void;
  dismissRollover: (day: string) => void;
  hideSuggestion: (taskId: string) => void;
  setHiddenSuggestions: (ids: string[]) => void;
  setMatrixScope: (s: MatrixScope) => void;
}

export const useGeneralStore = create<GeneralStore>()(
  persist(
    (set) => ({
      language: 'en',
      weekStartsOn: 1,
      defaultView: 'main',
      timeFormat: '24h',
      dateFormat: 'dd/MM/yyyy',
      workStart: 9 * 60,
      workEnd: 18 * 60,
      breakMinutes: 30,
      warmUp: true,
      notifyEnabled: true,
      notifyLead: 5,
      showMenuBar: true,
      rolloverDismissed: null,
      hiddenSuggestions: [],
      matrixScope: 'week',
      setLanguage:     (language)     => set({ language }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setDefaultView:  (defaultView)  => set({ defaultView }),
      setTimeFormat:   (timeFormat)   => set({ timeFormat }),
      setDateFormat:   (dateFormat)   => set({ dateFormat }),
      setWorkHours:    (workStart, workEnd) => set({ workStart, workEnd }),
      setBreakMinutes: (breakMinutes) => set({ breakMinutes }),
      setWarmUp:       (warmUp)       => set({ warmUp }),
      setNotifyEnabled: (notifyEnabled) => set({ notifyEnabled }),
      setNotifyLead:   (notifyLead)   => set({ notifyLead }),
      setShowMenuBar:  (showMenuBar)  => set({ showMenuBar }),
      dismissRollover: (rolloverDismissed) => set({ rolloverDismissed }),
      setMatrixScope:  (matrixScope)  => set({ matrixScope }),
      setHiddenSuggestions: (hiddenSuggestions) => set({ hiddenSuggestions }),
      hideSuggestion:  (id) => set((s) => ({ hiddenSuggestions: [...s.hiddenSuggestions.slice(-499), id] })),
    }),
    { name: 'cortex-general' }
  )
);
