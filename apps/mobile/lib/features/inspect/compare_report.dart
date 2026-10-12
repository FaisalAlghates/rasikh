import 'package:flutter/material.dart';

import '../../data/inspection_models.dart';
import '../../domain/inspection.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_surfaces.dart';
import '../ops/labels.dart' show money;
import 'inspect_labels.dart';

/// Move-in vs move-out. A change is only "damage" when a person decided so; the screen never judges on its own.
class CompareReport extends StatelessWidget {
  const CompareReport({
    super.key,
    required this.inspection,
    required this.leaseLabel,
    required this.moveIn,
    required this.moveOut,
  });
  final InspectionDoc inspection;
  final String leaseLabel;
  final List<InspectionItem> moveIn, moveOut;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final rows = compareInspections(
      [for (final i in moveIn) i.toRow()],
      [for (final i in moveOut) i.toRow()],
    );
    final changed = rows.where((r) => r.change != ChangeKind.same).toList();
    final open = needsAssessment(rows)
        .where((r) => r.after?.assessment == null)
        .length;
    final total = damageTotal(rows);

    return Column(
      key: const Key('compareReport'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            l10n.inspCompareTitle,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 4),
        Text(leaseLabel, style: TextStyle(fontSize: 15, color: t.textMuted)),
        const SizedBox(height: 12),
        if (changed.isEmpty)
          RkCard(child: Text(l10n.inspNoChanges, key: const Key('noChanges')))
        else
          for (final r in changed)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: RkCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  key: Key('cmp-${r.id}'),
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${roomLabel(l10n, r.room)} · ${itemLabel(l10n, r.item)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${l10n.inspColBefore}: ${r.before == null ? '—' : conditionLabel(l10n, r.before!.condition)}'
                      ' → ${l10n.inspColAfter}: ${r.after == null ? l10n.inspMissingNow : conditionLabel(l10n, r.after!.condition)}'
                      '${r.change == ChangeKind.better ? ' (${l10n.inspBetter})' : ''}',
                      style: TextStyle(fontSize: 14, color: t.textMuted),
                    ),
                    if (r.change == ChangeKind.worse) ...[
                      const SizedBox(height: 4),
                      Text(
                        switch (r.after?.assessment) {
                          'damage' =>
                            '${l10n.inspAssessDamage}${r.after?.costSar == null ? '' : ' · ${money(r.after!.costSar!)} ${l10n.inspSar}'}',
                          'wear' => l10n.inspAssessWear,
                          _ => l10n.inspNotAssessed,
                        },
                        style: TextStyle(
                          fontSize: 14,
                          color: r.after?.assessment == null
                              ? t.warning
                              : t.text,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: StatTile(
                key: const Key('damageTotal'),
                label: l10n.inspDamageTotal,
                value: money(total),
                note: l10n.inspSar,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatTile(
                key: const Key('pendingAssessment'),
                label: l10n.inspPendingAssessment,
                value: '$open',
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          l10n.inspCompareNote,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
      ],
    );
  }
}
