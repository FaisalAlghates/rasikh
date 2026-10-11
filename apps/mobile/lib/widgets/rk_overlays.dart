import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/rasikh_tokens.g.dart';

/// Bottom sheet with a drag handle. Returns when dismissed.
Future<T?> showRkSheet<T>(
  BuildContext context, {
  required String title,
  required Widget child,
}) {
  final t = context.tokens;
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: t.surface,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(RasikhTokens.radiusXl),
      ),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.viewInsetsOf(ctx).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    ),
  );
}

Future<T?> showRkDialog<T>(
  BuildContext context, {
  required String title,
  String? body,
  required List<Widget> actions,
}) {
  final t = context.tokens;
  return showDialog<T>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: t.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
        side: BorderSide(color: t.border.withValues(alpha: 0.3)),
      ),
      title: Text(
        title,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
      ),
      content: body == null
          ? null
          : Text(body, style: TextStyle(color: t.textMuted)),
      actions: actions,
    ),
  );
}

enum RkToastTone { info, success, danger }

/// Floating toast with a tone bar on the start edge. Announced to screen readers.
void showRkToast(
  BuildContext context,
  String message, {
  RkToastTone tone = RkToastTone.info,
}) {
  final t = context.tokens;
  final bar = switch (tone) {
    RkToastTone.info => t.brand,
    RkToastTone.success => t.success,
    RkToastTone.danger => t.danger,
  };
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: t.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
          side: BorderSide(color: t.border.withValues(alpha: 0.3)),
        ),
        padding: EdgeInsets.zero,
        duration: const Duration(seconds: 4),
        content: IntrinsicHeight(
          child: Row(
            children: [
              Container(width: 4, color: bar),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  child: Text(
                    message,
                    style: TextStyle(color: t.text, fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
}

/// Hairline segmented tabs.
class RkTabs extends StatelessWidget {
  const RkTabs({
    super.key,
    required this.labels,
    required this.index,
    required this.onChanged,
    required this.semanticLabel,
  });
  final List<String> labels;
  final int index;
  final ValueChanged<int> onChanged;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      label: semanticLabel,
      container: true,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
          border: Border.all(color: t.border.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            for (var i = 0; i < labels.length; i++)
              Expanded(
                child: Semantics(
                  selected: i == index,
                  button: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(RasikhTokens.radiusSm),
                    onTap: () => onChanged(i),
                    child: AnimatedContainer(
                      duration: RasikhTokens.fast,
                      curve: RasikhTokens.ease,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: i == index ? t.surface : null,
                        borderRadius: BorderRadius.circular(
                          RasikhTokens.radiusSm,
                        ),
                      ),
                      child: Text(
                        labels[i],
                        style: TextStyle(
                          fontSize: 15,
                          color: i == index ? t.text : t.textMuted,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
