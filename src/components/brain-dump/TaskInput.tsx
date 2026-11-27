import { useEffect, useRef, useState } from 'react';
import { useQuickStore, QUICK_SOURCE_ID } from '../../store/quickStore';
import { useT } from '../../hooks/useT';
import { addTaskFromText, parseInput } from '../../lib/actions';
import { ParsePreview } from '../common/ParsePreview';

interface Props {
  onAdd?: (title: string) => void;
  placeholder?: string;
  scheduledDate?: string | null;
  captureNewTaskShortcut?: boolean;
  /** This input is where the N overlay grows from and settles back into. */
  quickSource?: boolean;
}

export function TaskInput({ onAdd, placeholder = 'Add task…', scheduledDate = null, captureNewTaskShortcut = false, quickSource = false }: Props) {
  const overlayOpen = useQuickStore((s) => s.open);
  const showOverlay = useQuickStore((s) => s.show);
  const t = useT();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!captureNewTaskShortcut) return;
    function onNew() { inputRef.current?.focus(); }
    window.addEventListener('cortex:new-task', onNew);
    return () => window.removeEventListener('cortex:new-task', onNew);
  }, [captureNewTaskShortcut]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setValue('');
    const task = await addTaskFromText(text, scheduledDate ? { scheduled_date: scheduledDate } : {});
    if (task) onAdd?.(task.title);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 py-3">
      {quickSource && overlayOpen ? (
        // Keeps the space while the input is lifted out into the overlay.
        <div id={QUICK_SOURCE_ID} className="h-10" style={{ borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }} />
      ) : (
      <div
        id={quickSource ? QUICK_SOURCE_ID : undefined}
        className={`flex items-center gap-2 h-10 px-3 transition-[border-color,box-shadow] ${quickSource ? 'cursor-text hover:!border-[color:var(--accent)]' : ''}`}
        // The whole box (border, icon, padding) opens the overlay, not just the text field.
        onMouseDown={quickSource ? (e) => { e.preventDefault(); showOverlay(scheduledDate); } : undefined}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'var(--shadow-card)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0"
          style={{ color: focused ? 'var(--accent)' : 'var(--ink-secondary)' }}>
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => { if (quickSource) { inputRef.current?.blur(); showOverlay(scheduledDate); } else setFocused(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); inputRef.current?.blur(); } }}
          placeholder={placeholder}
          className={`flex-1 bg-transparent text-[13px] outline-none min-w-0 placeholder:text-[var(--ink-secondary)] ${quickSource ? 'cursor-text' : ''}`}
          style={{ color: 'var(--ink)' }}
        />
        {focused && value.trim() && <kbd className="cx-kbd">↵</kbd>}
        {!focused && quickSource && <kbd className="cx-kbd" title={t('New task')}>N</kbd>}
      </div>
      )}
      <ParsePreview parsed={focused && value.trim() ? parseInput(value) : null} />
    </form>
  );
}
