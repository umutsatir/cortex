import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInCalendarDays } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useTaskStore } from '../../store/taskStore';
import type { Priority } from '../../types';

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function parseEstimated(val: string): number | null {
  const v = val.trim().toLowerCase();
  // Accept: "90", "1h", "1h30", "1h 30m", "30m"
  const full = v.match(/^(\d+)h\s*(\d+)m?$/);
  if (full) return parseInt(full[1]) * 60 + parseInt(full[2]);
  const hoursOnly = v.match(/^(\d+)h$/);
  if (hoursOnly) return parseInt(hoursOnly[1]) * 60;
  const minsOnly = v.match(/^(\d+)m?$/);
  if (minsOnly) return parseInt(minsOnly[1]);
  return null;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#10B981', bg: '#D1FAE5' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FEF3C7' },
  high: { label: 'High', color: '#EF4444', bg: '#FEE2E2' },
};

const LABEL_COLORS = [
  '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
];

interface RowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function DetailRow({ icon, label, children }: RowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F3F4F6] last:border-b-0">
      <div className="flex items-center gap-2 w-36 flex-shrink-0 text-[#9CA3AF]">
        {icon}
        <span className="text-[12px]">{label}</span>
      </div>
      <div className="flex-1 text-[13px] text-[#374151]">{children}</div>
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

  const task = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const [titleVal, setTitleVal] = useState('');
  const [notesVal, setNotesVal] = useState('');
  const [labelVal, setLabelVal] = useState('');
  const [estimatedVal, setEstimatedVal] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitleVal(task.title);
      setNotesVal(task.notes ?? '');
      setLabelVal(task.label ?? '');
      setEstimatedVal(task.estimated_minutes ? formatMinutes(task.estimated_minutes) : '');
    }
  }, [task?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') selectTask(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectTask]);

  function saveTitle() {
    if (!task) return;
    const t = titleVal.trim();
    if (t && t !== task.title) updateTask(task.id, { title: t });
  }

  function saveNotes() {
    if (!task) return;
    const val = notesVal.trim() || null;
    if (val !== task.notes) updateTask(task.id, { notes: val });
  }

  function saveLabel() {
    if (!task) return;
    const val = labelVal.trim() || null;
    if (val !== task.label) updateTask(task.id, { label: val });
  }

  function saveEstimated() {
    if (!task) return;
    const mins = estimatedVal ? parseEstimated(estimatedVal) : null;
    if (mins !== task.estimated_minutes) updateTask(task.id, { estimated_minutes: mins });
    if (mins !== null) setEstimatedVal(formatMinutes(mins));
    else setEstimatedVal('');
  }

  function setDueDate(val: string) {
    if (!task) return;
    updateTask(task.id, { due_date: val || null });
  }

  function setPriority(p: Priority | null) {
    if (!task) return;
    updateTask(task.id, { priority: p === task.priority ? null : p });
  }

  const listLabel = task?.scheduled_date
    ? format(new Date(task.scheduled_date + 'T00:00:00'), 'EEE, MMM d')
    : 'Brain Dump';

  const dueDiff = task?.due_date
    ? differenceInCalendarDays(new Date(task.due_date + 'T00:00:00'), new Date())
    : null;

  return (
    <AnimatePresence>
      {task && (
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
            className="fixed right-0 top-0 h-full z-50 w-[360px] bg-white border-l border-[#E5E7EB] flex flex-col shadow-xl overflow-hidden"
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-[#F3F4F6]">
              <button
                className="flex-shrink-0 mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: task.is_completed ? '#6366F1' : '#D1D5DB',
                  background: task.is_completed ? '#6366F1' : undefined,
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
                className={`flex-1 text-[16px] font-semibold text-[#111827] bg-transparent outline-none resize-none leading-snug ${task.is_completed ? 'line-through text-[#9CA3AF]' : ''}`}
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); titleRef.current?.blur(); } }}
              />
              <button
                className="flex-shrink-0 p-1 text-[#9CA3AF] hover:text-[#EF4444] rounded transition-colors"
                onClick={() => { deleteTask(task.id); }}
                title="Delete task"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5h10M5.5 3.5V2.5h3v1M6 6v4M8 6v4M3 3.5l.7 7.5h6.6l.7-7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <DetailRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 5.5h11M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
                label="Due date"
              >
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-[13px] text-[#374151] bg-transparent outline-none cursor-pointer hover:text-[#6366F1] transition-colors"
                  style={{ colorScheme: 'light' }}
                />
                {dueDiff !== null && (
                  <span
                    className="ml-2 text-[11px]"
                    style={{ color: dueDiff < 0 ? '#EF4444' : dueDiff <= 2 ? '#F59E0B' : '#9CA3AF' }}
                  >
                    {dueDiff < 0
                      ? `${Math.abs(dueDiff)}d overdue`
                      : dueDiff === 0
                      ? 'Today'
                      : `in ${dueDiff}d`}
                  </span>
                )}
              </DetailRow>

              <DetailRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
                label="List"
              >
                <span className="text-[#6366F1] font-medium">{listLabel}</span>
              </DetailRow>

              <DetailRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
                label="Estimated"
              >
                <input
                  className="text-[13px] text-[#374151] bg-transparent outline-none border-b border-transparent hover:border-[#E5E7EB] focus:border-[#6366F1] transition-colors w-24"
                  placeholder="e.g. 1h 30m"
                  value={estimatedVal}
                  onChange={(e) => setEstimatedVal(e.target.value)}
                  onBlur={saveEstimated}
                  onKeyDown={(e) => { if (e.key === 'Enter') { saveEstimated(); (e.target as HTMLInputElement).blur(); } }}
                />
              </DetailRow>

              <DetailRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10L5 4l3 4 2-2.5 2 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                label="Priority"
              >
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                    const cfg = PRIORITY_CONFIG[p];
                    const active = task.priority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium transition-all"
                        style={{
                          background: active ? cfg.bg : '#F9FAFB',
                          color: active ? cfg.color : '#9CA3AF',
                          border: `1px solid ${active ? cfg.color + '40' : '#E5E7EB'}`,
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </DetailRow>

              <DetailRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="2" fill="currentColor" /></svg>}
                label="Label"
              >
                <div className="flex items-center gap-2">
                  {task.label && (
                    <div className="flex gap-1.5 flex-wrap mb-1">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          className="w-3.5 h-3.5 rounded-full ring-offset-1 transition-all"
                          style={{
                            background: c,
                            outline: (task.label && !LABEL_COLORS.includes(task.label)) ? undefined : undefined,
                          }}
                          onClick={() => updateTask(task.id, { label: task.label })}
                        />
                      ))}
                    </div>
                  )}
                  <input
                    className="text-[13px] text-[#374151] bg-transparent outline-none border-b border-transparent hover:border-[#E5E7EB] focus:border-[#6366F1] transition-colors flex-1"
                    placeholder="Add label…"
                    value={labelVal}
                    onChange={(e) => setLabelVal(e.target.value)}
                    onBlur={saveLabel}
                    onKeyDown={(e) => { if (e.key === 'Enter') { saveLabel(); (e.target as HTMLInputElement).blur(); } }}
                  />
                </div>
              </DetailRow>

              <div className="mt-4">
                <div className="text-[12px] font-medium text-[#374151] mb-2">Notes</div>
                <textarea
                  className="w-full text-[13px] text-[#374151] bg-[#F9FAFB] rounded-lg px-3 py-2.5 outline-none focus:bg-white focus:ring-1 focus:ring-[#6366F1] transition-all resize-none"
                  rows={4}
                  placeholder="Add any notes to this task…"
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  onBlur={saveNotes}
                />
              </div>

              {/* Timebox info if set */}
              {task.timebox_start && task.timebox_end && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#EEF2FF] rounded-lg">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#6366F1]">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] text-[#4338CA]">
                    Timeboxed {task.timebox_start} – {task.timebox_end}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#F3F4F6]">
              <button
                className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                onClick={() => selectTask(null)}
              >
                Close  ·  Esc
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
