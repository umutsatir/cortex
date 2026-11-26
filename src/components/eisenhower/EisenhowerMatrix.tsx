import { useShallow } from 'zustand/react/shallow';
import { format } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { SettingsButton } from '../layout/SettingsButton';
import { PanelToggle, Toolbar, TRAFFIC_LIGHTS_W, ViewSwitcher } from '../ui/Toolbar';
import { Quadrant } from './Quadrant';
import type { EisenhowerQuadrant } from '../../types';

const QUADRANTS: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];

export function EisenhowerMatrix() {
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === s.today && t.eisenhower_quadrant)
  ));
  const today = useTaskStore((s) => s.today);
  const showBrainDump = useTaskStore((s) => s.showBrainDump);
  const t = useT();
  const locale = useDateLocale();

  return (
    <div className="flex-1 min-w-0 overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      <Toolbar paddingLeft={showBrainDump ? 12 : TRAFFIC_LIGHTS_W}>
        <PanelToggle side="left" />
        <div className="flex items-baseline gap-2 ml-1 min-w-0">
          <span className="text-[16px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{t('Focus')}</span>
          <span className="text-[13px] truncate" style={{ color: 'var(--ink-secondary)' }}>
            {format(new Date(today + 'T00:00:00'), 'EEEE, MMM d', { locale })}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ViewSwitcher />
          <PanelToggle side="right" />
          <SettingsButton />
        </div>
      </Toolbar>

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-4 overflow-hidden">
        {QUADRANTS.map((q) => (
          <Quadrant
            key={q}
            quadrant={q}
            tasks={tasks.filter((t) => t.eisenhower_quadrant === q)}
          />
        ))}
      </div>
    </div>
  );
}
