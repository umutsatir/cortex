import { addDays, format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import type { ParsedTask } from '../../lib/parseTask';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { useGeneralStore } from '../../store/generalStore';
import { useLabelStore, labelSlug } from '../../store/labelStore';
import { formatTimeStr } from '../timebox/Timebox';
import { tokenColor, tokenInk, tokenWash } from './tokenColors';

const REPEAT_KEY = { daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every week' } as const;

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function Chip({ icon, text, color }: { icon: React.ReactNode; text: string; color?: string }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      className="inline-flex items-center gap-1 h-5 px-1.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        borderRadius: 'var(--radius-xs)',
        background: color ? tokenWash(color) : 'var(--accent-soft)',
        color: color ? tokenInk(color) : 'var(--accent-hover)',
      }}
    >
      {icon}
      {text}
    </motion.span>
  );
}

const I = {
  date: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" /><path d="M1 4.2h8M3.3 1v2M6.7 1v2" stroke="currentColor" strokeLinecap="round" /></svg>,
  time: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" /><path d="M5 3v2.2l1.4.9" stroke="currentColor" strokeLinecap="round" /></svg>,
  duration: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1h4M3 9h4M3.3 1.2c0 2.3 3.4 2.3 3.4 3.8S3.3 6.7 3.3 8.8M6.7 1.2c0 2.3-3.4 2.3-3.4 3.8s3.4 1.7 3.4 3.8" stroke="currentColor" strokeLinecap="round" /></svg>,
  repeat: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8.5 4A3.6 3.6 0 0 0 2 3M1.5 6A3.6 3.6 0 0 0 8 7" stroke="currentColor" strokeLinecap="round" /><path d="M2 1v2h2M8 9V7H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  priority: <svg width="8" height="10" viewBox="0 0 9 11" fill="none"><path d="M1 10V1l7 4-7 4z" fill="currentColor" /></svg>,
};

/** Chips showing what quick-entry text was understood as. */
export function ParsePreview({ parsed, compact = false }: { parsed: ParsedTask | null; compact?: boolean }) {
  const t = useT();
  const locale = useDateLocale();
  const timeFormat = useGeneralStore((s) => s.timeFormat);
  const language = useGeneralStore((s) => s.language);
  const labels = useLabelStore((s) => s.labels);
  if (!parsed) return null;

  const chips: { key: string; icon: React.ReactNode; text: string; color?: string }[] = [];
  if (parsed.date) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const text = parsed.date === today ? t('Today')
      : parsed.date === tomorrow ? t('Tomorrow')
      : format(parseISO(parsed.date), 'EEE, d MMM', { locale });
    chips.push({ key: 'date', icon: I.date, text: text, color: tokenColor('date', parsed) });
  }
  if (parsed.time) chips.push({ key: 'time', icon: I.time, text: formatTimeStr(parsed.time, timeFormat, language), color: tokenColor('time', parsed) });
  if (parsed.minutes) chips.push({ key: 'duration', icon: I.duration, text: formatDuration(parsed.minutes), color: tokenColor('duration', parsed) });
  if (parsed.recurrence) chips.push({ key: 'repeat', icon: I.repeat, text: t(REPEAT_KEY[parsed.recurrence]), color: tokenColor('repeat', parsed) });
  if (parsed.priority) {
    chips.push({ key: 'priority', icon: I.priority, text: t(parsed.priority === 'high' ? 'High' : parsed.priority === 'medium' ? 'Medium' : 'Low'), color: tokenColor('priority', parsed) });
  }
  if (parsed.labelName) {
    const slug = labelSlug(parsed.labelName);
    const existing = labels.find((l) => labelSlug(l.name) === slug);
    chips.push({
      key: 'label',
      icon: <span>#</span>,
      text: existing ? existing.name : `${parsed.labelName} (${t('new')})`,
      color: tokenColor('label', parsed),
    });
  }

  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          key="chips"
          className={`flex flex-wrap gap-1 ${compact ? 'pt-1' : 'pt-2'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.16 }}
        >
          <AnimatePresence initial={false}>
            {chips.map((c) => <Chip key={c.key} icon={c.icon} text={c.text} color={c.color} />)}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
