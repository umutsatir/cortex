import { addDays } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { WeekNav } from './WeekNav';
import { DayColumn } from './DayColumn';

export function WeeklyTimeline() {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const setView = useTaskStore((s) => s.setView);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  function handleDayClick() {
    setView('today');
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white">
      <WeekNav />
      <div className="flex flex-1 overflow-hidden">
        {days.map((day) => (
          <DayColumn key={day.toISOString()} date={day} onDayClick={handleDayClick} />
        ))}
      </div>
    </div>
  );
}
