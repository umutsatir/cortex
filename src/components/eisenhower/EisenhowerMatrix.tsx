import { useShallow } from 'zustand/react/shallow';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { SettingsButton } from '../layout/SettingsButton';
import { IconButton, PanelToggle, SearchButton, StatsButton, Toolbar, TRAFFIC_LIGHTS_W, ViewSwitcher } from '../ui/Toolbar';
import { Quadrant } from './Quadrant';
import { useGeneralStore } from '../../store/generalStore';
import { inScope, suggestQuadrant, weekRange, type MatrixScope } from '../../lib/eisenhower';
import { clearMatrix } from '../../lib/actions';
import type { EisenhowerQuadrant, Task } from '../../types';

const QUADRANTS: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];

const SCOPES: { id: MatrixScope; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All' },
];

/** Today / This week / All — the same sliding pill as the view switcher. */
function ScopeSwitcher({ value, onChange }: { value: MatrixScope; onChange: (s: MatrixScope) => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-0.5 p-[3px]" style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }} role="tablist">
      {SCOPES.map((it) => {
        const on = value === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className="cx-press relative px-3 h-[24px] text-[12px] font-medium hover:text-[var(--ink)] transition-colors duration-200"
            style={{ color: on ? 'var(--ink)' : 'var(--ink-secondary)' }}
          >
            {on && (
              <motion.span
                layoutId="matrix-scope-pill"
                className="absolute inset-0 z-0"
                style={{ borderRadius: 'var(--radius-xs)', background: 'var(--surface)', boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border)' }}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative z-10">{t(it.label)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EisenhowerMatrix() {
  const today = useTaskStore((s) => s.today);
  const scope = useGeneralStore((s) => s.matrixScope);
  const setScope = useGeneralStore((s) => s.setMatrixScope);
  const weekStartsOn = useGeneralStore((s) => s.weekStartsOn);
  const scoped = useTaskStore(useShallow((s) => s.tasks.filter((t) => inScope(t, scope, s.today, weekStartsOn))));
  const hidden = useGeneralStore((s) => s.hiddenSuggestions);
  // Tasks the user hasn't sorted yet show where they'd likely go (not saved until moved).
  const placed = scoped.flatMap((task) => {
    if (task.eisenhower_quadrant) return [{ task, quadrant: task.eisenhower_quadrant, auto: false }];
    if (hidden.includes(task.id)) return [];
    const quadrant = suggestQuadrant(task, today);
    return quadrant ? [{ task, quadrant, auto: true }] : [];
  });
  const showBrainDump = useTaskStore((s) => s.showBrainDump);
  const t = useT();
  const locale = useDateLocale();

  const [weekFrom, weekTo] = weekRange(today, weekStartsOn);
  const subtitle = scope === 'today'
    ? format(parseISO(today), 'EEEE, MMM d', { locale })
    : scope === 'week'
      ? `${format(parseISO(weekFrom), 'MMM d', { locale })} – ${format(parseISO(weekTo), 'MMM d', { locale })}`
      : `${placed.length} ${t('open tasks')}`;
  // Outside "Today", each card says which day it's on.
  const dateHint = scope === 'today' ? undefined : (task: Task) =>
    task.scheduled_date === null ? t('Brain Dump')
      : task.scheduled_date === today ? t('Today')
      : format(parseISO(task.scheduled_date), scope === 'week' ? 'EEEE' : 'd MMM', { locale });

  return (
    <div className="flex-1 min-w-0 overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      <Toolbar paddingLeft={showBrainDump ? 12 : TRAFFIC_LIGHTS_W}>
        <PanelToggle side="left" />
        <div className="flex items-baseline gap-2 ml-1 min-w-0">
          <span className="text-[16px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Eisenhower</span>
          <span className="text-[13px] truncate tabular-nums" style={{ color: 'var(--ink-secondary)' }}>{subtitle}</span>
        </div>
        <div className="ml-2 flex-shrink-0">
          <ScopeSwitcher value={scope} onChange={setScope} />
        </div>
        {placed.length > 0 && (
          <IconButton onClick={() => { void clearMatrix(); }} title={t('Clear matrix')} size={26}>
            {/* Eraser */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M9.2 2.8l4 4a1 1 0 010 1.4L8 13.4H4.6L2.8 11.6a1 1 0 010-1.4l5-5 1.4-2.4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M6 6.6l4.4 4.4M8 13.4h5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <SearchButton />
          <StatsButton />
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
            tasks={placed.filter((p) => p.quadrant === q).map((p) => p.task)}
            autoIds={new Set(placed.filter((p) => p.auto).map((p) => p.task.id))}
            dateHint={dateHint}
          />
        ))}
      </div>
    </div>
  );
}
