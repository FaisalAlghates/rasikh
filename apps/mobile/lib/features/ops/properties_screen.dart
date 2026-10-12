import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/ops_providers.dart';
import '../../app/router.dart';
import '../../data/ops_models.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'labels.dart';

class PropertiesScreen extends ConsumerStatefulWidget {
  const PropertiesScreen({super.key});

  @override
  ConsumerState<PropertiesScreen> createState() => _PropertiesScreenState();
}

class _PropertiesScreenState extends ConsumerState<PropertiesScreen> {
  final _name = TextEditingController();
  final _city = TextEditingController(text: 'الرياض');
  final _district = TextEditingController();
  String _kind = 'building';
  bool _busy = false;
  bool _submitted = false;

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _district.dispose();
    super.dispose();
  }

  Future<void> _add(String orgId) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _submitted = true);
    if (_name.text.trim().length < 2 || _city.text.trim().length < 2) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(opsRepositoryProvider)
          .addProperty(
            orgId,
            Property(
              name: _name.text.trim(),
              city: _city.text.trim(),
              district: _district.text.trim(),
              kind: _kind,
            ),
          );
      _name.clear();
      _district.clear();
      setState(() => _submitted = false);
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsErrorGeneric, tone: RkToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final scope = ref.watch(opsScopeProvider);
    final data = ref.watch(opsDataProvider).value;
    final orgId = scope?.orgId;

    return SubPage(
      title: l10n.opsTabProperties,
      children: [
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(
                  l10n.opsAddProperty,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('propName'),
                label: l10n.opsName,
                controller: _name,
                error: _submitted && _name.text.trim().length < 2
                    ? l10n.opsRequired
                    : null,
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('propCity'),
                label: l10n.opsCity,
                controller: _city,
                error: _submitted && _city.text.trim().length < 2
                    ? l10n.opsRequired
                    : null,
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('propDistrict'),
                label: l10n.opsDistrict,
                controller: _district,
              ),
              const SizedBox(height: 12),
              RkSelect<String>(
                label: l10n.opsKindBuilding,
                value: _kind,
                options: [
                  RkSelectOption('building', l10n.opsKindBuilding),
                  RkSelectOption('villa', l10n.opsKindVilla),
                ],
                onChanged: (v) => setState(() => _kind = v ?? 'building'),
              ),
              const SizedBox(height: 16),
              RkButton(
                key: const Key('addProperty'),
                label: l10n.opsAddProperty,
                loading: _busy,
                onPressed: orgId == null ? null : () => _add(orgId),
              ),
            ],
          ),
        ),
        if (data == null)
          const Skeleton(height: 120)
        else if (data.properties.isEmpty)
          EmptyState(title: l10n.opsNoProperties)
        else
          Column(
            children: [
              for (final p in data.properties)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: _PropertyCard(
                    orgId: orgId!,
                    property: p,
                    units: data.units
                        .where((u) => u.data.propertyId == p.id)
                        .toList(),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _PropertyCard extends ConsumerStatefulWidget {
  const _PropertyCard({
    required this.orgId,
    required this.property,
    required this.units,
  });
  final String orgId;
  final Doc<Property> property;
  final List<Doc<RentalUnit>> units;

  @override
  ConsumerState<_PropertyCard> createState() => _PropertyCardState();
}

class _PropertyCardState extends ConsumerState<_PropertyCard> {
  final _label = TextEditingController();
  String _type = 'apartment';
  bool _submitted = false;

  @override
  void dispose() {
    _label.dispose();
    super.dispose();
  }

  Future<void> _addUnit() async {
    final l10n = AppLocalizations.of(context);
    setState(() => _submitted = true);
    if (_label.text.trim().isEmpty) return;
    try {
      await ref
          .read(opsRepositoryProvider)
          .addUnit(
            widget.orgId,
            RentalUnit(
              propertyId: widget.property.id,
              label: _label.text.trim(),
              type: _type,
            ),
          );
      _label.clear();
      setState(() => _submitted = false);
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsErrorGeneric, tone: RkToastTone.danger);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final p = widget.property.data;
    return RkCard(
      child: Column(
        key: Key('property-${widget.property.id}'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              p.name,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
          ),
          Text(
            [
              p.city,
              if (p.district.isNotEmpty) p.district,
              kindLabel(l10n, p.kind),
            ].join('، '),
            style: TextStyle(fontSize: 15, color: t.textMuted),
          ),
          const SizedBox(height: 12),
          if (widget.units.isEmpty)
            Text(
              l10n.opsNoUnits,
              style: TextStyle(fontSize: 15, color: t.textMuted),
            )
          else
            for (final u in widget.units)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${u.data.label} · ${unitTypeLabel(l10n, u.data.type)}',
                        key: Key('unit-${u.id}'),
                        style: const TextStyle(fontSize: 17),
                      ),
                    ),
                    RkButton(
                      key: Key('addLease-${u.id}'),
                      label: l10n.opsAddLease,
                      variant: RkButtonVariant.quiet,
                      expand: false,
                      onPressed: () => context.push(Routes.leaseNewFor(u.id)),
                    ),
                  ],
                ),
              ),
          const SizedBox(height: 8),
          RkField(
            key: Key('unitLabel-${widget.property.id}'),
            label: l10n.opsUnitLabel,
            controller: _label,
            error: _submitted && _label.text.trim().isEmpty
                ? l10n.opsRequired
                : null,
          ),
          const SizedBox(height: 12),
          RkSelect<String>(
            label: l10n.opsAddUnit,
            value: _type,
            options: [
              for (final ty in unitTypes)
                RkSelectOption(ty, unitTypeLabel(l10n, ty)),
            ],
            onChanged: (v) => setState(() => _type = v ?? 'apartment'),
          ),
          const SizedBox(height: 12),
          RkButton(
            key: Key('addUnit-${widget.property.id}'),
            label: l10n.opsAddUnit,
            variant: RkButtonVariant.quiet,
            onPressed: _addUnit,
          ),
        ],
      ),
    );
  }
}
