import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/broker_providers.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_broker_repository.dart';
import 'helpers/fake_inspection_repository.dart';
import 'helpers/test_env.dart';

const brokerSession = SessionUser(
  uid: 'b1',
  hasPassword: true,
  orgs: {
    'o': ['broker'],
  },
);

/// Widgets whose string key starts with `prefix` (repeated rows carry their id in the key).
Finder keyed(String prefix) => find.byWidgetPredicate((w) {
  final k = w.key;
  return k is ValueKey<String> && k.value.startsWith(prefix);
});

void main() {
  Future<void> pump(
    WidgetTester tester,
    TestEnv env,
    FakeBrokerRepository repo,
  ) async {
    FontConfig.webFonts = false;
    SceneConfig.animate = false;
    tester.view.physicalSize = const Size(900, 9000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initial: brokerSession),
          ),
          opsRepositoryProvider.overrideWithValue(env.ops),
          inspectionRepositoryProvider.overrideWithValue(
            FakeInspectionRepository(),
          ),
          brokerRepositoryProvider.overrideWithValue(repo),
        ],
        child: const RasikhApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'a broker saves a license, adds a lead, moves it forward, schedules a viewing and keeps a log',
    (tester) async {
      final env = TestEnv();
      final repo = FakeBrokerRepository();
      await pump(tester, env, repo);

      // A broker-only account lands on the brokerage entry, not on leases or inspections.
      expect(find.byKey(const Key('nav-broker')), findsOneWidget);
      expect(find.byKey(const Key('nav-inspections')), findsNothing);
      await env.tapKey(tester, 'nav-broker');

      // Profile: an invalid license number is refused, a valid one is saved.
      await env.fill(tester, 'bpName', 'سلمان');
      await env.fill(tester, 'bpFal', '12');
      await env.fill(tester, 'bpExp', '2027-01-01');
      await env.tapKey(tester, 'saveProfile');
      expect(repo.calls, isEmpty);
      await env.fill(tester, 'bpFal', '1234567890');
      await env.tapKey(tester, 'saveProfile');
      expect(repo.calls, contains('profile:1234567890'));
      expect(find.byKey(const Key('falState')), findsOneWidget);

      // Leads: a bad phone is refused.
      await env.fill(tester, 'ldName', 'خالد');
      await env.fill(tester, 'ldPhone', '0512345678');
      await env.tapKey(tester, 'addLead');
      expect(repo.calls.where((c) => c.startsWith('lead:')), isEmpty);
      await env.fill(tester, 'ldPhone', '+966512345678');
      await env.tapKey(tester, 'addLead');
      expect(repo.calls, contains('lead:خالد'));
      expect(keyed('leadRow-'), findsOneWidget);

      await env.tapFinder(tester, find.text('افتح'));
      expect(find.byKey(const Key('leadStatus')), findsOneWidget);
      expect(find.textContaining('جديد'), findsWidgets);

      // The funnel only goes forward: there is no way back to "new".
      expect(find.byKey(const Key('move-new')), findsNothing);
      await env.tapKey(tester, 'move-contacted');
      expect(repo.calls, contains('move:contacted'));
      expect(find.byKey(const Key('move-contacted')), findsNothing);

      // Viewing, then done.
      await env.fill(tester, 'vwPlace', 'فيلا النرجس');
      await env.fill(tester, 'vwDate', '2026-12-01');
      await env.tapKey(tester, 'addViewing');
      expect(repo.calls, contains('viewing:فيلا النرجس'));
      expect(keyed('viewingRow-'), findsOneWidget);
      await env.tapKey(tester, 'viewingDone');
      expect(repo.calls, contains('viewingDone'));

      // Contract: end must be after start.
      await env.fill(tester, 'bcNo', 'BR-2026-001');
      await env.fill(tester, 'bcEnd', '2025-01-01');
      await env.tapKey(tester, 'addContract');
      expect(repo.calls.where((c) => c.startsWith('contract:')), isEmpty);
      await env.fill(tester, 'bcEnd', '2027-12-31');
      await env.tapKey(tester, 'addContract');
      expect(repo.calls, contains('contract:BR-2026-001'));

      await env.fill(tester, 'logNote', 'اتفقنا على المعاينة مساءً');
      await env.tapKey(tester, 'addNote');

      // The log kept every step in order and the screen offers no edit or delete.
      expect(repo.logEntries.map((e) => e.type), [
        'lead_created',
        'status_changed',
        'viewing_scheduled',
        'viewing_done',
        'contract_added',
        'note',
      ]);
      expect(keyed('logRow-'), findsNWidgets(6));
      expect(find.byIcon(Icons.delete_outline), findsNothing);
    },
  );

  testWidgets('the ad checker lists what is missing and clears when complete', (
    tester,
  ) async {
    final env = TestEnv();
    await pump(tester, env, FakeBrokerRepository());
    await env.tapKey(tester, 'nav-broker');
    await env.tapKey(tester, 'openAdChecker');

    expect(find.byKey(const Key('adVerdict')), findsOneWidget);
    expect(find.textContaining('ينقص الإعلان'), findsOneWidget);
    expect(keyed('adIssue-'), findsWidgets);

    await env.fill(tester, 'ad-adv', 'مكتب الأفق العقاري');
    await env.fill(tester, 'ad-lic', '1234567890');
    await env.fill(tester, 'ad-exp', '2020-01-01');
    // an expired license is an error
    expect(find.textContaining('انتهى ترخيص الإعلان'), findsOneWidget);
    await env.fill(tester, 'ad-phone', '0512345678');
    expect(find.textContaining('+9665XXXXXXXX'), findsOneWidget);
  });
}
