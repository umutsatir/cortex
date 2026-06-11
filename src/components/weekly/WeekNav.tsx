import { format, addDays, isSameWeek } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { SettingsButton } from '../layout/SettingsButton';

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

  const t = useT();
  const locale = useDateLocale();
  const weekEnd        = addDays(currentWeekStart, 6);
  const isCurrentWeek  = isSameWeek(new Date(), currentWeekStart, { weekStartsOn: 1 });
  const label          = `${format(currentWeekStart, 'MMM d', { locale })} – ${format(weekEnd, 'MMM d, yyyy', { locale })}`;

  return (
    <div
      data-tauri-drag-region
      className="flex items-center gap-2 border-b flex-shrink-0"
      style={{
        height: 52,
        paddingLeft: showBrainDump ? 12 : 80,
        paddingRight: 12,
        borderColor: 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Left panel toggle */}
      <button
        onClick={toggleBrainDump}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0"
        style={{
          color: showBrainDump ? 'var(--accent)' : 'var(--text-4)',
          background: showBrainDump ? 'var(--accent-bg)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!showBrainDump) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { if (!showBrainDump) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <PanelIcon side="left" />
      </button>

      {/* Week navigation */}
      <button
        onClick={() => navigateWeek('prev')}
        className="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="text-[13px] font-medium select-none flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>

      <button
        onClick={() => navigateWeek('next')}
        className="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        onClick={onTodayClick}
        className="px-3 py-1 text-[12px] font-medium rounded-lg border cursor-pointer flex-shrink-0 transition-colors"
        style={{
          background: isCurrentWeek ? 'var(--accent-bg)' : 'var(--surface-3)',
          color: isCurrentWeek ? 'var(--accent)' : 'var(--text-2)',
          borderColor: isCurrentWeek ? 'var(--accent-border)' : 'var(--border)',
        }}
      >
        {t('Today')}
      </button>

      {/* View switcher */}
      <div className="flex items-center gap-1 rounded-lg p-[3px] ml-auto flex-shrink-0" style={{ background: 'var(--surface-3)' }}>
        <button
          onClick={() => setView('main')}
          className="px-3 py-1 text-[12px] font-medium rounded-md transition-all"
          style={{
            background: currentView === 'main' ? 'var(--surface)' : 'transparent',
            color: currentView === 'main' ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: currentView === 'main' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
          }}
        >
          {t('Week')}
        </button>
        <button
          onClick={() => setView('today')}
          className="px-3 py-1 text-[12px] font-medium rounded-md transition-all"
          style={{
            background: currentView === 'today' ? 'var(--surface)' : 'transparent',
            color: currentView === 'today' ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: currentView === 'today' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
          }}
        >
          {t('Today')}
        </button>
      </div>

      {/* Right panel toggle */}
      <button
        onClick={toggleTimebox}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0"
        style={{
          color: showTimebox ? 'var(--accent)' : 'var(--text-4)',
          background: showTimebox ? 'var(--accent-bg)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!showTimebox) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { if (!showTimebox) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <PanelIcon side="right" />
      </button>

      <SettingsButton />
    </div>
  );
}
