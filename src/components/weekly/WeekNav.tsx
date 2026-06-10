import { format, addDays, isSameWeek, startOfWeek } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';

export function WeekNav() {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const navigateWeek = useTaskStore((s) => s.navigateWeek);

  const weekEnd = addDays(currentWeekStart, 6);
  const isCurrentWeek = isSameWeek(new Date(), currentWeekStart, { weekStartsOn: 1 });

  const label = `${format(currentWeekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  function goToToday() {
    const s = useTaskStore.getState();
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    if (s.currentWeekStart.getTime() !== thisWeek.getTime()) {
      s.navigateWeek(s.currentWeekStart < thisWeek ? 'next' : 'prev');
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E7EB]">
      <button
        onClick={() => navigateWeek('prev')}
        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="text-[13px] font-medium text-[#374151]">{label}</span>

      <button
        onClick={() => navigateWeek('next')}
        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!isCurrentWeek && (
        <button
          onClick={goToToday}
          className="ml-auto text-[11px] font-medium text-[#6366F1] hover:underline"
        >
          Today
        </button>
      )}
    </div>
  );
}
