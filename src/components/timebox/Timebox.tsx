import { useEffect, useRef, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { useGeneralStore } from '../../store/generalStore';
import { useIntegrationStore } from '../../store/integrationStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { useDayEvents, type ColoredDayEvent } from '../../hooks/useDayEvents';
import {
  END_HOUR, HOUR_PX, LABEL_W, START_HOUR, layoutColumns, minutesToOffset, minutesToTime,
  timeToMinutes, timeToOffset, type Span,
} from '../../lib/time';
import { TimeboxBlock } from './TimeboxBlock';
import { Chevron, IconButton, PillButton, Toolbar } from '../ui/Toolbar';
import type { Task } from '../../types';

type TimeboxItem = { kind: 'task'; task: Task } | { kind: 'event'; event: ColoredDayEvent };

function ampm(h: number, lang: string) {
  if (lang === 'tr') return h < 12 ? 'ÖÖ' : 'ÖS';
  return h < 12 ? 'AM' : 'PM';
}

function formatHour(hour: number, fmt: '12h' | '24h', lang: string): string {
  if (fmt === '24h') return `${String(hour).padStart(2, '0')}:00`;
  const label = ampm(hour, lang);
  if (hour === 0) return `12 ${label}`;
  if (hour === 12) return `12 ${label}`;
  return hour < 12 ? `${hour} ${label}` : `${hour - 12} ${label}`;
}

export function formatTimeStr(timeStr: string, fmt: '12h' | '24h', lang = 'en'): string {
  if (fmt === '24h') return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const label = ampm(h, lang);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${label}` : `${h12}:${String(m).padStart(2, '0')} ${label}`;
}

const BLOCK_GAP = 4;

export interface BlockColor { bg: string; border: string; text: string; meta: string }

// Design system: task blocks are accent or neutral; a label's own color is the only exception.
const ACCENT_BLOCK: BlockColor = {
  bg: 'var(--accent-soft)', border: 'var(--accent-line)', text: 'var(--ink)', meta: 'var(--accent-hover)',
};

export function getBlockColor(labelColor?: string | null): BlockColor {
  if (labelColor) {
    return {
      bg: `color-mix(in srgb, ${labelColor} 14%, var(--surface))`,
      border: `color-mix(in srgb, ${labelColor} 45%, var(--surface))`,
      text: 'var(--ink)',
      meta: `color-mix(in srgb, ${labelColor} 75%, var(--ink))`,
    };
  }
  return ACCENT_BLOCK;
}

function DropPreview() {
  const { active, over } = useDndContext();
  const allTasks = useTaskStore((s) => s.tasks);

  if (!active || !over) return null;
  const overId = String(over.id);
  if (!overId.startsWith('timebox__')) return null;

  const slotTime = overId.slice(9);
  const rawId = String(active.id);
  const taskId = rawId.startsWith('tb::') ? rawId.slice(4) : rawId;
  const task = allTasks.find((t) => t.id === taskId);

  let durationMin = 60;
  if (task?.timebox_start && task?.timebox_end) {
    durationMin = timeToMinutes(task.timebox_end) - timeToMinutes(task.timebox_start);
  } else if (task?.estimated_minutes) {
    durationMin = task.estimated_minutes;
  }
  durationMin = Math.max(15, durationMin);

  const top = timeToOffset(slotTime);
  const height = (durationMin / 60) * HOUR_PX;

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        top,
        left: LABEL_W + 4,
        right: 4,
        height,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-soft)',
        border: '1.5px dashed var(--accent)',
      }}
    />
  );
}

function QuarterSlot({ timeStr, isHour }: { timeStr: string; isHour: boolean }) {
  const { setNodeRef } = useDroppable({ id: `timebox__${timeStr}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: `${HOUR_PX / 4}px`,
        borderBottom: isHour
          ? '1px solid var(--border)'
          : '1px solid transparent',
      }}
    />
  );
}

function HourRow({ hour, timeFormat, lang }: { hour: number; timeFormat: '12h' | '24h'; lang: string }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex" style={{ height: `${HOUR_PX}px` }}>
      <div className="flex-shrink-0 relative" style={{ width: `${LABEL_W}px` }}>
        <span className={`text-[11px] font-medium tabular-nums pl-2.5 absolute leading-[14px] ${hour === START_HOUR ? 'top-0.5' : '-top-[7px]'}`} style={{ color: 'var(--ink-secondary)' }}>
          {formatHour(hour, timeFormat, lang)}
        </span>
      </div>
      <div className="flex-1 flex flex-col">
        <QuarterSlot timeStr={`${pad(hour)}:00`} isHour={false} />
        <QuarterSlot timeStr={`${pad(hour)}:15`} isHour={false} />
        <QuarterSlot timeStr={`${pad(hour)}:30`} isHour={false} />
        <QuarterSlot timeStr={`${pad(hour)}:45`} isHour={true}  />
      </div>
    </div>
  );
}

