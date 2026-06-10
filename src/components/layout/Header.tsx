import { useTaskStore } from '../../store/taskStore';

export function Header() {
  const currentView = useTaskStore((s) => s.currentView);
  const setView = useTaskStore((s) => s.setView);

  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB] bg-white"
      style={{ paddingTop: '44px' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[#6366F1] flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="3" height="3" rx="0.5" fill="white" />
            <rect x="6" y="1" width="3" height="3" rx="0.5" fill="white" />
            <rect x="1" y="6" width="3" height="3" rx="0.5" fill="white" />
            <rect x="6" y="6" width="3" height="3" rx="0.5" fill="white" />
          </svg>
        </div>
        <span className="text-[14px] font-semibold text-[#111827]">Cortex</span>
      </div>

      <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-1">
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

      <div className="w-20" />
    </div>
  );
}
