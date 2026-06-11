import { useEffect, useRef, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { useGeneralStore } from '../../store/generalStore';
import { useIsDark } from '../../hooks/useIsDark';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { TimeboxBlock } from './TimeboxBlock';
import type { Task } from '../../types';

function formatHour(hour: number, fmt: '12h' | '24h'): string {
  if (fmt === '24h') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function formatTimeStr(timeStr: string, fmt: '12h' | '24h'): string {
  if (fmt === '24h') return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export const START_HOUR = 6;
const END_HOUR = 24;
export const HOUR_PX = 60;
export const LABEL_W = 48;
const BLOCK_GAP = 2;

export const BLOCK_COLORS = [
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
  { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' },
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' },
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  { bg: '#F0FDFA', border: '#99F6E4', text: '#134E4A' },
];

const BLOCK_COLORS_DARK = [
  { bg: '#1E1B4B', border: '#3730A3', text: '#A5B4FC' },
  { bg: '#4C0519', border: '#9F1239', text: '#FDA4AF' },
  { bg: '#022C22', border: '#065F46', text: '#6EE7B7' },
  { bg: '#451A03', border: '#92400E', text: '#FCD34D' },
  { bg: '#082F49', border: '#075985', text: '#7DD3FC' },
  { bg: '#2E1065', border: '#5B21B6', text: '#C4B5FD' },
  { bg: '#431407', border: '#9A3412', text: '#FDBA74' },
  { bg: '#042F2E', border: '#134E4A', text: '#5EEAD4' },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function getBlockColor(taskId: string, labelColor?: string | null, isDark = false) {
  if (labelColor) return { bg: labelColor + '22', border: labelColor + '55', text: labelColor };
  const palette = isDark ? BLOCK_COLORS_DARK : BLOCK_COLORS;
  return palette[hashId(taskId) % palette.length];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h * 60 + m - START_HOUR * 60) / 60) * HOUR_PX;
}

interface LayoutTask { task: Task; col: number; totalCols: number }

function layoutTimebox(tasks: Task[]): LayoutTask[] {
  if (tasks.length === 0) return [];
  const sorted = [...tasks].sort((a, b) =>
    timeToMinutes(a.timebox_start!) - timeToMinutes(b.timebox_start!)
  );
  const colEnds: number[] = [];
  const cols = sorted.map((task) => {
    const start = timeToMinutes(task.timebox_start!);
    const end = timeToMinutes(task.timebox_end!);
    let col = colEnds.findIndex((e) => e <= start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = end;
    return col;
  });
  return sorted.map((task, i) => {
    const s = timeToMinutes(task.timebox_start!);
    const e = timeToMinutes(task.timebox_end!);
    let maxCol = cols[i];
    for (let j = 0; j < sorted.length; j++) {
      const sj = timeToMinutes(sorted[j].timebox_start!);
      const ej = timeToMinutes(sorted[j].timebox_end!);
      if (sj < e && ej > s) maxCol = Math.max(maxCol, cols[j]);
    }
    return { task, col: cols[i], totalCols: maxCol + 1 };
  });
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
      className="absolute pointer-events-none z-20 rounded-lg"
      style={{
        top,
        left: LABEL_W + 4,
        right: 4,
        height,
        background: 'var(--accent-bg)',
        border: '1.5px dashed var(--accent)',
        opacity: 0.65,
      }}
    />
  );
}

function HourRow({ hour, timeFormat }: { hour: number; timeFormat: '12h' | '24h' }) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;
  const { setNodeRef } = useDroppable({ id: `timebox__${timeStr}` });
  return (
    <div className="flex" style={{ height: `${HOUR_PX}px` }}>
      <div className="flex-shrink-0 flex items-start pt-1" style={{ width: `${LABEL_W}px` }}>
        <span className="text-[11px] pl-3" style={{ color: 'var(--text-4)' }}>
          {formatHour(hour, timeFormat)}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 border-b" style={{ borderColor: 'var(--border-subtle)' }} />
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

  const isDark = useIsDark();
  const t = useT();
  const locale = useDateLocale();
  const timeFormat = useGeneralStore((s) => s.timeFormat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowOffset, setNowOffset] = useState<number | null>(null);

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
  const layout = layoutTimebox(tasks);
  const blockAreaW = 300 - LABEL_W - 8;

  const dateObj = parseISO(timeboxDate);
  const isCurToday = isToday(dateObj);
  const dayLabel = format(dateObj, 'EEE', { locale });
  const dayNum = format(dateObj, 'd');

  return (
    <div
      className="w-[300px] flex-shrink-0 flex flex-col border-l h-full"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      {/* Header */}
      <div
        data-tauri-drag-region
        className="flex items-center px-3 border-b flex-shrink-0"
        style={{ height: 52, borderColor: 'var(--border)' }}
      >
        <span className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-4)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {t('Timebox')}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => navigateTimeboxDate('prev')}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-4)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 2L3 5L7 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => navigateTimeboxDate('today')}
            className="px-2 py-0.5 text-[11px] font-medium rounded-md border cursor-pointer transition-colors"
            style={{
              background: isCurToday ? 'var(--accent-bg)' : 'var(--surface-3)',
              color: isCurToday ? 'var(--accent)' : 'var(--text-2)',
              borderColor: isCurToday ? 'var(--accent-border)' : 'var(--border)',
            }}
          >
            {t('Today')}
          </button>

          <button
            onClick={() => navigateTimeboxDate('next')}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-4)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date label */}
      <div className="flex items-center justify-center gap-2 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>{dayLabel}</span>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
          style={{
            background: isCurToday ? 'var(--accent)' : 'var(--surface-3)',
            color: isCurToday ? 'white' : 'var(--text-2)',
          }}
        >
          {dayNum}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${totalH}px` }}>
          <DropPreview />

          {hours.map((hour) => (
            <div key={hour} className="absolute w-full" style={{ top: `${(hour - START_HOUR) * HOUR_PX}px`, height: `${HOUR_PX}px` }}>
              <HourRow hour={hour} timeFormat={timeFormat} />
            </div>
          ))}

          {nowOffset !== null && (
            <div
              className="absolute flex items-center z-10 pointer-events-none"
              style={{ top: `${nowOffset}px`, left: `${LABEL_W}px`, right: 0 }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0 -ml-1" style={{ background: '#EF4444' }} />
              <div className="flex-1 h-px" style={{ background: '#EF4444' }} />
            </div>
          )}

          {layout.map(({ task, col, totalCols }) => {
            const colW = Math.floor(blockAreaW / totalCols);
            const left = LABEL_W + 4 + col * colW;
            const width = colW - BLOCK_GAP;
            const labelColor = labels.find((l) => l.id === task.label)?.color ?? null;
            const color = getBlockColor(task.id, labelColor, isDark);
            return (
              <div key={task.id} className="absolute" style={{ top: `${timeToOffset(task.timebox_start!)}px`, left: `${left}px`, width: `${width}px` }}>
                <TimeboxBlock task={task} color={color} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
