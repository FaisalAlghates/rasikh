import 'package:flutter/material.dart';

import '../../data/ops_models.dart';
import '../../domain/domain.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_surfaces.dart';
import 'labels.dart';

/// Reminders computed on the device from the user's own records: free, no server job, no push service.
class RemindersCard extends StatelessWidget {
  const RemindersCard({
    super.key,
    required this.reminders,
    required this.leases,
  });
  final List<Reminder> reminders;
  final List<Doc<Lease>> leases;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    return RkCard(
      child: Column(
        key: const Key('reminders'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              l10n.opsNotifications,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 12),
          if (reminders.isEmpty)
            Text(
              l10n.opsNoNotifications,
              style: TextStyle(fontSize: 15, color: t.textMuted),
            )
          else
            for (final r in reminders)
              Padding(
                key: Key('reminder-${r.kind.name}-${r.paymentId ?? r.leaseId}'),
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _where(l10n, r),
                        style: const TextStyle(fontSize: 15),
                      ),
                    ),
                    const SizedBox(width: 12),
                    StatusDot(
                      status: r.kind == ReminderKind.paymentLate
                          ? RkStatus.late
                          : RkStatus.warn,
                      label: l10n.opsDaysLeft(r.days.abs()),
                    ),
                  ],
                ),
              ),
          const SizedBox(height: 4),
          Text(
            l10n.opsRemindersFree,
            style: TextStyle(fontSize: 13, color: t.textMuted),
          ),
        ],
      ),
    );
  }

  String _where(AppLocalizations l10n, Reminder r) {
    final lease = leases.where((l) => l.id == r.leaseId).firstOrNull?.data;
    final place = [
      lease?.propertyName,
      lease?.unitLabel,
    ].where((s) => s != null && s.isNotEmpty).join(' ');
    return place.isEmpty
        ? reminderLabel(l10n, r.kind)
        : '${reminderLabel(l10n, r.kind)} · $place';
  }
}
