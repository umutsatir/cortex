import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { TimeboxBlock } from './TimeboxBlock';
import type { Task } from '../../types';

export const START_HOUR = 6;
const END_HOUR = 24;
export const HOUR_PX = 60;
export const LABEL_W = 48;
const BLOCK_GAP = 2;

// Distinct pastel palettes
export const BLOCK_COLORS = [
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' }, // indigo
  { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' }, // rose
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' }, // emerald
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' }, // amber
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' }, // sky
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' }, // violet
  { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' }, // orange
  { bg: '#F0FDFA', border: '#99F6E4', text: '#134E4A' }, // teal
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

export function getBlockColor(taskId: string, labelColor?: string | null) {
  if (labelColor) {
    return { bg: labelColor + '22', border: labelColor + '77', text: labelColor };
  }
  return BLOCK_COLORS[hashId(taskId) % BLOCK_COLORS.length];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h * 60 + m - START_HOUR * 60) / 60) * HOUR_PX;
}

// Greedy column assignment for overlapping tasks
interface LayoutTask { task: Task; col: number; totalCols: number }

function layoutTimebox(tasks: Task[]): LayoutTask[] {
  if (tasks.length === 0) return [];

  const sorted = [...tasks].sort(
    (a, b) => timeToMinutes(a.timebox_start!) - timeToMinutes(b.timebox_start!)
  );

  const colEnds: number[] = []; // last end-time of each column

  const cols = sorted.map((task) => {
    const start = timeToMinutes(task.timebox_start!);
    const end = timeToMinutes(task.timebox_end!);
    let col = colEnds.findIndex((e) => e <= start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = end;
    return col;
  });

  // For each task: totalCols = max column index among all tasks that overlap with it + 1
  const result: LayoutTask[] = sorted.map((task, i) => {
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

  return result;
}

function HourRow({ hour }: { hour: number }) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;
  const { setNodeRef, isOver } = useDroppable({ id: `timebox__${timeStr}` });

  return (
    <div className="flex" style={{ height: `${HOUR_PX}px` }}>
      <div className="flex-shrink-0 flex items-start pt-1" style={{ width: `${LABEL_W}px` }}>
        <span className="text-[11px] text-[#9CA3AF] pl-3">
          {`${String(hour).padStart(2, '0')}:00`}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 border-b border-[#F3F4F6] transition-colors ${isOver ? 'bg-[#EEF2FF]' : ''}`}
      />
    </div>
  );
}

interface Props {
  dateFilter?: string;
}

export function Timebox({ dateFilter }: Props) {
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => {
      if (!t.timebox_start) return false;
      if (dateFilter) return t.scheduled_date === dateFilter;
      return true;
    })
  ));
  const labels = useLabelStore((s) => s.labels);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowOffset, setNowOffset] = useState<number | null>(null);

  function calcNowOffset() {
    const now = new Date();
    const offset = ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * HOUR_PX;
    const max = (END_HOUR - START_HOUR) * HOUR_PX;
    setNowOffset(offset >= 0 && offset <= max ? offset : null);
  }

  useEffect(() => {
    calcNowOffset();
    const id = setInterval(calcNowOffset, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current && nowOffset !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowOffset - 120);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalH = (END_HOUR - START_HOUR) * HOUR_PX;
  const layout = layoutTimebox(tasks);
  // Available width for blocks (container 300px - label area - side padding)
  const blockAreaW = 300 - LABEL_W - 8;

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col border-l border-[#E5E7EB] bg-white">
      <div className="px-4 pt-4 pb-2 border-b border-[#E5E7EB] flex-shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">Timebox</span>
        {!dateFilter && (
          <span className="ml-2 text-[11px] text-[#D1D5DB]">{format(new Date(), 'MMM d')}</span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${totalH}px` }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full"
              style={{ top: `${(hour - START_HOUR) * HOUR_PX}px`, height: `${HOUR_PX}px` }}
            >
              <HourRow hour={hour} />
            </div>
          ))}

          {nowOffset !== null && (
            <div
              className="absolute flex items-center z-10 pointer-events-none"
              style={{ top: `${nowOffset}px`, left: `${LABEL_W}px`, right: 0 }}
            >
              <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1" />
              <div className="flex-1 h-px bg-[#EF4444]" />
            </div>
          )}

          {layout.map(({ task, col, totalCols }) => {
            const colW = Math.floor(blockAreaW / totalCols);
            const left = LABEL_W + 4 + col * colW;
            const width = colW - BLOCK_GAP;
            const labelColor = labels.find((l) => l.id === task.label)?.color ?? null;
            const color = getBlockColor(task.id, labelColor);

            return (
              <div
                key={task.id}
                className="absolute"
                style={{
                  top: `${timeToOffset(task.timebox_start!)}px`,
                  left: `${left}px`,
                  width: `${width}px`,
                }}
              >
                <TimeboxBlock task={task} color={color} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
