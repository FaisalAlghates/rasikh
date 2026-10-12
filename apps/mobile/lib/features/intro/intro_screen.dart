import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/page_scaffold.dart';
import '../../widgets/reveal.dart';
import '../../widgets/rk_button.dart';

/// Three-screen introduction. The city behind is the story: each page moves the camera deeper
/// down the street, the sun sinks, and more windows light up.
class IntroScreen extends StatefulWidget {
  const IntroScreen({super.key});

  @override
  State<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends State<IntroScreen> {
  final _controller = PageController();
  final _progress = ValueNotifier<double>(0);
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final p = _controller.hasClients ? (_controller.page ?? 0) : 0.0;
      _progress.value = (p / 2).clamp(0.0, 1.0);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _progress.dispose();
    super.dispose();
  }

  void _next() {
    HapticFeedback.selectionClick();
    if (_page == 2) {
      context.go(Routes.auth);
    } else {
      _controller.nextPage(
        duration: RasikhTokens.slow,
        curve: RasikhTokens.ease,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = RasikhTokens.dark;
    final pages = [
      (l10n.intro1Title, l10n.intro1Body),
      (l10n.intro2Title, l10n.intro2Body),
      (l10n.intro3Title, l10n.intro3Body),
    ];

    return PageScaffold(
      scrollable: false,
      panel: false,
      progress: _progress,
      child: Column(
        children: [
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: 3,
              onPageChanged: (i) {
                HapticFeedback.selectionClick();
                setState(() => _page = i);
              },
              itemBuilder: (context, i) => _IntroPage(
                key: ValueKey('page$i'),
                index: i,
                title: pages[i].$1,
                body: pages[i].$2,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < 3; i++)
                AnimatedContainer(
                  duration: RasikhTokens.base,
                  curve: RasikhTokens.ease,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _page ? 28 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _page ? t.brand : t.text.withValues(alpha: 0.3),
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
    super.key,
    required this.index,
    required this.title,
    required this.body,
  });
  final int index;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final t = RasikhTokens.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (index == 2)
          Reveal(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Row(
                children: [
                  BrandMark(size: 56, color: t.brandText),
                  const SizedBox(width: 16),
                  const Expanded(child: ShurfaDivider()),
                ],
              ),
            ),
          ),
        Reveal(
          index: 1,
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: displayStyle(context, 38).copyWith(color: t.text),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Reveal(
          index: 2,
          child: Text(
            body,
            style: TextStyle(
              fontSize: 17,
              height: 1.7,
              color: t.text.withValues(alpha: 0.92),
            ),
          ),
        ),
      ],
    );
  }
}
