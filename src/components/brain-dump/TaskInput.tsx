import { useEffect, useRef, useState } from 'react';
import { useTaskStore } from '../../store/taskStore';

interface Props {
  onAdd?: (title: string) => void;
  placeholder?: string;
  scheduledDate?: string | null;
  captureNewTaskShortcut?: boolean;
}

export function TaskInput({ onAdd, placeholder = 'Add task…', scheduledDate = null, captureNewTaskShortcut = false }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const addTask = useTaskStore((s) => s.addTask);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!captureNewTaskShortcut) return;
    function onNew() { inputRef.current?.focus(); }
    window.addEventListener('cortex:new-task', onNew);
    return () => window.removeEventListener('cortex:new-task', onNew);
  }, [captureNewTaskShortcut]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    await addTask(title, scheduledDate ? { scheduled_date: scheduledDate } : {});
    setValue('');
    onAdd?.(title);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 py-3">
      <div
        className="flex items-center gap-2 h-10 px-3 transition-[border-color,box-shadow]"
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); inputRef.current?.blur(); } }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] outline-none min-w-0 placeholder:text-[var(--ink-secondary)]"
          style={{ color: 'var(--ink)' }}
        />
        {focused && value.trim() && <kbd className="cx-kbd">↵</kbd>}
        {!focused && captureNewTaskShortcut && <kbd className="cx-kbd">C</kbd>}
      </div>
    </form>
  );
}
