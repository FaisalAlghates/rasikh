import 'package:flutter/material.dart';

/// Three stacked Najdi shurfa triangles forming a solid base.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 32, this.color});
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      excludeSemantics: true,
      child: CustomPaint(
        size: Size.square(size),
        painter: _MarkPainter(color ?? Theme.of(context).colorScheme.secondary),
      ),
    );
  }
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 32;
    final paint = Paint()..color = color;
    Path tri(
      double ax,
      double ay,
      double bx,
      double by,
      double cx,
      double cy,
    ) => Path()
      ..moveTo(ax * s, ay * s)
      ..lineTo(bx * s, by * s)
      ..lineTo(cx * s, cy * s)
      ..close();
    canvas.drawPath(tri(16, 2, 22, 10, 10, 10), paint);
    canvas.drawPath(tri(16, 11.5, 25, 21, 7, 21), paint);
    canvas.drawPath(tri(16, 22.5, 28, 30, 4, 30), paint);
  }

  @override
  bool shouldRepaint(_MarkPainter old) => old.color != color;
}

/// Thin shurfa (crenellation) divider.
class ShurfaDivider extends StatelessWidget {
  const ShurfaDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        height: 10,
        width: double.infinity,
        child: CustomPaint(
          painter: _ShurfaPainter(
            Theme.of(context).colorScheme.secondary.withValues(alpha: 0.6),
          ),
        ),
      ),
    );
  }
}

class _ShurfaPainter extends CustomPainter {
  _ShurfaPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    for (double x = 0; x < size.width; x += 16) {
      canvas.drawPath(
        Path()
          ..moveTo(x, size.height)
          ..lineTo(x + 8, 0)
          ..lineTo(x + 16, size.height)
          ..close(),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ShurfaPainter old) => old.color != color;
}
