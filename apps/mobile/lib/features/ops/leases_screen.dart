import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/ops_providers.dart';
import '../../app/router.dart';
import '../../data/ops_models.dart';
import '../../domain/domain.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'lease_view.dart';

class LeasesScreen extends ConsumerWidget {
  const LeasesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final data = ref.watch(opsDataProvider).value;
    final now = riyadhToday();

    return SubPage(
      title: l10n.opsTabLeases,
      children: [
        if (data == null)
          const Skeleton(height: 100)
        else if (data.leases.isEmpty)
          EmptyState(title: l10n.opsNoLeases, body: l10n.opsChooseUnit)
        else
          Column(
            children: [
              for (final lease in data.leases)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _LeaseTile(
                    lease: lease,
                    nextDue: data
                        .paymentsOf(lease.id)
                        .where((p) => !p.data.paid)
                        .firstOrNull,
                    today: now,
                    muted: t.textMuted,
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _LeaseTile extends StatelessWidget {
  const _LeaseTile({
    required this.lease,
    required this.nextDue,
    required this.today,
    required this.muted,
  });
  final Doc<Lease> lease;
  final Doc<Payment>? nextDue;
  final String today;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final l = lease.data;
    final RkStatus? status = nextDue == null
        ? null
        : nextDue!.data.dueDate.compareTo(today) < 0
        ? RkStatus.late
        : RkStatus.warn;
    final title = [
      l.propertyName,
      l.unitLabel,
    ].where((s) => s != null && s.isNotEmpty).join(' · ');

    return Semantics(
      button: true,
      label: '${l10n.opsOpenLease}: $title',
      excludeSemantics: true,
      child: InkWell(
        key: Key('lease-${lease.id}'),
        borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
        onTap: () => context.push(Routes.leaseFor(lease.id)),
        child: RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(l.tenantName, style: TextStyle(fontSize: 15, color: muted)),
              const SizedBox(height: 2),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Text(
                  '${l.startDate} → ${l.endDate}',
                  style: TextStyle(
                    fontSize: 13,
                    color: muted,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              if (status != null) ...[
                const SizedBox(height: 8),
                StatusDot(
                  status: status,
                  label: status == RkStatus.late
                      ? l10n.opsStatusLate
                      : l10n.opsStatusDue,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class LeaseDetailScreen extends ConsumerWidget {
  const LeaseDetailScreen({super.key, required this.leaseId});
  final String leaseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final scope = ref.watch(opsScopeProvider);
    return SubPage(
      title: l10n.opsTabLeases,
      children: [LeaseView(leaseId: leaseId, canManage: scope?.staff ?? false)],
    );
  }
}
