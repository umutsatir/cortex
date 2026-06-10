import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Priority } from '../../types';

const OPTIONS: { value: Priority | null; label: string; color: string }[] = [
  { value: null,     label: 'No priority', color: '#9CA3AF' },
  { value: 'high',   label: 'High',        color: '#EF4444' },
  { value: 'medium', label: 'Medium',      color: '#F59E0B' },
  { value: 'low',    label: 'Low',         color: '#10B981' },
];

interface Props {
  anchorEl: HTMLElement;
  selected: Priority | null;
  onSelect: (p: Priority | null) => void;
  onClose: () => void;
}

export function PriorityPicker({ anchorEl, selected, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const rect = anchorEl.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 160);
  const top = rect.bottom + 6;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="fixed bg-white border border-[#E5E7EB] rounded-xl shadow-xl py-1 overflow-hidden"
      style={{ top, left, width: 152, zIndex: 9999 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F9FAFB] text-left transition-colors"
          onClick={() => { onSelect(opt.value); onClose(); }}
        >
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
            <path
              d="M1 12V1l9 5-9 5z"
              fill={selected === opt.value ? opt.color : 'none'}
              stroke={opt.color}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[13px] text-[#374151]">{opt.label}</span>
          {selected === opt.value && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-auto">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </div>,
    document.body
  );
}
