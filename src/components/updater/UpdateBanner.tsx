import { useUpdater } from '../../hooks/useUpdater';

export function UpdateBanner() {
  const { status, update, progress, install } = useUpdater();

  if (status === 'idle') return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-[13px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', maxWidth: 320 }}
    >
      {status === 'available' && (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--text-1)' }}>Update available</div>
            <div style={{ color: 'var(--text-4)' }}>v{update?.version}</div>
          </div>
          <button
            onClick={install}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Install
          </button>
        </>
      )}

      {status === 'downloading' && (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--text-1)' }}>Downloading update…</div>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
            </div>
          </div>
          <span style={{ color: 'var(--text-4)' }}>{progress}%</span>
        </>
      )}

      {status === 'done' && (
        <span style={{ color: 'var(--text-1)' }}>Update installed — relaunching…</span>
      )}
    </div>
  );
}
