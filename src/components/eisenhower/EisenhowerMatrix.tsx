import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';
import { SettingsButton } from '../layout/SettingsButton';
import { Quadrant } from './Quadrant';
import type { EisenhowerQuadrant } from '../../types';

const QUADRANTS: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];

export function EisenhowerMatrix() {
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === s.today && t.eisenhower_quadrant)
  ));
  const currentView = useTaskStore((s) => s.currentView);
  const setView     = useTaskStore((s) => s.setView);
  const toggleBrainDump = useTaskStore((s) => s.toggleBrainDump);
  const toggleTimebox   = useTaskStore((s) => s.toggleTimebox);
  const showBrainDump   = useTaskStore((s) => s.showBrainDump);
  const showTimebox     = useTaskStore((s) => s.showTimebox);
  const t = useT();

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

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
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

        <span className="text-[13px] font-semibold select-none" style={{ color: 'var(--text-1)' }}>{t('Focus')}</span>

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

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 px-4 py-4 overflow-hidden">
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
