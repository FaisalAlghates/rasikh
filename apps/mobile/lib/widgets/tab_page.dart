import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../app/router.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import 'brand_mark.dart';
import 'reveal.dart';
import 'rk_button.dart';

/// Header + padded scroll body shared by the shell tabs (keeps room for the dock).
class TabPage extends StatelessWidget {
  const TabPage({super.key, required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: ListView(
            padding: EdgeInsets.fromLTRB(
              24,
              16,
              24,
              120 + MediaQuery.paddingOf(context).bottom,
            ),
            children: [
              Row(
                children: [
                  BrandMark(size: 24, color: context.tokens.brandText),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(title, style: displayStyle(context, 28)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              for (var i = 0; i < children.length; i++)
                Reveal(index: i + 1, child: children[i]),
            ],
          ),
        ),
      ),
    );
  }
}

/// A pushed screen above the shell (no dock): back button, title and a padded scroll body.
class SubPage extends StatelessWidget {
  const SubPage({super.key, required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                24,
                16,
                24,
                32 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                Row(
                  children: [
                    RkIconButton(
                      key: const Key('back'),
                      icon: Icons.arrow_back,
                      label: l10n.opsBack,
                      onPressed: () => context.canPop()
                          ? context.pop()
                          : context.go(Routes.workspace),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(title, style: displayStyle(context, 24)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                for (var i = 0; i < children.length; i++)
                  Reveal(index: i + 1, child: children[i]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
