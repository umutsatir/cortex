import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { Quadrant } from './Quadrant';
import type { EisenhowerQuadrant } from '../../types';

const QUADRANTS: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];

export function EisenhowerMatrix() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = useTaskStore(useShallow((s) =>
    s.tasks.filter((t) => t.scheduled_date === today && t.eisenhower_quadrant)
  ));
  const currentView = useTaskStore((s) => s.currentView);
  const setView     = useTaskStore((s) => s.setView);
  const toggleBrainDump = useTaskStore((s) => s.toggleBrainDump);
  const toggleTimebox   = useTaskStore((s) => s.toggleTimebox);
  const showBrainDump   = useTaskStore((s) => s.showBrainDump);
  const showTimebox     = useTaskStore((s) => s.showTimebox);

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
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header — 52px, matches other panel headers */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 border-b border-[#E5E7EB] flex-shrink-0"
        style={{ height: 52, paddingLeft: showBrainDump ? 12 : 80, paddingRight: 12 }}
      >
        <button
          onClick={toggleBrainDump}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ${
            showBrainDump ? 'text-[#6366F1] bg-[#EEF2FF]' : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6]'
          }`}
        >
          <PanelIcon side="left" />
        </button>

        <span className="text-[13px] font-semibold text-[#111827] select-none">Focus</span>

        <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-[3px] ml-auto flex-shrink-0">
          <button
            onClick={() => setView('main')}
            className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
              currentView === 'main' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('today')}
            className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
              currentView === 'today' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Today
          </button>
        </div>

        <button
          onClick={toggleTimebox}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ${
            showTimebox ? 'text-[#6366F1] bg-[#EEF2FF]' : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6]'
          }`}
        >
          <PanelIcon side="right" />
        </button>
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
