import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_ops_repository.dart';

Future<FakeAuthRepository> pumpApp(
  WidgetTester tester, {
  SessionUser? initial,
}) async {
  FontConfig.webFonts = false;
  SceneConfig.animate =
      false; // paint the city once so pumpAndSettle can finish
  final repo = FakeAuthRepository(initial: initial);
  tester.view.physicalSize = const Size(900, 1800);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(repo),
        opsRepositoryProvider.overrideWithValue(FakeOpsRepository()),
        calendarExporterProvider.overrideWithValue(FakeCalendarExporter()),
      ],
      child: const RasikhApp(),
    ),
  );
  await tester.pumpAndSettle();
  return repo;
}

Future<void> goToAuth(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('introSkip')));
  await tester.pumpAndSettle();
}

void main() {
  group('intro', () {
    testWidgets('opens in Arabic, right-to-left, with three pages', (
      tester,
    ) async {
      await pumpApp(tester);
      expect(find.text('كل شيء موثّق'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.text('كل شيء موثّق'))),
        TextDirection.rtl,
      );

      await tester.tap(find.byKey(const Key('introNext')));
      await tester.pumpAndSettle();
      expect(find.text('فحص بالصور والتوقيع'), findsOneWidget);

      await tester.tap(find.byKey(const Key('introNext')));
      await tester.pumpAndSettle();
      expect(find.text('يكمّل إيجار'), findsOneWidget);
      expect(
        find.text('ابدأ الآن'),
        findsOneWidget,
      ); // last page offers "get started"
    });

    testWidgets('last page leads to sign-in', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.byKey(const Key('introNext')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('introNext')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('introNext')));
      await tester.pumpAndSettle();
      expect(find.text('ادخل إلى راسخ'), findsOneWidget);
    });

    testWidgets('language switch flips to English LTR', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.text('English'));
      await tester.pumpAndSettle();
      expect(find.text('Everything on record'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.text('Everything on record'))),
        TextDirection.ltr,
      );
    });
  });

  group('auth', () {
    testWidgets(
      'phone tab rejects a non-Saudi number without calling the backend',
      (tester) async {
        final repo = await pumpApp(tester);
        await goToAuth(tester);
        await tester.enterText(find.byKey(const Key('phone')), '1234');
        await tester.tap(find.byKey(const Key('submit')));
        await tester.pumpAndSettle();
        expect(find.text('اكتب رقم جوال سعودي صحيح.'), findsOneWidget);
        expect(repo.calls, isEmpty);
      },
    );

    testWidgets('phone tab sends E.164 number, then asks for the code', (
      tester,
    ) async {
      final repo = await pumpApp(tester);
      await goToAuth(tester);
      await tester.enterText(find.byKey(const Key('phone')), '0512345678');
      await tester.tap(find.byKey(const Key('submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['startPhone:+966512345678']);
      expect(find.byKey(const Key('code')), findsOneWidget);
    });

    testWidgets(
      'email sign-up shows a translated error, then onboarding after success',
      (tester) async {
        final repo = await pumpApp(tester);
        await goToAuth(tester);
        await tester.tap(find.text('البريد الإلكتروني').first);
        await tester.pumpAndSettle();
        await tester.tap(find.text('ما عندك حساب؟ أنشئ حساباً'));
        await tester.pumpAndSettle();
        await tester.enterText(find.byKey(const Key('email')), 'a@b.test');
        await tester.enterText(find.byKey(const Key('password')), 'x');

        repo.failNextAuthWith = AuthFailure.weakPassword;
        await tester.tap(find.byKey(const Key('submit')));
        await tester.pumpAndSettle();
        expect(
          find.text('كلمة المرور قصيرة، استخدم 8 أحرف على الأقل.'),
          findsOneWidget,
        );

        await tester.tap(find.byKey(const Key('submit')));
        await tester.pumpAndSettle();
        expect(
          find.text('عرّفنا بدورك'),
          findsOneWidget,
        ); // no org yet → onboarding
      },
    );
  });

  group('onboarding + shell', () {
    testWidgets(
      'needs a role + consent, then creates the org and lands in the shell',
      (tester) async {
        final repo = await pumpApp(
          tester,
          initial: const SessionUser(uid: 'u1'),
        );
        expect(find.text('عرّفنا بدورك'), findsOneWidget);

        await tester.enterText(find.byKey(const Key('displayName')), 'فيصل');
        await tester.enterText(
          find.byKey(const Key('orgName')),
          'عقارات الشمال',
        );
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
      },
    );

    testWidgets('dock switches between the four destinations', (tester) async {
      await pumpApp(
        tester,
        initial: const SessionUser(
          uid: 'u1',
          orgs: {
            'o': ['owner'],
          },
        ),
      );
      expect(find.text('مساحة العمل'), findsOneWidget);

      await tester.tap(find.byKey(const Key('dock-1')));
      await tester.pumpAndSettle();
      expect(find.text('الخريطة قريباً'), findsOneWidget);

      await tester.tap(find.byKey(const Key('dock-2')));
      await tester.pumpAndSettle();
      expect(find.text('مثال توضيحي'), findsOneWidget);
      expect(find.text('استلام الوحدة'), findsOneWidget);

      await tester.tap(find.byKey(const Key('dock-3')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('themeToggle')), findsOneWidget);
    });

    testWidgets('theme toggle switches dark ↔ light', (tester) async {
      await pumpApp(
        tester,
        initial: const SessionUser(
          uid: 'u1',
          orgs: {
            'o': ['owner'],
          },
        ),
      );
      await tester.tap(find.byKey(const Key('dock-3')));
      await tester.pumpAndSettle();
      Brightness current() =>
          Theme.of(tester.element(find.byKey(const Key('themeToggle'))))
              .brightness;
      expect(current(), Brightness.dark);
      await tester.tap(find.byKey(const Key('themeToggle')));
      await tester.pumpAndSettle();
      expect(current(), Brightness.light);
    });

    testWidgets('sign out returns to sign-in', (tester) async {
      await pumpApp(
        tester,
        initial: const SessionUser(
          uid: 'u1',
          orgs: {
            'o': ['owner'],
          },
        ),
      );
      await tester.tap(find.byKey(const Key('dock-3')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('signOut')));
      await tester.tap(find.byKey(const Key('signOut')));
      await tester.pumpAndSettle();
      expect(find.text('ادخل إلى راسخ'), findsOneWidget);
    });

    testWidgets(
      'gallery (debug builds) renders every component without errors',
      (tester) async {
        await pumpApp(
          tester,
          initial: const SessionUser(
            uid: 'u1',
            orgs: {
              'o': ['owner'],
            },
          ),
        );
        await tester.tap(find.byKey(const Key('dock-3')));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.byKey(const Key('openGallery')));
        await tester.tap(find.byKey(const Key('openGallery')));
        // The gallery has looping loaders/skeletons, so settle manually instead of pumpAndSettle.
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 600));
        expect(find.text('معرض المكوّنات'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });
}
