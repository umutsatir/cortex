import { describe, expect, it } from 'vitest';
import { parseTask } from './parseTask';

// Thursday 2026-11-26, 10:00 local
const now = new Date(2026, 10, 26, 10, 0);
const p = (s: string, monthFirst = false) => parseTask(s, { now, monthFirst });

describe('parseTask', () => {
  it('leaves plain titles alone', () => {
    const r = p('Write the report');
    expect(r).toMatchObject({ title: 'Write the report', date: null, time: null, minutes: null, tokens: [] });
  });

  it('reads the full example', () => {
    const r = p('Call Ali tomorrow 14:00 45m #work !high');
    expect(r).toMatchObject({
      title: 'Call Ali', date: '2026-11-27', time: '14:00', minutes: 45, labelName: 'work', priority: 'high',
    });
    expect(r.tokens.map((t) => t.kind).sort()).toEqual(['date', 'duration', 'label', 'priority', 'time']);
  });

  it('understands Turkish', () => {
    expect(p('Ali\'yi ara yarın saat 3 1 saat #iş !yüksek')).toMatchObject({
      title: 'Ali\'yi ara', date: '2026-11-27', time: '15:00', minutes: 60, labelName: 'iş', priority: 'high',
    });
    expect(p('Spor her gün 07:30')).toMatchObject({ title: 'Spor', recurrence: 'daily', time: '07:30' });
    expect(p('Rapor cumartesi')).toMatchObject({ title: 'Rapor', date: '2026-11-28' });
    expect(p('Pazar alışverişi pazartesi')).toMatchObject({ title: 'Pazar alışverişi', date: '2026-11-30' });
    expect(p('Toplantı 45dk')).toMatchObject({ title: 'Toplantı', minutes: 45 });
    expect(p('Okuma 1.5 saat')).toMatchObject({ title: 'Okuma', minutes: 90, date: null });
  });

  it('parses weekdays, same day counts as today', () => {
    expect(p('Gym thursday').date).toBe('2026-11-26');
    expect(p('Gym friday').date).toBe('2026-11-27');
    expect(p('Gym mon').date).toBe('2026-11-30');
  });

  it('parses numeric and named dates, rolling past ones to next year', () => {
    expect(p('Pay rent 3.12').date).toBe('2026-12-03');
    expect(p('Pay rent 1/2').date).toBe('2027-02-01');
    expect(p('Pay rent 1/2', true).date).toBe('2027-01-02');
    expect(p('Trip 5 jan').date).toBe('2027-01-05');
    expect(p('Trip dec 24').date).toBe('2026-12-24');
    expect(p('Doğum günü 14 şubat').date).toBe('2027-02-14');
  });

  it('tells dotted times from dates', () => {
    expect(p('Meet 14.30')).toMatchObject({ time: '14:30', date: null });
    expect(p('Meet 3pm')).toMatchObject({ time: '15:00' });
    expect(p('Meet 12am').time).toBe('00:00');
    expect(p('Meet at 9:15am').time).toBe('09:15');
  });

  it('parses durations', () => {
    expect(p('Deep work 1h30m').minutes).toBe(90);
    expect(p('Deep work 2h').minutes).toBe(120);
    expect(p('Deep work 90m').minutes).toBe(90);
  });

  it('parses repeats', () => {
    expect(p('Standup every weekday 09:30')).toMatchObject({ title: 'Standup', recurrence: 'weekdays', time: '09:30' });
    expect(p('1:1 every monday')).toMatchObject({ recurrence: 'weekly', date: '2026-11-30' });
    expect(p('Plan week weekly')).toMatchObject({ title: 'Plan week', recurrence: 'weekly' });
    expect(p('Rapor hafta içi').recurrence).toBe('weekdays');
  });

  it('parses priorities', () => {
    expect(p('x !!').priority).toBe('medium');
    expect(p('x !low').priority).toBe('low');
    expect(p('Fix login p1')).toMatchObject({ title: 'Fix login', priority: 'high' });
    expect(p('x P2').priority).toBe('medium');
    expect(p('x p3').priority).toBe('low');
    expect(p('Read chapter p12').priority).toBe(null);
  });

  it('keeps text that is only keywords', () => {
    expect(p('tomorrow')).toMatchObject({ title: 'tomorrow', date: null });
  });

  it('does not eat words inside other words', () => {
    expect(p('Monday.com sync').date).toBe(null);
    expect(p('Buy a todayish gift').date).toBe(null);
  });

  it('reports where each keyword is in the input', () => {
    const input = 'Call Ali tomorrow 14:00 #work';
    const r = p(input);
    for (const tok of r.tokens) expect(input.slice(tok.start, tok.end)).toBe(tok.text);
    expect(r.tokens.find((x) => x.kind === 'time')).toMatchObject({ start: 18, end: 23 });
  });

  it('reads am/pm in all the usual spellings', () => {
    expect(p('Call 10.30pm')).toMatchObject({ title: 'Call', time: '22:30' });
    expect(p('Call 10:30 PM').time).toBe('22:30');
    expect(p('Call 10 p.m.').time).toBe('22:00');
    expect(p('Call 7.15am').time).toBe('07:15');
    expect(p('Call 10.11pm')).toMatchObject({ time: '22:11', date: null });
    expect(p('Call tomorrow 9pm')).toMatchObject({ title: 'Call', date: '2026-11-27', time: '21:00' });
  });

  it('reads Turkish parts of the day', () => {
    expect(p('Spor akşam 8')).toMatchObject({ title: 'Spor', time: '20:00' });
    expect(p('Kahvaltı sabah 9:30').time).toBe('09:30');
    expect(p('Yemek öğlen 1').time).toBe('13:00');
    expect(p('Uyku gece 11').time).toBe('23:00');
    expect(p('Ders öğleden sonra 3').time).toBe('15:00');
    expect(p('Toplantı yarın akşam 7.30')).toMatchObject({ title: 'Toplantı', date: '2026-11-27', time: '19:30' });
  });

  it('reads relative dates', () => {
    // now: Thursday 2026-11-26
    expect(p('Call mom in 3 days')).toMatchObject({ title: 'Call mom', date: '2026-11-29' });
    expect(p('Annemi ara 3 gün sonra')).toMatchObject({ title: 'Annemi ara', date: '2026-11-29' });
    expect(p('Rapor iki hafta sonra').date).toBe('2026-12-10');
    expect(p('Renew in a month').date).toBe('2026-12-26');
    expect(p('Pay 2 weeks later').date).toBe('2026-12-10');
    expect(p('Gym next week').date).toBe('2026-12-03');
    expect(p('Spor haftaya').date).toBe('2026-12-03');
    expect(p('Review next friday').date).toBe('2026-12-04');
    expect(p('Toplantı haftaya salı 10:00')).toMatchObject({ title: 'Toplantı', date: '2026-12-01', time: '10:00' });
    expect(p('Fatura gelecek ay').date).toBe('2026-12-26');
    expect(p('Read 3 days of notes').date).toBe(null);
  });
});
