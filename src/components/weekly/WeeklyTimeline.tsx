import { addDays } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { WeekNav } from './WeekNav';
import { DayColumn } from './DayColumn';

export function WeeklyTimeline() {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const setView = useTaskStore((s) => s.setView);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white">
      <WeekNav />
      {/* Horizontally scrollable day columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
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
