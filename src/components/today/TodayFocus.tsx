import { format } from 'date-fns';
import { TodayTaskList } from './TodayTaskList';
import { EisenhowerMatrix } from '../eisenhower/EisenhowerMatrix';
import { Timebox } from '../timebox/Timebox';

export function TodayFocus() {
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      <TodayTaskList />
      <EisenhowerMatrix />
      <Timebox dateFilter={today} />
    </>
  );
}
