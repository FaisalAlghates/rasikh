import 'package:flutter/material.dart';

import '../theme/rasikh_tokens.g.dart';

/// Soft entrance: fades in while rising a few pixels. Use [index] to stagger siblings.
/// Collapses to an instant show when the platform asks to reduce motion.
class Reveal extends StatelessWidget {
  const Reveal({super.key, required this.child, this.index = 0, this.dy = 22});
  final Widget child;
  final int index;
  final double dy;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: RasikhTokens.slow + Duration(milliseconds: 90 * index),
      curve: Interval(
        (90 * index) / (700 + 90 * index),
        1,
        curve: RasikhTokens.ease,
      ),
      builder: (context, v, child) => Opacity(
        opacity: v,
        child: Transform.translate(
          offset: Offset(0, (1 - v) * dy),
          child: child,
        ),
      ),
      child: child,
    );
  }
}

/// Press feedback: the child shrinks slightly while a finger or pointer is down.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child});
  final Widget child;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: (_) => setState(() => _down = true),
      onPointerUp: (_) => setState(() => _down = false),
      onPointerCancel: (_) => setState(() => _down = false),
      child: AnimatedScale(
        scale: _down ? 0.97 : 1,
        duration: RasikhTokens.fast,
        curve: RasikhTokens.ease,
        child: widget.child,
      ),
    );
  }
}
