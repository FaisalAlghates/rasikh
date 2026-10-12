import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/broker_providers.dart';
import '../../app/ops_providers.dart';
import '../../domain/broker.dart';
import '../../domain/domain.dart' show riyadhToday;
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'broker_labels.dart';

final _dateRe = RegExp(r'^\d{4}-\d{2}-\d{2}$');
final _timeRe = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');

/// One lead: funnel, viewings, brokerage contracts and the immutable log (create-only; no edit or delete here).
class LeadScreen extends ConsumerStatefulWidget {
  const LeadScreen({super.key, required this.leadId});
  final String leadId;
  @override
  ConsumerState<LeadScreen> createState() => _LeadScreenState();
}

class _LeadScreenState extends ConsumerState<LeadScreen> {
  final _note = TextEditingController();
  final _place = TextEditingController();
  final _vDate = TextEditingController();
  final _vTime = TextEditingController(text: '15:00');
  final _cNo = TextEditingController();
  final _cStart = TextEditingController(text: riyadhToday());
  final _cEnd = TextEditingController();
  String _cType = 'rent';
  String? _error;

  @override
  void dispose() {
    for (final c in [_note, _place, _vDate, _vTime, _cNo, _cStart, _cEnd]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guard(Future<void> Function() fn) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _error = null);
    try {
      await fn();
    } catch (_) {
      if (mounted) setState(() => _error = l10n.brkFailed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final repo = ref.watch(brokerRepositoryProvider);
    final leads = ref.watch(brokerLeadsProvider).value;
    final lead = leads?.where((x) => x.id == widget.leadId).firstOrNull;
    final viewings = (ref.watch(brokerViewingsProvider).value ?? const [])
        .where((v) => v.data.leadId == widget.leadId)
        .toList();
    final contracts = (ref.watch(brokerContractsProvider).value ?? const [])
        .where((c) => c.data.leadId == widget.leadId)
        .toList();
    final log =
        (ref.watch(brokerActivityProvider).value ?? const [])
            .where((a) => a.data.leadId == widget.leadId)
            .toList()
          ..sort(
            (a, b) => (a.data.at?.millisecondsSinceEpoch ?? 1 << 50).compareTo(
              b.data.at?.millisecondsSinceEpoch ?? 1 << 50,
            ),
          );

    if (scope == null || lead == null) {
      return SubPage(
        title: l10n.brkLeads,
        children: [
          leads == null
              ? const Skeleton(height: 120)
              : EmptyState(title: l10n.brkNone),
        ],
      );
    }
    final org = scope.orgId, uid = scope.uid;
    final status = lead.data.status;

    return SubPage(
      title: lead.data.name,
      children: [
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lead.data.phone,
                textDirection: TextDirection.ltr,
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
              const SizedBox(height: 4),
              Text(
                '${l10n.brkStatus}: ${statusLabel(l10n, status)}',
                key: const Key('leadStatus'),
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s in leadStatuses.where(
                    (s) => canMoveLead(status, s),
                  ))
                    RkButton(
                      key: Key('move-$s'),
                      expand: false,
                      variant: RkButtonVariant.quiet,
                      label: '${l10n.brkMoveTo} ${statusLabel(l10n, s)}',
                      onPressed: () => _guard(
                        () => repo.moveLead(
                          org,
                          uid,
                          widget.leadId,
                          status,
                          s,
                          fromLabel: statusLabel(l10n, status),
                          toLabel: statusLabel(l10n, s),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Semantics(
            liveRegion: true,
            child: Text(_error!, style: TextStyle(color: t.danger)),
          ),
        ],
        const SizedBox(height: 16),
        _section(l10n.brkViewings, [
          for (final v in viewings)
            Row(
              key: Key('viewingRow-${v.id}'),
              children: [
                Expanded(
                  child: Text(
                    '${v.data.placeLabel} · ${DateTime.tryParse(v.data.scheduledAt)?.toLocal().toString().substring(0, 16) ?? v.data.scheduledAt}',
                  ),
                ),
                if (v.data.done)
                  Text(l10n.brkViewingDone, style: TextStyle(color: t.success))
                else
                  RkButton(
                    key: const Key('viewingDone'),
                    expand: false,
                    variant: RkButtonVariant.quiet,
                    label: l10n.brkMarkDone,
                    onPressed: () => _guard(
                      () => repo.markViewingDone(
                        org,
                        uid,
                        widget.leadId,
                        v.id,
                        v.data.placeLabel,
                      ),
                    ),
                  ),
              ],
            ),
          RkField(
            key: const Key('vwPlace'),
            label: l10n.brkPlace,
            controller: _place,
          ),
          RkDateField(
            key: const Key('vwDate'),
            label: l10n.brkWhen,
            controller: _vDate,
            pickerLabel: l10n.brkWhen,
          ),
          RkField(
            key: const Key('vwTime'),
            label: '${l10n.brkWhen} (HH:mm)',
            controller: _vTime,
            ltr: true,
          ),
          RkButton(
            key: const Key('addViewing'),
            label: l10n.brkScheduleViewing,
            onPressed: () {
              final when =
                  _dateRe.hasMatch(_vDate.text.trim()) &&
                      _timeRe.hasMatch(_vTime.text.trim())
                  ? DateTime.tryParse(
                      '${_vDate.text.trim()}T${_vTime.text.trim()}:00',
                    )
                  : null;
              if (_place.text.trim().length < 2 || when == null) {
                setState(() => _error = l10n.brkRequired);
                return;
              }
              _guard(() async {
                await repo.addViewing(
                  org,
                  uid,
                  widget.leadId,
                  _place.text.trim(),
                  when,
                );
                _place.clear();
                _vDate.clear();
              });
            },
          ),
        ]),
        const SizedBox(height: 16),
        _section(l10n.brkContracts, [
          for (final c in contracts)
            Text(
              key: Key('contractRow-${c.id}'),
              '${contractTypeLabel(l10n, c.data.type)} · ${c.data.contractNo} · ${c.data.startDate} → ${c.data.endDate}',
            ),
          RkSelect<String>(
            label: l10n.brkContractType,
            value: _cType,
            options: [
              for (final v in brokerageTypes)
                RkSelectOption(v, contractTypeLabel(l10n, v)),
            ],
            onChanged: (v) => setState(() => _cType = v ?? 'rent'),
          ),
          RkField(
            key: const Key('bcNo'),
            label: l10n.brkContractNo,
            controller: _cNo,
          ),
          RkDateField(
            key: const Key('bcStart'),
            label: l10n.brkStart,
            controller: _cStart,
            pickerLabel: l10n.brkStart,
          ),
          RkDateField(
            key: const Key('bcEnd'),
            label: l10n.brkEnd,
            controller: _cEnd,
            pickerLabel: l10n.brkEnd,
          ),
          RkButton(
            key: const Key('addContract'),
            label: l10n.brkAddContract,
            onPressed: () {
              final s = _cStart.text.trim(), e = _cEnd.text.trim();
              if (_cNo.text.trim().length < 3 ||
                  !_dateRe.hasMatch(s) ||
                  !_dateRe.hasMatch(e) ||
                  e.compareTo(s) <= 0) {
                setState(() => _error = l10n.brkRequired);
                return;
              }
              _guard(() async {
                await repo.addContract(
                  org,
                  uid,
                  widget.leadId,
                  _cType,
                  _cNo.text.trim(),
                  s,
                  e,
                );
                _cNo.clear();
                _cEnd.clear();
              });
            },
          ),
        ]),
        const SizedBox(height: 16),
        _section(l10n.brkLog, [
          Text(
            l10n.brkLogHint,
            style: TextStyle(fontSize: 13, color: t.textMuted),
          ),
          for (final a in log)
            Text(
              key: Key('logRow-${a.id}'),
              '${a.data.at?.toLocal().toString().substring(0, 16) ?? '…'} · ${logTypeLabel(l10n, a.data.type)}: ${a.data.text}',
              style: const TextStyle(fontSize: 13),
            ),
          RkField(
            key: const Key('logNote'),
            label: l10n.brkNote,
            controller: _note,
          ),
          RkButton(
            key: const Key('addNote'),
            label: l10n.brkAddNote,
            onPressed: () {
              final text = _note.text.trim();
              if (text.isEmpty) return;
              _guard(() async {
                await repo.addNote(org, uid, widget.leadId, text);
                _note.clear();
              });
            },
          ),
        ]),
      ],
    );
  }

  Widget _section(String title, List<Widget> children) => RkCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
        for (final c in children) ...[const SizedBox(height: 10), c],
      ],
    ),
  );
}
