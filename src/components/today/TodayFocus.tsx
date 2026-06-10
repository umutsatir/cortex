import { AnimatePresence, motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { TodayTaskList } from './TodayTaskList';
import { EisenhowerMatrix } from '../eisenhower/EisenhowerMatrix';
import { Timebox } from '../timebox/Timebox';

export function TodayFocus() {
  const showBrainDump = useTaskStore((s) => s.showBrainDump);
  const showTimebox   = useTaskStore((s) => s.showTimebox);

  return (
    <>
      <AnimatePresence initial={false}>
        {showBrainDump && (
          <motion.div
            key="today-left"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex-shrink-0 h-full"
          >
            <TodayTaskList />
          </motion.div>
        )}
      </AnimatePresence>

      <EisenhowerMatrix />

      <AnimatePresence initial={false}>
        {showTimebox && (
          <motion.div
            key="today-right"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex-shrink-0 h-full"
          >
            <Timebox />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
