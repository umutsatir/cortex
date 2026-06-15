import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SettingsPanel } from '../settings/SettingsPanel';

export function SettingsButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener('cortex:open-settings', onOpen);
    return () => window.removeEventListener('cortex:open-settings', onOpen);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0"
        style={{
          color: open ? 'var(--accent)' : 'var(--text-3)',
          background: open ? 'var(--accent-bg)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M6.1 1.5a1.4 1.4 0 0 1 2.8 0l.15.6a.9.9 0 0 0 1.3.5l.55-.3a1.4 1.4 0 0 1 1.97 1.97l-.3.55a.9.9 0 0 0 .5 1.3l.6.15a1.4 1.4 0 0 1 0 2.8l-.6.15a.9.9 0 0 0-.5 1.3l.3.55a1.4 1.4 0 0 1-1.97 1.97l-.55-.3a.9.9 0 0 0-1.3.5l-.15.6a1.4 1.4 0 0 1-2.8 0l-.15-.6a.9.9 0 0 0-1.3-.5l-.55.3A1.4 1.4 0 0 1 2.13 11.1l.3-.55a.9.9 0 0 0-.5-1.3l-.6-.15a1.4 1.4 0 0 1 0-2.8l.6-.15a.9.9 0 0 0 .5-1.3l-.3-.55A1.4 1.4 0 0 1 4.1 2.3l.55.3a.9.9 0 0 0 1.3-.5L6.1 1.5z"
            stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round"
          />
          <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.15" />
        </svg>
      </button>

      <AnimatePresence>
        {open && <SettingsPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
