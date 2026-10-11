import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/theme/app_theme.dart';

import 'helpers/fake_auth_repository.dart';

Future<FakeAuthRepository> pumpApp(WidgetTester tester, {SessionUser? initial}) async {
  FontConfig.webFonts = false;
  final repo = FakeAuthRepository(initial: initial);
  tester.view.physicalSize = const Size(900, 1800);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [authRepositoryProvider.overrideWithValue(repo)],
      child: const RasikhApp(),
    ),
  );
  await tester.pumpAndSettle();
  return repo;
}

void main() {
  testWidgets('opens in Arabic, right-to-left', (tester) async {
    await pumpApp(tester);
    expect(find.text('عقارك على أرض ثابتة'), findsNothing); // tagline is not on home
    expect(find.text('ابدأ الآن'), findsOneWidget);
    final dir = Directionality.of(tester.element(find.text('ابدأ الآن')));
    expect(dir, TextDirection.rtl);
  });

  testWidgets('language switch flips to English LTR', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    expect(find.text('Get started'), findsOneWidget);
    expect(Directionality.of(tester.element(find.text('Get started'))), TextDirection.ltr);
  });

  testWidgets('phone tab rejects a non-Saudi number without calling the backend', (tester) async {
    final repo = await pumpApp(tester);
    await tester.tap(find.text('ابدأ الآن'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('phone')), '1234');
    await tester.tap(find.byKey(const Key('submit')));
    await tester.pumpAndSettle();
    expect(find.text('اكتب رقم جوال سعودي صحيح.'), findsOneWidget);
    expect(repo.calls, isEmpty);
  });

  testWidgets('phone tab sends E.164 number, then asks for the code', (tester) async {
    final repo = await pumpApp(tester);
    await tester.tap(find.text('ابدأ الآن'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('phone')), '0512345678');
    await tester.tap(find.byKey(const Key('submit')));
    await tester.pumpAndSettle();
    expect(repo.calls, ['startPhone:+966512345678']);
    expect(find.byKey(const Key('code')), findsOneWidget);
  });

  testWidgets('email sign-up shows a translated error, then onboarding after success', (tester) async {
    final repo = await pumpApp(tester);
    await tester.tap(find.text('ابدأ الآن'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('البريد الإلكتروني').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('ما عندك حساب؟ أنشئ حساباً'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('email')), 'a@b.test');
    await tester.enterText(find.byKey(const Key('password')), 'x');

    repo.failNextAuthWith = AuthFailure.weakPassword;
    await tester.tap(find.byKey(const Key('submit')));
    await tester.pumpAndSettle();
    expect(find.text('كلمة المرور قصيرة، استخدم 8 أحرف على الأقل.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('submit')));
    await tester.pumpAndSettle();
    expect(find.text('عرّفنا بدورك'), findsOneWidget); // no org yet → onboarding
  });

  testWidgets('onboarding needs a role + consent, then creates the org and lands in the workspace',
      (tester) async {
    final repo = await pumpApp(tester, initial: const SessionUser(uid: 'u1'));
    expect(find.text('عرّفنا بدورك'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('displayName')), 'فيصل');
    await tester.enterText(find.byKey(const Key('orgName')), 'عقارات الشمال');
    await tester.pump();

    await tester.tap(find.byKey(const Key('submitOrg')));
    await tester.pumpAndSettle();
    expect(find.text('اختر دوراً واحداً على الأقل.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('role-owner')));
    await tester.tap(find.byKey(const Key('role-broker')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('submitOrg')));
    await tester.pumpAndSettle();
    expect(find.text('الموافقة مطلوبة للمتابعة.'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('consent')));
    await tester.tap(find.byKey(const Key('consent')));
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('submitOrg')));
    await tester.tap(find.byKey(const Key('submitOrg')));
    await tester.pumpAndSettle();

    expect(repo.lastOrgRequest!['roles'], ['owner', 'broker']);
    expect(repo.lastOrgRequest!['locale'], 'ar');
    expect(find.text('مساحة العمل'), findsOneWidget);
    expect(find.byKey(const Key('role-chip-owner')), findsOneWidget);
    expect(find.byKey(const Key('role-chip-broker')), findsOneWidget);
  });

  testWidgets('signed-out users cannot reach the workspace', (tester) async {
    await pumpApp(tester);
    // A signed-out session stays on the home screen (public) and never shows the workspace.
    expect(find.text('مساحة العمل'), findsNothing);
  });
}
