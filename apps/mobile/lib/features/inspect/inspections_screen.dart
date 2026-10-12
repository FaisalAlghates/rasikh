import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/inspection_providers.dart';
import '../../app/ops_providers.dart';
import '../../app/router.dart';
import '../../data/inspection_models.dart';
import '../../data/ops_models.dart';
import '../../domain/inspection.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'inspect_labels.dart';

String _leaseName(Lease? l) => [
  l?.propertyName,
  l?.unitLabel,
].where((s) => s != null && s.isNotEmpty).join(' · ');

/// All inspections the person may see, plus (for staff) the form that starts a new one.
class InspectionsScreen extends ConsumerWidget {
  const InspectionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final scope = ref.watch(opsScopeProvider);
    final ops = ref.watch(opsDataProvider).value;
    final list = ref.watch(inspectionsProvider).value;

    final sorted = [...?list]
      ..sort((a, b) {
        final x = a.data.createdAt?.millisecondsSinceEpoch ?? 0;
        final y = b.data.createdAt?.millisecondsSinceEpoch ?? 0;
        return y.compareTo(x);
      });

    return SubPage(
      title: l10n.inspTab,
      children: [
        if (scope != null && scope.staff && ops != null)
          _StartCard(
            orgId: scope.orgId,
            uid: scope.uid,
            ops: ops,
            inspections: sorted,
          ),
        if (list == null || ops == null)
          const Skeleton(height: 100)
        else if (sorted.isEmpty)
          EmptyState(title: l10n.inspNone)
        else
          Column(
            children: [
              for (final i in sorted)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _InspectionTile(
                    inspection: i,
                    leaseName: _leaseName(
                      ops.leases
                          .where((l) => l.id == i.data.leaseId)
                          .firstOrNull
                          ?.data,
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _InspectionTile extends StatelessWidget {
  const _InspectionTile({required this.inspection, required this.leaseName});
  final Doc<InspectionDoc> inspection;
  final String leaseName;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final d = inspection.data;
    return Semantics(
      button: true,
      label: '${kindLabel(l10n, d.kind)}: $leaseName',
      excludeSemantics: true,
      child: InkWell(
        key: Key('inspection-${d.kind}'),
        borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
        onTap: () => context.push(Routes.inspectionFor(inspection.id)),
        child: RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                leaseName,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                kindLabel(l10n, d.kind),
                style: TextStyle(fontSize: 15, color: t.textMuted),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  StatusDot(
                    status: d.isSealed ? RkStatus.ok : RkStatus.warn,
                    label: statusLabel(l10n, d.status),
                  ),
                  const Spacer(),
                  Directionality(
                    textDirection: TextDirection.ltr,
                    child: Text(
                      riyadhDay(d.sealedAt ?? d.createdAt) ?? '',
                      style: TextStyle(fontSize: 13, color: t.textMuted),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StartCard extends ConsumerStatefulWidget {
  const _StartCard({
    required this.orgId,
    required this.uid,
    required this.ops,
    required this.inspections,
  });
  final String orgId, uid;
  final OpsData ops;
  final List<Doc<InspectionDoc>> inspections;

  @override
  ConsumerState<_StartCard> createState() => _StartCardState();
}

class _StartCardState extends ConsumerState<_StartCard> {
  String? _leaseId;
  String _kind = 'move_in';
  final _bedrooms = TextEditingController(text: '2');
  final _bathrooms = TextEditingController(text: '1');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _bedrooms.dispose();
    _bathrooms.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    final l10n = AppLocalizations.of(context);
    final lease = widget.ops.leases.where((l) => l.id == _leaseId).firstOrNull;
    final unit = widget.ops.units
        .where((u) => u.id == lease?.data.unitId)
        .firstOrNull;
    if (lease == null || unit == null) {
      setState(() => _error = l10n.inspPickLease);
      return;
    }
    final sealedMoveIn = widget.inspections
        .where(
          (i) =>
              i.data.leaseId == lease.id &&
              i.data.kind == 'move_in' &&
              i.data.isSealed,
        )
        .firstOrNull;
    final rooms = templateFor(
      unit.data.type,
      bedrooms: int.tryParse(_bedrooms.text),
      bathrooms: int.tryParse(_bathrooms.text),
    ).map((r) => r.key).toList();

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await ref
          .read(inspectionRepositoryProvider)
          .createInspection(
            widget.orgId,
            widget.uid,
            NewInspection(
              unitId: lease.data.unitId,
              propertyId: lease.data.propertyId,
              leaseId: lease.id,
              tenantUid: lease.data.tenantUid,
              kind: _kind,
              rooms: rooms,
              moveInId: _kind == 'move_out' ? sealedMoveIn?.id : null,
            ),
          );
      if (mounted) context.push(Routes.inspectionFor(id));
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.inspSaveFailed);
        showRkToast(context, l10n.inspSaveFailed, tone: RkToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final active = widget.ops.leases
        .where((l) => l.data.status != 'ended')
        .toList();
    if (active.isEmpty) return EmptyState(title: l10n.inspNeedLease);

    final lease = active.where((l) => l.id == _leaseId).firstOrNull;
    final unit = widget.ops.units
        .where((u) => u.id == lease?.data.unitId)
        .firstOrNull;
    final hasMoveIn =
        lease != null &&
        widget.inspections.any(
          (i) =>
              i.data.leaseId == lease.id &&
              i.data.kind == 'move_in' &&
              i.data.isSealed,
        );

    return RkCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              l10n.inspStart,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 12),
          RkSelect<String>(
            key: const Key('inspLease'),
            label: l10n.inspLease,
            placeholder: l10n.inspChoose,
            value: _leaseId,
            options: [
              for (final l in active)
                RkSelectOption(
                  l.id,
                  '${_leaseName(l.data)} · ${l.data.tenantName}',
                ),
            ],
            onChanged: (v) => setState(() => _leaseId = v),
          ),
          const SizedBox(height: 12),
          RkSelect<String>(
            key: const Key('inspKind'),
            label: l10n.inspKind,
            value: _kind,
            options: [
              RkSelectOption('move_in', l10n.inspMoveIn),
              RkSelectOption('move_out', l10n.inspMoveOut),
            ],
            onChanged: (v) => setState(() => _kind = v ?? 'move_in'),
          ),
          if (unit != null && unit.data.type != 'studio') ...[
            const SizedBox(height: 12),
            RkField(
              key: const Key('inspBedrooms'),
              label: l10n.inspBedrooms,
              controller: _bedrooms,
              keyboardType: TextInputType.number,
              ltr: true,
            ),
            const SizedBox(height: 12),
            RkField(
              key: const Key('inspBathrooms'),
              label: l10n.inspBathrooms,
              controller: _bathrooms,
              keyboardType: TextInputType.number,
              ltr: true,
            ),
          ],
          if (_kind == 'move_out' && lease != null) ...[
            const SizedBox(height: 8),
            Text(
              hasMoveIn ? l10n.inspComparedWithMoveIn : l10n.inspNoSealedMoveIn,
              key: const Key('moveInNote'),
              style: TextStyle(fontSize: 13, color: t.textMuted),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: t.danger, fontSize: 14)),
          ],
          const SizedBox(height: 16),
          RkButton(
            key: const Key('startInspection'),
            label: l10n.inspStart,
            loading: _busy,
            onPressed: _start,
          ),
        ],
      ),
    );
  }
}
