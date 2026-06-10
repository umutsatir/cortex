import { useTaskStore } from '../../store/taskStore';

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

export function Header() {
  const currentView    = useTaskStore((s) => s.currentView);
  const setView        = useTaskStore((s) => s.setView);
  const showBrainDump  = useTaskStore((s) => s.showBrainDump);
  const showTimebox    = useTaskStore((s) => s.showTimebox);
  const toggleBrainDump = useTaskStore((s) => s.toggleBrainDump);
  const toggleTimebox  = useTaskStore((s) => s.toggleTimebox);

  return (
    <div
      data-tauri-drag-region
      className="relative flex items-center border-b border-[#E5E7EB] bg-white select-none flex-shrink-0"
      style={{ height: 52, paddingLeft: 80, paddingRight: 16 }}
    >
      {/* Left panel toggle */}
      <button
        onClick={toggleBrainDump}
        title={showBrainDump ? 'Hide sidebar' : 'Show sidebar'}
        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
          showBrainDump
            ? 'text-[#6366F1] bg-[#EEF2FF]'
            : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6]'
        }`}
      >
        <LeftPanelIcon active={showBrainDump} />
      </button>

      {/* View switcher — absolutely centered */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-[3px]"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => setView('main')}
          className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
            currentView === 'main'
              ? 'bg-white text-[#111827] shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setView('today')}
          className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
            currentView === 'today'
              ? 'bg-white text-[#111827] shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Today
        </button>
      </div>

      {/* Right panel toggle */}
      <button
        onClick={toggleTimebox}
        title={showTimebox ? 'Hide timebox' : 'Show timebox'}
        className={`ml-auto flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
          showTimebox
            ? 'text-[#6366F1] bg-[#EEF2FF]'
            : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6]'
        }`}
      >
        <RightPanelIcon active={showTimebox} />
      </button>
    </div>
  );
}
