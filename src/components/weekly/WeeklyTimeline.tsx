import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { RolloverBanner } from '../common/RolloverBanner';
import { WeekNav } from './WeekNav';
import { DayColumn } from './DayColumn';

const COL_W = 220;

export function WeeklyTimeline() {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const navigateToToday = useTaskStore((s) => s.navigateToToday);

  const scrollRef = useRef<HTMLDivElement>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Slide the grid in from the side the user navigated toward.
  const weekKey = currentWeekStart.getTime();
  const prevWeek = useRef(weekKey);
  const dir = Math.sign(weekKey - prevWeek.current);
  useEffect(() => { prevWeek.current = weekKey; }, [weekKey]);

  function handleScrollToToday() {
    navigateToToday();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (!el) return;
        const weekStart = useTaskStore.getState().currentWeekStart;
        const idx = Math.min(6, Math.max(0, differenceInCalendarDays(new Date(), weekStart)));
        el.scrollTo({ left: idx * COL_W, behavior: 'smooth' });
      });
    });
  }

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ background: 'var(--surface)' }}>
      <WeekNav onTodayClick={handleScrollToToday} />
      <RolloverBanner className="mx-4 mt-3 -mb-1" />
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">
        <motion.div
          key={weekKey}
          initial={{ opacity: 0, x: dir * 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          className="grid h-full overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(7, ${COL_W}px)`,
            width: 'max-content',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}
        >
          {days.map((day, i) => (
            <DayColumn key={day.toISOString()} date={day} last={i === 6} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
