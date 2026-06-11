import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInCalendarDays } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import { useLabelStore } from '../../store/labelStore';
import { LabelPicker } from '../common/LabelPicker';
import { PriorityPicker } from '../common/PriorityPicker';
import type { Priority } from '../../types';

function parseEstimated(val: string): number | null {
  const v = val.trim().toLowerCase();
  const full = v.match(/^(\d+)h\s*(\d+)m?$/);
  if (full) return parseInt(full[1]) * 60 + parseInt(full[2]);
  const hours = v.match(/^(\d+)h$/);
  if (hours) return parseInt(hours[1]) * 60;
  const mins = v.match(/^(\d+)m?$/);
  if (mins) return parseInt(mins[1]);
  return null;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#10B981', bg: '#D1FAE5' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FEF3C7' },
  high:   { label: 'High',   color: '#EF4444', bg: '#FEE2E2' },
};

interface RowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function DetailRow({ icon, label, children }: RowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-2 w-32 flex-shrink-0" style={{ color: 'var(--text-4)' }}>
        {icon}
        <span className="text-[12px]">{label}</span>
      </div>
      <div className="flex-1 text-[13px]" style={{ color: 'var(--text-2)' }}>{children}</div>
    </div>
  );
}

export function TaskDetailPanel() {
  const { selectedTaskId, tasks, updateTask, deleteTask, selectTask } = useTaskStore(
    useShallow((s) => ({
      selectedTaskId: s.selectedTaskId,
      tasks: s.tasks,
      updateTask: s.updateTask,
      deleteTask: s.deleteTask,
      selectTask: s.selectTask,
    }))
  );
  const labels = useLabelStore((s) => s.labels);
  const task = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const currentLabel = labels.find((l) => l.id === task?.label) ?? null;

  const [titleVal, setTitleVal] = useState('');
  const [notesVal, setNotesVal] = useState('');
  const [estimatedVal, setEstimatedVal] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const labelBtnRef = useRef<HTMLButtonElement>(null);
  const priorityBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (task) {
      setTitleVal(task.title);
      setNotesVal(task.notes ?? '');
      setEstimatedVal(task.estimated_minutes ? formatMinutes(task.estimated_minutes) : '');
    }
    setShowLabelPicker(false);
    setShowPriorityPicker(false);
  }, [task?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') selectTask(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectTask]);

  if (!task) return null;

  function saveTitle() {
    const t = titleVal.trim();
    if (t && t !== task!.title) updateTask(task!.id, { title: t });
  }

  function saveNotes() {
    const val = notesVal.trim() || null;
    if (val !== task!.notes) updateTask(task!.id, { notes: val });
  }

  function saveEstimated() {
    const mins = estimatedVal ? parseEstimated(estimatedVal) : null;
    if (mins !== task!.estimated_minutes) updateTask(task!.id, { estimated_minutes: mins });
    setEstimatedVal(mins ? formatMinutes(mins) : '');
  }

  const listLabel = task.scheduled_date
    ? format(new Date(task.scheduled_date + 'T00:00:00'), 'EEE, MMM d')
    : 'Brain Dump';

  const dueDiff = task.due_date
    ? differenceInCalendarDays(new Date(task.due_date + 'T00:00:00'), new Date())
    : null;

  return (
    <AnimatePresence>
      <>
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => selectTask(null)}
        />
        <motion.div
          key="panel"
          className="fixed right-0 top-0 h-full z-50 w-[360px] flex flex-col shadow-xl"
          style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              className="flex-shrink-0 mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
              style={{
                borderColor: task.is_completed ? 'var(--accent)' : 'var(--text-5)',
                background: task.is_completed ? 'var(--accent)' : undefined,
              }}
              onClick={() => useTaskStore.getState().toggleComplete(task.id)}
            >
              {task.is_completed && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <input
              ref={titleRef}
              className={`flex-1 text-[15px] font-semibold bg-transparent outline-none leading-snug ${task.is_completed ? 'line-through' : ''}`}
              style={{ color: task.is_completed ? 'var(--text-4)' : 'var(--text-1)' }}
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); titleRef.current?.blur(); } }}
            />
            <button
              className="flex-shrink-0 p-1 rounded transition-colors"
              style={{ color: 'var(--text-4)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; }}
              onClick={() => deleteTask(task.id)}
              title="Delete"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5.5 3.5V2.5h3v1M6 6v4M8 6v4M3 3.5l.7 7.5h6.6l.7-7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Fields */}
          <div className="flex-1 overflow-y-auto px-5 py-1">
            {/* Due date */}
            <DetailRow
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 5.5h11M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
              label="Due date"
            >
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) => updateTask(task.id, { due_date: e.target.value || null })}
                  className="text-[13px] bg-transparent outline-none cursor-pointer transition-colors"
                  style={{ color: 'var(--text-2)', colorScheme: 'auto' }}
                />
                {dueDiff !== null && (
                  <span
                    className="text-[11px]"
                    style={{ color: dueDiff < 0 ? '#EF4444' : dueDiff <= 2 ? '#F59E0B' : 'var(--text-4)' }}
                  >
                    {dueDiff < 0 ? `${Math.abs(dueDiff)}d overdue` : dueDiff === 0 ? 'Today' : `in ${dueDiff}d`}
                  </span>
                )}
              </div>
            </DetailRow>

            {/* List */}
            <DetailRow
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
              label="List"
            >
              <span className="font-medium" style={{ color: 'var(--accent)' }}>{listLabel}</span>
            </DetailRow>

            {/* Estimated time */}
            <DetailRow
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
              label="Estimated"
            >
              <input
                className="text-[13px] bg-transparent outline-none border-b border-transparent w-28 transition-colors"
                style={{ color: 'var(--text-2)' }}
                placeholder="e.g. 1h 30m"
                value={estimatedVal}
                onChange={(e) => setEstimatedVal(e.target.value)}
                onBlur={saveEstimated}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderBottomColor = 'var(--accent)'; }}
                onMouseEnter={(e) => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderBottomColor = 'var(--border)'; }}
                onMouseLeave={(e) => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderBottomColor = 'transparent'; }}
                onKeyDown={(e) => { if (e.key === 'Enter') { saveEstimated(); (e.target as HTMLInputElement).blur(); } }}
              />
            </DetailRow>

            {/* Priority */}
            <DetailRow
              icon={<svg width="11" height="13" viewBox="0 0 9 11" fill="none"><path d="M1 10V1l7 4-7 4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>}
              label="Priority"
            >
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const active = task.priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => updateTask(task.id, { priority: active ? null : p })}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium transition-all"
                      style={{
                        background: active ? cfg.bg : 'var(--surface-2)',
                        color: active ? cfg.color : 'var(--text-4)',
                        border: `1px solid ${active ? cfg.color + '50' : 'var(--border)'}`,
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </DetailRow>

            {/* Label */}
            <DetailRow
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="1.8" fill="currentColor" /></svg>}
              label="Label"
            >
              <button
                ref={labelBtnRef}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors -ml-2"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                onClick={() => setShowLabelPicker(true)}
              >
                {currentLabel ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: currentLabel.color }} />
                    <span className="text-[13px] font-medium" style={{ color: currentLabel.color }}>{currentLabel.name}</span>
                  </>
                ) : (
                  <span className="text-[13px]" style={{ color: 'var(--text-4)' }}>Click to add</span>
                )}
              </button>
            </DetailRow>

            {/* Notes */}
            <div className="mt-4 pb-4">
              <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-2)' }}>Notes</div>
              <textarea
                className="w-full text-[13px] rounded-xl px-3 py-2.5 outline-none transition-all resize-none"
                style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                rows={4}
                placeholder="Add any notes to this task…"
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                onBlur={saveNotes}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.background = 'var(--surface)';
                  (e.target as HTMLTextAreaElement).style.outline = `1px solid var(--accent)`;
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    (e.target as HTMLTextAreaElement).style.background = 'var(--surface-2)';
                    (e.target as HTMLTextAreaElement).style.outline = 'none';
                  }
                }}
              />
            </div>

            {/* Timebox chip */}
            {task.timebox_start && task.timebox_end && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: 'var(--accent-bg)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--accent)' }}>
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-[12px]" style={{ color: 'var(--accent-text)' }}>
                  Timeboxed {task.timebox_start} – {task.timebox_end}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              className="text-[11px] transition-colors"
              style={{ color: 'var(--text-4)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-4)'; }}
              onClick={() => selectTask(null)}
            >
              Close · Esc
            </button>
          </div>
        </motion.div>
      </>

      {showLabelPicker && labelBtnRef.current && (
        <LabelPicker
          anchorEl={labelBtnRef.current}
          selectedId={task.label}
          onSelect={(id) => updateTask(task.id, { label: id })}
          onClose={() => setShowLabelPicker(false)}
        />
      )}
      {showPriorityPicker && priorityBtnRef.current && (
        <PriorityPicker
          anchorEl={priorityBtnRef.current}
          selected={task.priority}
          onSelect={(p) => updateTask(task.id, { priority: p })}
          onClose={() => setShowPriorityPicker(false)}
        />
      )}
    </AnimatePresence>
  );
}
