// Timebox grid geometry and "HH:MM" helpers shared by the timebox, drag & drop and layout.

export const START_HOUR = 6;
export const END_HOUR = 24;
export const HOUR_PX = 60;
export const LABEL_W = 48;
export const SLOT_MIN = 15;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → "HH:MM", clamped to the last minute of the day. */
export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(min, 24 * 60 - 1));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/** Vertical pixel offset of a minute-of-day inside the timebox grid. */
export function minutesToOffset(min: number): number {
  return ((min - START_HOUR * 60) / 60) * HOUR_PX;
}

export function timeToOffset(time: string): number {
  return minutesToOffset(timeToMinutes(time));
}

export interface Span<T> {
  item: T;
  start: number; // minutes
  end: number;   // minutes
}

export interface Placed<T> extends Span<T> {
  col: number;
  totalCols: number;
}

/**
 * Assigns overlapping spans to side-by-side columns. Each span's `totalCols` is the
 * number of columns used by the spans it overlaps, so blocks only shrink when needed.
 */
export function layoutColumns<T>(spans: Span<T>[]): Placed<T>[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  // Zero-length spans still occupy their minimum visual height.
  const visEnd = (s: Span<T>) => Math.max(s.end, s.start + SLOT_MIN);
  const colEnds: number[] = [];
  const cols = sorted.map((s) => {
    let col = colEnds.findIndex((e) => e <= s.start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = visEnd(s);
    return col;
  });
  return sorted.map((s, i) => {
    let maxCol = cols[i];
    for (let j = 0; j < sorted.length; j++) {
      if (sorted[j].start < visEnd(s) && visEnd(sorted[j]) > s.start) maxCol = Math.max(maxCol, cols[j]);
    }
    return { ...s, col: cols[i], totalCols: maxCol + 1 };
  });
}
