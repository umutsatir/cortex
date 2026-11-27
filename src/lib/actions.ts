// App-level actions shared by inputs, the command palette, shortcuts and the quick-add window.
import { format } from 'date-fns';
import { useTaskStore } from '../store/taskStore';
import { useLabelStore, PRESET_COLORS, findLabelBySlug } from '../store/labelStore';
import { useGeneralStore } from '../store/generalStore';
import { useIntegrationStore } from '../store/integrationStore';
import { toast } from '../store/toastStore';
import { translate } from '../i18n';
import { parseTask, type ParsedTask } from './parseTask';
import { planDay } from './planDay';
import { eventsForDay } from './calendarEvents';
import { minutesToTime, timeToMinutes, SLOT_MIN } from './time';
import type { Task } from '../types';
import { inScope, suggestQuadrant } from './eisenhower';

const t = (key: string) => translate(key, useGeneralStore.getState().language);
const todayStr = () => format(new Date(), 'yyyy-MM-dd');

/** Default length of a block created from a typed time ("14:00") without a duration. */
const TYPED_TIME_MINUTES = 30;

export function parseInput(text: string): ParsedTask {
  return parseTask(text, { monthFirst: useGeneralStore.getState().dateFormat === 'MM/dd/yyyy' });
}

function labelIdFor(name: string): string {
  const found = findLabelBySlug(name);
  if (found) return found.id;
  const store = useLabelStore.getState();
  return store.addLabel(name, PRESET_COLORS[store.labels.length % PRESET_COLORS.length]).id;
}

/** Creates a task from quick-entry text ("Call Ali tomorrow 14:00 #work"). */
export async function addTaskFromText(
  text: string,
  defaults: Partial<Pick<Task, 'scheduled_date' | 'eisenhower_quadrant'>> = {},
): Promise<Task | null> {
  if (!text.trim()) return null;
  const p = parseInput(text);
  const extras: Partial<Task> = { ...defaults };
  if (p.date) extras.scheduled_date = p.date;
  if (p.minutes) extras.estimated_minutes = p.minutes;
  if (p.priority) extras.priority = p.priority;
  if (p.labelName) extras.label = labelIdFor(p.labelName);
  if (p.recurrence) {
    extras.recurrence = p.recurrence;
    extras.scheduled_date ??= todayStr();
  }
  if (p.time) {
    extras.scheduled_date ??= todayStr();
    extras.timebox_start = p.time;
    extras.timebox_end = minutesToTime(timeToMinutes(p.time) + (p.minutes ?? TYPED_TIME_MINUTES));
  }
  return useTaskStore.getState().addTask(p.title, extras);
}

export async function undoLast() {
  const label = await useTaskStore.getState().undo();
  toast(label ? `${t('Undone')}: ${t(label)}` : t('Nothing to undo'));
}

export async function deleteWithUndo(id: string) {
  await useTaskStore.getState().deleteTask(id);
  toast(t('Task deleted'), { label: t('Undo'), run: () => { void undoLast(); } });
}

/** Unfinished tasks scheduled before today. Repeating ones included: they're one task each. */
export function overdueTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter((x) => !x.is_completed && x.scheduled_date !== null && x.scheduled_date < today);
}

export async function moveOverdueToToday() {
  const s = useTaskStore.getState();
  const today = todayStr();
  const list = overdueTasks(s.tasks, today);
  if (!list.length) return;
  await s.batch('Move to today', async () => {
    for (const x of list) {
      await s.updateTask(x.id, { scheduled_date: today, timebox_start: null, timebox_end: null });
    }
  });
  useGeneralStore.getState().dismissRollover(today);
  toast(`${list.length} ${t('tasks moved to today')}`, { label: t('Undo'), run: () => { void undoLast(); } });
}

/**
 * Timeboxes the day's unscheduled tasks into free time between calendar events and
 * existing blocks, inside the work hours (from now on, for today).
 */
