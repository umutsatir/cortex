import { useGeneralStore } from '../store/generalStore';
import { translate } from '../i18n';

export function useT() {
  const lang = useGeneralStore((s) => s.language);
  return (key: string) => translate(key, lang);
}
