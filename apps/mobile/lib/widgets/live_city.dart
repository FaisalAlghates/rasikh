import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// Tests switch animation off so frames are painted once and `pumpAndSettle` can finish.
abstract final class SceneConfig {
  static bool animate = true;
}

/// A living Najdi street at dusk, drawn in true one-point perspective (no assets).
///
/// The camera dollies down the street as [progress] goes 0 → 1, the sun sinks, windows light up
/// (every lit window is a documented home), embers drift upward, and the camera sways with the
/// pointer / finger. Mirrors the web hero so the two products feel like one.
class LiveCity extends StatefulWidget {
  const LiveCity({
    super.key,
    this.progress,
    this.fixedProgress = 0.08,
    this.interactive = true,
  });

  /// Drives the story (0..1). When null, [fixedProgress] is used (ambient mode).
  final ValueListenable<double>? progress;
  final double fixedProgress;
  final bool interactive;

  @override
  State<LiveCity> createState() => _LiveCityState();
}

class _LiveCityState extends State<LiveCity>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final _tick = ValueNotifier<int>(0);
  final _state = _CityState();
  Duration _last = Duration.zero;
  bool _animating = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick);
    widget.progress?.addListener(_onProgress);
    _state.target = widget.progress?.value ?? widget.fixedProgress;
    _state.p = _state.target;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final animate =
        SceneConfig.animate && !MediaQuery.disableAnimationsOf(context);
    if (animate && !_animating) {
      _animating = true;
      _ticker.start();
    } else if (!animate && _animating) {
      _animating = false;
      _ticker.stop();
    }
    if (!animate) {
      _state.p = _state.target;
      _tick.value++;
    }
  }

  void _onProgress() {
    _state.target = widget.progress!.value;
    if (!_animating) {
      _state.p = _state.target;
      _tick.value++;
    }
  }

  void _onTick(Duration now) {
    final dt = ((now - _last).inMicroseconds / 1e6).clamp(0.0, 0.1);
    _last = now;
    _state.t = now.inMicroseconds / 1e6;
    _state.p += (_state.target - _state.p) * math.min(1.0, dt * 3.2);
    _state.pointerS = Offset.lerp(
      _state.pointerS,
      _state.pointer,
      math.min(1.0, dt * 4),
    )!;
    _tick.value++;
  }

  @override
  void didUpdateWidget(LiveCity old) {
    super.didUpdateWidget(old);
    if (old.progress != widget.progress) {
      old.progress?.removeListener(_onProgress);
      widget.progress?.addListener(_onProgress);
    }
    if (widget.progress == null) _state.target = widget.fixedProgress;
  }

  @override
  void dispose() {
    widget.progress?.removeListener(_onProgress);
    _ticker.dispose();
    _tick.dispose();
    super.dispose();
  }

  void _setPointer(Offset local, Size size) {
    _state.pointer = Offset(
      (local.dx / size.width * 2 - 1).clamp(-1.0, 1.0),
      (local.dy / size.height * 2 - 1).clamp(-1.0, 1.0),
    );
  }

  @override
  Widget build(BuildContext context) {
    final paint = RepaintBoundary(
      child: CustomPaint(
        painter: _CityPainter(_state, _tick),
        size: Size.infinite,
        isComplex: true,
      ),
    );
    if (!widget.interactive) return ExcludeSemantics(child: paint);
    return ExcludeSemantics(
      child: LayoutBuilder(
        builder: (context, c) {
          final size = Size(c.maxWidth, c.maxHeight);
          return MouseRegion(
            onHover: (e) => _setPointer(e.localPosition, size),
            child: Listener(
              behavior: HitTestBehavior.translucent,
              onPointerMove: (e) => _setPointer(e.localPosition, size),
              child: paint,
            ),
          );
        },
      ),
    );
  }
}

class _CityState {
  double t = 0;
  double p = 0;
  double target = 0;
  Offset pointer = Offset.zero;
  Offset pointerS = Offset.zero;
}

class _Tower {
  const _Tower(
    this.side,
    this.inner,
    this.w,
    this.h,
    this.z,
    this.d,
    this.shade,
    this.seed,
  );
  final int side;
  final double inner, w, h, z, d, shade, seed;
}

List<_Tower> _buildCity() {
  final r = math.Random(11);
  final list = <_Tower>[];
  for (final side in [-1, 1]) {
    for (var row = 0; row < 3; row++) {
      var z = 6 + r.nextDouble() * 5;
      final inner = 7.6 + row * 14 + r.nextDouble() * 2;
      while (z < 250) {
        final w = 4.2 + r.nextDouble() * 5 + row * 1.5;
        final d = 4.5 + r.nextDouble() * 6;
        final h =
            9 +
            r.nextDouble() * 16 +
            row * 9 +
            (z > 90 ? r.nextDouble() * 12 : 0);
        list.add(
          _Tower(
            side,
            inner,
            w,
            h,
            z,
            d,
            0.7 + r.nextDouble() * 0.5,
            r.nextDouble(),
          ),
        );
        z += d + 0.5 + r.nextDouble() * 2.2;
      }
    }
  }
  // far to near so painting order is correct
  list.sort((a, b) => b.z.compareTo(a.z));
  return list;
}

