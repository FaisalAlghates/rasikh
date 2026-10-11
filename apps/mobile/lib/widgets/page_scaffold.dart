import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/providers.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import 'brand_mark.dart';

/// Shared page frame: brand header with language switch, centered content column.
/// With `scrollable: false` the child fills the remaining height (use `Expanded` inside).
class PageScaffold extends ConsumerWidget {
  const PageScaffold({super.key, required this.child, this.scrollable = true});
  final Widget child;
  final bool scrollable;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    const padding = EdgeInsets.fromLTRB(24, 8, 24, 32);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  child: Row(
                    children: [
                      const BrandMark(size: 28),
                      const SizedBox(width: 12),
                      Text(l10n.appName, style: displayStyle(context, 20)),
                      const Spacer(),
                      TextButton(
                        onPressed: () =>
                            ref.read(localeProvider.notifier).toggle(),
                        child: Text(
                          l10n.switchLanguage,
                          style: TextStyle(
                            color: context.tokens.textMuted,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: scrollable
                      ? SingleChildScrollView(padding: padding, child: child)
                      : Padding(padding: padding, child: child),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
