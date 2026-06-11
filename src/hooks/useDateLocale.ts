import { tr, enUS } from 'date-fns/locale';
import { useGeneralStore } from '../store/generalStore';

export function useDateLocale() {
  const language = useGeneralStore((s) => s.language);
  return language === 'tr' ? tr : enUS;
}
