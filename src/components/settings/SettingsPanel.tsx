import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore, applyTheme, ACCENT_PRESETS, type Theme } from '../../store/themeStore';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'system', label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 12h5M7 10v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'light', label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'dark', label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M11.5 8.5A5 5 0 015.5 2.5a5 5 0 100 9 5 5 0 006-3z"
          stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const SECTIONS = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const { theme, accent, setTheme, setAccent } = useThemeStore();
  const [activeSection, setActiveSection] = useState('appearance');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t, accent);
  }

  function handleAccent(id: string) {
    setAccent(id);
    applyTheme(theme, id);
  }

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          className="flex overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: 640,
            height: 420,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div
            className="flex flex-col flex-shrink-0 py-3"
            style={{ width: 180, background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}
          >
            <div className="px-4 py-2 mb-1">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Settings</span>
            </div>

            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-left text-[13px] transition-colors"
                  style={{
                    background: active ? 'var(--accent-bg)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-3)',
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {s.icon}
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Content header */}
            <div
              className="flex items-center justify-between px-6 flex-shrink-0"
              style={{ height: 52, borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {SECTIONS.find((s) => s.id === activeSection)?.label}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-4)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-7">

              {activeSection === 'appearance' && (
                <>
                  {/* Theme */}
                  <div>
                    <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-4)' }}>THEME</p>
                    <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--surface-3)' }}>
                      {THEME_OPTIONS.map((opt) => {
                        const active = theme === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleTheme(opt.value)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-all"
                            style={{
                              background: active ? 'var(--surface)' : 'transparent',
                              color: active ? 'var(--accent)' : 'var(--text-3)',
                              boxShadow: active ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                            }}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent color */}
                  <div>
                    <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-4)' }}>ACCENT COLOR</p>
                    <div className="flex gap-3 flex-wrap">
                      {ACCENT_PRESETS.map((preset) => {
                        const active = accent === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => handleAccent(preset.id)}
                            title={preset.label}
                            className="flex flex-col items-center gap-1.5 group"
                          >
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                              style={{
                                background: preset.color,
                                boxShadow: active ? `0 0 0 2px var(--surface), 0 0 0 4px ${preset.color}` : 'none',
                              }}
                            >
                              {active && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6l3 3 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ color: active ? 'var(--accent)' : 'var(--text-4)', fontWeight: active ? 600 : 400 }}
                            >
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
