import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuickStore, sourceRect, type Rect } from '../../store/quickStore';
import { toast } from '../../store/toastStore';
import { useT } from '../../hooks/useT';
import { addTaskFromText, parseInput } from '../../lib/actions';
import { ParsePreview } from '../common/ParsePreview';
import { SmartInput } from '../common/SmartInput';

const WIDTH = 600;
const SPRING = { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 } as const;
const BACK = { duration: 0.26, ease: [0.4, 0, 0.2, 1] } as const;

/** Box geometry: in the sidebar (the small input) or centered (the big one). */
function smallAt(r: Rect) {
  return {
    left: r.left, top: r.top, width: r.width,
    paddingTop: 1, paddingBottom: 1, paddingLeft: 12, paddingRight: 12,
    borderRadius: 10, '--qfs': '13px', '--qicon': 0.78,
  };
}
function bigCentered() {
  return {
    left: Math.round((window.innerWidth - WIDTH) / 2), top: Math.round(window.innerHeight * 0.18), width: WIDTH,
    paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
    borderRadius: 16, '--qfs': '17px', '--qicon': 1,
  };
}

/**
 * N (or a click on the panel's input): the input lifts out of the sidebar and grows into a
 * centered box — position, width and type size animate, nothing is stretched — then
 * shrinks back into place on Enter / Esc.
 */
export function QuickOverlay() {
  const open = useQuickStore((s) => s.open);
  return <AnimatePresence>{open && <QuickBox key="quick" />}</AnimatePresence>;
}

function QuickBox() {
  const scheduledDate = useQuickStore((s) => s.scheduledDate);
  const from = useQuickStore((s) => s.from);
  const hide = useQuickStore((s) => s.hide);
  const [value, setValue] = useState('');
  // null while open; the rect to shrink into (or 'fade') while closing.
  const [leaving, setLeaving] = useState<Rect | 'fade' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const parsed = value.trim() ? parseInput(value) : null;

  useEffect(() => { inputRef.current?.focus(); }, []);

  function close() {
    if (leaving) return;
    setLeaving(sourceRect() ?? 'fade');
  }

  async function submit() {
    const text = value.trim();
    if (!text) return;
    close();
    const task = await addTaskFromText(text, scheduledDate ? { scheduled_date: scheduledDate } : {});
    if (task) toast(`${t('Added')}: ${task.title}`);
  }

  const big = bigCentered();
  const initial = from ? { ...smallAt(from), opacity: 1 } : { ...big, opacity: 0, y: -8 };
  const target = leaving === null ? { ...big, opacity: 1, y: 0 }
    : leaving === 'fade' ? { ...big, opacity: 0, y: -8 }
    : { ...smallAt(leaving), opacity: 0.85, y: 0 };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[65]"
        style={{ background: 'color-mix(in srgb, var(--ink) 18%, transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={close}
      />
      <motion.div
        className="fixed z-[66]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--accent)',
          boxShadow: '0 0 0 4px var(--accent-soft), var(--shadow-pop)',
        }}
        initial={initial}
        animate={target}
        transition={leaving ? BACK : SPRING}
        onAnimationComplete={() => { if (leaving) hide(); }}
      >
        <div className="flex items-center gap-3 h-9">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" className="flex-shrink-0"
            style={{ color: 'var(--accent)', scale: 'var(--qicon)' as unknown as number }}>
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <SmartInput
            ref={inputRef}
            value={value}
            parsed={parsed}
            onChange={setValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void submit(); }
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
            }}
            placeholder={t('Add a task… try “tomorrow 14:00 45m #work p1”')}
            className="text-[length:var(--qfs)]"
          />
          <kbd className="cx-kbd">↵</kbd>
        </div>
        <ParsePreview parsed={leaving ? null : parsed} />
      </motion.div>
    </>
  );
}
