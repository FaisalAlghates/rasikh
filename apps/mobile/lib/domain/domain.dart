// Dart port of packages/shared/src/domain.ts. Keep the two in sync: test/domain_test.dart uses the same
// fixtures as packages/shared/src/domain.test.ts.

enum PaymentCycle { monthly, quarterly, semiannual, annual }

int _monthsPer(PaymentCycle c) => switch (c) {
  PaymentCycle.monthly => 1,
  PaymentCycle.quarterly => 3,
  PaymentCycle.semiannual => 6,
  PaymentCycle.annual => 12,
};

DateTime _utc(String iso) {
  final p = iso.split('-').map(int.parse).toList();
  return DateTime.utc(p[0], p[1], p[2]);
}

String _iso(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String addDays(String iso, int days) =>
    _iso(_utc(iso).add(Duration(days: days)));

int daysBetween(String from, String to) =>
    _utc(to).difference(_utc(from)).inDays;

/// Adds calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb).
String addMonths(String iso, int months) {
  final p = iso.split('-').map(int.parse).toList();
  final total = p[0] * 12 + (p[1] - 1) + months;
  final y = total ~/ 12;
  final m = total % 12;
  final last = DateTime.utc(y, m + 2, 0).day;
  return _iso(DateTime.utc(y, m + 1, p[2] < last ? p[2] : last));
}

class Installment {
  const Installment(this.dueDate, this.amount);
  final String dueDate;
  final double amount;

  @override
  bool operator ==(Object other) =>
      other is Installment &&
      other.dueDate == dueDate &&
      other.amount == amount;
  @override
  int get hashCode => Object.hash(dueDate, amount);
  @override
  String toString() => '$dueDate:$amount';
}

/// Splits the rent over the term in halalas; the last installment absorbs rounding.
List<Installment> buildSchedule({
  required String startDate,
  required String endDate,
  required double annualRent,
  required PaymentCycle cycle,
}) {
  final step = _monthsPer(cycle);
  final dates = <String>[];
  for (var i = 0; ; i++) {
    final d = addMonths(startDate, i * step);
    if (d.compareTo(endDate) >= 0) break;
    dates.add(d);
  }
  final days = _utc(endDate).difference(_utc(startDate)).inDays;
  final termMonths = ((days / 365.25) * 12).round().clamp(1, 1 << 30);
  final total = (annualRent * 100 * termMonths / 12).round();
  final each = total ~/ dates.length;
  return [
    for (var i = 0; i < dates.length; i++)
      Installment(
        dates[i],
        (i == dates.length - 1 ? total - each * (dates.length - 1) : each) /
            100,
      ),
  ];
}

const riyadhFreezeFrom = '2025-09-25';
const riyadhFreezeUntil = '2030-09-25';
const renewalNoticeDays = 60;

bool _isRiyadh(String city) => RegExp(
  r'(^|\s)(riyadh|الرياض)(\s|$)',
  caseSensitive: false,
).hasMatch(city.trim());

/// Warns (never blocks) when a Riyadh renewal raises the rent during the freeze. Not a legal ruling.
({bool warn, double? maxAnnualRent}) rentFreezeCheck({
  required String city,
  required double previousAnnualRent,
  required double newAnnualRent,
  required String newStartDate,
}) {
  final inWindow =
      newStartDate.compareTo(riyadhFreezeFrom) >= 0 &&
      newStartDate.compareTo(riyadhFreezeUntil) < 0;
  if (!_isRiyadh(city) || !inWindow) return (warn: false, maxAnnualRent: null);
  return (
    warn: newAnnualRent > previousAnnualRent,
    maxAnnualRent: previousAnnualRent,
  );
}

String renewalNoticeDate(String endDate) =>
    addDays(endDate, -renewalNoticeDays);

enum ReminderKind { paymentUpcoming, paymentLate, leaseExpiring, renewalNotice }

class Reminder {
  const Reminder(
    this.key,
    this.kind,
    this.leaseId,
    this.days, [
    this.paymentId,
  ]);
  final String key;
  final ReminderKind kind;
  final String leaseId;
  final String? paymentId;
  final int days;
}

class LeaseRef {
  const LeaseRef(this.id, this.endDate, [this.status]);
  final String id, endDate;
  final String? status;
}

class PaymentRef {
  const PaymentRef(this.id, this.leaseId, this.dueDate, this.paid);
  final String id, leaseId, dueDate;
  final bool paid;
}

List<Reminder> computeReminders(
  String today,
  List<LeaseRef> leases,
  List<PaymentRef> payments, {
  int upcomingDays = 7,
  int expiringDays = 30,
}) {
  final out = <Reminder>[];
  for (final p in payments) {
    if (p.paid) continue;
    final days = daysBetween(today, p.dueDate);
    if (days < 0) {
      out.add(
        Reminder(
          'late:${p.id}:$today',
          ReminderKind.paymentLate,
          p.leaseId,
          days,
          p.id,
        ),
      );
    } else if (days <= upcomingDays) {
      out.add(
        Reminder(
          'upcoming:${p.id}',
          ReminderKind.paymentUpcoming,
          p.leaseId,
          days,
          p.id,
        ),
      );
    }
  }
  for (final l in leases) {
    if (l.status == 'ended') continue;
    final left = daysBetween(today, l.endDate);
    if (left < 0) continue;
    if (left <= renewalNoticeDays && left > expiringDays) {
      out.add(
        Reminder('renewal:${l.id}', ReminderKind.renewalNotice, l.id, left),
      );
    }
    if (left <= expiringDays) {
      out.add(
        Reminder('expiring:${l.id}', ReminderKind.leaseExpiring, l.id, left),
      );
    }
  }
  return out;
}

class YearTotals {
  const YearTotals(
    this.expected,
    this.collected,
    this.outstanding,
    this.expenses,
    this.net,
  );
  final double expected, collected, outstanding, expenses, net;
}

double _r(double n) => (n * 100).round() / 100;

YearTotals yearTotals(
  int year,
  List<({String dueDate, double amount, bool paid})> payments,
  List<({String date, double amount})> expenses,
) {
  final ps = payments.where((p) => p.dueDate.startsWith('$year-')).toList();
  final expected = ps.fold<double>(0, (s, p) => s + p.amount);
  final collected = ps
      .where((p) => p.paid)
      .fold<double>(0, (s, p) => s + p.amount);
  final spent = expenses
      .where((e) => e.date.startsWith('$year-'))
      .fold<double>(0, (s, e) => s + e.amount);
  return YearTotals(
    _r(expected),
    _r(collected),
    _r(expected - collected),
    _r(spent),
    _r(collected - spent),
  );
}

/// Today's date in Riyadh (UTC+3, no daylight saving).
String riyadhToday([DateTime? now]) =>
    _iso((now ?? DateTime.now().toUtc()).toUtc().add(const Duration(hours: 3)));
