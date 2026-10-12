import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/ops_providers.dart';
import '../../app/router.dart';
import '../../data/lease_draft.dart';
import '../../data/ops_repository.dart';
import '../../domain/domain.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'labels.dart';

/// New lease for one unit. Saving also writes the whole payment schedule; the Riyadh rent-freeze note is
/// informational only and never blocks saving.
class LeaseFormScreen extends ConsumerStatefulWidget {
  const LeaseFormScreen({super.key, required this.unitId});
  final String unitId;

  @override
  ConsumerState<LeaseFormScreen> createState() => _LeaseFormScreenState();
}

class _LeaseFormScreenState extends ConsumerState<LeaseFormScreen> {
  final _ejar = TextEditingController();
  final _tenant = TextEditingController();
  final _email = TextEditingController();
  final _start = TextEditingController();
  final _end = TextEditingController();
  final _rent = TextEditingController();
  final _prev = TextEditingController();
  final _deposit = TextEditingController();
  PaymentCycle _cycle = PaymentCycle.monthly;
  Map<LeaseIssue, bool> _issues = const {};
  bool _busy = false;

  List<TextEditingController> get _all => [
    _ejar,
    _tenant,
    _email,
    _start,
    _end,
    _rent,
    _prev,
    _deposit,
  ];

  @override
  void dispose() {
    for (final c in _all) {
      c.dispose();
    }
    super.dispose();
  }

  LeaseDraft get _draft => LeaseDraft(
    ejarNo: _ejar.text,
    tenantName: _tenant.text,
    tenantEmail: _email.text,
    startDate: _start.text,
    endDate: _end.text,
    annualRent: _rent.text,
    depositAmount: _deposit.text,
    cycle: _cycle,
  );

  ({bool warn, double? maxAnnualRent})? _freeze(String city) {
    final prev = parseAmount(_prev.text);
    final next = parseAmount(_rent.text);
    final start = asciiDigits(_start.text);
    if (prev == null || next == null || prev <= 0 || next <= 0) return null;
    if (!isIsoDate(start)) return null;
    final r = rentFreezeCheck(
      city: city,
      previousAnnualRent: prev,
      newAnnualRent: next,
      newStartDate: start,
    );
    return r.warn ? r : null;
  }

  Future<void> _save(
    String orgId,
    String propertyId,
    String propertyName,
    String unitLabel,
  ) async {
    final l10n = AppLocalizations.of(context);
    final issues = _draft.validate();
    setState(() => _issues = issues);
    if (issues.isNotEmpty) return;

    setState(() => _busy = true);
    try {
      final res = await ref
          .read(opsRepositoryProvider)
          .createLease(
            orgId,
            _draft.toLease(
              unitId: widget.unitId,
              propertyId: propertyId,
              propertyName: propertyName,
              unitLabel: unitLabel,
            ),
          );
      if (!mounted) return;
      final invite = switch (res.invite) {
        InviteStatus.linked => ' ${l10n.opsInviteLinked}',
        InviteStatus.pending => ' ${l10n.opsInvitePending}',
        null => '',
      };
      showRkToast(
        context,
        '${l10n.opsLeaseSaved}$invite',
        tone: RkToastTone.success,
      );
      context.pushReplacement(Routes.leaseFor(res.leaseId));
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsErrorGeneric, tone: RkToastTone.danger);
        setState(() => _busy = false);
      }
    }
  }

  String? _err(LeaseIssue i, String msg) => _issues[i] == true ? msg : null;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final data = ref.watch(opsDataProvider).value;
    final unit = data?.units.where((u) => u.id == widget.unitId).firstOrNull;
    final property = unit == null
        ? null
        : data!.properties
              .where((p) => p.id == unit.data.propertyId)
              .firstOrNull;

    if (scope == null || data == null || unit == null || property == null) {
      return SubPage(
        title: l10n.opsAddLease,
        children: [
          if (data == null)
            const Skeleton(height: 200)
          else
            EmptyState(title: l10n.opsChooseUnit),
        ],
      );
    }
    final freeze = _freeze(property.data.city);
    final pick = l10n.opsPickDate;

    return SubPage(
      title: '${l10n.opsAddLease} · ${unit.data.label}',
      children: [
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              RkField(
                key: const Key('ejarNo'),
                label: l10n.opsEjarNo,
                hint: l10n.opsEjarHint,
                controller: _ejar,
                ltr: true,
                error: _err(LeaseIssue.ejarNo, l10n.opsInvalidEjar),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('tenantName'),
                label: l10n.opsTenantName,
                controller: _tenant,
                error: _err(LeaseIssue.tenantName, l10n.opsRequired),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('tenantEmail'),
                label: l10n.opsTenantEmail,
                controller: _email,
                ltr: true,
                keyboardType: TextInputType.emailAddress,
                error: _err(LeaseIssue.tenantEmail, l10n.opsInvalidEmail),
              ),
              const SizedBox(height: 12),
              RkDateField(
                key: const Key('startDate'),
                label: l10n.opsStartDate,
                controller: _start,
                pickerLabel: pick,
                onChanged: (_) => setState(() {}),
                error: _err(LeaseIssue.startDate, l10n.opsInvalidDate),
              ),
              const SizedBox(height: 12),
              RkDateField(
                key: const Key('endDate'),
                label: l10n.opsEndDate,
                controller: _end,
                pickerLabel: pick,
                onChanged: (_) => setState(() {}),
                error:
                    _err(LeaseIssue.endDate, l10n.opsInvalidDate) ??
                    _err(LeaseIssue.endBeforeStart, l10n.opsEndBeforeStart),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('annualRent'),
                label: l10n.opsAnnualRent,
                controller: _rent,
                ltr: true,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                onChanged: (_) => setState(() {}),
                error: _err(LeaseIssue.rent, l10n.opsInvalidAmount),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('previousRent'),
                label: l10n.opsPreviousRent,
                controller: _prev,
                ltr: true,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              RkSelect<PaymentCycle>(
                label: l10n.opsCycle,
                value: _cycle,
                options: [
                  for (final c in PaymentCycle.values)
                    RkSelectOption(c, cycleLabel(l10n, c)),
                ],
                onChanged: (v) =>
                    setState(() => _cycle = v ?? PaymentCycle.monthly),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('deposit'),
                label: l10n.opsDeposit,
                hint: l10n.opsDepositNote,
                controller: _deposit,
                ltr: true,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                error: _err(LeaseIssue.deposit, l10n.opsInvalidAmount),
              ),
              if (freeze != null) ...[
                const SizedBox(height: 16),
                Semantics(
                  liveRegion: true,
                  child: Container(
                    key: const Key('freeze-warning'),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(
                        RasikhTokens.radiusMd,
                      ),
                      border: Border.all(color: t.warning),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.opsFreezeWarn(money(freeze.maxAnnualRent ?? 0)),
                          style: TextStyle(fontSize: 15, color: t.warning),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l10n.opsFreezeNote,
                          style: TextStyle(fontSize: 13, color: t.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              RkButton(
                key: const Key('saveLease'),
                label: l10n.opsSaveLease,
                loading: _busy,
                onPressed: () => _save(
                  scope.orgId,
                  unit.data.propertyId,
                  property.data.name,
                  unit.data.label,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
