import { AnimatePresence, motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { useGeneralStore } from '../../store/generalStore';
import { useT } from '../../hooks/useT';
import { moveOverdueToToday, overdueTasks } from '../../lib/actions';

/** Offers to move unfinished tasks from earlier days to today, once per day. */
export function RolloverBanner({ className = '' }: { className?: string }) {
  const today = useTaskStore((s) => s.today);
  const count = useTaskStore((s) => overdueTasks(s.tasks, s.today).length);
  const dismissed = useGeneralStore((s) => s.rolloverDismissed === today);
  const dismiss = useGeneralStore((s) => s.dismissRollover);
  const t = useT();
  const show = count > 0 && !dismissed;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="rollover"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          className={`overflow-hidden flex-shrink-0 ${className}`}
        >
          <div
            className="flex items-center gap-2.5 pl-3 pr-1.5 py-1.5"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-line)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0" style={{ color: 'var(--accent-hover)' }}>
              <path d="M2 8h9M8 4.5L11.5 8 8 11.5M14 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="flex-1 min-w-0 text-[13px] truncate" style={{ color: 'var(--ink-body)' }}>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{count}</span>{' '}
              {t('unfinished tasks from earlier days')}
            </span>
            <button
              className="cx-press flex-shrink-0 h-7 px-2.5 text-[12px] font-medium"
              style={{ background: 'var(--accent-strong)', color: 'var(--on-accent)', borderRadius: 'var(--radius-sm)' }}
              onClick={() => { void moveOverdueToToday(); }}
            >
              {t('Move to today')}
            </button>
            <button
              className="cx-press flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-[var(--surface)]"
              style={{ color: 'var(--ink-secondary)', borderRadius: 'var(--radius-sm)' }}
              title={t('Not now')}
              aria-label={t('Not now')}
              onClick={() => dismiss(today)}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
