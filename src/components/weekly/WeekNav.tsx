import { format, addDays, isSameWeek } from 'date-fns';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';

interface Props {
  onTodayClick?: () => void;
}

function PanelIcon({ side }: { side: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      {side === 'left'
        ? <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.3" />
        : <line x1="10.5" y1="1" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1.3" />}
    </svg>
  );
}

export function WeekNav({ onTodayClick }: Props) {
  const currentWeekStart  = useTaskStore((s) => s.currentWeekStart);
  const navigateWeek      = useTaskStore((s) => s.navigateWeek);
  const currentView       = useTaskStore((s) => s.currentView);
  const setView           = useTaskStore((s) => s.setView);
  const showBrainDump     = useTaskStore((s) => s.showBrainDump);
  const showTimebox       = useTaskStore((s) => s.showTimebox);
  const toggleBrainDump   = useTaskStore((s) => s.toggleBrainDump);
  const toggleTimebox     = useTaskStore((s) => s.toggleTimebox);

  const weekEnd        = addDays(currentWeekStart, 6);
  const isCurrentWeek  = isSameWeek(new Date(), currentWeekStart, { weekStartsOn: 1 });
  const label          = `${format(currentWeekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div
      data-tauri-drag-region
      className="flex items-center gap-2 border-b border-[#E5E7EB] bg-white flex-shrink-0"
      style={{ height: 52, paddingLeft: showBrainDump ? 12 : 80, paddingRight: 12 }}
    >
      {/* Left panel toggle */}
      <button
        onClick={toggleBrainDump}
        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ${
          showBrainDump ? 'text-[#6366F1] bg-[#EEF2FF]' : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6]'
        }`}
      >
        <PanelIcon side="left" />
      </button>

      {/* Week navigation */}
      <motion.button whileHover={{ backgroundColor: '#F3F4F6' }} whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.1 }} onClick={() => navigateWeek('prev')}
        className="w-6 h-6 flex items-center justify-center rounded-md text-[#6B7280] flex-shrink-0"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      <span className="text-[13px] font-medium text-[#374151] select-none flex-shrink-0">{label}</span>

      <motion.button whileHover={{ backgroundColor: '#F3F4F6' }} whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.1 }} onClick={() => navigateWeek('next')}
        className="w-6 h-6 flex items-center justify-center rounded-md text-[#6B7280] flex-shrink-0"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      <motion.button onClick={onTodayClick} whileTap={{ scale: 0.95 }}
        animate={{ backgroundColor: isCurrentWeek ? '#EEF2FF' : '#F3F4F6', color: isCurrentWeek ? '#6366F1' : '#374151', borderColor: isCurrentWeek ? '#C7D2FE' : '#E5E7EB' }}
        whileHover={{ backgroundColor: '#EEF2FF', color: '#6366F1', borderColor: '#C7D2FE' }}
        transition={{ duration: 0.15 }}
        className="px-3 py-1 text-[12px] font-medium rounded-lg border cursor-pointer flex-shrink-0"
      >
        Today
      </motion.button>

      {/* View switcher */}
      <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-[3px] ml-auto flex-shrink-0">
        <button
          onClick={() => setView('main')}
          className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
            currentView === 'main' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setView('today')}
          className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
            currentView === 'today' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Today
        </button>
      </div>

      {/* Right panel toggle */}
      <button
        onClick={toggleTimebox}
        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ${
          showTimebox ? 'text-[#6366F1] bg-[#EEF2FF]' : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6]'
        }`}
      >
        <PanelIcon side="right" />
      </button>
    </div>
  );
}
