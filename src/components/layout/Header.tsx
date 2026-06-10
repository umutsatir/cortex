import { useTaskStore } from '../../store/taskStore';

export function Header() {
  const currentView = useTaskStore((s) => s.currentView);
  const setView = useTaskStore((s) => s.setView);

  return (
    <div
      data-tauri-drag-region
      className="relative flex items-center border-b border-[#E5E7EB] bg-white select-none flex-shrink-0"
      // 36px aligns content center (y=18) close to macOS traffic lights (y≈13-14)
      // paddingLeft 80px clears the three traffic light buttons
      style={{ height: 36, paddingLeft: 80, paddingRight: 16 }}
    >
      {/* Logo — left-anchored after traffic lights */}
      <div className="flex items-center gap-1.5 pointer-events-none">
        <div className="w-[18px] h-[18px] rounded-md bg-[#6366F1] flex items-center justify-center flex-shrink-0">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="3" height="3" rx="0.5" fill="white" />
            <rect x="6" y="1" width="3" height="3" rx="0.5" fill="white" />
            <rect x="1" y="6" width="3" height="3" rx="0.5" fill="white" />
            <rect x="6" y="6" width="3" height="3" rx="0.5" fill="white" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-[#111827] leading-none">Cortex</span>
      </div>

      {/* View switcher — absolutely centered in the full window width */}
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

      {/* Right spacer keeps switcher truly centered */}
      <div className="ml-auto" style={{ width: 80 }} />
    </div>
  );
}
