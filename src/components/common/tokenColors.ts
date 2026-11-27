import type { ParsedTask, ParsedToken } from '../../lib/parseTask';
import { findLabelBySlug } from '../../store/labelStore';

/** One hue per kind of keyword, shared by the chips and the highlighted text. */
const KIND_COLOR: Record<ParsedToken['kind'], string> = {
  date: '#2563EB',
  time: '#7C3AED',
  duration: '#0D9488',
  repeat: '#DB2777',
  priority: '#DC2626',
  label: '#6B7280',
};
const PRIORITY_COLOR = { high: '#DC2626', medium: '#D97706', low: '#059669' } as const;

export function tokenColor(kind: ParsedToken['kind'], parsed: ParsedTask): string {
  if (kind === 'priority' && parsed.priority) return PRIORITY_COLOR[parsed.priority];
  if (kind === 'label' && parsed.labelName) {
    const label = findLabelBySlug(parsed.labelName);
    if (label) return label.color;
  }
  return KIND_COLOR[kind];
}

/** Readable on both themes: mixed toward the text color (dark in light mode, light in dark). */
export const tokenInk = (color: string) => `color-mix(in srgb, ${color} 82%, var(--ink))`;
export const tokenWash = (color: string) => `color-mix(in srgb, ${color} 13%, transparent)`;
