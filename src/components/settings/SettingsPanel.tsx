import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore, applyTheme, type Theme } from '../../store/themeStore';

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 12h5M7 10v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M11.5 8.5A5 5 0 015.5 2.5a5 5 0 100 9 5 5 0 006-3z"
          stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
];

interface Props {
  anchorEl: HTMLElement;
  onClose: () => void;
}

export function SettingsPanel({ anchorEl, onClose }: Props) {
  const { theme, setTheme } = useThemeStore();
  const ref = useRef<HTMLDivElement>(null);

  const [pos] = useState(() => {
    const r = anchorEl.getBoundingClientRect();
    return { top: r.bottom + 8, right: window.innerWidth - r.right };
  });

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] rounded-xl shadow-xl overflow-hidden"
      style={{
        top: pos.top,
        right: pos.right,
        width: 200,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
          Appearance
        </span>
      </div>

      <div className="pb-2">
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleTheme(opt.value)}
              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
              style={{
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {opt.icon}
              <span className="text-[13px] font-medium">{opt.label}</span>
              {active && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
