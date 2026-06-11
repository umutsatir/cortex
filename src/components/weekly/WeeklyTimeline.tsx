import { useRef } from 'react';
import { addDays, differenceInCalendarDays, isThisWeek } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { WeekNav } from './WeekNav';
import { DayColumn } from './DayColumn';

const COL_W = 272;

export function WeeklyTimeline() {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const setView = useTaskStore((s) => s.setView);
  const navigateToToday = useTaskStore((s) => s.navigateToToday);

  const scrollRef = useRef<HTMLDivElement>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  function handleScrollToToday() {
    navigateToToday();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        const idx = differenceInCalendarDays(new Date(), currentWeekStart);
        const todayIdx = isThisWeek(new Date(), { weekStartsOn: 1 })
          ? differenceInCalendarDays(new Date(), currentWeekStart)
          : 0;
        scrollRef.current.scrollTo({ left: Math.max(0, todayIdx) * COL_W, behavior: 'smooth' });
        void idx;
      });
    });
  }

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ background: 'var(--surface)' }}>
      <WeekNav onTodayClick={handleScrollToToday} />
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full" style={{ minWidth: 'max-content' }}>
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              date={day}
              onFocusClick={() => setView('today')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
