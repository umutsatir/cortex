import { useDroppable } from '@dnd-kit/core';

interface Props {
  hour: number;
}

export function TimeSlot({ hour }: Props) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;
  const { setNodeRef, isOver } = useDroppable({ id: `timebox__${timeStr}` });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 h-[60px] border-b transition-colors"
      style={{
        borderColor: 'var(--border-subtle)',
        background: isOver ? 'var(--accent-bg)' : 'transparent',
      }}
    />
  );
}
