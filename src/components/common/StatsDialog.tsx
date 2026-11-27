import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { addDays, format, parseISO } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { timeToMinutes } from '../../lib/time';
import { formatDuration } from './ParsePreview';
import type { Task } from '../../types';

const DAYS = 7;

/** Local date a task counts for: the day it was completed, else the day it was planned. */
function doneDay(task: Task): string | null {
  if (!task.is_completed) return null;
  return task.completed_at ? format(new Date(task.completed_at), 'yyyy-MM-dd') : task.scheduled_date;
}

export function computeStats(tasks: Task[], today: string) {
  const days = Array.from({ length: DAYS }, (_, i) => format(addDays(parseISO(today), i - (DAYS - 1)), 'yyyy-MM-dd'));
  const perDay = days.map((d) => ({
    date: d,
    planned: tasks.filter((x) => x.scheduled_date === d).length,
    done: tasks.filter((x) => doneDay(x) === d).length,
  }));

  const todays = tasks.filter((x) => x.scheduled_date === today);
  const timeboxed = todays.reduce((m, x) => (x.timebox_start && x.timebox_end ? m + timeToMinutes(x.timebox_end) - timeToMinutes(x.timebox_start) : m), 0);
  const estimated = todays.reduce((m, x) => m + (x.estimated_minutes ?? 0), 0);

  // Consecutive days with at least one completed task, ending today (or yesterday if today is still empty).
  const doneDays = new Set(tasks.map(doneDay).filter(Boolean) as string[]);
  let streak = 0;
  let cursor = parseISO(today);
  if (!doneDays.has(today)) cursor = addDays(cursor, -1);
  while (doneDays.has(format(cursor, 'yyyy-MM-dd'))) { streak++; cursor = addDays(cursor, -1); }

  // Estimate accuracy: for timeboxed tasks finished on their day, time from block start to
  // completion against the estimate (or the block length).
  const ratios: number[] = [];
  for (const x of tasks) {
    if (!x.is_completed || !x.completed_at || !x.timebox_start || !x.timebox_end || !x.scheduled_date) continue;
    if (!days.includes(x.scheduled_date)) continue;
    const start = new Date(`${x.scheduled_date}T${x.timebox_start}:00`);
    const took = (new Date(x.completed_at).getTime() - start.getTime()) / 60000;
    const planned = x.estimated_minutes ?? timeToMinutes(x.timebox_end) - timeToMinutes(x.timebox_start);
    if (took >= 5 && took <= 8 * 60 && planned > 0) ratios.push(took / planned);
  }
  ratios.sort((a, b) => a - b);
  const accuracy = ratios.length >= 3 ? ratios[Math.floor(ratios.length / 2)] : null;

  const week = perDay.reduce((a, d) => ({ planned: a.planned + d.planned, done: a.done + d.done }), { planned: 0, done: 0 });
  return {
    perDay,
    today: { planned: todays.length, done: todays.filter((x) => x.is_completed).length, timeboxed, estimated },
    week,
    streak,
    accuracy,
    accuracySamples: ratios.length,
  };
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-0 px-3.5 py-3" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div className="cx-section truncate">{label}</div>
      <div className="mt-1.5 text-[22px] leading-7 font-semibold tracking-[-0.02em] tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] truncate" style={{ color: 'var(--ink-secondary)' }}>{sub}</div>}
    </div>
  );
}

export function StatsDialog({ onClose }: { onClose: () => void }) {
  const tasks = useTaskStore((s) => s.tasks);
  const today = useTaskStore((s) => s.today);
  const t = useT();
  const locale = useDateLocale();
  const stats = useMemo(() => computeStats(tasks, today), [tasks, today]);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...stats.perDay.map((d) => Math.max(d.planned, d.done)));
  const CHART_H = 120;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const accuracyText = stats.accuracy === null
    ? '—'
    : `${stats.accuracy.toFixed(1)}×`;
  const accuracySub = stats.accuracy === null
    ? t('Finish a few timeboxed tasks to see this')
    : stats.accuracy > 1.15 ? t('Tasks take longer than planned')
    : stats.accuracy < 0.85 ? t('Tasks finish faster than planned')
    : t('Your estimates are on point');

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[560px] p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-pop)' }}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('Stats')}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{t('Stats')}</h2>
          <button
            onClick={onClose}
            className="cx-press w-7 h-7 flex items-center justify-center hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-secondary)', borderRadius: 'var(--radius-sm)' }}
            aria-label={t('Close')}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex gap-2.5">
          <Tile
            label={t('Today')}
            value={`${stats.today.done}/${stats.today.planned}`}
            sub={stats.today.planned ? `${Math.round((stats.today.done / stats.today.planned) * 100)}% ${t('done')}` : t('Nothing planned')}
          />
          <Tile
            label={t('Time blocked')}
            value={formatDuration(stats.today.timeboxed)}
            sub={stats.today.estimated ? `${t('Estimated')} ${formatDuration(stats.today.estimated)}` : undefined}
          />
          <Tile label={t('Streak')} value={`${stats.streak}`} sub={t('days in a row')} />
          <Tile label={t('Estimates')} value={accuracyText} sub={accuracySub} />
        </div>

        {/* Last 7 days: done (bar) against planned (track) */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{t('Completed, last 7 days')}</span>
            <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-secondary)' }}>
              {stats.week.done} {t('done')} · {stats.week.planned} {t('planned')}
            </span>
          </div>
          <div className="relative flex items-end gap-3 px-1" style={{ height: CHART_H + 22 }}>
            {stats.perDay.map((d, i) => {
              const isToday = d.date === today;
              return (
                <div
                  key={d.date}
                  className="relative flex-1 flex flex-col items-center justify-end h-full"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="relative w-full flex items-end justify-center" style={{ height: CHART_H, borderBottom: '1px solid var(--border)' }}>
                    {/* planned track */}
                    <div
                      className="absolute bottom-0 w-[60%] max-w-[36px]"
                      style={{ height: (d.planned / max) * CHART_H, background: 'var(--surface-hover)', borderRadius: '4px 4px 0 0' }}
                    />
                    <motion.div
                      className="relative w-[60%] max-w-[36px]"
                      style={{ background: isToday ? 'var(--accent-strong)' : 'var(--accent)', borderRadius: '4px 4px 0 0', opacity: hover === null || hover === i ? 1 : 0.55 }}
                      initial={{ height: 0 }}
                      animate={{ height: (d.done / max) * CHART_H }}
                      transition={{ type: 'spring', stiffness: 260, damping: 30, delay: i * 0.03 }}
                    />
                  </div>
                  <span className="mt-1.5 text-[11px] font-medium" style={{ color: isToday ? 'var(--accent-hover)' : 'var(--ink-secondary)' }}>
                    {format(parseISO(d.date), 'EEE', { locale })}
                  </span>
                  {hover === i && (
                    <div
                      className="cx-pop-in absolute bottom-full mb-1 z-10 px-2 py-1 text-[11px] whitespace-nowrap pointer-events-none"
                      style={{ background: 'var(--ink)', color: 'var(--surface)', borderRadius: 'var(--radius-xs)', boxShadow: 'var(--shadow-pop)' }}
                    >
                      {format(parseISO(d.date), 'EEE d MMM', { locale })} · {d.done} {t('done')} / {d.planned} {t('planned')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px]" style={{ color: 'var(--ink-secondary)' }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--accent)' }} />{t('Done')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)' }} />{t('Planned')}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
