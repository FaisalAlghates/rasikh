import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/page_scaffold.dart';

class WorkspaceScreen extends ConsumerWidget {
  const WorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final session = ref.watch(sessionProvider).value;
    final orgs = session?.orgs.entries.toList() ?? const [];

    String roleLabel(String r) => switch (r) {
          'owner' => l10n.roleOwner,
          'tenant' => l10n.roleTenant,
          'manager' => l10n.roleManager,
          'broker' => l10n.roleBroker,
          'vendor' => l10n.roleVendor,
          _ => r,
        };

    return PageScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.workspaceTitle, style: displayStyle(context, 28)),
          const SizedBox(height: 16),
          Text(
            orgs.isEmpty ? l10n.workspaceNoOrg : l10n.workspaceReady,
            style: TextStyle(color: t.textMuted),
          ),
          const SizedBox(height: 16),
          for (final org in orgs)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: t.border.withValues(alpha: 0.3)),
              ),
              child: Wrap(
                spacing: 8,
                children: [
                  for (final r in org.value)
                    Chip(
                      key: Key('role-chip-$r'),
                      label: Text(roleLabel(r), style: TextStyle(color: t.brandText, fontSize: 13)),
                      backgroundColor: t.surface,
                      side: BorderSide.none,
                    ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            child: Text(l10n.signOut),
          ),
        ],
      ),
    );
  }
}