class _Ember {
  const _Ember(this.x, this.y, this.z, this.s);
  final double x, y, z, s;
}

final _city = _buildCity();
final _embers = (() {
  final r = math.Random(5);
  return List.generate(
    70,
    (_) => _Ember(
      (r.nextDouble() - 0.5) * 46,
      r.nextDouble() * 34,
      4 + r.nextDouble() * 150,
      r.nextDouble(),
    ),
  );
})();

const _clayLight = Color(0xFFE8995F);
const _brick = [
  Color(0xFF2B1D16),
  Color(0xFF34241B),
  Color(0xFF3D2B20),
  Color(0xFF241812),
  Color(0xFF31211A),
  Color(0xFF463226),
];

class _CityPainter extends CustomPainter {
  _CityPainter(this.s, Listenable repaint) : super(repaint: repaint);
  final _CityState s;

  static Color _mix(Color a, Color b, double t) =>
      Color.lerp(a, b, t.clamp(0.0, 1.0))!;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final night = _smooth(s.p, 0.5, 1.0);
    final lit = 0.1 + 0.86 * _smooth(s.p, 0.02, 0.95);

    final horizonY = h * 0.46 + s.pointerS.dy * 8;
    final cx = w / 2 - s.pointerS.dx * 6;
    final f = h * 0.52;
    final camZ = s.p * 105 + math.sin(s.t * 0.12) * 1.5;
    final camX = s.pointerS.dx * 1.6 + math.sin(s.t * 0.11) * 0.7;
    const camH = 2.9;

    final horizon = _mix(
      const Color(0xFF6E3820),
      const Color(0xFF2F170D),
      night,
    );
    final top = _mix(const Color(0xFF0B0908), const Color(0xFF060505), night);
    final mid = _mix(const Color(0xFF26160E), const Color(0xFF110908), night);

