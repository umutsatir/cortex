import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useIntegrationStore } from '../../store/integrationStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { clearMatrix, clearTimebox, moveOverdueToToday, overdueTasks, parseInput, planMyDay, undoLast } from '../../lib/actions';
import type { Task } from '../../types';
import { openQuickOverlay } from '../../store/quickStore';

interface Item {
  id: string;
  group: 'Tasks' | 'Go to' | 'Actions';
  title: string;
  hint?: string;
  done?: boolean;
  run: () => void;
}

/** Case- and accent-insensitive, so "calis" finds "Çalış". */
const fold = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

export function CommandPalette({ onClose, onOpenStats }: { onClose: () => void; onOpenStats: () => void }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const tasks = useTaskStore((s) => s.tasks);
  const today = useTaskStore((s) => s.today);
  const t = useT();
  const locale = useDateLocale();

  const items = useMemo<Item[]>(() => {
    const s = useTaskStore.getState();
    const close = (fn: () => void) => () => { onClose(); fn(); };
    const q = fold(query.trim());

    const actions: Item[] = [
      { id: 'new', group: 'Actions', title: t('New task'), hint: 'N', run: close(() => openQuickOverlay(s.currentView, today)) },
      { id: 'plan', group: 'Actions', title: t('Plan my day'), hint: 'P', run: close(() => { void planMyDay(); }) },
      { id: 'clear', group: 'Actions', title: t('Clear timebox'), run: close(() => { void clearTimebox(); }) },
      { id: 'clear-matrix', group: 'Actions', title: t('Clear matrix'), run: close(() => { void clearMatrix(); }) },
      ...(overdueTasks(tasks, today).length
        ? [{ id: 'rollover', group: 'Actions' as const, title: `${t('Move to today')} (${overdueTasks(tasks, today).length})`, run: close(() => { void moveOverdueToToday(); }) }]
        : []),
      { id: 'undo', group: 'Actions', title: t('Undo'), hint: '⌘Z', run: close(() => { void undoLast(); }) },
      { id: 'stats', group: 'Actions', title: t('Stats'), run: close(onOpenStats) },
      { id: 'refresh', group: 'Actions', title: t('Refresh calendars'), run: close(() => { void useIntegrationStore.getState().ensureEvents(s.timeboxDate, { force: true }); }) },
      { id: 'settings', group: 'Actions', title: t('Settings'), hint: ',', run: close(() => window.dispatchEvent(new Event('cortex:open-settings'))) },
      { id: 'sidebar', group: 'Actions', title: t('Toggle sidebar'), hint: 'B', run: close(s.toggleBrainDump) },
      { id: 'timebox', group: 'Actions', title: t('Toggle timebox'), hint: 'T', run: close(s.toggleTimebox) },
      { id: 'today', group: 'Go to', title: t('Today'), run: close(() => { s.goToDate(today); }) },
      { id: 'week', group: 'Go to', title: t('Week view'), hint: 'V', run: close(() => s.setView('main')) },
      { id: 'month', group: 'Go to', title: t('Month view'), hint: 'V', run: close(() => s.setView('month')) },
      { id: 'focus', group: 'Go to', title: t('Focus view'), hint: 'V', run: close(() => s.setView('today')) },
      { id: 'next', group: 'Go to', title: t('Next week'), run: close(() => { s.setView('main'); s.navigateWeek('next'); }) },
      { id: 'prev', group: 'Go to', title: t('Previous week'), run: close(() => { s.setView('main'); s.navigateWeek('prev'); }) },
    ];

    // "friday", "3.12", "yarın" → jump to that day.
    const parsed = query.trim() ? parseInput(query) : null;
    const jump: Item[] = parsed?.date && parsed.tokens.length === 1 && parsed.tokens[0].kind === 'date'
      ? [{
          id: 'jump', group: 'Go to',
          title: `${t('Go to')} ${format(parseISO(parsed.date), 'EEEE, d MMMM', { locale })}`,
          run: close(() => { s.setView('main'); s.goToDate(parsed.date!); }),
        }]
      : [];

    const openTask = (task: Task) => close(() => {
      if (task.scheduled_date) { s.setView('main'); s.goToDate(task.scheduled_date); }
      s.selectTask(task.id);
    });
    const taskItems: Item[] = q
      ? tasks
          .filter((x) => fold(x.title).includes(q) || (x.notes && fold(x.notes).includes(q)))
          .sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || (b.scheduled_date ?? '').localeCompare(a.scheduled_date ?? ''))
          .slice(0, 8)
          .map((x) => ({
            id: `task:${x.id}`, group: 'Tasks' as const, title: x.title, done: x.is_completed,
            hint: x.scheduled_date ? format(parseISO(x.scheduled_date), 'd MMM', { locale }) : t('Brain Dump'),
            run: openTask(x),
          }))
      : [];

    const matching = q ? actions.filter((a) => fold(a.title).includes(q)) : actions;
    return [...jump, ...taskItems, ...matching];
  }, [query, tasks, today, t, locale, onClose, onOpenStats]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[index]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  }

  let lastGroup = '';
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[60] flex justify-center pt-[14vh]"
      style={{ background: 'rgba(0,0,0,0.28)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[560px] self-start flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-pop)', maxHeight: '60vh' }}
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ type: 'spring', stiffness: 600, damping: 40 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('Command palette')}
      >
        <div className="flex items-center gap-2.5 px-4 h-12 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--ink-secondary)' }}>
            <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('Search tasks or type a command…')}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--ink-muted)]"
            style={{ color: 'var(--ink)' }}
            role="combobox"
            aria-expanded
            aria-controls="cx-palette-list"
          />
          <kbd className="cx-kbd">esc</kbd>
        </div>

        <div ref={listRef} id="cx-palette-list" role="listbox" className="overflow-y-auto py-1.5">
          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--ink-secondary)' }}>{t('No results')}</div>
          )}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? (lastGroup = it.group) : null;
            const on = i === index;
            return (
              <div key={it.id}>
                {header && <div className="cx-section px-4 pt-2.5 pb-1">{t(header)}</div>}
                <div
                  data-index={i}
                  role="option"
                  aria-selected={on}
                  onMouseMove={() => setIndex(i)}
                  onClick={it.run}
                  className="relative mx-1.5 flex items-center gap-2.5 h-9 px-2.5 cursor-pointer text-[13px]"
                  style={{ color: it.done ? 'var(--ink-secondary)' : 'var(--ink)' }}
                >
                  {on && (
                    <motion.span
                      layoutId="palette-active"
                      className="absolute inset-0 z-0"
                      style={{ background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)' }}
                      transition={{ type: 'spring', stiffness: 700, damping: 45 }}
                    />
                  )}
                  {it.group === 'Tasks' && (
                    <span
                      className="relative z-10 w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ border: `1.5px solid ${it.done ? 'var(--accent)' : 'var(--border-strong)'}`, background: it.done ? 'var(--accent)' : undefined }}
                    />
                  )}
                  <span className={`relative z-10 flex-1 truncate ${it.done ? 'line-through' : ''}`}>{it.title}</span>
                  {it.hint && (
                    <span className="relative z-10 text-[11px] font-medium" style={{ color: 'var(--ink-secondary)' }}>{it.hint}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
