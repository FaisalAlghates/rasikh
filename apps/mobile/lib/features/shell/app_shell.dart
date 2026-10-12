import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../app/router.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/live_city.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import '../ops/ops_home.dart';

/// Signed-in home shell: four destinations and a floating glass dock.
/// The dock is the one glass layer on these screens.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tabs = <Widget>[
      const _HomeTab(),
      const _MapTab(),
      const _RecordTab(),
      const _ProfileTab(),
    ];
    final items = [
      (Icons.home_outlined, Icons.home_rounded, l10n.navHome),
      (Icons.map_outlined, Icons.map_rounded, l10n.navMap),
      (Icons.history_outlined, Icons.history_rounded, l10n.navRecord),
      (Icons.person_outline_rounded, Icons.person_rounded, l10n.navProfile),
    ];

    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          // Tabs cross-fade and rise slightly; the map tab keeps its camera between visits.
          AnimatedSwitcher(
            duration: RasikhTokens.base,
            switchInCurve: RasikhTokens.ease,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween(
                  begin: const Offset(0, 0.015),
                  end: Offset.zero,
                ).animate(anim),
                child: child,
              ),
            ),
            child: KeyedSubtree(key: ValueKey(_index), child: tabs[_index]),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 12 + MediaQuery.paddingOf(context).bottom,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Semantics(
                  container: true,
                  label: l10n.navLabel,
                  child: GlassPanel(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    radius: RasikhTokens.radiusXl,
                    child: Stack(
                      children: [
                        // a clay pill slides under the selected destination
                        Positioned.fill(
                          child: AnimatedAlign(
                            duration: RasikhTokens.base,
                            curve: RasikhTokens.ease,
                            alignment: AlignmentDirectional(
                              -1 + 2 * _index / (items.length - 1),
                              0,
                            ),
                            child: FractionallySizedBox(
                              widthFactor: 1 / items.length,
                              child: Container(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: context.tokens.brand.withValues(
                                    alpha: 0.18,
                                  ),
                                  borderRadius: BorderRadius.circular(
                                    RasikhTokens.radiusLg,
                                  ),
                                  border: Border.all(
                                    color: context.tokens.brandText.withValues(
                                      alpha: 0.35,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            for (var i = 0; i < items.length; i++)
                              Expanded(
                                child: _DockItem(
                                  key: Key('dock-$i'),
                                  icon: _index == i ? items[i].$2 : items[i].$1,
                                  label: items[i].$3,
                                  selected: _index == i,
                                  onTap: () {
                                    if (_index != i) {
                                      HapticFeedback.selectionClick();
                                    }
                                    setState(() => _index = i);
                                  },
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DockItem extends StatelessWidget {
  const _DockItem({
    super.key,
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final color = selected ? t.brandText : t.textMuted;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 22, color: color),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  color: color,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeTab extends ConsumerWidget {
  const _HomeTab();

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

    return TabPage(
      title: l10n.workspaceTitle,
      children: [
        if (orgs.isEmpty)
          Text(
            l10n.workspaceNoOrg,
            style: TextStyle(color: t.textMuted, fontSize: 17, height: 1.7),
          ),
        for (final org in orgs.take(1))
          Wrap(
            spacing: 8,
            children: [
              for (final r in org.value)
                Chip(
                  key: Key('role-chip-$r'),
                  label: Text(
                    roleLabel(r),
                    style: TextStyle(color: t.brandText, fontSize: 13),
                  ),
                  backgroundColor: t.surface,
                  side: BorderSide.none,
                ),
            ],
          ),
        if (orgs.isNotEmpty) const OpsHome(),
      ],
    );
  }
}

class _MapTab extends StatelessWidget {
  const _MapTab();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    // Stand-in for the live 3D map (Phase 3): the scene fills the screen, the dock floats over it.
    return Stack(
      fit: StackFit.expand,
      children: [
        const LiveCity(fixedProgress: 0.5),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Align(
              alignment: AlignmentDirectional.topStart,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      l10n.mapSoonTitle,
                      style: displayStyle(
                        context,
                        34,
                      ).copyWith(color: const Color(0xFFF4EEE4)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.mapSoonBody,
                    style: const TextStyle(
                      fontSize: 17,
                      color: Color(0xFFF4EEE4),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _RecordTab extends StatelessWidget {
  const _RecordTab();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    return TabPage(
      title: l10n.recordEmptyTitle,
      children: [
        Text(
          l10n.recordSample,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
        const SizedBox(height: 16),
        RkTimeline(
          semanticLabel: l10n.recordEmptyTitle,
          events: [
            TimelineEvent(
              title: l10n.recordEv1,
              date: '2026-01-05',
              detail: l10n.recordEv1Detail,
            ),
            TimelineEvent(
              title: l10n.recordEv2,
              date: '2026-06-18',
              detail: l10n.recordEv2Detail,
            ),
            TimelineEvent(
              title: l10n.recordEv3,
              date: '2026-11-02',
              detail: l10n.recordEv3Detail,
            ),
          ],
        ),
      ],
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final dark = ref.watch(themeModeProvider) == ThemeMode.dark;
    return TabPage(
      title: l10n.profileTitle,
      children: [
        RkButton(
          label: l10n.switchLanguage,
          variant: RkButtonVariant.quiet,
          onPressed: () => ref.read(localeProvider.notifier).toggle(),
        ),
        const SizedBox(height: 12),
        RkButton(
          key: const Key('themeToggle'),
          label:
              '${l10n.themeToggle}: ${dark ? l10n.themeDark : l10n.themeLight}',
          variant: RkButtonVariant.quiet,
          onPressed: () => ref.read(themeModeProvider.notifier).toggle(),
        ),
        const SizedBox(height: 12),
        if (kDebugMode) ...[
          RkButton(
            key: const Key('openGallery'),
            label: l10n.galleryTitle,
            variant: RkButtonVariant.quiet,
            onPressed: () => context.push(Routes.gallery),
          ),
          const SizedBox(height: 12),
        ],
        RkButton(
          key: const Key('signOut'),
          label: l10n.signOut,
          variant: RkButtonVariant.ghost,
          onPressed: () => ref.read(authRepositoryProvider).signOut(),
        ),
      ],
    );
  }
}
