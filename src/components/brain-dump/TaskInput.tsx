import { useRef, useState } from 'react';
import { useTaskStore } from '../../store/taskStore';

interface Props {
  onAdd?: (title: string) => void;
  placeholder?: string;
  scheduledDate?: string | null;
}

export function TaskInput({ onAdd, placeholder = 'Add task…', scheduledDate = null }: Props) {
  const [value, setValue] = useState('');
  const addTask = useTaskStore((s) => s.addTask);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2">
      <div
        className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2 transition-colors"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0" style={{ color: 'var(--text-4)' }}>
          <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] outline-none min-w-0"
          style={{ color: 'var(--text-1)' }}
        />
      </div>
    </form>
  );
}
