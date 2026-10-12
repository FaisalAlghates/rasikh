import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/domain/domain.dart';

// Same fixtures as packages/shared/src/domain.test.ts, so the Dart port cannot drift from the TS source.
void main() {
  test('addMonths clamps to the end of the month', () {
    expect(addMonths('2026-01-31', 1), '2026-02-28');
    expect(addMonths('2028-01-31', 1), '2028-02-29');
    expect(addMonths('2026-11-15', 3), '2027-02-15');
  });

  test('days arithmetic', () {
    expect(addDays('2026-03-01', -1), '2026-02-28');
    expect(daysBetween('2026-01-01', '2026-03-01'), 59);
  });

  group('buildSchedule', () {
    List<Installment> s(
      PaymentCycle c, {
      double rent = 42000,
      String end = '2027-01-01',
    }) => buildSchedule(
      startDate: '2026-01-01',
      endDate: end,
      annualRent: rent,
      cycle: c,
    );

    test('monthly: 12 x 3,500', () {
      final r = s(PaymentCycle.monthly);
      expect(r, hasLength(12));
      expect(r.first, const Installment('2026-01-01', 3500));
      expect(r.last.dueDate, '2026-12-01');
    });
    test('counts per cycle', () {
      expect(s(PaymentCycle.quarterly), hasLength(4));
      expect(s(PaymentCycle.semiannual), hasLength(2));
      expect(s(PaymentCycle.annual), [const Installment('2026-01-01', 42000)]);
    });
    test('adds up exactly', () {
      final r = s(PaymentCycle.monthly, rent: 10000);
      expect(
        r.fold<double>(0, (a, i) => a + i.amount).toStringAsFixed(2),
        '10000.00',
      );
    });
    test('multi-year', () {
      final r = s(PaymentCycle.quarterly, rent: 24000, end: '2028-01-01');
      expect(r, hasLength(8));
      expect(r.fold<double>(0, (a, i) => a + i.amount).round(), 48000);
    });
  });

  group('Riyadh freeze', () {
    ({bool warn, double? maxAnnualRent}) r({
      String city = 'الرياض',
      double next = 44000,
      String start = '2026-06-01',
    }) => rentFreezeCheck(
      city: city,
      previousAnnualRent: 40000,
      newAnnualRent: next,
      newStartDate: start,
    );
    test('warns on an increase inside the window', () {
      expect(r().warn, isTrue);
      expect(r().maxAnnualRent, 40000);
      expect(r(city: 'Riyadh').warn, isTrue);
    });
    test('no warning otherwise', () {
      expect(r(next: 40000).warn, isFalse);
      expect(r(city: 'جدة').warn, isFalse);
      expect(r(start: '2025-09-01').warn, isFalse);
      expect(r(start: '2030-09-25').warn, isFalse);
    });
  });

  test('renewal notice is 60 days before the end', () {
    expect(renewalNoticeDate('2026-12-31'), '2026-11-01');
  });

  test('reminders: upcoming, late, expiring, renewal', () {
    final rs = computeReminders(
      '2026-10-12',
      const [
        LeaseRef('a', '2026-11-20'),
        LeaseRef('b', '2026-10-30'),
        LeaseRef('c', '2027-06-01'),
      ],
      const [
        PaymentRef('p1', 'a', '2026-10-15', false),
        PaymentRef('p2', 'a', '2026-10-01', false),
        PaymentRef('p3', 'a', '2026-10-14', true),
        PaymentRef('p4', 'c', '2026-12-01', false),
      ],
    );
    final kinds = rs
        .map((x) => '${x.kind.name}:${x.paymentId ?? x.leaseId}')
        .toSet();
    expect(
      kinds,
      containsAll([
        'paymentUpcoming:p1',
        'paymentLate:p2',
        'renewalNotice:a',
        'leaseExpiring:b',
      ]),
    );
    expect(
      kinds.any(
        (k) => k.endsWith(':p3') || k.endsWith(':p4') || k.endsWith(':c'),
      ),
      isFalse,
    );
  });

  test('yearTotals', () {
    final t = yearTotals(
      2026,
      const [
        (dueDate: '2026-01-01', amount: 3500.0, paid: true),
        (dueDate: '2026-02-01', amount: 3500.0, paid: false),
        (dueDate: '2027-01-01', amount: 3500.0, paid: false),
      ],
      const [
        (date: '2026-03-03', amount: 500.0),
        (date: '2025-03-03', amount: 900.0),
      ],
    );
    expect(
      [t.expected, t.collected, t.outstanding, t.expenses, t.net],
      [7000, 3500, 3500, 500, 3000],
    );
  });

  test('riyadhToday is UTC+3', () {
    expect(riyadhToday(DateTime.utc(2026, 10, 11, 22)), '2026-10-12');
  });
}
