// Timebox reminders (macOS notifications) and the menu bar status item.
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useTaskStore } from '../store/taskStore';
import { useGeneralStore } from '../store/generalStore';
import { useIntegrationStore } from '../store/integrationStore';
import { eventsForDay } from '../lib/calendarEvents';
import { timeToMinutes } from '../lib/time';
import { translate } from '../i18n';

// @ts-expect-error Tauri injects this global in the webview
const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
const TICK_MS = 20_000;

interface Block { key: string; title: string; start: number; end: number; kind: 'task' | 'event' }

/** Today's timed blocks: open timeboxed tasks and enabled calendar events. */
function todaysBlocks(): Block[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks: Block[] = useTaskStore.getState().tasks
    .filter((x) => x.scheduled_date === today && x.timebox_start && x.timebox_end && !x.is_completed)
    .map((x) => ({ key: `t|${x.id}|${x.timebox_start}`, title: x.title, start: timeToMinutes(x.timebox_start!), end: timeToMinutes(x.timebox_end!), kind: 'task' }));

  const { accounts, months } = useIntegrationStore.getState();
  const enabled = new Set(accounts.flatMap((a) => a.calendars.filter((c) => c.enabled).map((c) => `${a.id}|${c.id}`)));
  const events: Block[] = eventsForDay(
    accounts.map((a) => ({ accountId: a.id, events: months[`${a.id}|${today.slice(0, 7)}`]?.events ?? [] })),
    today,
  )
    .filter((e) => !e.allDay && !e.continuesBefore && enabled.has(`${e.accountId}|${e.calendarId}`))
    .map((e) => ({ key: `e|${e.key}|${e.startMin}`, title: e.title, start: e.startMin, end: e.endMin, kind: 'event' }));

  return [...tasks, ...events].sort((a, b) => a.start - b.start);
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** "Title · 12m left" for the block in progress, else "14:00 Title" for the next one today. */
export function menuBarTitle(blocks: Block[], nowMin: number, lang: 'en' | 'tr'): string | null {
  const current = blocks.find((b) => b.start <= nowMin && nowMin < b.end);
  if (current) {
    const left = current.end - nowMin;
    const leftText = left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : `${left}m`;
    return `${clip(current.title || translate('(No title)', lang), 28)} · ${leftText} ${translate('left', lang)}`;
  }
  const next = blocks.find((b) => b.start > nowMin);
  if (!next) return null;
  const hh = `${String(Math.floor(next.start / 60)).padStart(2, '0')}:${String(next.start % 60).padStart(2, '0')}`;
  return `${hh} ${clip(next.title || translate('(No title)', lang), 28)}`;
}

export function useBackground() {
  const notified = useRef(new Set<string>());
  const lastTray = useRef<string>('');

  useEffect(() => {
    if (!isTauri) return;
    let permission: boolean | null = null;

    async function tick() {
      const { notifyEnabled, notifyLead, showMenuBar, language } = useGeneralStore.getState();
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const blocks = todaysBlocks();

      // Reminders
      const lead = notifyLead || 5; // 0 was "off" before the separate switch
      if (notifyEnabled) {
        for (const b of blocks) {
          const until = b.start - nowMin;
          if (until < 0 || until > lead || notified.current.has(b.key)) continue;
          notified.current.add(b.key);
          if (permission === null) {
            permission = await isPermissionGranted();
            if (!permission) permission = (await requestPermission()) === 'granted';
          }
          if (!permission) continue;
          sendNotification({
            title: b.title || translate('(No title)', language),
            body: until === 0
              ? translate('Starting now', language)
              : `${translate('Starts in', language)} ${until} ${translate('min', language)}`,
          });
        }
      }

      // Menu bar
      const title = showMenuBar ? menuBarTitle(blocks, nowMin, language) : null;
      const labels = ['Open Cortex', 'Quick add…', 'Quit Cortex'].map((k) => translate(k, language));
      const state = JSON.stringify([showMenuBar, title, labels]);
      if (state !== lastTray.current) {
        lastTray.current = state;
        invoke('tray_update', { visible: showMenuBar, title, labels }).catch(() => {});
      }
    }

    void tick();
    const id = setInterval(() => { void tick(); }, TICK_MS);
    // React to edits and setting changes right away instead of on the next tick.
    const unsubTasks = useTaskStore.subscribe((s, prev) => { if (s.tasks !== prev.tasks) void tick(); });
    const unsubGeneral = useGeneralStore.subscribe(() => { void tick(); });
    return () => { clearInterval(id); unsubTasks(); unsubGeneral(); };
  }, []);
}
