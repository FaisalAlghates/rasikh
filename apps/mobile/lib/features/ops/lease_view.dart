import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/ops_providers.dart';
import '../../data/ops_models.dart';
import '../../data/ops_repository.dart';
import '../../domain/domain.dart';
import '../../domain/ics.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import 'labels.dart';

const _ltrNumbers = [FontFeature.tabularFigures()];

/// One lease with its payment schedule. Staff can record payments and invite the tenant;
/// the tenant sees the same schedule read-only. Dates stay as YYYY-MM-DD strings, so no time zone can shift them.
class LeaseView extends ConsumerStatefulWidget {
  const LeaseView({super.key, required this.leaseId, required this.canManage});
  final String leaseId;
  final bool canManage;

  @override
  ConsumerState<LeaseView> createState() => _LeaseViewState();
}

class _LeaseViewState extends ConsumerState<LeaseView> {
  String? _busy;

  Future<void> _markPaid(String orgId, String paymentId) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _busy = paymentId);
    try {
      await ref
          .read(opsRepositoryProvider)
          .markPaid(orgId, paymentId, riyadhToday());
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsErrorGeneric, tone: RkToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _invite(String orgId, String email) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _busy = 'invite');
    try {
      final status = await ref
          .read(opsRepositoryProvider)
          .inviteTenant(orgId, widget.leaseId, email);
      if (mounted) {
        showRkToast(
          context,
          status == InviteStatus.linked
              ? l10n.opsInviteLinked
              : l10n.opsInvitePending,
          tone: RkToastTone.success,
        );
      }
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsErrorGeneric, tone: RkToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _calendar(Doc<Lease> lease, List<Doc<Payment>> payments) async {
    final l10n = AppLocalizations.of(context);
    try {
      final events = leaseIcsEvents(
        leaseId: lease.id,
        endDate: lease.data.endDate,
        unitLabel: lease.data.unitLabel,
        propertyName: lease.data.propertyName,
        payments: [
          for (final p in payments)
            IcsPayment(p.id, p.data.dueDate, p.data.amount, p.data.paid),
        ],
        labels: IcsLabels(
          payment: l10n.opsCalPayment,
          leaseEnd: l10n.opsCalLeaseEnd,
          renewal: l10n.opsCalRenewal,
        ),
      );
      await ref
          .read(calendarExporterProvider)
          .export(
            fileName: 'rasikh-${lease.data.ejarContractNo}.ics',
            ics: buildIcs('راسخ · Rasikh', events),
            title: l10n.opsAddToCalendar,
          );
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsCalendarFailed, tone: RkToastTone.danger);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final data = ref.watch(opsDataProvider).value;
    final lease = data?.leases.where((l) => l.id == widget.leaseId).firstOrNull;
    if (scope == null || data == null || lease == null) {
      return EmptyState(title: l10n.opsNoLeases);
    }
    final payments = data.paymentsOf(lease.id);
    final now = riyadhToday();
    final l = lease.data;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RkCard(
          child: Column(
            key: const Key('lease-card'),
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  [
                    l.propertyName,
                    l.unitLabel,
                  ].where((s) => s != null && s.isNotEmpty).join(' · '),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Text(
                  '${l.ejarContractNo} · ${l.startDate} → ${l.endDate}',
                  style: TextStyle(
                    fontSize: 14,
                    color: t.textMuted,
                    fontFeatures: _ltrNumbers,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${money(l.annualRent)} ${l10n.opsSar} · ${cycleLabel(l10n, l.cycle)}',
                style: TextStyle(fontSize: 15, color: t.textMuted),
              ),
              if (widget.canManage) ...[
                const SizedBox(height: 4),
                Text(
                  '${l10n.opsTenantLabel}: ${l.tenantName}',
                  style: TextStyle(fontSize: 15, color: t.textMuted),
                ),
              ],
              const SizedBox(height: 4),
              Text(
                l10n.opsRenewalNotice(renewalNoticeDate(l.endDate)),
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
              const SizedBox(height: 16),
              RkButton(
                key: const Key('addToCalendar'),
                label: l10n.opsAddToCalendar,
                variant: RkButtonVariant.quiet,
                onPressed: () => _calendar(lease, payments),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.opsCalendarNote,
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
              if (widget.canManage &&
                  l.tenantUid == null &&
                  l.tenantEmail != null) ...[
                const SizedBox(height: 12),
                RkButton(
                  key: const Key('inviteTenant'),
                  label: l10n.opsInviteTenant,
                  variant: RkButtonVariant.quiet,
                  loading: _busy == 'invite',
                  onPressed: () => _invite(scope.orgId, l.tenantEmail!),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
        Semantics(
          header: true,
          child: Text(
            l10n.opsSchedule,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 8),
        for (final p in payments)
          _PaymentRow(
            key: Key('pay-${p.data.dueDate}'),
            payment: p,
            late: !p.data.paid && p.data.dueDate.compareTo(now) < 0,
            canMarkPaid: widget.canManage,
            busy: _busy == p.id,
            onMarkPaid: () => _markPaid(scope.orgId, p.id),
          ),
        const SizedBox(height: 8),
        Text(
          l10n.opsRecordsOnly,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
      ],
    );
  }
}

class _PaymentRow extends StatelessWidget {
  const _PaymentRow({
    super.key,
    required this.payment,
    required this.late,
    required this.canMarkPaid,
    required this.busy,
    required this.onMarkPaid,
  });
  final Doc<Payment> payment;
  final bool late, canMarkPaid, busy;
  final VoidCallback onMarkPaid;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final p = payment.data;
    return Container(
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: t.border.withValues(alpha: 0.2))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: Text(
                    p.dueDate,
                    style: const TextStyle(
                      fontSize: 15,
                      fontFeatures: _ltrNumbers,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${money(p.amount)} ${l10n.opsSar}',
                  style: TextStyle(fontSize: 14, color: t.textMuted),
                ),
              ],
            ),
          ),
          StatusDot(
            status: p.paid
                ? RkStatus.ok
                : late
                ? RkStatus.late
                : RkStatus.warn,
            label: p.paid
                ? l10n.opsStatusPaid
                : late
                ? l10n.opsStatusLate
                : l10n.opsStatusDue,
          ),
          if (canMarkPaid && !p.paid) ...[
            const SizedBox(width: 12),
            RkButton(
              key: Key('markPaid-${p.dueDate}'),
              label: l10n.opsMarkPaid,
              variant: RkButtonVariant.quiet,
              expand: false,
              loading: busy,
              onPressed: onMarkPaid,
            ),
          ],
        ],
      ),
    );
  }
}
