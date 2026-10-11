import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../app/router.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/hero_scene.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_surfaces.dart';

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
          IndexedStack(index: _index, children: tabs),
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
                    child: Row(
                      children: [
                        for (var i = 0; i < items.length; i++)
                          Expanded(
                            child: _DockItem(
                              key: Key('dock-$i'),
                              icon: _index == i ? items[i].$2 : items[i].$1,
                              label: items[i].$3,
                              selected: _index == i,
                              onTap: () => setState(() => _index = i),
                            ),
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

/// Header + padded scroll body shared by the tabs (keeps room for the dock).
class _TabPage extends ConsumerWidget {
  const _TabPage({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
              ...children,
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

    return _TabPage(
      title: l10n.workspaceTitle,
      children: [
        Text(
          orgs.isEmpty ? l10n.workspaceNoOrg : l10n.workspaceReady,
          style: TextStyle(color: t.textMuted, fontSize: 17, height: 1.7),
        ),
        const SizedBox(height: 16),
        for (final org in orgs)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: RkCard(
              child: Wrap(
                spacing: 8,
                children: [
                  for (final r in org.value)
                    Chip(
                      key: Key('role-chip-$r'),
                      label: Text(
                        roleLabel(r),
                        style: TextStyle(color: t.brandText, fontSize: 13),
                      ),
                      backgroundColor: t.bg,
                      side: BorderSide.none,
                    ),
                ],
              ),
            ),
          ),
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
        const HeroScene(focusX: 0.2),
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
    return _TabPage(
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
    return _TabPage(
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
