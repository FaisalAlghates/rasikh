import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/broker_providers.dart';
import '../../app/ops_providers.dart';
import '../../data/broker_repository.dart';
import '../../domain/broker.dart';
import '../../domain/domain.dart' show daysBetween, riyadhToday;
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'broker_labels.dart';

final _dateRe = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// The broker's workspace: license profile with reminders, a new-lead form and the list of leads.
class BrokerScreen extends ConsumerStatefulWidget {
  const BrokerScreen({super.key});
  @override
  ConsumerState<BrokerScreen> createState() => _BrokerScreenState();
}

class _BrokerScreenState extends ConsumerState<BrokerScreen> {
  final _pName = TextEditingController();
  final _pFal = TextEditingController();
  final _pExp = TextEditingController();
  final _lName = TextEditingController();
  final _lPhone = TextEditingController();
  final _lBudget = TextEditingController();
  String _interest = 'rent';
  String _source = 'call';
  String? _profileMsg;
  bool _profileOk = false;
  String? _leadError;
  bool _loaded = false;

  @override
  void dispose() {
    for (final c in [_pName, _pFal, _pExp, _lName, _lPhone, _lBudget]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _saveProfile(OpsScope scope) async {
    final l10n = AppLocalizations.of(context);
    final name = _pName.text.trim();
    if (name.length < 2 ||
        !isFalLicense(_pFal.text.trim()) ||
        !_dateRe.hasMatch(_pExp.text.trim())) {
      setState(() {
        _profileOk = false;
        _profileMsg = l10n.brkRequired;
      });
      return;
    }
    try {
      await ref
          .read(brokerRepositoryProvider)
          .saveProfile(
            scope.orgId,
            scope.uid,
            BrokerProfile(name, _pFal.text.trim(), _pExp.text.trim()),
          );
      if (!mounted) return;
      setState(() {
        _profileOk = true;
        _profileMsg = l10n.brkSaved;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _profileOk = false;
        _profileMsg = l10n.brkFailed;
      });
    }
  }

  Future<void> _addLead(OpsScope scope) async {
    final l10n = AppLocalizations.of(context);
    final budget = double.tryParse(_lBudget.text.trim());
    if (_lName.text.trim().length < 2 || !isSaudiPhone(_lPhone.text.trim())) {
      setState(() => _leadError = l10n.brkRequired);
      return;
    }
    try {
      await ref
          .read(brokerRepositoryProvider)
          .addLead(
            scope.orgId,
            scope.uid,
            BLead(
              name: _lName.text.trim(),
              phone: _lPhone.text.trim(),
              interest: _interest,
              source: _source,
              status: 'new',
              budgetSar: budget,
            ),
          );
      if (!mounted) return;
      _lName.clear();
      _lPhone.clear();
      _lBudget.clear();
      setState(() => _leadError = null);
    } catch (_) {
      if (mounted) setState(() => _leadError = l10n.brkFailed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final profile = ref.watch(brokerProfileProvider).value;
    final leads = ref.watch(brokerLeadsProvider).value;

    if (!_loaded && profile != null) {
      _loaded = true;
      _pName.text = profile.displayName;
      _pFal.text = profile.falNo;
      _pExp.text = profile.falExpiry;
    }
    final today = riyadhToday();
    final state = profile == null ? null : falState(profile.falExpiry, today);
    final reminder = profile == null
        ? null
        : falReminder(profile.falExpiry, today);
    final left = profile == null ? 0 : daysBetween(today, profile.falExpiry);

    return SubPage(
      title: l10n.brkTab,
      children: [
        Text(l10n.brkIntro, style: TextStyle(fontSize: 13, color: t.textMuted)),
        const SizedBox(height: 16),
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.brkProfile,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (state != null) ...[
                const SizedBox(height: 8),
                Semantics(
                  liveRegion: state != FalState.valid,
                  child: Text(
                    key: const Key('falState'),
                    state == FalState.expired
                        ? l10n.brkFalExpired
                        : reminder != null
                        ? l10n.brkFalExpiring(left)
                        : l10n.brkFalValid,
                    style: TextStyle(
                      fontSize: 13,
                      color: state == FalState.valid ? t.success : t.danger,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              RkField(
                key: const Key('bpName'),
                label: l10n.brkDisplayName,
                controller: _pName,
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('bpFal'),
                label: l10n.brkFalNo,
                controller: _pFal,
                keyboardType: TextInputType.number,
                ltr: true,
              ),
              const SizedBox(height: 12),
              RkDateField(
                key: const Key('bpExp'),
                label: l10n.brkFalExpiry,
                controller: _pExp,
                pickerLabel: l10n.brkFalExpiry,
              ),
              const SizedBox(height: 12),
              RkButton(
                key: const Key('saveProfile'),
                label: l10n.brkSaveProfile,
                onPressed: scope == null ? null : () => _saveProfile(scope),
              ),
              if (_profileMsg != null) ...[
                const SizedBox(height: 8),
                Text(
                  _profileMsg!,
                  style: TextStyle(
                    fontSize: 13,
                    color: _profileOk ? t.success : t.danger,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        RkButton(
          key: const Key('openAdChecker'),
          label: l10n.brkAdTitle,
          variant: RkButtonVariant.quiet,
          onPressed: () => context.push('/broker/ad'),
        ),
        const SizedBox(height: 16),
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.brkAddLead,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('ldName'),
                label: l10n.brkName,
                controller: _lName,
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('ldPhone'),
                label: l10n.brkPhone,
                controller: _lPhone,
                keyboardType: TextInputType.phone,
                ltr: true,
              ),
              const SizedBox(height: 12),
              RkField(
                key: const Key('ldBudget'),
                label: l10n.brkBudget,
                controller: _lBudget,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              RkSelect<String>(
                label: l10n.brkInterest,
                value: _interest,
                options: [
                  for (final v in leadInterests)
                    RkSelectOption(v, interestLabel(l10n, v)),
                ],
                onChanged: (v) => setState(() => _interest = v ?? 'rent'),
              ),
              const SizedBox(height: 12),
              RkSelect<String>(
                label: l10n.brkSource,
                value: _source,
                options: [
                  for (final v in leadSources)
                    RkSelectOption(v, sourceLabel(l10n, v)),
                ],
                onChanged: (v) => setState(() => _source = v ?? 'call'),
              ),
              const SizedBox(height: 12),
              RkButton(
                key: const Key('addLead'),
                label: l10n.brkAddLead,
                onPressed: scope == null ? null : () => _addLead(scope),
              ),
              if (_leadError != null) ...[
                const SizedBox(height: 8),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    _leadError!,
                    style: TextStyle(fontSize: 13, color: t.danger),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.brkLeads,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        if (leads == null)
          const Skeleton(height: 72)
        else if (leads.isEmpty)
          EmptyState(title: l10n.brkNone)
        else
          for (final lead in leads) ...[
            RkCard(
              child: Row(
                key: Key('leadRow-${lead.id}'),
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          lead.data.name,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${interestLabel(l10n, lead.data.interest)} · ${statusLabel(l10n, lead.data.status)}',
                          style: TextStyle(fontSize: 13, color: t.textMuted),
                        ),
                      ],
                    ),
                  ),
                  RkButton(
                    label: l10n.brkOpen,
                    expand: false,
                    variant: RkButtonVariant.quiet,
                    onPressed: () => context.push('/broker/lead/${lead.id}'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
      ],
    );
  }
}
