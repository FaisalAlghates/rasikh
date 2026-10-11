import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/hero_scene.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/shurfa_loader.dart';

/// Every component, with theme and language switches (dark/light, ar/en).
class GalleryScreen extends ConsumerStatefulWidget {
  const GalleryScreen({super.key});

  @override
  ConsumerState<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends ConsumerState<GalleryScreen> {
  int _tab = 0;
  String? _type;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final t = context.tokens;

    Widget block(String title, List<Widget> children) => Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              color: t.textMuted,
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );

    return Scaffold(
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(l.galleryTitle, style: displayStyle(context, 22)),
        actions: [
          TextButton(
            onPressed: () => ref.read(localeProvider.notifier).toggle(),
            child: Text(l.switchLanguage, style: TextStyle(color: t.textMuted)),
          ),
          RkIconButton(
            icon: Icons.brightness_6_outlined,
            label: l.themeToggle,
            onPressed: () => ref.read(themeModeProvider.notifier).toggle(),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 48),
            children: [
              block(l.gButtons, [
                RkButton(label: l.gPrimary, onPressed: () {}),
                const SizedBox(height: 8),
                RkButton(
                  label: l.gQuiet,
                  variant: RkButtonVariant.quiet,
                  onPressed: () {},
                ),
                const SizedBox(height: 8),
                RkButton(
                  label: l.gGhost,
                  variant: RkButtonVariant.ghost,
                  onPressed: () {},
                ),
                const SizedBox(height: 8),
                RkButton(label: l.gLoading, loading: true, onPressed: () {}),
                const SizedBox(height: 8),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: RkIconButton(
                    icon: Icons.add,
                    label: l.gAddUnit,
                    onPressed: () {},
                  ),
                ),
              ]),
              block(l.gFields, [
                RkField(label: l.gFieldLabel, hint: l.gFieldHint),
                const SizedBox(height: 16),
                RkField(label: l.gFieldLabel, error: l.gFieldError),
                const SizedBox(height: 16),
                RkSelect<String>(
                  label: l.gSelectLabel,
                  placeholder: l.gSelectPlaceholder,
                  value: _type,
                  onChanged: (v) => setState(() => _type = v),
                  options: [
                    RkSelectOption('studio', l.gStudio),
                    RkSelectOption('apartment', l.gApartment),
                    RkSelectOption('villa', l.gVilla),
                  ],
                ),
              ]),
              block(l.gOverlays, [
                RkButton(
                  label: l.gOpenDialog,
                  variant: RkButtonVariant.quiet,
                  onPressed: () => showRkDialog<void>(
                    context,
                    title: l.gDialogTitle,
                    body: l.gDialogBody,
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: Text(l.gConfirm),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                RkButton(
                  label: l.gOpenSheet,
                  variant: RkButtonVariant.quiet,
                  onPressed: () => showRkSheet<void>(
                    context,
                    title: l.gSheetTitle,
                    child: RkSelect<String>(
                      label: l.gSelectLabel,
                      placeholder: l.gSelectPlaceholder,
                      onChanged: (_) {},
                      options: [
                        RkSelectOption('studio', l.gStudio),
                        RkSelectOption('apartment', l.gApartment),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                RkButton(
                  label: l.gShowToast,
                  variant: RkButtonVariant.quiet,
                  onPressed: () => showRkToast(
                    context,
                    l.gToastMsg,
                    tone: RkToastTone.success,
                  ),
                ),
              ]),
              block(l.gTabs, [
                RkTabs(
                  semanticLabel: l.gTabsLabel,
                  labels: [l.gTabA, l.gTabB],
                  index: _tab,
                  onChanged: (i) => setState(() => _tab = i),
                ),
              ]),
              block(l.gCards, [
                StatTile(
                  label: l.gStatRent,
                  value: '38,500',
                  note: l.gStatNote,
                ),
                const SizedBox(height: 12),
                PropertyCard(
                  title: l.gPropTitle,
                  place: l.gPropPlace,
                  meta: l.gPropMeta,
                  status: RkStatus.ok,
                  statusLabel: l.gStatusOk,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    StatusDot(status: RkStatus.ok, label: l.gStatusOk),
                    const SizedBox(width: 24),
                    StatusDot(status: RkStatus.late, label: l.gStatusLate),
                  ],
                ),
              ]),
              block(l.recordEmptyTitle, [
                RkTimeline(
                  semanticLabel: l.recordEmptyTitle,
                  events: [
                    TimelineEvent(
                      title: l.recordEv1,
                      date: '2026-01-05',
                      detail: l.recordEv1Detail,
                    ),
                    TimelineEvent(title: l.recordEv2, date: '2026-06-18'),
                  ],
                ),
              ]),
              block(l.gEmpty, [
                EmptyState(
                  title: l.gEmptyTitle,
                  body: l.gEmptyBody,
                  action: RkButton(
                    label: l.gAddUnit,
                    variant: RkButtonVariant.quiet,
                    expand: false,
                    onPressed: () {},
                  ),
                ),
                const SizedBox(height: 12),
                const RkCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Skeleton(height: 14, width: 120),
                      SizedBox(height: 12),
                      Skeleton(height: 64),
                      SizedBox(height: 12),
                      ShurfaLoader(),
                    ],
                  ),
                ),
              ]),
              block(l.gGlass, [
                SizedBox(
                  height: 190,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        const HeroScene(),
                        Positioned(
                          left: 12,
                          right: 12,
                          top: 12,
                          child: GlassPanel(
                            child: Row(
                              children: [
                                Icon(
                                  Icons.search,
                                  size: 20,
                                  color: t.textMuted,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    l.gGlassSample,
                                    style: TextStyle(color: t.textMuted),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ]),
              block(l.gArch, [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const SizedBox(
                      width: 96,
                      child: ArchImage(child: HeroScene(arch: true)),
                    ),
                    const SizedBox(width: 24),
                    const Expanded(child: ShurfaDivider()),
                    const SizedBox(width: 12),
                    BrandMark(size: 32, color: t.brandText),
                  ],
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}
