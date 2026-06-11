import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { SettingsPanel } from '../settings/SettingsPanel';

function LeftPanelIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.3"
        strokeOpacity={active ? 1 : 0.4} />
    </svg>
  );
}

function RightPanelIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.5" y1="1" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1.3"
        strokeOpacity={active ? 1 : 0.4} />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M6.1 1.5a1.4 1.4 0 0 1 2.8 0l.15.6a.9.9 0 0 0 1.3.5l.55-.3a1.4 1.4 0 0 1 1.97 1.97l-.3.55a.9.9 0 0 0 .5 1.3l.6.15a1.4 1.4 0 0 1 0 2.8l-.6.15a.9.9 0 0 0-.5 1.3l.3.55a1.4 1.4 0 0 1-1.97 1.97l-.55-.3a.9.9 0 0 0-1.3.5l-.15.6a1.4 1.4 0 0 1-2.8 0l-.15-.6a.9.9 0 0 0-1.3-.5l-.55.3A1.4 1.4 0 0 1 2.13 11.1l.3-.55a.9.9 0 0 0-.5-1.3l-.6-.15a1.4 1.4 0 0 1 0-2.8l.6-.15a.9.9 0 0 0 .5-1.3l-.3-.55A1.4 1.4 0 0 1 4.1 2.3l.55.3a.9.9 0 0 0 1.3-.5L6.1 1.5z"
        stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}

export function Header() {
  const currentView     = useTaskStore((s) => s.currentView);
  const setView         = useTaskStore((s) => s.setView);
  const showBrainDump   = useTaskStore((s) => s.showBrainDump);
  const showTimebox     = useTaskStore((s) => s.showTimebox);
  const toggleBrainDump = useTaskStore((s) => s.toggleBrainDump);
  const toggleTimebox   = useTaskStore((s) => s.toggleTimebox);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      data-tauri-drag-region
      className="absolute top-0 left-0 right-0 flex items-center select-none z-10"
      style={{
        height: 52,
        paddingLeft: 80,
        paddingRight: 16,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Left panel toggle */}
      <button
        onClick={toggleBrainDump}
        title={showBrainDump ? 'Hide sidebar' : 'Show sidebar'}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
        style={{
          color: showBrainDump ? 'var(--accent)' : 'var(--text-4)',
          background: showBrainDump ? 'var(--accent-bg)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!showBrainDump) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { if (!showBrainDump) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <LeftPanelIcon active={showBrainDump} />
      </button>

      {/* View switcher — absolutely centered */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg p-[3px]"
        style={{ background: 'var(--surface-3)', pointerEvents: 'auto' }}
      >
        <button
          onClick={() => setView('main')}
          className="px-3 py-1 text-[12px] font-medium rounded-md transition-all"
          style={{
            background: currentView === 'main' ? 'var(--surface)' : 'transparent',
            color: currentView === 'main' ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: currentView === 'main' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
          }}
        >
          Week
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
          Today
        </button>
      </div>

      {/* Right side controls */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Right panel toggle */}
        <button
          onClick={toggleTimebox}
          title={showTimebox ? 'Hide timebox' : 'Show timebox'}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{
            color: showTimebox ? 'var(--accent)' : 'var(--text-4)',
            background: showTimebox ? 'var(--accent-bg)' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!showTimebox) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
          onMouseLeave={(e) => { if (!showTimebox) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <RightPanelIcon active={showTimebox} />
        </button>

        {/* Settings gear */}
        <button
          ref={gearRef}
          onClick={() => setSettingsOpen((v) => !v)}
          title="Settings"
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{
            color: settingsOpen ? 'var(--accent)' : 'var(--text-4)',
            background: settingsOpen ? 'var(--accent-bg)' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!settingsOpen) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
          onMouseLeave={(e) => { if (!settingsOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <GearIcon />
        </button>
      </div>

      <AnimatePresence>
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
