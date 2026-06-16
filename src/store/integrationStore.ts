import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface AppleCalendar {
  id: string;   // CalDAV href (stable identifier)
  name: string;
  href: string; // Full URL
  color: string;
}

export interface CalEvent {
  id: string;
  title: string;
  startTime: string; // "HH:MM" local time
  endTime: string;
  calHref: string;
  allDay: boolean;
  date: string; // "YYYY-MM-DD" local date
}

const PALETTE = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6',
];

function monthRange(yearMonth: string): { startDate: string; endDate: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    startDate: `${yearMonth}-01`,
    endDate: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
  };
}

function toYearMonth(date: string) {
  return date.slice(0, 7); // "YYYY-MM"
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface IntegrationStore {
  connected: boolean;
  email: string;
  password: string;
  calendars: AppleCalendar[];
  disabledIds: string[];
  eventsCache: Record<string, CalEvent[]>; // keyed by "YYYY-MM-DD"
  cachedMonths: Record<string, number>;    // "YYYY-MM" → timestamp of last fetch
  loading: boolean;
  error: string | null;

  connect: (email: string, password: string) => Promise<void>;
  disconnect: () => void;
  toggleCalendar: (id: string) => void;
  setCalendarColor: (id: string, color: string) => void;
  fetchEventsForDate: (date: string) => Promise<void>;
  invalidateCache: () => void;
}

export const useIntegrationStore = create<IntegrationStore>()(
  persist(
    (set, get) => ({
      connected: false,
      email: '',
      password: '',
      calendars: [],
      disabledIds: [],
      eventsCache: {},
      cachedMonths: {},
      loading: false,
      error: null,

      connect: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const raw = await invoke<string>('caldav_connect', { email, password });
          const rawCalendars: (Omit<AppleCalendar, 'color'> & { color?: string })[] = JSON.parse(raw);
          if (rawCalendars.length === 0) throw new Error('No calendars found');
          const calendars: AppleCalendar[] = rawCalendars.map((c, i) => ({
            ...c,
            color: c.color || PALETTE[i % PALETTE.length],
          }));
          set({ connected: true, email, password, calendars, loading: false, error: null, eventsCache: {}, cachedMonths: {} });
        } catch (e) {
          set({ loading: false, error: String(e).replace('Err ', ''), connected: false });
        }
      },

      disconnect: () => {
        set({ connected: false, email: '', password: '', calendars: [], eventsCache: {}, cachedMonths: {}, disabledIds: [], error: null });
      },

      toggleCalendar: (id) => {
        set((s) => ({
          disabledIds: s.disabledIds.includes(id)
            ? s.disabledIds.filter((d) => d !== id)
            : [...s.disabledIds, id],
          eventsCache: {},
          cachedMonths: {},
        }));
      },

      setCalendarColor: (id, color) => {
        set((s) => ({
          calendars: s.calendars.map((c) => c.id === id ? { ...c, color } : c),
        }));
      },

      invalidateCache: () => {
        set({ eventsCache: {}, cachedMonths: {} });
      },

      fetchEventsForDate: async (date) => {
        const { connected, email, password, calendars, disabledIds, cachedMonths } = get();
        if (!connected || !email || !password) return;

        const yearMonth = toYearMonth(date);
        const cachedAt = cachedMonths[yearMonth];
        const isFresh = cachedAt && (Date.now() - cachedAt) < CACHE_TTL_MS;

        // Already cached and fresh — no fetch needed
        if (isFresh) return;

        const enabledHrefs = calendars
          .filter((c) => !disabledIds.includes(c.id))
          .map((c) => c.href);

        if (enabledHrefs.length === 0) {
          set((s) => ({ cachedMonths: { ...s.cachedMonths, [yearMonth]: Date.now() } }));
          return;
        }

        set({ loading: true });
        try {
          const { startDate, endDate } = monthRange(yearMonth);
          const raw = await invoke<string>('caldav_get_events', {
            email,
            password,
            calendarHrefs: enabledHrefs,
            startDate,
            endDate,
          });
          const events: CalEvent[] = JSON.parse(raw);

          // Group by date
          const byDate: Record<string, CalEvent[]> = {};
          for (const ev of events) {
            if (!ev.date) continue;
            if (!byDate[ev.date]) byDate[ev.date] = [];
            byDate[ev.date].push(ev);
          }

          const now = Date.now();
          set((s) => ({
            eventsCache: { ...s.eventsCache, ...byDate },
            cachedMonths: { ...s.cachedMonths, [yearMonth]: now },
            loading: false,
          }));

          // Background prefetch adjacent months if stale/missing
          const [y, m] = yearMonth.split('-').map(Number);
          const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
          const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;

          const { cachedMonths: updated } = get();
          for (const adjMonth of [prevMonth, nextMonth]) {
            const adjCachedAt = updated[adjMonth];
            if (adjCachedAt && (Date.now() - adjCachedAt) < CACHE_TTL_MS) continue;
            const { startDate: s2, endDate: e2 } = monthRange(adjMonth);
            invoke<string>('caldav_get_events', {
              email,
              password,
              calendarHrefs: enabledHrefs,
              startDate: s2,
              endDate: e2,
            }).then((r) => {
              const evs: CalEvent[] = JSON.parse(r);
              const bd: Record<string, CalEvent[]> = {};
              for (const ev of evs) {
                if (!ev.date) continue;
                if (!bd[ev.date]) bd[ev.date] = [];
                bd[ev.date].push(ev);
              }
              set((st) => ({
                eventsCache: { ...st.eventsCache, ...bd },
                cachedMonths: { ...st.cachedMonths, [adjMonth]: Date.now() },
              }));
            }).catch(() => {});
          }
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'cortex-integrations',
      partialize: (s) => ({
        connected: s.connected,
        email: s.email,
        password: s.password,
        calendars: s.calendars,
        disabledIds: s.disabledIds,
        eventsCache: s.eventsCache,
        cachedMonths: s.cachedMonths,
      }),
    }
  )
);
