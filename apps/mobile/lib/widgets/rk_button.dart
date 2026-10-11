import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/rasikh_tokens.g.dart';
import 'shurfa_loader.dart';

enum RkButtonVariant { primary, quiet, ghost }

class RkButton extends StatelessWidget {
  const RkButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = RkButtonVariant.primary,
    this.loading = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final RkButtonVariant variant;
  final bool loading;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final enabled = onPressed != null && !loading;
    final child = loading
        ? ShurfaLoader(size: 10, semanticLabel: label)
        : Text(label);

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
    );
    final size = Size(expand ? double.infinity : 0, 48);
    final style = switch (variant) {
      RkButtonVariant.primary => FilledButton.styleFrom(
        backgroundColor: t.brand,
        foregroundColor: t.onBrand,
        minimumSize: size,
        shape: shape,
      ),
      RkButtonVariant.quiet => OutlinedButton.styleFrom(
        foregroundColor: t.text,
        minimumSize: size,
        shape: shape,
        side: BorderSide(color: t.border.withValues(alpha: 0.3)),
      ),
      RkButtonVariant.ghost => TextButton.styleFrom(
        foregroundColor: t.brandText,
        minimumSize: size,
        shape: shape,
      ),
    };

    final cb = enabled ? onPressed : null;
    return switch (variant) {
      RkButtonVariant.primary => FilledButton(
        onPressed: cb,
        style: style,
        child: child,
      ),
      RkButtonVariant.quiet => OutlinedButton(
        onPressed: cb,
        style: style,
        child: child,
      ),
      RkButtonVariant.ghost => TextButton(
        onPressed: cb,
        style: style,
        child: child,
      ),
    };
  }
}

/// Icon-only button. `label` is required: it is the accessible name and the tooltip.
class RkIconButton extends StatelessWidget {
  const RkIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        child: InkResponse(
          onTap: onPressed,
          radius: 24,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
              border: Border.all(color: t.border.withValues(alpha: 0.3)),
            ),
            child: Icon(icon, size: 20, color: t.text),
          ),
        ),
      ),
    );
  }
}
