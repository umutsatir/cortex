import { useEffect, useRef, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateStatus = 'idle' | 'available' | 'downloading' | 'done';

export function useUpdater() {
  const [status, setStatus]     = useState<UpdateStatus>('idle');
  const [update, setUpdate]     = useState<Update | null>(null);
  const [progress, setProgress] = useState(0);
  const checking = useRef(false);

  function runCheck() {
    if (checking.current || status === 'available' || status === 'downloading' || status === 'done') return;
    checking.current = true;
    check()
      .then((u) => { if (u) { setUpdate(u); setStatus('available'); } })
      .catch(() => {})
      .finally(() => { checking.current = false; });
  }

  useEffect(() => {
    runCheck();

    function onResume() {
      if (document.visibilityState === 'visible') runCheck();
    }
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', runCheck);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', runCheck);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function install() {
    if (!update) return;
    setStatus('downloading');
    let downloaded = 0;
    let total = 0;
    await update.downloadAndInstall((event) => {
      if (event.event === 'Started')    { total = event.data.contentLength ?? 0; }
      if (event.event === 'Progress')   { downloaded += event.data.chunkLength; setProgress(total ? Math.round((downloaded / total) * 100) : 0); }
      if (event.event === 'Finished')   { setStatus('done'); }
    });
    await relaunch();
  }

  return { status, update, progress, install };
}
