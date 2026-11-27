import { useEffect, useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useGeneralStore } from '../../store/generalStore';
import { useLabelStore } from '../../store/labelStore';
import { useT } from '../../hooks/useT';
import { useDateLocale } from '../../hooks/useDateLocale';
import { useDayEvents } from '../../hooks/useDayEvents';
import { eventHatch } from '../ui/eventStyle';
import { minutesToTime } from '../../lib/time';
import { formatTimeStr } from '../timebox/Timebox';
import { SettingsButton } from '../layout/SettingsButton';
import {
  Chevron, IconButton, PanelToggle, PillButton, SearchButton, StatsButton, Toolbar, TRAFFIC_LIGHTS_W, ViewSwitcher,
} from '../ui/Toolbar';
import type { Task } from '../../types';

/** Rows of items a day cell shows before "+N more". */
const MAX_ITEMS = 4;
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function MonthNav() {
  const monthCursor = useTaskStore((s) => s.monthCursor);
  const navigateMonth = useTaskStore((s) => s.navigateMonth);
  const showBrainDump = useTaskStore((s) => s.showBrainDump);
  const t = useT();
  const locale = useDateLocale();
  const isThisMonth = monthCursor === format(new Date(), 'yyyy-MM');

  return (
    <Toolbar paddingLeft={showBrainDump ? 12 : TRAFFIC_LIGHTS_W}>
      <PanelToggle side="left" />
      <span className="ml-1 text-[18px] font-semibold tracking-[-0.02em] truncate" style={{ color: 'var(--ink)' }}>
        {format(parseISO(`${monthCursor}-01`), 'MMMM yyyy', { locale })}
      </span>
      <div className="flex items-center gap-0.5 ml-1">
        <IconButton onClick={() => navigateMonth('prev')} size={26} title={t('Previous month')}>
          <Chevron dir="left" />
        </IconButton>
        <IconButton onClick={() => navigateMonth('next')} size={26} title={t('Next month')}>
          <Chevron dir="right" />
        </IconButton>
      </div>
      <PillButton onClick={() => navigateMonth('today')} active={isThisMonth}>{t('Today')}</PillButton>
      <div className="ml-auto flex items-center gap-1.5">
        <SearchButton />
        <StatsButton />
        <ViewSwitcher />
        <PanelToggle side="right" />
        <SettingsButton />
      </div>
    </Toolbar>
  );
}

function TaskChip({ task }: { task: Task }) {
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const selectTask = useTaskStore((s) => s.selectTask);
  const label = useLabelStore((s) => s.labels.find((l) => l.id === task.label) ?? null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { taskId: task.id } });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); selectTask(task.id); }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="group/chip flex items-center gap-1.5 h-5 px-1.5 text-[12px] leading-4 min-w-0 cursor-pointer select-none touch-none transition-colors duration-150 hover:bg-[var(--surface-hover)]"
      style={{ borderRadius: 'var(--radius-xs)', opacity: isDragging ? 0.35 : 1 }}
    >
      <button
        aria-label={task.is_completed ? 'Mark as not done' : 'Mark as done'}
        className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
        style={{
          border: `1.5px solid ${task.is_completed ? 'var(--accent)' : label?.color ?? 'var(--border-strong)'}`,
          background: task.is_completed ? 'var(--accent)' : undefined,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); void toggleComplete(task.id); }}
      >
        {task.is_completed && (
          <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span
        className={`truncate ${task.is_completed ? 'line-through' : ''}`}
        style={{ color: task.is_completed ? 'var(--ink-muted)' : 'var(--ink-body)' }}
      >
        {task.title}
      </span>
    </div>
  );
}

