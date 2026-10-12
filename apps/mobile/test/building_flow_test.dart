import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/building_providers.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/data/building_repository.dart';
import 'package:rasikh/data/ops_models.dart' show Doc;
import 'package:rasikh/data/photo_picker.dart';
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
    FakeTicketRepository tickets, [
    SessionUser session = ownerSession,
  ]) async {
    FontConfig.webFonts = false;
    SceneConfig.animate = false;
    tester.view.physicalSize = const Size(900, 9000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initial: session),
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
      // link the first owner to an account by email
      await env.fill(tester, 'linkEmail-1', 'salem@test.sa');
      await env.tapKey(tester, 'linkOwner-1');
      expect(repo.calls, contains('link:salem@test.sa'));
      expect(find.byKey(const Key('linked-1')), findsOneWidget);
      expect(find.byKey(const Key('linked-2')), findsNothing);
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
  testWidgets(
    'a linked unit owner sees their balance and votes for their own unit only',
    (tester) async {
      final env = TestEnv();
      final repo = FakeBuildingRepository();
      await repo.addBuilding('o', 'عمارة الملاك');
      await repo.addMember('o', 'b1', const BMember('سالم', '1', 6000));
      await repo.addMember('o', 'b1', const BMember('نورة', '2', 4000));
      await repo.addExpense(
        'o',
        'b1',
        'صيانة المصعد',
        1000,
        '2026-10-01',
        PickedFile(Uint8List(1), 'r.jpg', 'image/jpeg'),
      );
      await repo.addContribution(
        'o',
        'b1',
        const BContribution('m3', 100, '2026-10-02'),
      );
      await repo.addVote('o', 'b1', 'اعتماد الميزانية', 'majority');
      repo.linked.add(
        Doc('o_b1', const BMembership('o', 'b1', 'm3', 'عمارة الملاك')),
      );
      await pump(
        tester,
        env,
        repo,
        FakePhotoPicker(),
        FakeTicketRepository(),
        const SessionUser(
          uid: 'unit1',
          orgs: {
            'o': ['building_owner'],
          },
        ),
      );
      await env.tapKey(tester, 'nav-my-buildings');
      // the second unit (40%) owes 400, has paid 100
      expect(
        tester.widget<Text>(find.byKey(const Key('myBalance'))).data,
        contains('300'),
      );
      expect(find.byKey(const Key('ownerExpense-e4')), findsOneWidget);
      expect(find.byKey(const Key('addExpense')), findsNothing); // read only
      await env.tapFinder(tester, find.widgetWithText(OutlinedButton, 'موافق'));
      expect(repo.calls, contains('ballot:yes'));
      expect(
        find.widgetWithText(OutlinedButton, 'موافق'),
        findsNothing,
      ); // one ballot per unit
      expect(find.textContaining('موافق 1'), findsOneWidget);
    },
  );
}
