import { RENEWAL_NOTICE_DAYS, addDays } from './domain.js';

// Available in every runtime we target (Node 22, browsers, Hermes); declared because this package has no DOM/Node lib.
declare const TextEncoder: new () => { encode(s: string): Uint8Array };

/**
 * iCalendar (.ics) export: free reminders on any phone. Calendar apps (Google, Apple, Outlook) show the
 * alarms as notifications, so no server, no push service and no money are involved.
 */
export interface IcsEvent {
  uid: string;
  /** All-day date, `YYYY-MM-DD`. */
  date: string;
  title: string;
  description?: string;
  /** Alarm this many days before (0 = on the day). */
  alarmDaysBefore?: number;
}

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const day = (iso: string) => iso.replaceAll('-', '');

/** RFC 5545: lines are folded at 75 octets (not characters), continuation lines start with a space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
      limit = 74; // the leading space counts
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(calendarName: string, events: IcsEvent[], stamp = new Date()): string {
  const dtstamp = stamp
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rasikh//Reminders//AR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(calendarName)}`,
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@rasikh`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${day(e.date)}`,
      `DTEND;VALUE=DATE:${day(addDays(e.date, 1))}`,
      `SUMMARY:${esc(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.alarmDaysBefore !== undefined) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(e.title)}`,
        `TRIGGER:-P${e.alarmDaysBefore}D`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export interface IcsLabels {
  payment: string;
  leaseEnd: string;
  renewal: string;
}

/** Events for one lease: every unpaid installment, the renewal-notice date and the lease end. */
export function leaseIcsEvents(
  lease: { id: string; endDate: string; unitLabel?: string; propertyName?: string },
  payments: Array<{ id: string; dueDate: string; amount: number; status: 'due' | 'paid' }>,
  labels: IcsLabels,
): IcsEvent[] {
  const where = [lease.propertyName, lease.unitLabel].filter(Boolean).join(' · ');
  const events: IcsEvent[] = payments
    .filter((p) => p.status === 'due')
    .map((p) => ({
      uid: `pay-${p.id}`,
      date: p.dueDate,
      title: `${labels.payment} ${p.amount}`,
      description: where,
      alarmDaysBefore: 3,
    }));
  events.push({
    uid: `renewal-${lease.id}`,
    date: addDays(lease.endDate, -RENEWAL_NOTICE_DAYS),
    title: labels.renewal,
    description: where,
    alarmDaysBefore: 0,
  });
  events.push({
    uid: `end-${lease.id}`,
    date: lease.endDate,
    title: labels.leaseEnd,
    description: where,
    alarmDaysBefore: 7,
  });
  return events;
}
