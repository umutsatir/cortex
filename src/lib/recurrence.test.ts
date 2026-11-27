import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './recurrence';

describe('nextOccurrence', () => {
  it('moves forward one step from today', () => {
    expect(nextOccurrence('daily', '2026-11-26', '2026-11-26')).toBe('2026-11-27');
    expect(nextOccurrence('weekly', '2026-11-26', '2026-11-26')).toBe('2026-12-03');
  });
  it('skips weekends for weekdays', () => {
    expect(nextOccurrence('weekdays', '2026-11-27', '2026-11-27')).toBe('2026-11-30'); // Fri → Mon
  });
  it('never lands in the past', () => {
    expect(nextOccurrence('daily', '2026-11-20', '2026-11-26')).toBe('2026-11-26');
    expect(nextOccurrence('weekly', '2026-11-02', '2026-11-26')).toBe('2026-11-30');
  });
});