/** A task whose due date is this day (it may be planned on another day). */
function DueFlag({ task, today }: { task: Task; today: string }) {
  const selectTask = useTaskStore((s) => s.selectTask);
  const t = useT();
  const overdue = !task.is_completed && task.due_date! < today;
  const color = task.is_completed ? 'var(--ink-muted)' : overdue ? 'var(--danger)' : 'var(--warn)';
  return (
    <div
      onClick={(e) => { e.stopPropagation(); selectTask(task.id); }}
      onDoubleClick={(e) => e.stopPropagation()}
      title={`${t('Due')}: ${task.title}`}
      className="flex items-center gap-1.5 h-5 px-1.5 text-[12px] leading-4 min-w-0 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors duration-150"
      style={{ borderRadius: 'var(--radius-xs)', color }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
        <path d="M2.5 11V1.5M2.5 2h6.5l-1.5 2.25L9 6.5H2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`truncate font-medium ${task.is_completed ? 'line-through' : ''}`}>{task.title}</span>
    </div>
  );
}

function DayCell({ date, inMonth }: { date: Date; inMonth: boolean }) {
  const dateStr = ymd(date);
  const today = useTaskStore((s) => s.today);
  const selected = useTaskStore((s) => s.timeboxDate === dateStr);
  const tasks = useTaskStore(useShallow((s) => s.tasks.filter((x) => x.scheduled_date === dateStr)));
  const due = useTaskStore(useShallow((s) => s.tasks.filter((x) => x.due_date === dateStr && x.scheduled_date !== dateStr)));
  const events = useDayEvents(dateStr);
  const timeFormat = useGeneralStore((s) => s.timeFormat);
  const language = useGeneralStore((s) => s.language);
  const { setNodeRef, isOver } = useDroppable({ id: `day__${dateStr}` });
  const t = useT();

  const isToday = dateStr === today;
  const done = tasks.filter((x) => x.is_completed).length;
  // Open tasks first, finished ones last.
  const sorted = [...tasks].sort((a, b) => Number(a.is_completed) - Number(b.is_completed));
  const items: React.ReactNode[] = [
    ...due.map((x) => <DueFlag key={`due-${x.id}`} task={x} today={today} />),
    ...sorted.map((x) => <TaskChip key={x.id} task={x} />),
    ...events.map((ev) => {
      const time = ev.allDay || ev.continuesBefore ? null : formatTimeStr(minutesToTime(ev.startMin), timeFormat, language);
      return (
        <div
          key={ev.key}
          title={ev.title || t('(No title)')}
          className="flex items-center gap-1 h-5 px-1.5 text-[11px] leading-4 min-w-0"
          style={{ borderRadius: 'var(--radius-xs)', ...eventHatch(ev.color) }}
        >
          {time && <span className="flex-shrink-0 font-medium tabular-nums" style={{ color: `color-mix(in srgb, ${ev.color} 70%, var(--ink))` }}>{time}</span>}
          <span className="truncate" style={{ color: 'var(--ink-body)' }}>{ev.title || t('(No title)')}</span>
        </div>
      );
    }),
  ];
  const shown = items.slice(0, MAX_ITEMS);
  const hidden = items.length - shown.length;

  const openWeek = () => {
    const s = useTaskStore.getState();
    s.goToDate(dateStr);
    s.setView('main');
  };

  return (
    <div
      ref={setNodeRef}
      onClick={() => useTaskStore.setState({ timeboxDate: dateStr })}
      onDoubleClick={openWeek}
      title={t('Double-click to open the week')}
      className="relative flex flex-col min-w-0 min-h-0 px-1.5 pt-1.5 pb-1 cursor-default transition-[background-color,box-shadow] duration-200"
      style={{
        background: isOver
          ? 'var(--accent-soft)'
          : isToday ? 'color-mix(in srgb, var(--accent-soft) 55%, var(--surface))'
          : inMonth ? 'var(--surface)' : 'var(--surface-sunken)',
        boxShadow: isOver ? 'inset 0 0 0 1.5px var(--accent)' : selected ? 'inset 0 0 0 1.5px var(--accent-line)' : undefined,
      }}
    >
      <div className="flex items-center gap-1 mb-1 px-0.5 flex-shrink-0">
        <span
          className="min-w-6 h-6 px-1 rounded-full flex items-center justify-center text-[12px] font-semibold tabular-nums transition-colors duration-200"
          style={{
            background: isToday ? 'var(--accent-strong)' : 'transparent',
            color: isToday ? 'var(--on-accent)' : inMonth ? 'var(--ink)' : 'var(--ink-muted)',
          }}
        >
          {format(date, 'd')}
        </span>
        {tasks.length > 0 && (
          <span className="ml-auto text-[10px] font-medium tabular-nums" style={{ color: done === tasks.length ? 'var(--accent-hover)' : 'var(--ink-secondary)' }}>
            {done}/{tasks.length}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-h-0 overflow-hidden" style={{ opacity: inMonth ? 1 : 0.6 }}>
        {shown}
        {hidden > 0 && (
          <button
            className="cx-press self-start h-5 px-1.5 text-[11px] font-medium hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-secondary)', borderRadius: 'var(--radius-xs)' }}
            onClick={(e) => { e.stopPropagation(); openWeek(); }}
          >
            +{hidden} {t('more')}
          </button>
        )}
      </div>
      {/* Done progress along the bottom edge */}
      {tasks.length > 0 && (
        <div className="absolute left-0 right-0 bottom-0 h-[2px]">
          <div
            className="h-full transition-[width] duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{ width: `${(done / tasks.length) * 100}%`, background: 'var(--accent)', opacity: 0.7 }}
          />
        </div>
      )}
    </div>
  );
}

export function MonthView() {
  const monthCursor = useTaskStore((s) => s.monthCursor);
  const weekStartsOn = useGeneralStore((s) => s.weekStartsOn);
  const locale = useDateLocale();

  // Slide in from the side we're moving towards.
  const prev = useRef(monthCursor);
  const dir = monthCursor > prev.current ? 1 : monthCursor < prev.current ? -1 : 0;
  useEffect(() => { prev.current = monthCursor; }, [monthCursor]);

  const first = parseISO(`${monthCursor}-01`);
  const gridStart = startOfWeek(startOfMonth(first), { weekStartsOn });
  const weeks = Math.ceil((differenceInCalendarDays(endOfMonth(first), gridStart) + 1) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ background: 'var(--surface)' }}>
      <MonthNav />
      <div className="flex-1 min-h-0 p-4 flex flex-col">
        <div className="grid grid-cols-7 flex-shrink-0 pb-1.5">
          {days.slice(0, 7).map((d) => (
            <div key={d.toISOString()} className="text-center text-[12px] font-medium" style={{ color: 'var(--ink-secondary)' }}>
              {format(d, 'EEE', { locale })}
            </div>
          ))}
        </div>
        <motion.div
          key={monthCursor}
          initial={{ opacity: 0, x: dir * 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          className="flex-1 min-h-0 grid grid-cols-7 gap-px overflow-hidden"
          style={{
            gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))`,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {days.map((d) => (
            <DayCell key={d.toISOString()} date={d} inMonth={format(d, 'yyyy-MM') === monthCursor} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
