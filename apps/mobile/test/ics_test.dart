import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/domain/ics.dart';

// Same fixtures as packages/shared/src/ics.test.ts.
void main() {
  final stamp = DateTime.utc(2026, 10, 12);

  test('builds a CRLF-terminated calendar with all-day events and alarms', () {
    final ics = buildIcs('راسخ', const [
      IcsEvent(
        uid: 'a',
        date: '2026-11-01',
        title: 'دفعة 3500',
        alarmDaysBefore: 3,
      ),
    ], stamp);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n'), isTrue);
    expect(ics.endsWith('END:VCALENDAR\r\n'), isTrue);
    expect(ics, contains('DTSTART;VALUE=DATE:20261101'));
    expect(ics, contains('DTEND;VALUE=DATE:20261102'));
    expect(ics, contains('TRIGGER:-P3D'));
    expect(ics, contains('DTSTAMP:20261012T000000Z'));
    expect(RegExp(r'[^\r]\n').hasMatch(ics), isFalse); // only CRLF breaks
  });

  test('escapes commas, semicolons and newlines', () {
    final ics = buildIcs('x', const [
      IcsEvent(
        uid: 'a',
        date: '2026-11-01',
        title: 'a,b;c',
        description: 'l1\nl2',
      ),
    ], stamp);
    expect(ics, contains(r'SUMMARY:a\,b\;c'));
    expect(ics, contains(r'DESCRIPTION:l1\nl2'));
  });

  test('folds long lines at 75 octets, Arabic included', () {
    final long = 'DESCRIPTION:${'عقار' * 40}';
    final folded = foldLine(long);
    for (final part in folded.split('\r\n')) {
      expect(utf8.encode(part).length, lessThanOrEqualTo(75));
    }
    expect(folded.replaceAll('\r\n ', ''), long);
  });

  test('lease events: unpaid installments, renewal 60 days out, lease end', () {
    final ev = leaseIcsEvents(
      leaseId: 'L',
      endDate: '2027-01-01',
      unitLabel: 'شقة 3',
      propertyName: 'النخيل',
      payments: const [
        IcsPayment('p1', '2026-11-01', 3500, false),
        IcsPayment('p0', '2026-10-01', 3500, true),
      ],
      labels: const IcsLabels(
        payment: 'دفعة',
        leaseEnd: 'نهاية العقد',
        renewal: 'إشعار التجديد',
      ),
    );
    expect(ev.map((e) => e.uid), ['pay-p1', 'renewal-L', 'end-L']);
    expect(ev.firstWhere((e) => e.uid == 'renewal-L').date, '2026-11-02');
    expect(ev.first.title, 'دفعة 3500');
  });
}
