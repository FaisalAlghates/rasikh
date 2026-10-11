import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/hero_scene.dart';
import '../../widgets/page_scaffold.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_surfaces.dart';

/// Three-screen introduction shown to signed-out users.
class IntroScreen extends StatefulWidget {
  const IntroScreen({super.key});

  @override
  State<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends State<IntroScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_page == 2) {
      context.go(Routes.auth);
    } else {
      _controller.nextPage(
        duration: RasikhTokens.base,
        curve: RasikhTokens.ease,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final pages = [
      (l10n.intro1Title, l10n.intro1Body),
      (l10n.intro2Title, l10n.intro2Body),
      (l10n.intro3Title, l10n.intro3Body),
    ];

    return PageScaffold(
      scrollable: false,
      child: Column(
        children: [
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: 3,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (context, i) =>
                  _IntroPage(index: i, title: pages[i].$1, body: pages[i].$2),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < 3; i++)
                AnimatedContainer(
                  duration: RasikhTokens.fast,
                  curve: RasikhTokens.ease,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _page ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _page
                        ? t.brand
                        : t.border.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 24),
          RkButton(
            key: const Key('introNext'),
            label: _page == 2 ? l10n.start : l10n.next,
            onPressed: _next,
          ),
          const SizedBox(height: 8),
          RkButton(
            key: const Key('introSkip'),
            label: l10n.skip,
            variant: RkButtonVariant.ghost,
            onPressed: _page == 2 ? null : () => context.go(Routes.auth),
          ),
        ],
      ),
    );
  }
}

class _IntroPage extends StatelessWidget {
  const _IntroPage({
    required this.index,
    required this.title,
    required this.body,
  });
  final int index;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final visual = switch (index) {
      0 => ClipRRect(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusXl),
        child: const HeroScene(),
      ),
      1 => const Center(
        child: SizedBox(
          width: 180,
          child: ArchImage(child: HeroScene(arch: true)),
        ),
      ),
      _ => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            BrandMark(size: 96, color: t.brandText),
            const SizedBox(height: 24),
            const SizedBox(width: 160, child: ShurfaDivider()),
          ],
        ),
      ),
    };

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: SizedBox(width: double.infinity, child: visual),
          ),
          const SizedBox(height: 24),
          Semantics(
            header: true,
            child: Text(title, style: displayStyle(context, 34)),
          ),
          const SizedBox(height: 12),
          Text(
            body,
            style: TextStyle(fontSize: 17, height: 1.7, color: t.textMuted),
          ),
        ],
      ),
    );
  }
}