export function Timebox() {
  const { timeboxDate, navigateTimeboxDate } = useTaskStore(
    useShallow((s) => ({ timeboxDate: s.timeboxDate, navigateTimeboxDate: s.navigateTimeboxDate }))
  );
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.timebox_start && t.scheduled_date === timeboxDate)
  ));
  const labels = useLabelStore((s) => s.labels);
  const dayEvents = useDayEvents(timeboxDate);
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const { hasAccounts, calLoading, calIssue, ensureEvents } = useIntegrationStore(
    useShallow((s) => ({
      hasAccounts: s.accounts.length > 0,
      calLoading: s.loading > 0,
      calIssue: s.accounts.find((a) => a.status !== 'ok') ?? null,
      ensureEvents: s.ensureEvents,
    }))
  );

  const t = useT();
  const locale = useDateLocale();
  const timeFormat = useGeneralStore((s) => s.timeFormat);
  const language  = useGeneralStore((s) => s.language);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowOffset, setNowOffset] = useState<number | null>(null);
  const nowMinutes = nowOffset === null ? 0 : Math.round((nowOffset / HOUR_PX) * 60) + START_HOUR * 60;

  function calcNowOffset() {
    if (!isToday(parseISO(timeboxDate))) { setNowOffset(null); return; }
    const now = new Date();
    const offset = ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * HOUR_PX;
    const max = (END_HOUR - START_HOUR) * HOUR_PX;
    setNowOffset(offset >= 0 && offset <= max ? offset : null);
  }

  useEffect(() => {
    calcNowOffset();
    const id = setInterval(calcNowOffset, 60_000);
    return () => clearInterval(id);
  }, [timeboxDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current && nowOffset !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowOffset - 120);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalH = (END_HOUR - START_HOUR) * HOUR_PX;
  // Tasks and calendar events share the column layout so they never cover each other.
  const gridStart = START_HOUR * 60;
  const spans: Span<TimeboxItem>[] = [
    ...tasks.map((task) => ({
      item: { kind: 'task' as const, task },
      start: timeToMinutes(task.timebox_start!),
      end: timeToMinutes(task.timebox_end!),
    })),
    ...dayEvents
      .filter((e) => !e.allDay && e.endMin > gridStart)
      .map((event) => ({ item: { kind: 'event' as const, event }, start: Math.max(event.startMin, gridStart), end: event.endMin })),
  ];
  const layout = layoutColumns(spans);
  const blockAreaW = 300 - LABEL_W - 8;

  const dateObj = parseISO(timeboxDate);
  const isCurToday = isToday(dateObj);
  const dayLabel = format(dateObj, 'EEEE, MMMM', { locale });
  const dayNum = format(dateObj, 'd');

  return (
    <div
      className="w-[300px] flex-shrink-0 flex flex-col h-full"
      style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {/* Header */}
      <Toolbar paddingLeft={14} paddingRight={10}>
        <span className="cx-section">{t('Timebox')}</span>

        <div className="flex items-center gap-0.5 ml-auto">
          {hasAccounts && (
            <IconButton
              onClick={() => ensureEvents(timeboxDate, { force: true })}
              title={calIssue ? `${calIssue.label}: ${calIssue.error ?? ''}` : t('Refresh calendars')}
              tone={calIssue ? 'var(--warn)' : undefined}
              size={26}
            >
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" className={calLoading ? 'animate-spin' : ''}>
                <path d="M10.5 6A4.5 4.5 0 1 1 9 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M9.5 1v2.2H7.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          )}
          <IconButton onClick={() => navigateTimeboxDate('prev')} size={26} title="Previous day">
            <Chevron dir="left" />
          </IconButton>
          <PillButton onClick={() => navigateTimeboxDate('today')} active={isCurToday}>{t('Today')}</PillButton>
          <IconButton onClick={() => navigateTimeboxDate('next')} size={26} title="Next day">
            <Chevron dir="right" />
          </IconButton>
        </div>
      </Toolbar>

      {/* Date label */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <span
          className="min-w-7 h-7 px-1.5 rounded-full flex items-center justify-center text-[13px] font-semibold tabular-nums"
          style={{
            background: isCurToday ? 'var(--accent-strong)' : 'var(--surface-hover)',
            color: isCurToday ? 'var(--on-accent)' : 'var(--ink)',
          }}
        >
          {dayNum}
        </span>
        <span className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{dayLabel}</span>
      </div>

      {/* All-day calendar events */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 flex-shrink-0 max-h-[76px] overflow-y-auto" style={{ borderBottom: '1px solid var(--border)' }}>
          {allDayEvents.map((ev) => (
            <span
              key={ev.key}
              title={ev.title || t('(No title)')}
              className="max-w-full truncate px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                borderRadius: 'var(--radius-xs)',
                background: `color-mix(in srgb, ${ev.color} 14%, var(--surface))`,
                color: 'var(--ink)',
                boxShadow: `inset 2px 0 0 ${ev.color}`,
              }}
            >
              {ev.title || t('(No title)')}
            </span>
          ))}
        </div>
      )}

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${totalH}px` }}>
          <DropPreview />

          {hours.map((hour) => (
            <div key={hour} className="absolute w-full" style={{ top: `${(hour - START_HOUR) * HOUR_PX}px`, height: `${HOUR_PX}px` }}>
              <HourRow hour={hour} timeFormat={timeFormat} lang={language} />
            </div>
          ))}

          {nowOffset !== null && (
            <div
              className="absolute flex items-center z-10 pointer-events-none"
              style={{ top: `${nowOffset - 1}px`, left: 0, right: 0 }}
            >
              <span
                className="absolute left-1 -translate-y-1/2 top-1/2 px-1 text-[10px] font-semibold leading-[14px] tabular-nums"
                style={{ background: 'var(--now-strong)', color: 'var(--on-accent)', borderRadius: 'var(--radius-xs)' }}
              >
                {formatTimeStr(minutesToTime(nowMinutes), timeFormat, language)}
              </span>
              <div className="flex items-center flex-1" style={{ marginLeft: LABEL_W }}>
                <div className="cx-pulse w-2 h-2 rounded-full flex-shrink-0 -ml-1" style={{ background: 'var(--now)' }} />
                <div className="flex-1 h-[2px]" style={{ background: 'var(--now)' }} />
              </div>
            </div>
          )}

          {layout.map(({ item, start, end, col, totalCols }) => {
            const colW = Math.floor(blockAreaW / totalCols);
            const left = LABEL_W + 4 + col * colW;
            const width = colW - BLOCK_GAP;

            if (item.kind === 'event') {
              const ev = item.event;
              const height = Math.max(((end - start) / 60) * HOUR_PX, 15);
              const range = `${formatTimeStr(minutesToTime(ev.startMin), timeFormat, language)} – ${
                ev.endMin >= 1440 ? formatTimeStr('00:00', timeFormat, language) : formatTimeStr(minutesToTime(ev.endMin), timeFormat, language)}`;
              return (
                <div
                  key={ev.key}
                  title={`${ev.title || t('(No title)')}\n${range}`}
                  className="cx-rise-in absolute pointer-events-none z-[2] px-3 py-1.5 overflow-hidden"
                  style={{
                    top: minutesToOffset(start),
                    left,
                    width,
                    height,
                    borderRadius: 'var(--radius-md)',
                    background: `color-mix(in srgb, ${ev.color} 12%, var(--surface))`,
                    border: `1px solid color-mix(in srgb, ${ev.color} 30%, var(--surface))`,
                  }}
                >
                  <div className="text-[13px] font-semibold leading-[18px] truncate" style={{ color: 'var(--ink)' }}>
                    {ev.title || t('(No title)')}
                  </div>
                  {height > 36 && (
                    <div className="text-[12px] font-medium leading-4 tabular-nums truncate" style={{ color: `color-mix(in srgb, ${ev.color} 70%, var(--ink))` }}>
                      {range}
                    </div>
                  )}
                </div>
              );
            }

            const task = item.task;
            const labelColor = labels.find((l) => l.id === task.label)?.color ?? null;
            const color = getBlockColor(labelColor);
            return (
              <div key={task.id} className="absolute" style={{ top: `${timeToOffset(task.timebox_start!)}px`, left: `${left}px`, width: `${width}px` }}>
                <TimeboxBlock task={task} color={color} lang={language} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
