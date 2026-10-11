import 'package:flutter/material.dart';

import '../theme/rasikh_tokens.g.dart';

/// Loading indicator: four crenellation triangles rising in sequence.
/// Honors "reduce motion": shows static triangles instead.
class ShurfaLoader extends StatefulWidget {
  const ShurfaLoader({super.key, this.size = 12, this.semanticLabel});
  final double size;
  final String? semanticLabel;

  @override
  State<ShurfaLoader> createState() => _ShurfaLoaderState();
}

class _ShurfaLoaderState extends State<ShurfaLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.disableAnimationsOf(context);
    if (reduce) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.secondary;
    return Semantics(
      label: widget.semanticLabel,
      liveRegion: widget.semanticLabel != null,
      excludeSemantics: widget.semanticLabel == null,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => SizedBox(
          width: widget.size * 4 + 12,
          height: widget.size + 6,
          child: CustomPaint(
            painter: _LoaderPainter(
              color,
              _c.value,
              widget.size,
              MediaQuery.disableAnimationsOf(context),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoaderPainter extends CustomPainter {
  _LoaderPainter(this.color, this.t, this.s, this.still);
  final Color color;
  final double t, s;
  final bool still;

  @override
  void paint(Canvas canvas, Size size) {
    for (var i = 0; i < 4; i++) {
      final phase = still ? 0.4 : ((t - i * 0.125) % 1.0);
      final peak = (1 - (phase - 0.4).abs() / 0.4).clamp(0.0, 1.0);
      final opacity = still
          ? 0.6
          : 0.25 + 0.75 * Curves.easeOut.transform(peak);
      final lift = still ? 0.0 : 3 * peak;
      final x = i * (s + 4);
      canvas.drawPath(
        Path()
          ..moveTo(x, size.height - lift)
          ..lineTo(x + s / 2, size.height - lift - s * 0.85)
          ..lineTo(x + s, size.height - lift)
          ..close(),
        Paint()..color = color.withValues(alpha: opacity),
      );
    }
  }

  @override
  bool shouldRepaint(_LoaderPainter old) => old.t != t || old.color != color;
}

// Re-exported for convenience in widgets that only need the motion constants.
const rkEase = RasikhTokens.ease;