    // sky
    canvas.drawRect(
      Rect.fromLTWH(0, 0, w, horizonY + 1),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [top, mid, horizon],
          stops: const [0, 0.55, 1],
        ).createShader(Rect.fromLTWH(0, 0, w, horizonY)),
    );
    // sun glow at the end of the street
    final sunC = Offset(cx, horizonY - 2);
    canvas.drawCircle(
      sunC,
      w * (0.55 - night * 0.18),
      Paint()
        ..shader = RadialGradient(
          colors: [
            _clayLight.withValues(alpha: 0.85 * (1 - night * 0.5)),
            _clayLight.withValues(alpha: 0.22 * (1 - night * 0.5)),
            _clayLight.withValues(alpha: 0),
          ],
          stops: const [0, 0.28, 1],
        ).createShader(Rect.fromCircle(center: sunC, radius: w * 0.55)),
    );
    // ground + street leading to the sun
    canvas.drawRect(
      Rect.fromLTWH(0, horizonY, w, h - horizonY),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [horizon, const Color(0xFF100B08)],
          stops: const [0, 0.35],
        ).createShader(Rect.fromLTWH(0, horizonY, w, h - horizonY)),
    );
    final street = Path()
      ..moveTo(cx - 3, horizonY)
      ..lineTo(cx + 3, horizonY)
      ..lineTo(cx + 7.5 * f / 4 + 20, h)
      ..lineTo(cx - 7.5 * f / 4 - 20, h)
      ..close();
    canvas.drawPath(
      street,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFF7A3D22).withValues(alpha: 0.7),
            const Color(0xFF1B110C).withValues(alpha: 0.2),
          ],
        ).createShader(Rect.fromLTWH(0, horizonY, w, h - horizonY)),
    );

    final fog = horizon;
    final litPath = Path();
    final dimPath = Path();

    for (final b in _city) {
      final d = b.z - camZ;
      if (d < 2.2 || d > 230) continue;
      final dEnd = d + b.d;
      final sc = f / d, scEnd = f / dEnd;
      final fogT = 1 - math.exp(-math.pow(0.0105 * d, 2));
      final base = _brick[(b.seed * _brick.length).floor() % _brick.length];
      final front = _mix(base.withValues(alpha: 1), fog, fogT);
      final wall = _mix(
        Color.lerp(base, const Color(0xFF6A4330), 0.45)!,
        fog,
        fogT,
      );

      final xIn = (b.side * b.inner - camX);
      final xOut = (b.side * (b.inner + b.w) - camX);
      double sx(double x, double scale) => cx + x * scale;
      double sy(double y, double scale) => horizonY + (camH - y) * scale;

      // street-facing wall (trapezoid)
      final wallPath = Path()
        ..moveTo(sx(xIn, sc), sy(b.h, sc))
        ..lineTo(sx(xIn, scEnd), sy(b.h, scEnd))
        ..lineTo(sx(xIn, scEnd), sy(0, scEnd))
        ..lineTo(sx(xIn, sc), sy(0, sc))
        ..close();
      canvas.drawPath(wallPath, Paint()..color = wall);

      // camera-facing front wall
      final fl = math.min(sx(xIn, sc), sx(xOut, sc)),
          fr = math.max(sx(xIn, sc), sx(xOut, sc));
      final ft = sy(b.h, sc), fb = sy(0, sc);
      canvas.drawRect(Rect.fromLTRB(fl, ft, fr, fb), Paint()..color = front);

      // shurfa crenellations along the front roof edge
      if (sc > 6) {
        final n = math.max(2, ((fr - fl) / (1.25 * sc)).round());
        final step = (fr - fl) / n;
        final p = Path();
        for (var i = 0; i < n; i++) {
          p
            ..moveTo(fl + i * step + step * 0.12, ft)
            ..lineTo(fl + i * step + step * 0.5, ft - step * 0.62)
            ..lineTo(fl + (i + 1) * step - step * 0.12, ft)
            ..close();
        }
        canvas.drawPath(p, Paint()..color = front);
      }

      // Najdi triangular windows on the street-facing wall
      if (sc > 4 && fogT < 0.85) {
        final rows = ((b.h - 4.5) / 2.5).floor();
        final cols = math.max(1, (b.d / 2.2).floor());
        for (var rr = 0; rr < rows; rr++) {
          final y = 2.4 + rr * 2.5;
          for (var c = 0; c < cols; c++) {
            final k = (b.seed * 997 + rr * 31 + c * 17) % 1.0;
            if (((b.seed * 53 + rr * 7 + c * 13) % 1.0) < 0.12) {
              continue; // plaster gaps
            }
            final u = (c + 0.5) / cols;
            final zz = d + u * b.d;
            final scz = f / zz;
            final px = sx(xIn, scz);
            final py = sy(y, scz);
            final tw = 0.2 * scz, th = 0.66 * scz;
            final path = Path()
              ..moveTo(px - tw * 0.55, py)
              ..lineTo(px + tw * 0.55, py)
              ..lineTo(px, py - th)
              ..close();
            (k < lit ? litPath : dimPath).addPath(path, Offset.zero);
          }
        }
      }
    }

    canvas.drawPath(dimPath, Paint()..color = const Color(0xFF120A07));
    // halo, then the lit windows
    canvas.drawPath(
      litPath,
      Paint()
        ..color = _clayLight.withValues(alpha: 0.28)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5),
    );
    canvas.drawPath(
      litPath,
      Paint()..color = _clayLight.withValues(alpha: 0.95),
    );

    // embers drifting upward
    final emberPaint = Paint();
    for (final e in _embers) {
      final d = e.z - (camZ % 150);
      final dd = d < 2 ? d + 150 : d;
      final sc = f / dd;
      final y = (e.y + s.t * (0.6 + e.s * 1.4)) % 34;
      final ex = cx + (e.x - camX + math.sin(s.t * 0.4 + e.s * 40) * 1.2) * sc;
      final ey = horizonY + (camH - y) * sc;
      if (ex < -10 || ex > w + 10 || ey < -10 || ey > h) continue;
      final a =
          (0.2 +
              0.55 * (0.5 + 0.5 * math.sin(s.t * (1 + e.s * 2) + e.s * 20))) *
          (1 - 1 * (1 - math.exp(-math.pow(0.0105 * dd, 2))));
      emberPaint.color = _clayLight.withValues(alpha: a.clamp(0.0, 0.8));
      canvas.drawCircle(
        Offset(ex, ey),
        (0.7 + e.s * 1.1) * math.min(sc * 0.34, 2.1),
        emberPaint,
      );
    }

    // vignette keeps copy legible
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = RadialGradient(
          center: Alignment(0, 0.1),
          radius: 1.05,
          colors: [
            Colors.transparent,
            const Color(0xFF0B0908).withValues(alpha: 0.6),
          ],
          stops: const [0.4, 1],
        ).createShader(Offset.zero & size),
    );
  }

  static double _smooth(double x, double a, double b) {
    final t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    return t * t * (3 - 2 * t);
  }

  @override
  bool shouldRepaint(_CityPainter old) => false; // repaints via the `repaint` listenable
}
