import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/rasikh_tokens.g.dart';
import 'brand_mark.dart';
import 'hero_scene.dart';

/// Hairline card, no shadow.
class RkCard extends StatelessWidget {
  const RkCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
        border: Border.all(color: t.border.withValues(alpha: 0.3)),
      ),
      child: child,
    );
  }
}

class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.note,
  });
  final String label;
  final String value;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      container: true,
      label: '$label: $value',
      child: ExcludeSemantics(
        child: RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 15, color: t.textMuted)),
              const SizedBox(height: 4),
              Text(
                value,
                style: displayStyle(
                  context,
                  40,
                ).copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
              ),
              if (note != null) ...[
                const SizedBox(height: 4),
                Text(note!, style: TextStyle(fontSize: 13, color: t.textMuted)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

enum RkStatus { ok, warn, late }

class StatusDot extends StatelessWidget {
  const StatusDot({super.key, required this.status, required this.label});
  final RkStatus status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final color = switch (status) {
      RkStatus.ok => t.success,
      RkStatus.warn => t.warning,
      RkStatus.late => t.danger,
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 13, color: color)),
      ],
    );
  }
}

/// Najdi doorway arch mask. One per screen, on the main property image.
class ArchImage extends StatelessWidget {
  const ArchImage({super.key, required this.child, this.aspectRatio = 3 / 4});
  final Widget child;
  final double aspectRatio;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: aspectRatio,
      child: ClipPath(clipper: _ArchClipper(), child: child),
    );
  }
}

class _ArchClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final r = size.width / 2;
    return Path()
      ..moveTo(0, size.height)
      ..lineTo(0, r)
      ..arcToPoint(Offset(size.width, r), radius: Radius.circular(r))
      ..lineTo(size.width, size.height)
      ..close();
  }

  @override
  bool shouldReclip(_ArchClipper old) => false;
}

class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    required this.title,
    required this.place,
    this.meta,
    this.status,
    this.statusLabel,
  });
  final String title;
  final String place;
  final String? meta;
  final RkStatus? status;
  final String? statusLabel;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return RkCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const SizedBox(
            width: 72,
            child: ArchImage(child: HeroScene(arch: true)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  place,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 15, color: t.textMuted),
                ),
                if (meta != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    meta!,
                    style: TextStyle(
                      fontSize: 13,
                      color: t.textMuted,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
                if (status != null && statusLabel != null) ...[
                  const SizedBox(height: 6),
                  StatusDot(status: status!, label: statusLabel!),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TimelineEvent {
  const TimelineEvent({required this.title, required this.date, this.detail});
  final String title;
  final String date;
  final String? detail;
}

/// Property Health Record: vertical timeline with one clay node per event.
class RkTimeline extends StatelessWidget {
  const RkTimeline({
    super.key,
    required this.events,
    required this.semanticLabel,
  });
  final List<TimelineEvent> events;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      label: semanticLabel,
      container: true,
      child: Column(
        children: [
          for (var i = 0; i < events.length; i++)
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 24,
                    child: Column(
                      children: [
                        const SizedBox(height: 6),
                        Container(
                          width: 15,
                          height: 15,
                          decoration: BoxDecoration(
                            color: t.brand,
                            shape: BoxShape.circle,
                            border: Border.all(color: t.bg, width: 2),
                          ),
                        ),
                        if (i < events.length - 1)
                          Expanded(
                            child: Container(
                              width: 1,
                              color: t.border.withValues(alpha: 0.4),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(
                        bottom: i < events.length - 1 ? 28 : 0,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            events[i].date,
                            style: TextStyle(
                              fontSize: 13,
                              color: t.textMuted,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                            ),
                          ),
                          Text(
                            events[i].title,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          if (events[i].detail != null)
                            Text(
                              events[i].detail!,
                              style: TextStyle(
                                fontSize: 15,
                                color: t.textMuted,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.body, this.action});
  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
        border: Border.all(color: t.border.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          const SizedBox(width: 96, child: ShurfaDivider()),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          if (body != null) ...[
            const SizedBox(height: 8),
            Text(
              body!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: t.textMuted),
            ),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    );
  }
}

class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.height = 16, this.width});
  final double height;
  final double? width;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return ExcludeSemantics(
      child: AnimatedBuilder(
        animation: _c,
        builder: (_, _) => Opacity(
          opacity: 1 - 0.45 * Curves.easeInOut.transform(_c.value),
          child: Container(
            height: widget.height,
            width: widget.width,
            decoration: BoxDecoration(
              color: t.border.withValues(alpha: 0.22),
              borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
            ),
          ),
        ),
      ),
    );
  }
}

/// Glass material: ONLY for controls floating over a map or image (search bar, peek card,
/// bottom dock). One glass layer per screen. Falls back to a solid surface when the platform
/// asks for high contrast or reduced transparency.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    this.radius = RasikhTokens.radiusLg,
  });
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final solid =
        MediaQuery.highContrastOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    final shape = BorderRadius.circular(radius);
    final body = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: solid ? t.surface : t.surface.withValues(alpha: 0.62),
        borderRadius: shape,
        border: Border.all(color: t.text.withValues(alpha: 0.14)),
      ),
      child: child,
    );
    if (solid) return body;
    return ClipRRect(
      borderRadius: shape,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: body,
      ),
    );
  }
}
