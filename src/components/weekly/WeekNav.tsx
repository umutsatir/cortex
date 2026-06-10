import { format, addDays, isSameWeek } from 'date-fns';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';

interface Props {
  onTodayClick?: () => void;
}

export function WeekNav({ onTodayClick }: Props) {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const navigateWeek = useTaskStore((s) => s.navigateWeek);

  const weekEnd = addDays(currentWeekStart, 6);
  const isCurrentWeek = isSameWeek(new Date(), currentWeekStart, { weekStartsOn: 1 });
  const label = `${format(currentWeekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5E7EB] flex-shrink-0">
      <motion.button
        whileHover={{ backgroundColor: '#F3F4F6' }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.1 }}
        onClick={() => navigateWeek('prev')}
        className="w-6 h-6 flex items-center justify-center rounded-md text-[#6B7280]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      <span className="text-[13px] font-medium text-[#374151] select-none">{label}</span>

      <motion.button
        whileHover={{ backgroundColor: '#F3F4F6' }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.1 }}
        onClick={() => navigateWeek('next')}
        className="w-6 h-6 flex items-center justify-center rounded-md text-[#6B7280]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      <motion.button
        onClick={onTodayClick}
        whileTap={{ scale: 0.95 }}
        animate={{
          backgroundColor: isCurrentWeek ? '#EEF2FF' : '#F9FAFB',
          color: isCurrentWeek ? '#6366F1' : '#6B7280',
        }}
        whileHover={{
          backgroundColor: '#EEF2FF',
          color: '#6366F1',
        }}
        transition={{ duration: 0.15 }}
        className="ml-1 px-2.5 py-1 text-[12px] font-medium rounded-lg"
      >
        Today
      </motion.button>
    </div>
  );
}
