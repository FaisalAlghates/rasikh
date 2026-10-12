import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/widgets/live_city.dart';

Widget host(Widget child, {bool reduceMotion = false}) => MaterialApp(
  home: MediaQuery(
    data: MediaQueryData(
      size: const Size(390, 844),
      disableAnimations: reduceMotion,
    ),
    child: Scaffold(body: SizedBox.expand(child: child)),
  ),
);

void main() {
  tearDown(() => SceneConfig.animate = false);

  testWidgets('paints the whole story (dusk → night) without errors', (
    tester,
  ) async {
    SceneConfig.animate = false;
    final progress = ValueNotifier<double>(0);
    await tester.pumpWidget(host(LiveCity(progress: progress)));
    for (final p in [0.0, 0.25, 0.5, 0.75, 1.0]) {
      progress.value = p;
      await tester.pump();
    }
    expect(tester.takeException(), isNull);
    progress.dispose();
  });

  testWidgets('animates when allowed: frames keep coming', (tester) async {
    SceneConfig.animate = true;
    await tester.pumpWidget(host(const LiveCity()));
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.hasRunningAnimations, isTrue);
    await tester.pump(const Duration(milliseconds: 500));
    expect(tester.takeException(), isNull);
  });

  testWidgets('reduce motion paints a still frame (no running ticker)', (
    tester,
  ) async {
    SceneConfig.animate = true;
    await tester.pumpWidget(host(const LiveCity(), reduceMotion: true));
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.hasRunningAnimations, isFalse);
  });

  testWidgets('pointer movement does not throw and the scene stays alive', (
    tester,
  ) async {
    SceneConfig.animate = true;
    await tester.pumpWidget(host(const LiveCity()));
    final gesture = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await gesture.addPointer(location: const Offset(10, 10));
    await gesture.moveTo(const Offset(300, 600));
    await tester.pump(const Duration(milliseconds: 200));
    expect(tester.takeException(), isNull);
    await gesture.removePointer();
  });
}
