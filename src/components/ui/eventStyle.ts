import type { CSSProperties } from 'react';

/** Calendar events are hatched (not filled) so they never read as Cortex tasks. */
export function eventHatch(color: string): CSSProperties {
  return {
    backgroundColor: 'var(--surface)',
    backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 22%, transparent) 0 2px, transparent 2px 7px)`,
    border: `1px dashed color-mix(in srgb, ${color} 55%, var(--surface))`,
  };
}
