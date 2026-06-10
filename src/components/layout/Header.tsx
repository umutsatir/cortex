import { useTaskStore } from '../../store/taskStore';

export function Header() {
  const currentView = useTaskStore((s) => s.currentView);
  const setView = useTaskStore((s) => s.setView);

  return (
    // data-tauri-drag-region lets the user drag the window from this bar
    <div
      data-tauri-drag-region
      className="flex items-center border-b border-[#E5E7EB] bg-white select-none"
      style={{ height: 52, paddingLeft: 80 /* clear traffic lights (~68px) */ }}
    >
      {/* App identity */}
      <div className="flex items-center gap-2 mr-auto">
        <div className="w-5 h-5 rounded-md bg-[#6366F1] flex items-center justify-center pointer-events-none">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="3" height="3" rx="0.5" fill="white" />
            <rect x="6" y="1" width="3" height="3" rx="0.5" fill="white" />
            <rect x="1" y="6" width="3" height="3" rx="0.5" fill="white" />
            <rect x="6" y="6" width="3" height="3" rx="0.5" fill="white" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-[#111827]">Cortex</span>
      </div>

      {/* View switcher — centered */}
      <div
        className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-1 absolute left-1/2 -translate-x-1/2"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => setView('main')}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
            currentView === 'main'
              ? 'bg-white text-[#111827] shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setView('today')}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
            currentView === 'today'
              ? 'bg-white text-[#111827] shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Today
        </button>
      </div>

      <div className="ml-auto" style={{ width: 80 }} />
    </div>
  );
}
