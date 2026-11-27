import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../store/toastStore';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 36 }}
            className="pointer-events-auto flex items-center gap-3 pl-3.5 pr-1.5 h-10 text-[13px]"
            style={{
              background: 'var(--ink)',
              color: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-pop)',
            }}
            role="status"
          >
            <span className="whitespace-nowrap">{toast.text}</span>
            {toast.action ? (
              <button
                className="cx-press h-7 px-2.5 text-[12px] font-semibold hover:bg-[color-mix(in_srgb,var(--surface)_14%,transparent)]"
                style={{ color: 'var(--accent-line)', borderRadius: 'var(--radius-sm)' }}
                onClick={() => { toast.action!.run(); dismiss(toast.id); }}
              >
                {toast.action.label}
              </button>
            ) : <span className="w-1" />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
