import 'dart:convert';

import 'domain.dart';

// Dart port of packages/shared/src/ics.ts. Free reminders: calendar apps show the alarms as notifications,
// so no server, push service or money is involved. test/ics_test.dart mirrors the TS fixtures.

class IcsEvent {
  const IcsEvent({
    required this.uid,
    required this.date,
    required this.title,
    this.description,
    this.alarmDaysBefore,
  });
  final String uid;

  /// All-day date, `YYYY-MM-DD`.
  final String date;
  final String title;
  final String? description;

  /// Alarm this many days before (0 = on the day).
  final int? alarmDaysBefore;
}

String _esc(String s) => s
    .replaceAll(r'\', r'\\')
    .replaceAll(';', r'\;')
    .replaceAll(',', r'\,')
    .replaceAll(RegExp(r'\r?\n'), r'\n');

String _day(String iso) => iso.replaceAll('-', '');

/// RFC 5545: lines fold at 75 octets (not characters); continuation lines start with a space.
String foldLine(String line) {
  if (utf8.encode(line).length <= 75) return line;
  final out = <String>[];
  final cur = StringBuffer();
  var bytes = 0;
  var limit = 75;
  for (final rune in line.runes) {
    final ch = String.fromCharCode(rune);
    final n = utf8.encode(ch).length;
    if (bytes + n > limit) {
      out.add(cur.toString());
      cur.clear();
      bytes = 0;
      limit = 74; // the leading space counts
    }
    cur.write(ch);
    bytes += n;
  }
  out.add(cur.toString());
  return out.join('\r\n ');
}

String buildIcs(String calendarName, List<IcsEvent> events, [DateTime? stamp]) {
  final dtstamp = (stamp ?? DateTime.now())
      .toUtc()
      .toIso8601String()
      .replaceAll(RegExp(r'[-:]'), '')
      .replaceFirst(RegExp(r'\.\d+'), '');
  final lines = <String>[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rasikh//Reminders//AR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:${_esc(calendarName)}',
  ];
  for (final e in events) {
    lines.addAll([
      'BEGIN:VEVENT',
      'UID:${e.uid}@rasikh',
      'DTSTAMP:$dtstamp',
      'DTSTART;VALUE=DATE:${_day(e.date)}',
      'DTEND;VALUE=DATE:${_day(addDays(e.date, 1))}',
      'SUMMARY:${_esc(e.title)}',
    ]);
    if (e.description != null && e.description!.isNotEmpty) {
      lines.add('DESCRIPTION:${_esc(e.description!)}');
    }
    if (e.alarmDaysBefore != null) {
      lines.addAll([
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:${_esc(e.title)}',
        'TRIGGER:-P${e.alarmDaysBefore}D',
        'END:VALARM',
      ]);
    }
    lines.add('END:VEVENT');
  }
  lines.add('END:VCALENDAR');
  return '${lines.map(foldLine).join('\r\n')}\r\n';
}

class IcsLabels {
  const IcsLabels({
    required this.payment,
    required this.leaseEnd,
    required this.renewal,
  });
  final String payment, leaseEnd, renewal;
}

class IcsPayment {
  const IcsPayment(this.id, this.dueDate, this.amount, this.paid);
  final String id, dueDate;
  final double amount;
  final bool paid;
}

String _amount(double a) =>
    a == a.roundToDouble() ? a.toInt().toString() : a.toString();

/// Events for one lease: every unpaid installment, the renewal-notice date and the lease end.
List<IcsEvent> leaseIcsEvents({
  required String leaseId,
  required String endDate,
  String? unitLabel,
  String? propertyName,
  required List<IcsPayment> payments,
  required IcsLabels labels,
}) {
  final where = [
    propertyName,
    unitLabel,
  ].where((s) => s != null && s.isNotEmpty).join(' · ');
  return [
    for (final p in payments)
      if (!p.paid)
        IcsEvent(
          uid: 'pay-${p.id}',
          date: p.dueDate,
          title: '${labels.payment} ${_amount(p.amount)}',
          description: where,
          alarmDaysBefore: 3,
        ),
    IcsEvent(
      uid: 'renewal-$leaseId',
      date: renewalNoticeDate(endDate),
      title: labels.renewal,
      description: where,
      alarmDaysBefore: 0,
    ),
    IcsEvent(
      uid: 'end-$leaseId',
      date: endDate,
      title: labels.leaseEnd,
      description: where,
      alarmDaysBefore: 7,
    ),
  ];
}
