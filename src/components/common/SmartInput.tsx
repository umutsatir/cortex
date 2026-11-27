import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ParsedTask } from '../../lib/parseTask';
import { useLabelStore, labelSlug, type Label } from '../../store/labelStore';
import { useT } from '../../hooks/useT';
import { tokenColor, tokenInk, tokenWash } from './tokenColors';

interface Props {
  value: string;
  parsed: ParsedTask | null;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Font size etc.; applied to both the input and the highlight layer so they line up. */
  className?: string;
}

const MAX_SUGGESTIONS = 6;

/** The "#partial" right before the caret, if the caret is in one. */
function hashQuery(value: string, caret: number): { start: number; end: number; query: string } | null {
  const m = value.slice(0, caret).match(/(^|\s)#([^\s#]*)$/);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[1].length;
  // The rest of the word after the caret is replaced too.
  const rest = value.slice(caret).match(/^[^\s#]*/)?.[0].length ?? 0;
  return { start, end: caret + rest, query: m[2] };
}

function matchLabels(labels: Label[], query: string): Label[] {
  const q = labelSlug(query);
  return labels
    .filter((l) => labelSlug(l.name).includes(q))
    .sort((a, b) => Number(!labelSlug(a.name).startsWith(q)) - Number(!labelSlug(b.name).startsWith(q)) || a.name.localeCompare(b.name))
    .slice(0, MAX_SUGGESTIONS);
}

let measureCanvas: HTMLCanvasElement | null = null;
function textWidth(text: string, el: HTMLElement): number {
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d')!;
  ctx.font = getComputedStyle(el).font;
  return ctx.measureText(text).width;
}

/**
 * A text input whose recognised keywords ("tomorrow", "14:00", "#work") turn their own
 * color as you type, drawn by a mirror layer behind a transparent input. Typing "#"
 * offers the existing labels.
 */
export const SmartInput = forwardRef<HTMLInputElement, Props>(function SmartInput(
  { value, parsed, onChange, onKeyDown, onBlur, placeholder, autoFocus, className = '' },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => inputRef.current!);
  const labels = useLabelStore((s) => s.labels);
  const t = useT();

  const [caret, setCaret] = useState(0);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null); // "#" position closed with Esc
  const hq = hashQuery(value, caret);
  const suggestions = hq && hq.start !== dismissed ? matchLabels(labels, hq.query) : [];
  const open = suggestions.length > 0;

  useEffect(() => { setIndex(0); }, [hq?.query, hq?.start]);

  const syncCaret = () => {
    const el = inputRef.current;
    if (!el) return;
    setCaret(el.selectionStart ?? el.value.length);
    if (mirrorRef.current) mirrorRef.current.scrollLeft = el.scrollLeft;
  };

  function pick(label: Label) {
    if (!hq) return;
    const insert = `#${labelSlug(label.name)} `;
    const after = value.slice(hq.end).replace(/^\s/, '');
    const next = value.slice(0, hq.start) + insert + after;
    onChange(next);
    const pos = hq.start + insert.length;
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(pos, pos);
      syncCaret();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(suggestions[index]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDismissed(hq!.start); return; }
    }
    onKeyDown?.(e);
    requestAnimationFrame(syncCaret);
  }

  // Highlighted copy of the text.
  const tokens = [...(parsed?.tokens ?? [])].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let at = 0;
  tokens.forEach((tok, i) => {
    if (tok.start < at) return;
    if (tok.start > at) parts.push(<span key={`p${i}`}>{value.slice(at, tok.start)}</span>);
    const color = tokenColor(tok.kind, parsed!);
    parts.push(
      <span
        key={`t${tok.kind}`}
        className="cx-token rounded-[4px] transition-[color,background-color,box-shadow] duration-300"
        style={{ color: tokenInk(color), background: tokenWash(color), boxShadow: `0 0 0 2px ${tokenWash(color)}` }}
      >
        {value.slice(tok.start, tok.end)}
      </span>,
    );
    at = tok.end;
  });
  if (at < value.length) parts.push(<span key="rest">{value.slice(at)}</span>);

  // The list sits under the "#", in a portal so scrolling panels don't clip it.
  let pos: { left: number; top: number } | null = null;
  if (open && inputRef.current) {
    const r = inputRef.current.getBoundingClientRect();
    const x = textWidth(value.slice(0, hq!.start), inputRef.current) - inputRef.current.scrollLeft;
    pos = { left: Math.min(r.left + Math.max(0, x) - 8, window.innerWidth - 228), top: r.bottom + 6 };
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={mirrorRef}
        aria-hidden
        className={`absolute inset-0 flex items-center overflow-hidden whitespace-pre pointer-events-none ${className}`}
        style={{ color: 'var(--ink)' }}
      >
        {parts}
      </div>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => { onChange(e.target.value); setDismissed(null); requestAnimationFrame(syncCaret); }}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onScroll={syncCaret}
        onSelect={syncCaret}
        onBlur={onBlur}
        placeholder={placeholder}
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={`relative w-full bg-transparent outline-none placeholder:text-[var(--ink-muted)] ${className}`}
        style={{ color: 'transparent', caretColor: 'var(--ink)' }}
      />

      {open && pos && createPortal(
        <div
          role="listbox"
          className="cx-pop-in fixed z-[90] w-[220px] py-1"
          style={{
            left: pos.left,
            top: pos.top,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-pop)',
          }}
          // Keep focus in the input while clicking a row.
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="cx-section px-3 pt-1.5 pb-1">{t('Labels')}</div>
          {suggestions.map((l, i) => (
            <div
              key={l.id}
              role="option"
              aria-selected={i === index}
              onMouseMove={() => setIndex(i)}
              onClick={() => pick(l)}
              className="mx-1 flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer transition-colors duration-100"
              style={{
                borderRadius: 'var(--radius-sm)',
                background: i === index ? 'var(--accent-soft)' : undefined,
                color: 'var(--ink)',
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="flex-1 truncate">{l.name}</span>
              {i === index && <kbd className="cx-kbd">↵</kbd>}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
});
