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
import 'labels.dart';
import 'lease_view.dart';
import 'reminders_card.dart';

/// Body of the Home tab once the user has an organization: the owner's overview or the tenant's lease.
class OpsHome extends ConsumerWidget {
  const OpsHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final scope = ref.watch(opsScopeProvider);
    if (scope == null) return const SizedBox.shrink();
    final async = ref.watch(opsDataProvider);

    if (async.hasError && !async.hasValue) {
      return EmptyState(title: l10n.opsLoadFailed);
    }
    final data = async.value;
    if (data == null) {
      return const Column(
        children: [
          Skeleton(height: 96),
          SizedBox(height: 12),
          Skeleton(height: 96),
          SizedBox(height: 12),
          Skeleton(height: 140),
        ],
      );
    }
    final now = riyadhToday();
    final reminders = data.reminders(now);

    if (!scope.staff) {
      final lease = data.leases.firstOrNull;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (lease == null)
            EmptyState(title: l10n.opsNoLeases)
          else
            LeaseView(leaseId: lease.id, canManage: false),
          const SizedBox(height: 20),
          _NavRow(
            navKey: const Key('nav-inspections'),
            icon: Icons.fact_check_outlined,
            label: l10n.inspTab,
            route: Routes.inspections,
          ),
          const SizedBox(height: 10),
          RemindersCard(reminders: reminders, leases: data.leases),
        ],
      );
    }
    return _StaffOverview(data: data, reminders: reminders, today: now);
  }
}

class _StaffOverview extends StatelessWidget {
  const _StaffOverview({
    required this.data,
    required this.reminders,
    required this.today,
  });
  final OpsData data;
  final List<Reminder> reminders;
  final String today;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final year = int.parse(today.substring(0, 4));
    final totals = yearTotals(
      year,
      [
        for (final p in data.payments)
          (dueDate: p.data.dueDate, amount: p.data.amount, paid: p.data.paid),
      ],
      [
        for (final e in data.expenses)
          (date: e.data.date, amount: e.data.amount),
      ],
    );
    final active = data.leases
        .where(
          (l) =>
              l.data.status != 'ended' && l.data.endDate.compareTo(today) >= 0,
        )
        .length;
    final upcoming =
        data.payments
            .where((p) => !p.data.paid && p.data.dueDate.compareTo(today) >= 0)
            .toList()
          ..sort((a, b) => a.data.dueDate.compareTo(b.data.dueDate));

    String place(Payment p) {
      final lease = data.leases
          .where((l) => l.id == p.leaseId)
          .firstOrNull
          ?.data;
      return [
        lease?.propertyName,
        lease?.unitLabel,
      ].where((s) => s != null && s.isNotEmpty).join(' ');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: StatTile(
                key: const Key('stat-units'),
                label: l10n.opsUnits,
                value: '${data.units.length}',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatTile(
                key: const Key('stat-leases'),
                label: l10n.opsActiveLeases,
                value: '$active',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: StatTile(
                key: const Key('stat-collected'),
                label: l10n.opsCollected,
                value: money(totals.collected),
                note: l10n.opsSar,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatTile(
                key: const Key('stat-outstanding'),
                label: l10n.opsOutstanding,
                value: money(totals.outstanding),
                note: l10n.opsSar,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        RemindersCard(reminders: reminders, leases: data.leases),
        const SizedBox(height: 20),
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  l10n.opsUpcoming,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (upcoming.isEmpty)
                Text(
                  l10n.opsNoUpcoming,
                  style: TextStyle(fontSize: 15, color: t.textMuted),
                )
              else
                for (final p in upcoming.take(5))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${p.data.dueDate} · ${place(p.data)}',
                            style: const TextStyle(fontSize: 15),
                          ),
                        ),
                        Text(
                          '${money(p.data.amount)} ${l10n.opsSar}',
                          style: TextStyle(fontSize: 14, color: t.textMuted),
                        ),
                      ],
                    ),
                  ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _NavRow(
          navKey: const Key('nav-properties'),
          icon: Icons.apartment_rounded,
          label: l10n.opsTabProperties,
          route: Routes.properties,
        ),
        _NavRow(
          navKey: const Key('nav-leases'),
          icon: Icons.description_outlined,
          label: l10n.opsTabLeases,
          route: Routes.leases,
        ),
        _NavRow(
          navKey: const Key('nav-inspections'),
          icon: Icons.fact_check_outlined,
          label: l10n.inspTab,
          route: Routes.inspections,
        ),
        _NavRow(
          navKey: const Key('nav-expenses'),
          icon: Icons.receipt_long_outlined,
          label: l10n.opsTabExpenses,
          route: Routes.expenses,
        ),
        _NavRow(
          navKey: const Key('nav-report'),
          icon: Icons.insights_outlined,
          label: l10n.opsTabReport,
          route: Routes.report,
        ),
      ],
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    required this.navKey,
    required this.icon,
    required this.label,
    required this.route,
  });
  final Key navKey;
  final IconData icon;
  final String label, route;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Semantics(
        button: true,
        label: label,
        excludeSemantics: true,
        child: InkWell(
          key: navKey,
          borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
          onTap: () => context.push(route),
          child: Container(
            constraints: const BoxConstraints(minHeight: 56),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
              border: Border.all(color: t.border.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(icon, size: 22, color: t.brandText),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(label, style: const TextStyle(fontSize: 17)),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 22,
                  color: t.textMuted,
                  textDirection: Directionality.of(context),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
