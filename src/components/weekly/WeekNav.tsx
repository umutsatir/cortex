import { format, addDays, isSameWeek } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useGeneralStore } from '../../store/generalStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { SettingsButton } from '../layout/SettingsButton';
import {
  Chevron, IconButton, PanelToggle, PillButton, Toolbar, TRAFFIC_LIGHTS_W, ViewSwitcher,
} from '../ui/Toolbar';

interface Props {
  onTodayClick?: () => void;
}

export function WeekNav({ onTodayClick }: Props) {
  const currentWeekStart = useTaskStore((s) => s.currentWeekStart);
  const navigateWeek     = useTaskStore((s) => s.navigateWeek);
  const showBrainDump    = useTaskStore((s) => s.showBrainDump);
  const weekStartsOn     = useGeneralStore((s) => s.weekStartsOn);

  const t = useT();
  const locale = useDateLocale();
  const weekEnd       = addDays(currentWeekStart, 6);
  const isCurrentWeek = isSameWeek(new Date(), currentWeekStart, { weekStartsOn });
  const sameMonth     = currentWeekStart.getMonth() === weekEnd.getMonth();
  const range = sameMonth
    ? `${format(currentWeekStart, 'MMM d', { locale })} – ${format(weekEnd, 'd', { locale })}`
    : `${format(currentWeekStart, 'MMM d', { locale })} – ${format(weekEnd, 'MMM d', { locale })}`;

  return (
    <Toolbar paddingLeft={showBrainDump ? 12 : TRAFFIC_LIGHTS_W}>
      <PanelToggle side="left" />

      <div className="flex items-baseline gap-2 ml-1 min-w-0">
        <span className="text-[18px] font-semibold tracking-[-0.02em] truncate" style={{ color: 'var(--ink)' }}>
          {format(weekEnd, 'MMMM yyyy', { locale })}
        </span>
        <span className="text-[13px] tabular-nums truncate" style={{ color: 'var(--ink-secondary)' }}>
          {range}
        </span>
      </div>

      <div className="flex items-center gap-0.5 ml-1">
        <IconButton onClick={() => navigateWeek('prev')} size={26} title="Previous week">
          <Chevron dir="left" />
        </IconButton>
        <IconButton onClick={() => navigateWeek('next')} size={26} title="Next week">
          <Chevron dir="right" />
        </IconButton>
      </div>

      <PillButton onClick={() => onTodayClick?.()} active={isCurrentWeek}>{t('Today')}</PillButton>

      <div className="ml-auto flex items-center gap-1.5">
        <ViewSwitcher />
        <PanelToggle side="right" />
        <SettingsButton />
      </div>
    </Toolbar>
  );
}
