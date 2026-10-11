import 'package:flutter/material.dart';

/// Static dusk scene (Najdi mud-brick towers, shurfa tops, clay-lit horizon).
/// Same artwork as the web hero; replaced by the live 3D map in Phase 3.
class HeroScene extends StatelessWidget {
  const HeroScene({super.key, this.arch = false, this.focusX = 0.5});

  /// Crop used inside the Najdi arch mask.
  final bool arch;

  /// Which part of a too-wide scene stays visible: 0 = left edge, 1 = right edge.
  final double focusX;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: CustomPaint(
        painter: _ScenePainter(arch: arch, focusX: focusX),
        size: Size.infinite,
      ),
    );
  }
}

class _Block {
  const _Block(this.x, this.w, this.h, [this.windows = const []]);
  final double x, w, h;
  final List<(double, double)> windows;
}

const _far = [
  _Block(40, 70, 210),
  _Block(150, 56, 300),
  _Block(250, 90, 180),
  _Block(420, 60, 360),
  _Block(540, 100, 230),
  _Block(700, 64, 280),
  _Block(1000, 80, 250),
  _Block(1130, 58, 340),
  _Block(1240, 96, 200),
  _Block(1400, 70, 300),
  _Block(1500, 70, 190),
];

const _near = [
  _Block(-20, 210, 250, [(40, 70), (110, 70), (40, 140), (110, 140)]),
  _Block(230, 160, 330, [
    (40, 60),
    (100, 60),
    (40, 130),
    (100, 130),
    (40, 200),
    (100, 200),
  ]),
  _Block(430, 130, 200, [(30, 60), (80, 60), (30, 120)]),
  _Block(1020, 150, 290, [(35, 60), (90, 60), (35, 130), (90, 130), (35, 200)]),
  _Block(1210, 200, 220, [(40, 60), (110, 60), (40, 130), (110, 130)]),
  _Block(1450, 190, 340, [
    (40, 60),
    (105, 60),
    (40, 130),
    (105, 130),
    (40, 200),
    (105, 200),
  ]),
];

class _ScenePainter extends CustomPainter {
  _ScenePainter({required this.arch, required this.focusX});
  final bool arch;
  final double focusX;

  static const _w = 1600.0, _h = 900.0, _ground = 850.0, _k = 0.8;

  @override
  void paint(Canvas canvas, Size size) {
    final view = arch
        ? const Rect.fromLTWH(170, 260, 480, 640)
        : const Rect.fromLTWH(0, 0, _w, _h);
    // "slice" fit, anchored bottom-center.
    final scale = size.width / view.width > size.height / view.height
        ? size.width / view.width
        : size.height / view.height;
    final dx = (size.width - view.width * scale) * focusX;
    final dy = size.height - view.height * scale;
    canvas
      ..save()
      ..clipRect(Offset.zero & size)
      ..translate(dx, dy)
      ..scale(scale)
      ..translate(-view.left, -view.top);

    // Sky + horizon glow (drawn well past the view so slices never show gaps).
    const full = Rect.fromLTWH(-800, -400, _w + 1600, _h + 800);
    canvas.drawRect(
      full,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0E0D0B), Color(0xFF1F1511), Color(0xFF5A2C1B)],
          stops: [0, 0.62, 1],
        ).createShader(const Rect.fromLTWH(0, 0, _w, _h)),
    );
    canvas.drawCircle(
      const Offset(_w * 0.62, _h * 0.86),
      _w * 0.5,
      Paint()
        ..shader =
            const RadialGradient(colors: [Color(0x8CD9825A), Color(0x00D9825A)])
                .createShader(
                  Rect.fromCircle(
                    center: const Offset(_w * 0.62, _h * 0.86),
                    radius: _w * 0.5,
                  ),
                ),
    );

    final farPaint = Paint()..color = const Color(0xFF2A1A14);
    for (final b in _far) {
      canvas.drawRect(
        Rect.fromLTWH(b.x, _ground - b.h * _k, b.w, b.h * _k),
        farPaint,
      );
    }

    final nearPaint = Paint()..color = const Color(0xFF150F0C);
    final windowPaint = Paint()..color = const Color(0xBFD9825A);
    for (final b in _near) {
      final top = _ground - b.h * _k;
      canvas.drawRect(Rect.fromLTWH(b.x, top, b.w, b.h * _k), nearPaint);
      final n = (b.w / 20).floor().clamp(1, 100);
      final step = b.w / n;
      for (var i = 0; i < n; i++) {
        canvas.drawPath(
          Path()
            ..moveTo(b.x + i * step, top)
            ..relativeLineTo(step / 2, -step * 0.7)
            ..relativeLineTo(step / 2, step * 0.7)
            ..close(),
          nearPaint,
        );
      }
      for (final (wx, wy) in b.windows) {
        canvas.drawPath(
          Path()
            ..moveTo(b.x + wx, top + wy + 22)
            ..relativeLineTo(7, -18)
            ..relativeLineTo(7, 18)
            ..close(),
          windowPaint,
        );
      }
    }
    canvas.drawRect(
      const Rect.fromLTWH(-800, _ground, _w + 1600, _h - _ground + 400),
      Paint()..color = const Color(0xFF0E0D0B),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ScenePainter old) =>
      old.arch != arch || old.focusX != focusX;
}
