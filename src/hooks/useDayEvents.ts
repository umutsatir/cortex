import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useIntegrationStore } from '../store/integrationStore';
import { eventsForDay, type DayEvent } from '../lib/calendarEvents';

export type ColoredDayEvent = DayEvent & { color: string };

/** Calendar events (all connected accounts, enabled calendars) for one local day. */
export function useDayEvents(date: string): ColoredDayEvent[] {
  const { accounts, months, ensureEvents } = useIntegrationStore(
    useShallow((s) => ({ accounts: s.accounts, months: s.months, ensureEvents: s.ensureEvents }))
  );

  // Accounts whose month isn't loaded: changes when an account is added, reconnected or
  // a calendar is toggled (those drop the cached months), which triggers a fetch.
  const missing = accounts.filter((a) => !months[`${a.id}|${date.slice(0, 7)}`]).map((a) => a.id).join(',');

  useEffect(() => {
    if (accounts.length > 0) ensureEvents(date);
  }, [date, missing, ensureEvents]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    const yearMonth = date.slice(0, 7);
    const colors = new Map<string, string>();
    for (const a of accounts) {
      for (const c of a.calendars) if (c.enabled) colors.set(`${a.id}|${c.id}`, c.color);
    }
    const sources = accounts.map((a) => ({ accountId: a.id, events: months[`${a.id}|${yearMonth}`]?.events ?? [] }));
    return eventsForDay(sources, date).flatMap((e) => {
      const color = colors.get(`${e.accountId}|${e.calendarId}`);
      return color ? [{ ...e, color }] : [];
    });
  }, [accounts, months, date]);
}
