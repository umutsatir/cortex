import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { format } from 'date-fns';
import { monthBounds, shiftMonth, type CalEvent } from '../lib/calendarEvents';

export type Provider = 'apple' | 'google';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

export interface CalendarAccount {
  id: string;            // "apple:<email>" | "google:<email>" — also the secret store key
  provider: Provider;
  label: string;         // email
  status: 'ok' | 'needs_reauth' | 'error';
  error: string | null;
  calendars: Calendar[];
}

interface MonthEntry {
  at: number;            // fetch time (ms)
  events: CalEvent[];
}

interface EventsResult { events: CalEvent[]; errors: string[] }
interface ConnectResult {
  accountId: string;
  label: string;
  calendars: { id: string; name: string; color: string; selected?: boolean }[];
}

/** Total calendar accounts across providers. Reconnecting an existing one doesn't count. */
export const MAX_ACCOUNTS = 6;
const LIMIT_ERROR = `You can connect up to ${MAX_ACCOUNTS} calendar accounts.`;

const PALETTE = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
const CACHE_TTL_MS = 10 * 60 * 1000;
const AUTH_PREFIX = 'AUTH:';

const monthKey = (accountId: string, yearMonth: string) => `${accountId}|${yearMonth}`;
const errText = (e: unknown) => String(e).replace(/^Error:\s*/, '').replace(AUTH_PREFIX, '').trim();

// Requests in flight, so overlapping triggers (focus, navigation, prefetch) share one fetch.
const inFlight = new Map<string, Promise<void>>();
// Password found in pre-0.2.1 localStorage, moved to the native secret store once after hydration.
let legacyApple: { email: string; password: string } | null = null;

interface IntegrationStore {
  accounts: CalendarAccount[];
  months: Record<string, MonthEntry>; // keyed by monthKey()
  loading: number;                    // fetches in flight
  connecting: Provider | null;
  connectError: string | null;
  connectErrorFor: Provider | null;
  googleConfigured: boolean | null;

  connectApple: (email: string, password: string) => Promise<void>;
  connectGoogle: () => Promise<void>;
  cancelGoogle: () => void;
  checkGoogleConfigured: () => Promise<void>;
  disconnect: (accountId: string) => Promise<void>;
  refreshCalendars: (accountId: string) => Promise<void>;
  toggleCalendar: (accountId: string, calendarId: string) => void;
  setCalendarColor: (accountId: string, calendarId: string, color: string) => void;
  /** Loads the month containing `date` (and prefetches its neighbours) unless fresh. */
  ensureEvents: (date: string, opts?: { force?: boolean }) => Promise<void>;
  clearConnectError: () => void;
}

function toCalendars(raw: ConnectResult['calendars'], previous: Calendar[] = [], defaultEnabled = (_: ConnectResult['calendars'][number]) => true): Calendar[] {
  return raw.map((c, i) => {
    const prev = previous.find((p) => p.id === c.id);
    return {
      id: c.id,
      name: c.name,
      color: prev?.color ?? (c.color || PALETTE[i % PALETTE.length]),
      enabled: prev?.enabled ?? defaultEnabled(c),
    };
  });
}

