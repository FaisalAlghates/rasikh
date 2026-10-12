import { describe, expect, it } from 'vitest';
import { buildIcs, foldLine, leaseIcsEvents } from './ics.js';

describe('ics', () => {
  const stamp = new Date('2026-10-12T00:00:00Z');

  it('builds a valid, CRLF-terminated calendar with all-day events and alarms', () => {
    const ics = buildIcs(
      'راسخ',
      [{ uid: 'a', date: '2026-11-01', title: 'دفعة 3500', alarmDaysBefore: 3 }],
      stamp,
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261101');
    expect(ics).toContain('DTEND;VALUE=DATE:20261102');
    expect(ics).toContain('TRIGGER:-P3D');
    expect(ics).toContain('DTSTAMP:20261012T000000Z');
    expect(ics.includes('\n') && !/[^\r]\n/.test(ics)).toBe(true); // only CRLF line breaks
  });

  it('escapes commas, semicolons and newlines', () => {
    const ics = buildIcs(
      'x',
      [{ uid: 'a', date: '2026-11-01', title: 'a,b;c', description: 'l1\nl2' }],
      stamp,
    );
    expect(ics).toContain('SUMMARY:a\\,b\\;c');
    expect(ics).toContain('DESCRIPTION:l1\\nl2');
  });

  it('folds long lines at 75 octets, including Arabic (multi-byte) text', () => {
    const long = 'DESCRIPTION:' + 'عقار'.repeat(40);
    const folded = foldLine(long);
    for (const part of folded.split('\r\n')) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replaceAll('\r\n ', '')).toBe(long); // unfolds back to the original
  });

  it('lease events: unpaid installments, renewal notice 60 days out, lease end', () => {
    const ev = leaseIcsEvents(
      { id: 'L', endDate: '2027-01-01', unitLabel: 'شقة 3', propertyName: 'النخيل' },
      [
        { id: 'p1', dueDate: '2026-11-01', amount: 3500, status: 'due' },
        { id: 'p0', dueDate: '2026-10-01', amount: 3500, status: 'paid' },
      ],
      { payment: 'دفعة', leaseEnd: 'نهاية العقد', renewal: 'إشعار التجديد' },
    );
    expect(ev.map((e) => e.uid)).toEqual(['pay-p1', 'renewal-L', 'end-L']);
    expect(ev.find((e) => e.uid === 'renewal-L')!.date).toBe('2026-11-02');
  });
});
