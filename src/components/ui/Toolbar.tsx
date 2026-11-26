import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTaskStore } from '../../store/taskStore';
import { useT } from '../../hooks/useT';

export const TOOLBAR_H = 52;
/** Room for the macOS traffic lights when a toolbar starts at the window's left edge. */
export const TRAFFIC_LIGHTS_W = 80;

/** Lets empty toolbar space drag the window without dnd-kit grabbing the pointer. */
export function startWindowDrag(e: React.PointerEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('button, input, a, [role="button"]')) {
    e.stopPropagation();
    getCurrentWindow().startDragging();
  }
}

export function Toolbar({ children, paddingLeft = 16, paddingRight = 12 }: {
  children: ReactNode; paddingLeft?: number; paddingRight?: number;
}) {
  return (
    <div
      data-tauri-drag-region
      onPointerDown={startWindowDrag}
      className="flex items-center gap-2 flex-shrink-0 select-none"
      style={{
        height: TOOLBAR_H,
        paddingLeft,
        paddingRight,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {children}
    </div>
  );
}

export function IconButton({ onClick, title, active = false, tone, size = 28, children }: {
  onClick: () => void;
  title?: string;
  active?: boolean;
  tone?: string;
  size?: number;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className="cx-press flex items-center justify-center flex-shrink-0 hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-sm)',
        color: tone ?? (active ? 'var(--accent-hover)' : 'var(--ink-secondary)'),
        background: active ? 'var(--accent-soft)' : undefined,
      }}
    >
      {children}
    </button>
  );
}

/** Small bordered button: "Today" and other secondary actions in a toolbar. */
export function PillButton({ onClick, active = false, children }: {
  onClick: () => void; active?: boolean; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="cx-press flex-shrink-0 px-2.5 h-7 text-[12px] font-medium hover:border-[var(--border-strong)] hover:-translate-y-px"
      style={{
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${active ? 'var(--accent-line)' : 'var(--border)'}`,
        background: active ? 'var(--accent-soft)' : 'var(--surface)',
        color: active ? 'var(--accent-hover)' : 'var(--ink-body)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </button>
  );
}

export function PanelIcon({ side, open = true }: { side: 'left' | 'right'; open?: boolean }) {
  const x = side === 'left' ? 5.5 : 10.5;
  // The panel area fills in when open.
  const fillX = side === 'left' ? 1.5 : x;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <motion.rect
        x={fillX} y="1.5" height="13" rx="0"
        width={4}
        fill="currentColor"
        initial={false}
        animate={{ opacity: open ? 0.25 : 0, scaleX: open ? 1 : 0 }}
        style={{ originX: side === 'left' ? 0 : 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
      />
      <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <line x1={x} y1="1.5" x2={x} y2="14.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d={dir === 'left' ? 'M7.5 2.5L4 6l3.5 3.5' : 'M4.5 2.5L8 6l-3.5 3.5'}
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Week / Today segmented control. */
export function ViewSwitcher() {
  const currentView = useTaskStore((s) => s.currentView);
  const setView = useTaskStore((s) => s.setView);
  const t = useT();
  const items = [
    { id: 'main' as const, label: t('Week') },
    { id: 'today' as const, label: t('Today') },
  ];
  return (
    <div
      className="flex items-center gap-0.5 p-[3px] flex-shrink-0"
      style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }}
      role="tablist"
    >
      {items.map((it) => {
        const on = currentView === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            onClick={() => setView(it.id)}
            className="cx-press relative px-3 h-[22px] text-[12px] font-medium hover:text-[var(--ink)]"
            style={{ color: on ? 'var(--ink)' : 'var(--ink-secondary)' }}
          >
            {on && (
              // Slides between the two tabs.
              <motion.span
                layoutId="view-switcher-pill"
                className="absolute inset-0"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border)',
                }}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Show/hide the left (Brain Dump / today list) or right (Timebox) panel. */
export function PanelToggle({ side }: { side: 'left' | 'right' }) {
  const shown = useTaskStore((s) => (side === 'left' ? s.showBrainDump : s.showTimebox));
  const toggle = useTaskStore((s) => (side === 'left' ? s.toggleBrainDump : s.toggleTimebox));
  return (
    <IconButton onClick={toggle} active={shown} title={side === 'left' ? 'Toggle sidebar (B)' : 'Toggle timebox (T)'}>
      <PanelIcon side={side} open={shown} />
    </IconButton>
  );
}
