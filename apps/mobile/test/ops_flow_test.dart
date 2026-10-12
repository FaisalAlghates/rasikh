import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/domain/domain.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';
import 'package:rasikh/widgets/rk_button.dart';

import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_ops_repository.dart';

Future<void> pumpOps(
  WidgetTester tester, {
  required SessionUser session,
  required FakeOpsRepository ops,
  required FakeCalendarExporter calendar,
}) async {
  FontConfig.webFonts = false;
  SceneConfig.animate = false;
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(initial: session),
        ),
        opsRepositoryProvider.overrideWithValue(ops),
        calendarExporterProvider.overrideWithValue(calendar),
      ],
      child: const RasikhApp(),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final f = find.byKey(Key(key));
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}

Future<void> tapButton(WidgetTester tester, String label) async {
  final f = find.widgetWithText(RkButton, label);
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}

Future<void> fill(WidgetTester tester, String key, String text) async {
  await tester.enterText(find.byKey(Key(key)), text);
  await tester.pump();
}

void main() {
  // The lease starts next year so the schedule is entirely in the future, whatever day the suite runs.
  final year = int.parse(riyadhToday().substring(0, 4));
  final start = '${year + 1}-01-01';
  final end = '${year + 2}-01-01';

  group('owner', () {
    testWidgets(
      'adds a property, a unit and a lease; records a payment; exports the calendar',
      (tester) async {
        final ops = FakeOpsRepository();
        final calendar = FakeCalendarExporter();
        await pumpOps(
          tester,
          session: const SessionUser(
            uid: 'owner1',
            orgs: {
              'o': ['owner'],
            },
          ),
          ops: ops,
          calendar: calendar,
        );

        // empty portfolio
        expect(find.byKey(const Key('stat-units')), findsOneWidget);
        expect(find.byKey(const Key('reminders')), findsOneWidget);
        expect(find.text('لا توجد تنبيهات.'), findsOneWidget);

        // property
        await tapKey(tester, 'nav-properties');
        expect(find.text('ما أضفت عقارات بعد.'), findsOneWidget);
        await tapKey(tester, 'addProperty');
        expect(find.text('هذا الحقل مطلوب'), findsOneWidget);
        expect(ops.calls, isEmpty);

        await fill(tester, 'propName', 'برج النخيل');
        await fill(tester, 'propDistrict', 'النرجس');
        await tapKey(tester, 'addProperty');
        expect(ops.calls, ['addProperty:برج النخيل']);
        expect(find.text('لا توجد وحدات.'), findsOneWidget);

        // unit
        await tester.enterText(
          find.widgetWithText(TextField, 'رقم أو اسم الوحدة'),
          'شقة 3',
        );
        await tester.pump();
        await tapButton(tester, 'أضف وحدة');
        expect(ops.calls.last, 'addUnit:شقة 3');
        expect(find.textContaining('شقة 3 · شقة'), findsOneWidget);

        // lease form: validation first
        await tapButton(tester, 'أضف عقداً');
        await tapKey(tester, 'saveLease');
        expect(
          find.text('رقم عقد إيجار من 6 إلى 30 حرفاً أو رقماً'),
          findsOneWidget,
        );
        expect(find.text('اكتب مبلغاً صحيحاً أكبر من صفر'), findsOneWidget);
        expect(ops.calls.where((c) => c.startsWith('createLease')), isEmpty);

        await fill(tester, 'ejarNo', '10203040');
        await fill(tester, 'tenantName', 'سالم');
        await fill(tester, 'tenantEmail', 'salem@test.sa');
        await fill(tester, 'startDate', start);
        await fill(tester, 'endDate', end);
        await fill(tester, 'annualRent', '42000');

        // Riyadh rent freeze: a raise over the previous rent is flagged, never blocked
        expect(find.byKey(const Key('freeze-warning')), findsNothing);
        await fill(tester, 'previousRent', '40000');
        expect(find.byKey(const Key('freeze-warning')), findsOneWidget);
        expect(find.textContaining('40,000'), findsOneWidget);

        await tapKey(tester, 'saveLease');
        expect(ops.calls.last, 'createLease:10203040');
        expect(ops.leasesNow.single.data.tenantEmail, 'salem@test.sa');

        // lease detail with the 12-month schedule
        expect(find.byKey(const Key('lease-card')), findsOneWidget);
        expect(find.text('10203040 · $start → $end'), findsOneWidget);
        expect(find.byKey(Key('pay-$start')), findsOneWidget);
        expect(find.byKey(Key('markPaid-$start')), findsOneWidget);
        expect(find.byKey(const Key('inviteTenant')), findsOneWidget);

        await tapKey(tester, 'markPaid-$start');
        expect(ops.calls.last, startsWith('markPaid:'));
        expect(find.byKey(Key('markPaid-$start')), findsNothing);
        expect(find.text('مدفوعة'), findsOneWidget);

        // invite again from the lease page
        await tapKey(tester, 'inviteTenant');
        expect(ops.calls.last, 'invite:salem@test.sa');

        // free calendar export: unpaid installments only
        await tapKey(tester, 'addToCalendar');
        final ics = calendar.exports.single;
        expect(ics.fileName, 'rasikh-10203040.ics');
        expect(ics.ics, contains('BEGIN:VCALENDAR'));
        expect(ics.ics, contains('TRIGGER:-P3D'));
        expect(
          ics.ics,
          contains('DTSTART;VALUE=DATE:${year + 1}0201'),
        ); // second installment
        expect(
          ics.ics,
          isNot(contains('DTSTART;VALUE=DATE:${year + 1}0101')),
        ); // the paid one is gone

        // back to the portfolio: the summary reflects the new records
        await tapKey(tester, 'back');
        await tapKey(tester, 'back');
        expect(
          find.descendant(
            of: find.byKey(const Key('stat-units')),
            matching: find.byType(Semantics),
          ),
          findsWidgets,
        );
        expect(
          tester.getSemantics(find.byKey(const Key('stat-units'))).label,
          contains('1'),
        );
        expect(
          tester.getSemantics(find.byKey(const Key('stat-leases'))).label,
          contains('1'),
        );

        // expenses: one property, so it is preselected
        await tapKey(tester, 'nav-expenses');
        await tapKey(tester, 'addExpense');
        expect(find.text('اكتب مبلغاً صحيحاً أكبر من صفر'), findsOneWidget);
        await fill(tester, 'expenseAmount', '450');
        await fill(tester, 'expenseNote', 'سباكة');
        await tapKey(tester, 'addExpense');
        expect(ops.calls.last, 'addExpense:450.0');
        expect(find.textContaining('450 ر.س'), findsOneWidget);
        await tapKey(tester, 'back');

        // yearly report: this year holds the expense, next year holds the rent
        await tapKey(tester, 'nav-report');
        expect(find.text('$year'), findsOneWidget);
        expect(
          tester.getSemantics(find.byKey(const Key('rep-expenses'))).label,
          contains('450'),
        );
        await tapKey(tester, 'yearNext');
        expect(find.text('${year + 1}'), findsOneWidget);
        String label(String key) =>
            tester.getSemantics(find.byKey(Key(key))).label;
        expect(label('rep-expected'), contains('42,000'));
        expect(label('rep-collected'), contains('3,500'));
        expect(label('rep-outstanding'), contains('38,500'));
        expect(label('rep-net'), contains('3,500'));
      },
    );

    testWidgets('a failed write shows an error and keeps the form', (
      tester,
    ) async {
      final ops = FakeOpsRepository()..failWrites = true;
      await pumpOps(
        tester,
        session: const SessionUser(
          uid: 'owner1',
          orgs: {
            'o': ['owner'],
          },
        ),
        ops: ops,
        calendar: FakeCalendarExporter(),
      );
      await tapKey(tester, 'nav-properties');
      await fill(tester, 'propName', 'برج النخيل');
      await tapKey(tester, 'addProperty');
      expect(find.text('تعذّر الحفظ. حاول مرة أخرى.'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(
              find.descendant(
                of: find.byKey(const Key('propName')),
                matching: find.byType(TextField),
              ),
            )
            .controller!
            .text,
        'برج النخيل',
      );
    });
  });

  group('tenant', () {
    testWidgets('sees only their lease, with reminders and no staff actions', (
      tester,
    ) async {
      final ops = FakeOpsRepository();
      // Started 45 days ago and paid monthly: the first two installments are overdue, the next is soon.
      ops.seedLease(
        tenantUid: 'tenant1',
        start: addDays(riyadhToday(), -45),
        end: addDays(riyadhToday(), 320),
      );
      ops.seedLease(
        tenantUid: 'someone-else',
        property: 'برج آخر',
        unit: 'شقة 9',
      );
      final calendar = FakeCalendarExporter();
      await pumpOps(
        tester,
        session: const SessionUser(
          uid: 'tenant1',
          orgs: {
            'o': ['tenant'],
          },
        ),
        ops: ops,
        calendar: calendar,
      );

      expect(find.byKey(const Key('lease-card')), findsOneWidget);
      expect(find.textContaining('برج النخيل'), findsWidgets);
      expect(find.textContaining('برج آخر'), findsNothing);
      expect(find.byKey(const Key('nav-properties')), findsNothing);
      expect(find.byKey(const Key('inviteTenant')), findsNothing);
      expect(
        find.byWidgetPredicate((w) => w.key.toString().contains('markPaid-')),
        findsNothing,
      );

      // computed on the device from the schedule: overdue installments are flagged
      expect(find.text('لا توجد تنبيهات.'), findsNothing);
      expect(
        find.byWidgetPredicate(
          (w) => w.key.toString().contains('reminder-paymentLate'),
        ),
        findsWidgets,
      );

      await tapKey(tester, 'addToCalendar');
      expect(calendar.exports, hasLength(1));
      expect(calendar.exports.single.fileName, 'rasikh-10203040.ics');
    });

    testWidgets('without a lease, shows an empty state', (tester) async {
      await pumpOps(
        tester,
        session: const SessionUser(
          uid: 'tenant1',
          orgs: {
            'o': ['tenant'],
          },
        ),
        ops: FakeOpsRepository(),
        calendar: FakeCalendarExporter(),
      );
      expect(find.text('لا توجد عقود.'), findsOneWidget);
      expect(find.byKey(const Key('lease-card')), findsNothing);
    });
  });
}
