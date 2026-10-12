import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';
import 'package:rasikh/widgets/rk_button.dart';
import 'package:rasikh/widgets/rk_overlays.dart';
import 'package:rasikh/widgets/rk_surfaces.dart';
import 'package:rasikh/widgets/shurfa_loader.dart';

Widget host(
  Widget child, {
  bool highContrast = false,
  bool reduceMotion = false,
}) {
  FontConfig.webFonts = false;
  SceneConfig.animate =
      false; // paint the city once so pumpAndSettle can finish
  return MaterialApp(
    theme: buildTheme(Brightness.dark, arabic: true),
    home: MediaQuery(
      data: MediaQueryData(
        highContrast: highContrast,
        disableAnimations: reduceMotion,
      ),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

void main() {
  testWidgets('RkButton: loading disables taps and shows the loader', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(
      host(RkButton(label: 'حفظ', loading: true, onPressed: () => taps++)),
    );
    await tester.tap(find.byType(FilledButton), warnIfMissed: false);
    expect(taps, 0);
    expect(find.byType(ShurfaLoader), findsOneWidget);
  });

  testWidgets('RkButton: enabled button fires onPressed', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
      host(RkButton(label: 'حفظ', onPressed: () => taps++)),
    );
    await tester.tap(find.text('حفظ'));
    expect(taps, 1);
  });

  testWidgets('RkIconButton exposes its label to accessibility', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      host(RkIconButton(icon: Icons.add, label: 'أضف وحدة', onPressed: () {})),
    );
    expect(find.bySemanticsLabel('أضف وحدة'), findsOneWidget);
    handle.dispose();
  });

  testWidgets(
    'GlassPanel blurs normally and falls back to solid in high-contrast mode',
    (tester) async {
      await tester.pumpWidget(host(const GlassPanel(child: Text('x'))));
      expect(
        find.byWidgetPredicate(
          (w) => w is BackdropFilter && w.filter is ImageFilter,
        ),
        findsOneWidget,
      );

      await tester.pumpWidget(
        host(const GlassPanel(child: Text('x')), highContrast: true),
      );
      await tester.pump();
      expect(find.byType(BackdropFilter), findsNothing);
    },
  );

  testWidgets('ShurfaLoader stops animating when reduce-motion is on', (
    tester,
  ) async {
    await tester.pumpWidget(host(const ShurfaLoader(), reduceMotion: true));
    // pumpAndSettle only returns when no animation is scheduled.
    await tester.pumpAndSettle(const Duration(seconds: 1));

    await tester.pumpWidget(host(const ShurfaLoader()));
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.hasRunningAnimations, isTrue);
  });

  testWidgets('RkTabs reports the tapped index', (tester) async {
    var index = 0;
    await tester.pumpWidget(
      host(
        StatefulBuilder(
          builder: (context, set) => RkTabs(
            semanticLabel: 'عرض',
            labels: const ['الوحدات', 'العقود'],
            index: index,
            onChanged: (i) => set(() => index = i),
          ),
        ),
      ),
    );
    await tester.tap(find.text('العقود'));
    await tester.pumpAndSettle();
    expect(index, 1);
  });

  testWidgets('toast shows its message', (tester) async {
    await tester.pumpWidget(
      host(
        Builder(
          builder: (context) => TextButton(
            onPressed: () => showRkToast(
              context,
              'تم حفظ التغييرات',
              tone: RkToastTone.success,
            ),
            child: const Text('go'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('go'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('تم حفظ التغييرات'), findsOneWidget);
  });

  testWidgets('Timeline renders one node per event in order', (tester) async {
    await tester.pumpWidget(
      host(
        const RkTimeline(
          semanticLabel: 'سجل',
          events: [
            TimelineEvent(title: 'أ', date: '2026-01-05'),
            TimelineEvent(title: 'ب', date: '2026-06-18'),
          ],
        ),
      ),
    );
    expect(find.text('أ'), findsOneWidget);
    expect(find.text('ب'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('أ')).dy,
      lessThan(tester.getTopLeft(find.text('ب')).dy),
    );
  });

  testWidgets(
    'ArchImage clips to an arch: top corners cut, bottom corners kept',
    (tester) async {
      await tester.pumpWidget(
        host(
          const SizedBox(
            width: 120,
            child: ArchImage(child: ColoredBox(color: Colors.red)),
          ),
        ),
      );
      final clip = tester.widget<ClipPath>(find.byType(ClipPath));
      final path = clip.clipper!.getClip(const Size(120, 160));
      expect(
        path.contains(const Offset(2, 2)),
        isFalse,
      ); // top-left corner is cut away
      expect(
        path.contains(const Offset(2, 158)),
        isTrue,
      ); // bottom-left corner stays
      expect(path.contains(const Offset(60, 20)), isTrue); // crown of the arch
    },
  );
}
