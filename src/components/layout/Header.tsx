import { useTaskStore } from '../../store/taskStore';

export function Header() {
  const currentView = useTaskStore((s) => s.currentView);
  const setView = useTaskStore((s) => s.setView);

  return (
    <div
      data-tauri-drag-region
      className="relative flex items-center border-b border-[#E5E7EB] bg-white select-none flex-shrink-0"
      style={{ height: 52, paddingLeft: 80, paddingRight: 16 }}
    >
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
