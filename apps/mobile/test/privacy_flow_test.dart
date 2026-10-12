import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/account_providers.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/account_repository.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/rk_button.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'helpers/fake_account_repository.dart';
import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_inspection_repository.dart';
import 'helpers/test_env.dart';

void main() {
  late FakeAuthRepository auth;

  Future<void> pump(
    WidgetTester tester,
    TestEnv env,
    FakeAccountRepository account,
    FakeDataFileSharer sharer, {
    SessionUser session = ownerSession,
  }) async {
    FontConfig.webFonts = false;
    SceneConfig.animate = false;
    tester.view.physicalSize = const Size(900, 9000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    auth = FakeAuthRepository(initial: session);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          opsRepositoryProvider.overrideWithValue(env.ops),
          inspectionRepositoryProvider.overrideWithValue(
            FakeInspectionRepository(),
          ),
          accountRepositoryProvider.overrideWithValue(account),
          dataFileSharerProvider.overrideWithValue(sharer),
        ],
        child: const RasikhApp(),
      ),
    );
    await tester.pumpAndSettle();
    await env.tapKey(tester, 'nav-privacy');
  }

  testWidgets('exporting hands the JSON file to the share sheet', (
    tester,
  ) async {
    final env = TestEnv();
    final account = FakeAccountRepository();
    final sharer = FakeDataFileSharer();
    await pump(tester, env, account, sharer);
    await env.tapKey(tester, 'exportData');
    expect(account.calls, ['export']);
    expect(sharer.shared.single.fileName, 'rasikh-my-data.json');
    expect(sharer.shared.single.json, contains('"uid"'));
    expect(find.byKey(const Key('privacyMessage')), findsOneWidget);
  });

  testWidgets(
    'delete needs the confirmation and the password; a wrong password deletes nothing',
    (tester) async {
      final env = TestEnv();
      final account = FakeAccountRepository();
      await pump(tester, env, account, FakeDataFileSharer());

      // disabled until both the password and the confirmation are given
      final btn = find.byKey(const Key('deleteAccount'));
      expect(tester.widget<RkButton>(btn).onPressed, isNull);
      await env.fill(tester, 'deletePassword', 'Ops-pass-2026!');
      expect(tester.widget<RkButton>(btn).onPressed, isNull);
      await env.tapKey(tester, 'deleteSure');

      auth.failNextReauthWith = AuthFailure.invalidCredentials;
      await env.tapKey(tester, 'deleteAccount');
      expect(account.calls, isEmpty);
      expect(find.textContaining('غير صحيحة'), findsOneWidget);

      // the right password deletes and signs the person out
      await env.tapKey(tester, 'deleteAccount');
      expect(account.calls, ['delete']);
      expect(auth.calls, contains('reauthPassword'));
      expect(find.byKey(const Key('deleteAccount')), findsNothing);
    },
  );

  testWidgets(
    'the sole owner of an organization with members is told to hand it over',
    (tester) async {
      final env = TestEnv();
      final account = FakeAccountRepository()
        ..failDeleteWith = AccountFailure.transferOwnershipFirst;
      await pump(tester, env, account, FakeDataFileSharer());
      await env.fill(tester, 'deletePassword', 'Ops-pass-2026!');
      await env.tapKey(tester, 'deleteSure');
      await env.tapKey(tester, 'deleteAccount');
      expect(find.textContaining('انقل الملكية'), findsOneWidget);
    },
  );

  testWidgets('a phone-only account is told to contact support instead', (
    tester,
  ) async {
    final env = TestEnv();
    await pump(
      tester,
      env,
      FakeAccountRepository(),
      FakeDataFileSharer(),
      session: const SessionUser(
        uid: 'u1',
        hasPhone: true,
        orgs: {
          'o': ['owner'],
        },
      ),
    );
    expect(find.byKey(const Key('phoneNote')), findsOneWidget);
    expect(find.byKey(const Key('deleteAccount')), findsNothing);
  });
}