export async function planMyDay(date = useTaskStore.getState().timeboxDate) {
  const s = useTaskStore.getState();
  const { workStart, workEnd, breakMinutes, warmUp } = useGeneralStore.getState();

  const integ = useIntegrationStore.getState();
  if (integ.accounts.length) await integ.ensureEvents(date);
  const { accounts, months } = useIntegrationStore.getState();
  const enabled = new Set(accounts.flatMap((a) => a.calendars.filter((c) => c.enabled).map((c) => `${a.id}|${c.id}`)));
  const events = eventsForDay(
    accounts.map((a) => ({ accountId: a.id, events: months[`${a.id}|${date.slice(0, 7)}`]?.events ?? [] })),
    date,
  ).filter((e) => !e.allDay && enabled.has(`${e.accountId}|${e.calendarId}`));

  const dayTasks = s.tasks.filter((x) => x.scheduled_date === date);
  const busy: [number, number][] = [
    ...events.map((e) => [e.startMin, e.endMin] as [number, number]),
    ...dayTasks
      .filter((x) => x.timebox_start && x.timebox_end)
      .map((x) => [timeToMinutes(x.timebox_start!), timeToMinutes(x.timebox_end!)] as [number, number]),
  ];
  const candidates = dayTasks.filter((x) => !x.is_completed && !x.timebox_start);
  if (!candidates.length) {
    toast(t('No unscheduled tasks on this day'));
    return;
  }

  let from = workStart;
  if (date === todayStr()) {
    const now = new Date();
    from = Math.max(from, Math.ceil((now.getHours() * 60 + now.getMinutes()) / SLOT_MIN) * SLOT_MIN);
  }
  const { placed, unplaced } = planDay({ tasks: candidates, busy, from, to: workEnd, gap: breakMinutes, warmUp });
  if (!placed.length) {
    toast(t('No free time left in your work hours'));
    return;
  }

  await s.batch('Plan my day', async () => {
    for (const p of placed) {
      await s.updateTask(p.id, { timebox_start: minutesToTime(p.start), timebox_end: minutesToTime(p.end) });
    }
  });
  const msg = unplaced.length
    ? `${placed.length} ${t('tasks planned')} · ${unplaced.length} ${t("didn't fit")}`
    : `${placed.length} ${t('tasks planned')}`;
  toast(msg, { label: t('Undo'), run: () => { void undoLast(); } });
}

/** Takes the day's open tasks out of the timebox (they stay on that day), e.g. to re-plan. */
export async function clearTimebox(date = useTaskStore.getState().timeboxDate) {
  const s = useTaskStore.getState();
  const list = s.tasks.filter((x) => x.scheduled_date === date && x.timebox_start && !x.is_completed);
  if (!list.length) {
    toast(t('Nothing to clear'));
    return;
  }
  await s.batch('Clear timebox', async () => {
    for (const x of list) await s.updateTask(x.id, { timebox_start: null, timebox_end: null });
  });
  toast(`${list.length} ${t('blocks cleared')}`, { label: t('Undo'), run: () => { void undoLast(); } });
}

/**
 * Empties the Eisenhower matrix for its current scope: saved quadrants are cleared and the
 * automatic suggestions hidden. Tasks stay where they are; one undo brings it all back.
 */
export async function clearMatrix() {
  const s = useTaskStore.getState();
  const g = useGeneralStore.getState();
  const scoped = s.tasks.filter((x) => inScope(x, g.matrixScope, s.today, g.weekStartsOn));
  const saved = scoped.filter((x) => x.eisenhower_quadrant);
  const suggested = scoped.filter((x) => !x.eisenhower_quadrant && !g.hiddenSuggestions.includes(x.id) && suggestQuadrant(x, s.today));
  if (!saved.length && !suggested.length) {
    toast(t('Nothing to clear'));
    return;
  }
  const hiddenBefore = g.hiddenSuggestions;
  await s.batch('Clear matrix', async () => {
    for (const x of saved) await s.updateTask(x.id, { eisenhower_quadrant: null });
    // Cleared tasks shouldn't pop straight back in as suggestions.
    useGeneralStore.getState().setHiddenSuggestions([...hiddenBefore, ...scoped.map((x) => x.id)].slice(-500));
  }, () => useGeneralStore.getState().setHiddenSuggestions(hiddenBefore));
  toast(`${saved.length + suggested.length} ${t('tasks removed from the matrix')}`, { label: t('Undo'), run: () => { void undoLast(); } });
}
