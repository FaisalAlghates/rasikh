import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/building_providers.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/app/ticket_providers.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_building_repository.dart';
import 'helpers/fake_inspection_repository.dart';
import 'helpers/fake_ticket_repository.dart';
import 'helpers/test_env.dart';

void main() {
  Future<void> pump(
    WidgetTester tester,
    TestEnv env,
    FakeBuildingRepository repo,
    FakePhotoPicker picker,
    FakeTicketRepository tickets,
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
            FakeAuthRepository(initial: ownerSession),
          ),
          opsRepositoryProvider.overrideWithValue(env.ops),
          inspectionRepositoryProvider.overrideWithValue(
            FakeInspectionRepository(),
          ),
          ticketRepositoryProvider.overrideWithValue(tickets),
          buildingRepositoryProvider.overrideWithValue(repo),
          photoPickerProvider.overrideWithValue(picker),
        ],
        child: const RasikhApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'members, receipt-backed expense, balances, quotes, vote and statement',
    (tester) async {
      final env = TestEnv();
      final repo = FakeBuildingRepository();
      final picker = FakePhotoPicker();
      await pump(tester, env, repo, picker, FakeTicketRepository());
      await env.tapKey(tester, 'nav-buildings');

      await env.fill(tester, 'buildingName', 'عمارة الجمعية');
      await env.tapKey(tester, 'addBuilding');
      expect(find.byKey(const Key('buildingBoard')), findsOneWidget);

      Future<void> member(String n, String u, String s) async {
        await env.fill(tester, 'mName', n);
        await env.fill(tester, 'mUnit', u);
        await env.fill(tester, 'mShare', s);
        await env.tapKey(tester, 'addMember');
      }

      await member('سالم', '1', '60');
      expect(
        find.byKey(const Key('sharesWarn')),
        findsOneWidget,
      ); // 60% is not 100%
      await member('نورة', '2', '40');
      expect(find.byKey(const Key('sharesWarn')), findsNothing);
      expect(repo.calls, containsAll(['member:6000', 'member:4000']));

      // an expense needs a receipt
      await env.fill(tester, 'eTitle', 'صيانة المصعد');
      await env.fill(tester, 'eAmount', '1000');
      await env.tapKey(tester, 'addExpense');
      expect(find.text('أرفق إيصال المصروف.'), findsOneWidget);
      expect(repo.calls.any((c) => c.startsWith('expense')), isFalse);
      await env.tapKey(tester, 'pickReceipt');
      await env.tapKey(tester, 'addExpense');
      expect(repo.calls, contains('expense:1000.0'));

      expect(find.textContaining('المستحق 600'), findsOneWidget);
      expect(find.textContaining('المستحق 400'), findsOneWidget);

      await env.fill(tester, 'cAmount', '250');
      await env.tapKey(tester, 'addContribution');
      expect(
        find.textContaining('المتبقي 350'),
        findsOneWidget,
      ); // first member (60%): 600 - 250

      // quotes: cheapest first
      await env.fill(tester, 'qReq', 'طلاء الواجهة');
      await env.fill(tester, 'qVendor', 'شركة أ');
      await env.fill(tester, 'qAmount', '5200');
      await env.tapKey(tester, 'addQuote');
      await env.fill(tester, 'qVendor', 'شركة ب');
      await env.fill(tester, 'qAmount', '4800');
      await env.tapKey(tester, 'addQuote');
      expect(find.textContaining('شركة ب'), findsOneWidget);
      expect(
        tester.widget<Text>(find.byKey(const Key('quote-cheapest'))).data,
        contains('شركة ب'),
      );
      expect(
        tester.widget<Text>(find.byKey(const Key('quote-other'))).data,
        contains('+400'),
      );

      // vote: both units yes → majority passes
      await env.fill(tester, 'vTitle', 'اعتماد عرض الطلاء');
      await env.tapKey(tester, 'addVote');
      final id = find
          .byWidgetPredicate((w) => w.key.toString().contains('voteResult-'))
          .evaluate()
          .single
          .widget
          .key
          .toString();
      expect(find.textContaining('مفتوح'), findsWidgets);
      await env.tapFinder(tester, find.widgetWithText(OutlinedButton, 'موافق'));
      await env.tapFinder(tester, find.widgetWithText(OutlinedButton, 'موافق'));
      expect(find.textContaining('أُقرّ'), findsOneWidget);
      expect(id, isNotEmpty);

      // statement
      expect(
        tester.widget<Text>(find.byKey(const Key('stmt-expenses'))).data,
        contains('1,000'),
      );
      expect(
        tester.widget<Text>(find.byKey(const Key('stmt-net'))).data,
        contains('-750'),
      );
    },
  );
}
