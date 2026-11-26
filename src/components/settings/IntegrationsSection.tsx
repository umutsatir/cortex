import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { MAX_ACCOUNTS, useIntegrationStore, type CalendarAccount, type Provider } from '../../store/integrationStore';
import { useT } from '../../hooks/useT';

const SWATCH_COLORS = [
  '#6366f1','#3b82f6','#0ea5e9','#10b981','#84cc16',
  '#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6',
  '#f97316','#a2845e','#63da38','#cc73e1','#34aadc',
];

function CalendarColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function openPicker() {
    if (!swatchRef.current) return;
    const rect = swatchRef.current.getBoundingClientRect();
    const popW = 152;
    const popH = 130; // approx height
    const left = Math.min(rect.left, window.innerWidth - popW - 8);
    const top = rect.bottom + 6 + popH > window.innerHeight
      ? rect.top - popH - 6
      : rect.bottom + 6;
    setPos({ top, left: Math.max(8, left) });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          swatchRef.current && !swatchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <>
      <button
        ref={swatchRef}
        onClick={openPicker}
        className="w-4 h-4 rounded-full border flex-shrink-0"
        style={{ background: color, borderColor: 'rgba(0,0,0,0.15)' }}
        title="Change color"
      />
      {open && createPortal(
        <div
          ref={popoverRef}
          className="cx-pop-in fixed z-[200] rounded-xl p-2"
          style={{ boxShadow: 'var(--shadow-pop)',
            top: pos.top,
            left: pos.left,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            width: 152,
          }}
        >
          <div className="grid grid-cols-5 gap-1.5">
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${c}` : 'none',
                }}
              />
            ))}
          </div>
          {/* Custom hex input */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full flex-shrink-0 border" style={{ background: color, borderColor: 'rgba(0,0,0,0.15)' }} />
            <input
              type="text"
              value={color}
              maxLength={7}
              onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
              className="flex-1 text-[11px] font-mono rounded px-1.5 py-1 outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' };
const focusAccent = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'var(--accent)'; };
const blurBorder = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'var(--border)'; };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>
      {children}
    </p>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="w-9 h-5 rounded-full transition-colors flex-shrink-0 relative"
      style={{ background: on ? 'var(--accent)' : 'var(--surface-3)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
        style={{ background: 'white', left: on ? '18px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
      />
    </button>
  );
}

function SmallButton({ onClick, children, disabled, primary }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50 flex-shrink-0"
      style={primary
        ? { background: 'var(--accent-strong)', color: 'var(--on-accent)' }
        : { background: 'var(--surface-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
    >
      {children}
    </button>
  );
}

const PROVIDER_NAME: Record<Provider, string> = { apple: 'iCloud', google: 'Google' };

function AppleForm({ fixedEmail, onDone }: { fixedEmail?: string; onDone?: () => void }) {
  const { connectApple, connecting, connectError } = useIntegrationStore(
    useShallow((s) => ({ connectApple: s.connectApple, connecting: s.connecting, connectError: s.connectErrorFor === 'apple' ? s.connectError : null }))
  );
  const [email, setEmail] = useState(fixedEmail ?? '');
  const [password, setPassword] = useState('');
  const t = useT();
  const busy = connecting === 'apple';

  async function submit() {
    await connectApple(email, password);
    if (!useIntegrationStore.getState().connectError) onDone?.();
  }

  return (
    <div className="flex flex-col gap-3">
      {!fixedEmail && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px]" style={{ color: 'var(--text-3)' }}>Apple ID</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@icloud.com"
            className="rounded-lg px-3 py-2 text-[13px] outline-none" style={inputStyle} onFocus={focusAccent} onBlur={blurBorder}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px]" style={{ color: 'var(--text-3)' }}>{t('App-Specific Password')}</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx"
          onKeyDown={(e) => { if (e.key === 'Enter' && email && password && !busy) submit(); }}
          className="rounded-lg px-3 py-2 text-[13px] outline-none" style={inputStyle} onFocus={focusAccent} onBlur={blurBorder}
        />
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-4)' }}>
        {t('Generate an app-specific password at')} <span style={{ color: 'var(--accent-hover)' }}>appleid.apple.com</span> → {t('Sign-In and Security → App-Specific Passwords.')}
      </p>
      {connectError && <p className="text-[11px]" style={{ color: '#ef4444' }}>{t(connectError)}</p>}
      <SmallButton primary onClick={submit} disabled={busy || !email || !password}>
        {busy ? t('Connecting…') : t('Connect')}
      </SmallButton>
    </div>
  );
}

function AccountCard({ account }: { account: CalendarAccount }) {
  const { disconnect, refreshCalendars, toggleCalendar, setCalendarColor, connectGoogle, connecting } = useIntegrationStore(
    useShallow((s) => ({
      disconnect: s.disconnect, refreshCalendars: s.refreshCalendars, toggleCalendar: s.toggleCalendar,
      setCalendarColor: s.setCalendarColor, connectGoogle: s.connectGoogle, connecting: s.connecting,
    }))
  );
  const t = useT();
  const needsReauth = account.status === 'needs_reauth';

  return (
    <div className="flex flex-col rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 py-1.5">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--text-4)' }}>{PROVIDER_NAME[account.provider]} · </span>{account.label}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: account.status === 'ok' ? 'var(--text-4)' : '#F59E0B' }}>
            {needsReauth ? t('Access expired — reconnect to keep seeing events')
              : account.status === 'error' ? account.error
              : t('Connected — events shown in Timebox')}
          </div>
        </div>
        {!needsReauth && (
          <button
            onClick={() => refreshCalendars(account.id)}
            title={t('Refresh calendar list')}
            className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ color: 'var(--text-4)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 6A4.5 4.5 0 1 1 9 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M9.5 1v2.2H7.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {needsReauth && account.provider === 'google' && (
          <SmallButton primary onClick={connectGoogle} disabled={connecting !== null}>{t('Reconnect')}</SmallButton>
        )}
        <SmallButton onClick={() => disconnect(account.id)}>{t('Disconnect')}</SmallButton>
      </div>

      {needsReauth && account.provider === 'apple' && (
        <div className="py-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <AppleForm fixedEmail={account.label} />
        </div>
      )}

      {!needsReauth && account.calendars.length > 0 && (
        <div className="flex flex-col border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {account.calendars.map((cal) => (
            <div key={cal.id} className="flex items-center gap-2 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
              <CalendarColorPicker color={cal.color} onChange={(c) => setCalendarColor(account.id, cal.id, c)} />
              <span className="text-[13px] flex-1 min-w-0 truncate" style={{ color: 'var(--text-2)' }}>{cal.name}</span>
              <Toggle on={cal.enabled} onClick={() => toggleCalendar(account.id, cal.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function IntegrationsSection() {
  const { accounts, connecting, connectError, connectErrorFor, googleConfigured, connectGoogle, cancelGoogle, checkGoogleConfigured, clearConnectError } =
    useIntegrationStore(useShallow((s) => ({
      accounts: s.accounts, connecting: s.connecting, connectError: s.connectError, connectErrorFor: s.connectErrorFor, googleConfigured: s.googleConfigured,
      connectGoogle: s.connectGoogle, cancelGoogle: s.cancelGoogle, checkGoogleConfigured: s.checkGoogleConfigured,
      clearConnectError: s.clearConnectError,
    })));
  const [adding, setAdding] = useState<Provider | null>(null);
  const t = useT();
  const atLimit = accounts.length >= MAX_ACCOUNTS;

  useEffect(() => { checkGoogleConfigured(); }, [checkGoogleConfigured]);
  useEffect(() => () => clearConnectError(), [clearConnectError]);

  return (
    <div className="flex flex-col gap-4">
      {accounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>{t('Calendars')}</SectionLabel>
          {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionLabel>{t('Add calendar account')}</SectionLabel>
        <div className="flex gap-2">
          <SmallButton onClick={() => { clearConnectError(); setAdding(adding === 'apple' ? null : 'apple'); }} disabled={atLimit}>
            + iCloud Calendar
          </SmallButton>
          <SmallButton
            onClick={() => { clearConnectError(); setAdding(null); connectGoogle(); }}
            disabled={connecting !== null || googleConfigured === false || atLimit}
          >
            + Google Calendar
          </SmallButton>
        </div>

        {atLimit && (
          <p className="text-[11px]" style={{ color: 'var(--text-4)' }}>
            {t('You can connect up to 6 calendar accounts.')}
          </p>
        )}

        {googleConfigured === false && (
          <p className="text-[11px]" style={{ color: 'var(--text-4)' }}>{t('Google Calendar is not configured in this build.')}</p>
        )}

        {connecting === 'google' && (
          <div className="flex items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--text-3)' }}>
            <span>{t('Waiting for Google sign-in in your browser…')}</span>
            <SmallButton onClick={cancelGoogle}>{t('Cancel')}</SmallButton>
          </div>
        )}

        {adding === 'apple' && !atLimit && <AppleForm onDone={() => setAdding(null)} />}

        {connectError && connectErrorFor === 'google' && (
          <p className="text-[11px]" style={{ color: '#ef4444' }}>{t(connectError)}</p>
        )}
      </div>
    </div>
  );
}
