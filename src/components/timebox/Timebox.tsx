import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { TimeboxBlock } from './TimeboxBlock';

const START_HOUR = 6;
const END_HOUR = 24;
const HOUR_PX = 60;
const LABEL_W = 48;

function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h * 60 + m - START_HOUR * 60) / 60) * HOUR_PX;
}

function HourRow({ hour }: { hour: number }) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;
  const { setNodeRef, isOver } = useDroppable({ id: `timebox__${timeStr}` });

  return (
    <div className="flex" style={{ height: `${HOUR_PX}px` }}>
      <div className="flex-shrink-0 flex items-start pt-1" style={{ width: `${LABEL_W}px` }}>
        <span className="text-[11px] text-[#9CA3AF] pl-3">
          {hour === 0 ? '00:00' : `${String(hour).padStart(2, '0')}:00`}
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
  }, []);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalH = (END_HOUR - START_HOUR) * HOUR_PX;

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

          {tasks.map((task) => (
            <div
              key={task.id}
              className="absolute"
              style={{
                top: `${timeToOffset(task.timebox_start!)}px`,
                left: `${LABEL_W + 2}px`,
                right: '4px',
              }}
            >
              <TimeboxBlock task={task} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
