import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/page_scaffold.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return PageScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          Text(l10n.homeHeadline, style: displayStyle(context, 36)),
          const SizedBox(height: 24),
          Text(
            l10n.homeSubhead,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: context.tokens.textMuted),
          ),
          const SizedBox(height: 32),
          FilledButton(onPressed: () => context.go(Routes.auth), child: Text(l10n.start)),
          const SizedBox(height: 40),
          const ShurfaDivider(),
        ],
      ),
    );
  }
}
