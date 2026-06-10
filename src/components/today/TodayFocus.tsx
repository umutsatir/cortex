import { TodayTaskList } from './TodayTaskList';
import { EisenhowerMatrix } from '../eisenhower/EisenhowerMatrix';
import { Timebox } from '../timebox/Timebox';

export function TodayFocus() {
  return (
    <>
      <TodayTaskList />
      <EisenhowerMatrix />
      <Timebox />
    </>
  );
}
