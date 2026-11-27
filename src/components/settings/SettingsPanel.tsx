import { useEffect, useState, useCallback, useId } from 'react';
import appIcon from '../../assets/brand/cortex-app-icon.svg';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek } from 'date-fns';
import { useThemeStore, applyTheme, ACCENT_PRESETS, type Theme } from '../../store/themeStore';
import { useGeneralStore, type Lang, type TimeFormat, type WeekStart, type DateFormat } from '../../store/generalStore';
import { useTaskStore } from '../../store/taskStore';
import { IntegrationsSection } from './IntegrationsSection';
import { useT } from '../../hooks/useT';
import type { AppView } from '../../types';

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

interface SectionDef {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    labelKey: 'General',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 5h5M4.5 7h5M4.5 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'planning',
    labelKey: 'Planning',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'appearance',
    labelKey: 'Appearance',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="7" cy="7" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'update',
    labelKey: 'Update',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v4M7 1L5 3M7 1l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 7a5 5 0 1010 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'shortcuts',
    labelKey: 'Shortcuts',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="3" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="6.5" y="3" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="8" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="6.5" y="8" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'integrations',
    labelKey: 'Integrations',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="4" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 7h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="min-w-0">
        <div className="text-[13px]" style={{ color: 'var(--text-2)' }}>{label}</div>
        {hint && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-4)' }}>{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

function HourSelect({ value, onChange, min = 0, max = 23 }: { value: number; onChange: (h: number) => void; min?: number; max?: number }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 pl-2 pr-1 text-[12px] font-medium tabular-nums outline-none cursor-pointer"
      style={{ background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
    >
      {HOUR_OPTIONS.filter((h) => h >= min && h <= max).map((h) => (
        <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
      ))}
    </select>
  );
}

const PILL_SPRING = { type: 'spring', stiffness: 520, damping: 38 } as const;

function SegmentedControl<T>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  // Each control needs its own layoutId so the pill only slides within it.
  const id = useId();
  return (
    <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--surface-3)' }}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={i}
            onClick={() => onChange(opt.value)}
            className="cx-press relative px-3 py-1 rounded-md text-[12px] font-medium transition-colors duration-200"
            style={{ color: active ? 'var(--accent-hover)' : 'var(--ink-secondary)' }}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-md z-0"
                style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border)' }}
                transition={PILL_SPRING}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const { theme, accent, setTheme, setAccent } = useThemeStore();
  const { language, weekStartsOn, defaultView, timeFormat, dateFormat,
          setLanguage, setDefaultView, setTimeFormat, setDateFormat } = useGeneralStore();
  const setWeekStartsOn = useGeneralStore((s) => s.setWeekStartsOn);
  const { workStart, workEnd, breakMinutes, setBreakMinutes, warmUp, setWarmUp, notifyEnabled, notifyLead, showMenuBar, setWorkHours, setNotifyEnabled, setNotifyLead, setShowMenuBar } = useGeneralStore();
  const [activeSection, setActiveSection] = useState('general');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'none' | 'installing'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const t = useT();

  const checkForUpdate = useCallback(async () => {
    setUpdateStatus('checking');
    try {
      const u = await check();
      if (u) { setUpdateVersion(u.version); setUpdateStatus('available'); }
      else { setUpdateStatus('none'); }
    } catch { setUpdateStatus('none'); }
  }, []);