export const useIntegrationStore = create<IntegrationStore>()(
  persist(
    (set, get) => {
      const patchAccount = (id: string, patch: Partial<CalendarAccount>) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

      const dropMonths = (accountId: string) =>
        set((s) => ({
          months: Object.fromEntries(Object.entries(s.months).filter(([k]) => !k.startsWith(accountId + '|'))),
        }));

      const addAccount = (provider: Provider, r: ConnectResult) => {
        const existing = get().accounts.find((a) => a.id === r.accountId);
        const account: CalendarAccount = {
          id: r.accountId,
          provider,
          label: r.label,
          status: 'ok',
          error: null,
          calendars: toCalendars(r.calendars, existing?.calendars, (c) => provider === 'apple' || c.selected !== false),
        };
        set((s) => ({
          accounts: existing ? s.accounts.map((a) => (a.id === account.id ? account : a)) : [...s.accounts, account],
          connecting: null,
          connectError: null,
          connectErrorFor: null,
        }));
        dropMonths(account.id);
      };

      async function fetchMonth(account: CalendarAccount, yearMonth: string, force: boolean) {
        const key = monthKey(account.id, yearMonth);
        const cached = get().months[key];
        if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) return;
        if (account.status === 'needs_reauth') return;
        const existing = inFlight.get(key);
        if (existing) return existing;

        const calendarIds = account.calendars.filter((c) => c.enabled).map((c) => c.id);
        if (calendarIds.length === 0) {
          set((s) => ({ months: { ...s.months, [key]: { at: Date.now(), events: [] } } }));
          return;
        }

        const { timeMin, timeMax } = monthBounds(yearMonth);
        const run = (async () => {
          set((s) => ({ loading: s.loading + 1 }));
          try {
            const result = account.provider === 'apple'
              ? await invoke<EventsResult>('caldav_get_events', {
                  accountId: account.id, email: account.label, calendarIds, timeMin, timeMax,
                })
              : await invoke<EventsResult>('google_get_events', {
                  accountId: account.id, calendarIds, timeMin, timeMax,
                });
            set((s) => ({ months: { ...s.months, [key]: { at: Date.now(), events: result.events } } }));
            patchAccount(account.id, result.errors.length
              ? { status: 'error', error: result.errors.join('\n') }
              : { status: 'ok', error: null });
          } catch (e) {
            const msg = String(e);
            patchAccount(account.id, msg.includes(AUTH_PREFIX)
              ? { status: 'needs_reauth', error: errText(e) }
              : { status: 'error', error: errText(e) });
          } finally {
            set((s) => ({ loading: s.loading - 1 }));
            inFlight.delete(key);
          }
        })();
        inFlight.set(key, run);
        return run;
      }

      return {
        accounts: [],
        months: {},
        loading: 0,
        connecting: null,
        connectError: null,
        connectErrorFor: null,
        googleConfigured: null,

        connectApple: async (email, password) => {
          const { accounts } = get();
          const isNew = !accounts.some((a) => a.id === `apple:${email.trim().toLowerCase()}`);
          if (isNew && accounts.length >= MAX_ACCOUNTS) {
            set({ connectError: LIMIT_ERROR, connectErrorFor: 'apple' });
            return;
          }
          set({ connecting: 'apple', connectError: null });
          try {
            addAccount('apple', await invoke<ConnectResult>('caldav_connect', { email, password }));
          } catch (e) {
            set({ connecting: null, connectError: errText(e), connectErrorFor: 'apple' });
          }
        },

        connectGoogle: async () => {
          // The account is only known after sign-in, so at the limit only a reconnect can start.
          const atLimit = () => get().accounts.length >= MAX_ACCOUNTS;
          if (atLimit() && !get().accounts.some((a) => a.provider === 'google' && a.status === 'needs_reauth')) {
            set({ connectError: LIMIT_ERROR, connectErrorFor: 'google' });
            return;
          }
          set({ connecting: 'google', connectError: null });
          try {
            const result = await invoke<ConnectResult>('google_connect');
            if (atLimit() && !get().accounts.some((a) => a.id === result.accountId)) {
              // Signed in to a different account than the one being reconnected: undo it.
              await invoke('google_disconnect', { accountId: result.accountId }).catch(() => {});
              set({ connecting: null, connectError: LIMIT_ERROR, connectErrorFor: 'google' });
              return;
            }
            addAccount('google', result);
          } catch (e) {
            set({ connecting: null, connectError: errText(e), connectErrorFor: 'google' });
          }
        },

        cancelGoogle: () => {
          invoke('google_cancel_connect').catch(() => {});
        },

        checkGoogleConfigured: async () => {
          try {
            set({ googleConfigured: await invoke<boolean>('google_is_configured') });
          } catch {
            set({ googleConfigured: false });
          }
        },

        disconnect: async (accountId) => {
          const account = get().accounts.find((a) => a.id === accountId);
          if (!account) return;
          try {
            await invoke(account.provider === 'google' ? 'google_disconnect' : 'integration_forget', { accountId });
          } catch {
            // The account is removed locally either way.
          }
          set((s) => ({ accounts: s.accounts.filter((a) => a.id !== accountId) }));
          dropMonths(accountId);
        },

        refreshCalendars: async (accountId) => {
          const account = get().accounts.find((a) => a.id === accountId);
          if (!account) return;
          try {
            const raw = account.provider === 'apple'
              ? await invoke<ConnectResult['calendars']>('caldav_list_calendars', { accountId, email: account.label })
              : await invoke<ConnectResult['calendars']>('google_list_calendars', { accountId });
            patchAccount(accountId, { calendars: toCalendars(raw, account.calendars, () => false), status: 'ok', error: null });
            dropMonths(accountId);
          } catch (e) {
            patchAccount(accountId, String(e).includes(AUTH_PREFIX)
              ? { status: 'needs_reauth', error: errText(e) }
              : { status: 'error', error: errText(e) });
          }
        },

        toggleCalendar: (accountId, calendarId) => {
          const account = get().accounts.find((a) => a.id === accountId);
          if (!account) return;
          patchAccount(accountId, {
            calendars: account.calendars.map((c) => (c.id === calendarId ? { ...c, enabled: !c.enabled } : c)),
          });
          dropMonths(accountId);
        },

        setCalendarColor: (accountId, calendarId, color) => {
          const account = get().accounts.find((a) => a.id === accountId);
          if (!account) return;
          patchAccount(accountId, {
            calendars: account.calendars.map((c) => (c.id === calendarId ? { ...c, color } : c)),
          });
        },

        ensureEvents: async (date, opts) => {
          const force = opts?.force ?? false;
          const yearMonth = date.slice(0, 7);
          const accounts = get().accounts;
          await Promise.all(accounts.map((a) => fetchMonth(a, yearMonth, force)));
          // Prefetch neighbours so week/day navigation is instant.
          for (const adj of [shiftMonth(yearMonth, -1), shiftMonth(yearMonth, 1)]) {
            for (const a of get().accounts) fetchMonth(a, adj, false);
          }
        },

        clearConnectError: () => set({ connectError: null, connectErrorFor: null }),
      };
    },
    {
      name: 'cortex-integrations',
      version: 2,
      partialize: (s) => {
        // Keep only months near today so localStorage doesn't grow forever.
        const now = format(new Date(), 'yyyy-MM');
        const keep = new Set([-1, 0, 1, 2].map((d) => shiftMonth(now, d)));
        return {
          accounts: s.accounts,
          months: Object.fromEntries(Object.entries(s.months).filter(([k]) => keep.has(k.split('|')[1]))),
        };
      },
      migrate: (persisted, version) => {
        if (version < 2) {
          // v0.2.0 stored one Apple account flat, including the password in plain text.
          const old = persisted as {
            connected?: boolean; email?: string; password?: string;
            calendars?: { id: string; name: string; href: string; color: string }[];
            disabledIds?: string[];
          };
          const accounts: CalendarAccount[] = [];
          if (old.connected && old.email) {
            accounts.push({
              id: `apple:${old.email.trim().toLowerCase()}`,
              provider: 'apple',
              label: old.email.trim(),
              status: 'ok',
              error: null,
              calendars: (old.calendars ?? []).map((c) => ({
                id: c.href,
                name: c.name,
                color: c.color,
                enabled: !(old.disabledIds ?? []).includes(c.id),
              })),
            });
            if (old.password) legacyApple = { email: old.email.trim(), password: old.password };
          }
          return { accounts, months: {} };
        }
        return persisted as Pick<IntegrationStore, 'accounts' | 'months'>;
      },
      onRehydrateStorage: () => () => {
        if (!legacyApple) return;
        const { email, password } = legacyApple;
        legacyApple = null;
        invoke('caldav_migrate_secret', { email, password }).catch(() => {
          const id = `apple:${email.toLowerCase()}`;
          useIntegrationStore.setState((s) => ({
            accounts: s.accounts.map((a) => (a.id === id ? { ...a, status: 'needs_reauth', error: 'Please reconnect' } : a)),
          }));
        });
      },
    }
  )
);
