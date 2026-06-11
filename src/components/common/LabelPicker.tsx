import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLabelStore, PRESET_COLORS } from '../../store/labelStore';

interface Props {
  anchorEl: HTMLElement;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export function LabelPicker({ anchorEl, selectedId, onSelect, onClose }: Props) {
  const { labels, addLabel, deleteLabel } = useLabelStore();
  const [query, setQuery] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [pos] = useState(() => {
    const rect = anchorEl.getBoundingClientRect();
    return { top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 232) };
  });

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!pickerRef.current?.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
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

  const filtered = labels.filter((l) =>
    l.name.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = labels.find(
    (l) => l.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showCreate = query.trim() && !exactMatch;

  function handleCreate() {
    const label = addLabel(query.trim(), newColor);
    onSelect(label.id);
    onClose();
  }

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed rounded-xl shadow-xl overflow-hidden"
      style={{
        top: pos.top,
        left: pos.left,
        width: 220,
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Search / create input */}
      <div className="p-2">
        <input
          autoFocus
          className="w-full text-[13px] outline-none px-2.5 py-1.5 rounded-lg border border-transparent transition-colors"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-1)',
          }}
          placeholder="Search or create…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'transparent'; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && showCreate) handleCreate();
          }}
        />
      </div>

      {/* Label list */}
      <div className="max-h-52 overflow-y-auto">
        {selectedId && !query && (
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors"
            style={{ color: 'var(--text-4)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            onClick={() => { onSelect(null); onClose(); }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Remove label
          </button>
        )}

        {filtered.length === 0 && !showCreate && (
          <div className="px-3 py-3 text-[12px] text-center" style={{ color: 'var(--text-4)' }}>
            {query ? 'No match' : 'No labels yet — type to create'}
          </div>
        )}

        {filtered.map((label) => (
          <button
            key={label.id}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group/lbl"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            onClick={() => { onSelect(selectedId === label.id ? null : label.id); onClose(); }}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: label.color }}
            />
            <span className="text-[13px] flex-1 truncate" style={{ color: 'var(--text-2)' }}>{label.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover/lbl:opacity-100 transition-opacity">
              {selectedId === label.id && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 5.5l3 3 5-5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <button
                className="transition-colors"
                style={{ color: 'var(--text-5)' }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-5)'; }}
                onClick={(e) => { e.stopPropagation(); deleteLabel(label.id); if (selectedId === label.id) onSelect(null); }}
                title="Delete label"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </button>
        ))}
      </div>

      {/* Create new label */}
      {showCreate && (
        <div className="border-t p-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>
            Create "{query.trim()}"
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: newColor === c ? `2.5px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <button
            className="w-full text-[12px] font-medium text-white rounded-lg px-3 py-1.5 transition-opacity hover:opacity-90"
            style={{ background: newColor }}
            onClick={handleCreate}
          >
            Create label
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