  const installUpdate = useCallback(async () => {
    setUpdateStatus('installing');
    try {
      const u = await check();
      if (u) { await u.downloadAndInstall(); await relaunch(); }
    } catch { setUpdateStatus('available'); }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleTheme(v: Theme) { setTheme(v); applyTheme(v, accent); }
  function handleAccent(id: string) { setAccent(id); applyTheme(theme, id); }
  function handleWeekStart(v: WeekStart) {
    setWeekStartsOn(v);
    useTaskStore.setState({ currentWeekStart: startOfWeek(new Date(), { weekStartsOn: v }) });
  }
  function handleDefaultView(v: AppView) {
    setDefaultView(v);
    useTaskStore.setState({ currentView: v });
  }

  return createPortal(
    <AnimatePresence>
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
        <motion.div
          key="modal"
          className="flex overflow-hidden rounded-[16px]"
          style={{ boxShadow: 'var(--shadow-pop)',
            width: 640, height: 440,
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
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{t('Settings')}</span>
            </div>
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`cx-press relative flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-left text-[13px] ${active ? '' : 'hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]'}`}
                  style={{
                    color: active ? 'var(--accent-hover)' : 'var(--ink-secondary)',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-nav-active"
                      className="absolute inset-0 rounded-lg z-0"
                      style={{ background: 'var(--accent-soft)' }}
                      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    {s.icon}
                    {t(s.labelKey)}
                  </span>
                </button>
              );
            })}
            <div className="mt-auto px-4 pt-3 flex items-center gap-2">
              <img src={appIcon} width={20} height={20} alt="" draggable={false} />
              <span className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>Cortex</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 flex-shrink-0"
              style={{ height: 52, borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {t(SECTIONS.find((s) => s.id === activeSection)?.labelKey ?? '')}
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

            {/* Body */}
            <motion.div
              key={activeSection}
              className="flex-1 overflow-y-auto px-6 py-4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            >

              {activeSection === 'appearance' && (
                <div className="flex flex-col gap-6">
                  {/* Theme */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-4)' }}>{t('Theme')}</p>
                    <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--surface-3)' }}>
                      {THEME_OPTIONS.map((opt) => {
                        const active = theme === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleTheme(opt.value)}
                            className="cx-press relative flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-200"
                            style={{ color: active ? 'var(--accent-hover)' : 'var(--ink-secondary)' }}
                          >
                            {active && (
                              <motion.span
                                layoutId="theme-pill"
                                className="absolute inset-0 rounded-lg z-0"
                                style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border)' }}
                                transition={PILL_SPRING}
                              />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {opt.icon}
                              {t(opt.label)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent color */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-4)' }}>{t('Accent color')}</p>
                    <div className="flex gap-4 flex-wrap">
                      {ACCENT_PRESETS.map((preset, i) => {
                        const active = accent === preset.id;
                        return (
                          <motion.button
                            key={preset.id}
                            onClick={() => handleAccent(preset.id)}
                            title={preset.label}
                            className="flex flex-col items-center gap-1.5 group"
                            // Swatches arrive one after another when the tab opens.
                            initial={{ opacity: 0, y: 8, scale: 0.6 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 26, delay: 0.04 + i * 0.035 }}
                            whileTap={{ scale: 0.88 }}
                          >
                            <span className="relative w-8 h-8 flex items-center justify-center">
                              {active && (
                                // The selection ring slides to the new color and takes it on.
                                <motion.span
                                  layoutId="accent-ring"
                                  className="absolute -inset-[4px] rounded-full"
                                  initial={false}
                                  animate={{ borderColor: preset.color }}
                                  style={{ border: `2px solid ${preset.color}` }}
                                  transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                                />
                              )}
                              <span
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:scale-110"
                                style={{ background: preset.color }}
                              >
                                <AnimatePresence initial={false}>
                                  {active && (
                                    <motion.svg
                                      key="check"
                                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                                      initial={{ scale: 0, rotate: -30, opacity: 0 }}
                                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                                      transition={{ type: 'spring', stiffness: 600, damping: 20, delay: 0.06 }}
                                    >
                                      <motion.path
                                        d="M2.5 6l3 3 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.22, delay: 0.1, ease: 'easeOut' }}
                                      />
                                    </motion.svg>
                                  )}
                                </AnimatePresence>
                              </span>
                            </span>
                            <span
                              className="text-[10px] transition-colors duration-200"
                              style={{ color: active ? 'var(--accent-hover)' : 'var(--ink-secondary)', fontWeight: active ? 600 : 400 }}
                            >
                              {preset.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'update' && (
                <div className="flex flex-col gap-4">
                  <div
                    className="flex items-center justify-between py-3 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div>
                      <div className="text-[13px]" style={{ color: 'var(--text-2)' }}>{t('Current version')}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-4)' }}>
                        {updateVersion && updateStatus === 'available'
                          ? `v${updateVersion} ${t('available')}`
                          : updateStatus === 'none' ? t('You are up to date') : ''}
                      </div>
                    </div>
                    {updateStatus === 'available' ? (
                      <button
                        onClick={installUpdate}
                        className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                        style={{ background: 'var(--accent-strong)', color: 'var(--on-accent)' }}
                      >
                        {t('Install update')}
                      </button>
                    ) : (
                      <button
                        onClick={checkForUpdate}
                        disabled={updateStatus === 'checking' || updateStatus === 'installing'}
                        className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                      >
                        {updateStatus === 'checking' ? t('Checking…') : updateStatus === 'installing' ? t('Installing…') : t('Check for updates')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'shortcuts' && (
                <div className="flex flex-col gap-1">
                  {([
                    { key: '⌘K', description: t('Search and commands') },
                    { key: '⌘Z', description: t('Undo') },
                    { key: 'N', description: t('New task') },
                    { key: 'P', description: t('Plan my day') },
                    { key: 'V', description: t('Switch view (Week / Month / Focus)') },
                    { key: 'B', description: t('Toggle sidebar') },
                    { key: 'T', description: t('Toggle timebox') },
                    { key: ',', description: t('Open settings') },
                    { key: 'Esc', description: t('Close panel') },
                  ] as { key: string; description: string }[]).map(({ key, description }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2.5 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{description}</span>
                      <kbd
                        className="px-2 py-0.5 rounded-md text-[12px] font-medium font-mono"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                      >
                        {key}
                      </kbd>
                    </div>
                  ))}
                  <p className="text-[11px] mt-3" style={{ color: 'var(--text-4)' }}>
                    {t('Shortcuts work when no input is focused.')}
                  </p>
                </div>
              )}

              {activeSection === 'planning' && (
                <div>
                  <SettingRow label={t('Work hours')} hint={t('“Plan my day” fills free time inside these hours.')}>
                    <div className="flex items-center gap-1.5">
                      <HourSelect value={workStart / 60} max={22} onChange={(h) => setWorkHours(h * 60, Math.max(workEnd, (h + 1) * 60))} />
                      <span className="text-[12px]" style={{ color: 'var(--text-4)' }}>–</span>
                      <HourSelect value={Math.min(23, workEnd / 60)} min={workStart / 60 + 1} onChange={(h) => setWorkHours(workStart, h * 60)} />
                    </div>
                  </SettingRow>

                  <SettingRow label={t('Break between tasks')} hint={t('“Plan my day” leaves this much free time between tasks.')}>
                    <SegmentedControl<number>
                      value={breakMinutes}
                      onChange={setBreakMinutes}
                      options={[
                        { value: 0, label: t('None') },
                        { value: 10, label: `10 ${t('min')}` },
                        { value: 15, label: `15 ${t('min')}` },
                        { value: 30, label: `30 ${t('min')}` },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow label={t('Start with a warm-up')} hint={t('A short task (up to 30 min) first, then the most important one.')}>
                    <SegmentedControl<boolean>
                      value={warmUp}
                      onChange={setWarmUp}
                      options={[{ value: true, label: t('On') }, { value: false, label: t('Off') }]}
                    />
                  </SettingRow>

                  <SettingRow label={t('Timebox reminders')} hint={t('A macOS notification before each timebox starts.')}>
                    <SegmentedControl<boolean>
                      value={notifyEnabled}
                      onChange={setNotifyEnabled}
                      options={[{ value: true, label: t('On') }, { value: false, label: t('Off') }]}
                    />
                  </SettingRow>

                  {notifyEnabled && (
                    <SettingRow label={t('Notify me')}>
                      <SegmentedControl<number>
                        value={notifyLead || 5}
                        onChange={setNotifyLead}
                        options={[
                          { value: 5, label: `5 ${t('min')}` },
                          { value: 10, label: `10 ${t('min')}` },
                          { value: 15, label: `15 ${t('min')}` },
                        ]}
                      />
                    </SettingRow>
                  )}

                  <SettingRow label={t('Show in menu bar')} hint={t('Shows the current or next timebox next to the clock.')}>
                    <SegmentedControl<boolean>
                      value={showMenuBar}
                      onChange={setShowMenuBar}
                      options={[{ value: true, label: t('On') }, { value: false, label: t('Off') }]}
                    />
                  </SettingRow>

                </div>
              )}

              {activeSection === 'integrations' && <IntegrationsSection />}

              {activeSection === 'general' && (
                <div>
                  <SettingRow label={t('Language')}>
                    <SegmentedControl<Lang>
                      value={language}
                      onChange={setLanguage}
                      options={[{ value: 'en', label: 'English' }, { value: 'tr', label: 'Türkçe' }]}
                    />
                  </SettingRow>

                  <SettingRow label={t('Start of week')}>
                    <SegmentedControl<number>
                      value={weekStartsOn}
                      onChange={(v) => handleWeekStart(v as WeekStart)}
                      options={[{ value: 1, label: t('Monday') }, { value: 0, label: t('Sunday') }]}
                    />
                  </SettingRow>

                  <SettingRow label={t('Default view')}>
                    <SegmentedControl<AppView>
                      value={defaultView}
                      onChange={handleDefaultView}
                      options={[{ value: 'main', label: t('Week') }, { value: 'month', label: t('Month') }, { value: 'today', label: t('Focus') }]}
                    />
                  </SettingRow>

                  <SettingRow label={t('Time format')}>
                    <SegmentedControl<TimeFormat>
                      value={timeFormat}
                      onChange={setTimeFormat}
                      options={[{ value: '24h', label: '24h' }, { value: '12h', label: '12h' }]}
                    />
                  </SettingRow>

                  <SettingRow label={t('Date format')}>
                    <SegmentedControl<DateFormat>
                      value={dateFormat}
                      onChange={setDateFormat}
                      options={[
                        { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
                        { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
                        { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
                      ]}
                    />
                  </SettingRow>
                </div>
              )}

            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
