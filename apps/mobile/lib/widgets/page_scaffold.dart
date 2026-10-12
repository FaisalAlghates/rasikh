import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/providers.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../theme/rasikh_tokens.g.dart';
import 'brand_mark.dart';
import 'live_city.dart';

/// Shared page frame for the entry flow (intro, sign-in, onboarding): the living 3D city behind,
/// brand header with language switch, and the content on a calm panel (or bare for the intro).
///
/// With `scrollable: false` the child fills the remaining height (use `Expanded` inside).
class PageScaffold extends ConsumerWidget {
  const PageScaffold({
    super.key,
    required this.child,
    this.scrollable = true,
    this.panel = true,
    this.progress,
  });
  final Widget child;
  final bool scrollable;

  /// Wraps the content in a translucent panel so forms stay readable over the scene.
  final bool panel;

  /// Story progress for the city (0..1). Null = ambient.
  final ValueListenable<double>? progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final arabic = Localizations.localeOf(context).languageCode == 'ar';
    // The scene is always dusk, so this flow is always dark regardless of the user's theme.
    final dark = buildTheme(Brightness.dark, arabic: arabic);
    final t = dark.extension<RasikhTokens>()!;

    final body = panel
        ? Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: t.surface.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
              border: Border.all(color: t.border.withValues(alpha: 0.28)),
            ),
            // Material between the tinted panel and its content keeps ink effects (ListTile, checkboxes) visible.
            child: Material(type: MaterialType.transparency, child: child),
          )
        : child;
    const outer = EdgeInsets.fromLTRB(20, 8, 20, 28);

    return Theme(
      data: dark,
      child: Scaffold(
        backgroundColor: const Color(0xFF0B0908),
        body: Stack(
          fit: StackFit.expand,
          children: [
            LiveCity(progress: progress),
            SafeArea(
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
                            Text(
                              l10n.appName,
                              style: displayStyle(
                                context,
                                20,
                              ).copyWith(color: t.text),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: () =>
                                  ref.read(localeProvider.notifier).toggle(),
                              child: Text(
                                l10n.switchLanguage,
                                style: TextStyle(
                                  color: t.text.withValues(alpha: 0.8),
                                  fontSize: 15,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: scrollable
                            ? SingleChildScrollView(padding: outer, child: body)
                            : Padding(padding: outer, child: body),
                      ),
                    ],
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
