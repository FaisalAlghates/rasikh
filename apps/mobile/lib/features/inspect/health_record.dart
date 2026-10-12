import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/inspection_providers.dart';
import '../../app/ops_providers.dart';
import '../../data/inspection_models.dart';
import '../../domain/domain.dart';
import '../../domain/inspection.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_surfaces.dart';
import '../ops/labels.dart' show categoryLabel, money;

/// Property Health Record: one timeline per property, computed from the leases, signed inspections and
/// expenses the other modules already keep, so it can never contradict them.
class HealthRecord extends ConsumerStatefulWidget {
  const HealthRecord({super.key});

  @override
  ConsumerState<HealthRecord> createState() => _HealthRecordState();
}

class _HealthRecordState extends ConsumerState<HealthRecord> {
  String? _propertyId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final ops = ref.watch(opsDataProvider).value;
    final inspections = ref.watch(inspectionsProvider).value;
    if (ops == null || inspections == null) return const Skeleton(height: 160);

    // Owners pick among their properties; a tenant's record is the property of their own lease.
    final propertyIds = {
      for (final p in ops.properties) p.id,
      for (final l in ops.leases) l.data.propertyId,
    }.toList();
    if (propertyIds.isEmpty) return EmptyState(title: l10n.inspRecordEmpty);
    final chosen = propertyIds.contains(_propertyId)
        ? _propertyId!
        : propertyIds.first;
    final names = {
      for (final p in ops.properties) p.id: p.data.name,
      for (final l in ops.leases)
        if (l.data.propertyName != null)
          l.data.propertyId: l.data.propertyName!,
    };

    final events = buildTimeline(
      chosen,
      today: riyadhToday(),
      leases: [
        for (final l in ops.leases)
          TimelineLease(
            l.id,
            l.data.propertyId,
            l.data.startDate,
            l.data.endDate,
            unitLabel: l.data.unitLabel,
            status: l.data.status,
          ),
      ],
      inspections: [
        for (final i in inspections)
          TimelineInspection(
            i.id,
            i.data.propertyId,
            i.data.kind,
            i.data.status,
            sealedOn: riyadhDay(i.data.sealedAt),
            unitLabel: ops.leases
                .where((l) => l.id == i.data.leaseId)
                .firstOrNull
                ?.data
                .unitLabel,
          ),
      ],
      expenses: [
        for (final e in ops.expenses)
          TimelineExpense(
            e.id,
            e.data.propertyId,
            e.data.date,
            e.data.category,
            e.data.amount,
          ),
      ],
    );

    String title(HealthEvent e) {
      final where = e.unitLabel == null ? '' : ' · ${e.unitLabel}';
      return switch (e.kind) {
        HealthKind.leaseStarted => '${l10n.inspEvLeaseStarted}$where',
        HealthKind.leaseEnded => '${l10n.inspEvLeaseEnded}$where',
        HealthKind.inspectionSealed =>
          '${e.detail == 'move_out' ? l10n.inspEvMoveOut : l10n.inspEvMoveIn}$where',
        HealthKind.expense =>
          '${l10n.inspEvExpense} · ${categoryLabel(l10n, e.detail ?? 'other')}',
      };
    }

    return Column(
      key: const Key('healthRecord'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (propertyIds.length > 1) ...[
          RkSelect<String>(
            key: ValueKey('record-$chosen'),
            label: l10n.inspRecordProperty,
            value: chosen,
            options: [
              for (final id in propertyIds) RkSelectOption(id, names[id] ?? id),
            ],
            onChanged: (v) => setState(() => _propertyId = v),
          ),
          const SizedBox(height: 16),
        ],
        if (events.isEmpty)
          EmptyState(title: l10n.inspRecordEmpty)
        else
          RkTimeline(
            semanticLabel: l10n.inspRecordTitle,
            events: [
              for (final e in events)
                TimelineEvent(
                  title: title(e),
                  date: e.date,
                  detail: e.amount == null
                      ? null
                      : '${money(e.amount!)} ${l10n.inspSar}',
                ),
            ],
          ),
        const SizedBox(height: 16),
        Text(
          l10n.inspRecordNote,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
      ],
    );
  }
}
