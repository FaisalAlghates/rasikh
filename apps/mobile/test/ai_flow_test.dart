import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/ai_providers.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/ai_repository.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'helpers/fake_ai_repository.dart';
import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_inspection_repository.dart';
import 'helpers/test_env.dart';

void main() {
  Future<void> pump(
    WidgetTester tester,
    TestEnv env,
    FakeAiRepository ai,
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
          aiRepositoryProvider.overrideWithValue(ai),
        ],
        child: const RasikhApp(),
      ),
    );
    await tester.pumpAndSettle();
    await env.tapKey(tester, 'nav-assistant');
  }

  testWidgets('an answer is marked as AI-made and shows its sources', (
    tester,
  ) async {
    final env = TestEnv();
    final ai = FakeAiRepository();
    await pump(tester, env, ai);
    await env.fill(tester, 'aiQuestion', 'كم عقداً عندي؟');
    await env.tapKey(tester, 'aiSend');
    expect(ai.asked.single.feature, 'assistant');
    expect(ai.asked.single.input['question'], 'كم عقداً عندي؟');
    expect(find.byKey(const Key('aiBadge')), findsOneWidget);
    expect(find.textContaining('مُولَّد بالذكاء الاصطناعي'), findsOneWidget);
    expect(find.text('عدد العقود المتاحة لك: 1'), findsOneWidget);
    expect(find.textContaining('عقد 10203040'), findsOneWidget);
  });

  testWidgets('a refusal is shown as the polite message, never as an answer', (
    tester,
  ) async {
    final env = TestEnv();
    final ai = FakeAiRepository()
      ..respond = (_, _) =>
          const AiRefused('أقدر أساعدك في أمور العقار داخل راسخ فقط.');
    await pump(tester, env, ai);
    await env.fill(tester, 'aiQuestion', 'اكتب لي قصيدة');
    await env.tapKey(tester, 'aiSend');
    expect(find.byKey(const Key('aiRefused')), findsOneWidget);
    expect(find.byKey(const Key('aiAnswer')), findsNothing);
    expect(find.byKey(const Key('aiBadge')), findsNothing);
  });

  testWidgets('disclaimers are shown with the answer', (tester) async {
    final env = TestEnv();
    final ai = FakeAiRepository()
      ..respond = (_, _) => const AiAnswer(
        label: 'مُولَّد بالذكاء الاصطناعي، راجعه قبل الاعتماد',
        text: 'شرح عام',
        citations: [],
        disclaimers: ['هذا شرح عام وليس رأياً قانونياً.'],
      );
    await pump(tester, env, ai);
    await env.fill(tester, 'aiQuestion', 'هل يحق لي قانونياً إنهاء العقد؟');
    await env.tapKey(tester, 'aiSend');
    expect(find.byKey(const Key('aiDisclaimer')), findsOneWidget);
  });

  testWidgets('limits and outages are explained in Arabic', (tester) async {
    final env = TestEnv();
    final ai = FakeAiRepository()..failWith = AiFailure.dailyLimit;
    await pump(tester, env, ai);
    await env.fill(tester, 'aiQuestion', 'كم دفعة متأخرة؟');
    await env.tapKey(tester, 'aiSend');
    expect(find.textContaining('اليومي'), findsOneWidget);

    ai.failWith = AiFailure.unavailable;
    await env.tapKey(tester, 'aiSend');
    expect(find.textContaining('غير متاح'), findsOneWidget);
  });
}
