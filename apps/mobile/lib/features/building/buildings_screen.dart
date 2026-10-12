import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/building_providers.dart';
import '../../app/ops_providers.dart';
import '../../data/building_repository.dart';
import '../../data/lease_draft.dart';
import '../../data/ops_models.dart' show Doc;
import '../../data/photo_picker.dart';
import '../../domain/building.dart';
import '../../domain/domain.dart' show riyadhToday;
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import '../ops/labels.dart' show money;

/// Owners-association bookkeeping (staff). Complements the official Mullak platform; not an official registration.
class BuildingsScreen extends ConsumerStatefulWidget {
  const BuildingsScreen({super.key});

  @override
  ConsumerState<BuildingsScreen> createState() => _BuildingsScreenState();
}

class _BuildingsScreenState extends ConsumerState<BuildingsScreen> {
  final _name = TextEditingController();
  String? _picked;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final list = ref.watch(buildingsProvider).value;
    final current = list
        ?.where((b) => b.id == (_picked ?? list.firstOrNull?.id))
        .firstOrNull;

    return SubPage(
      title: l10n.bdTab,
      children: [
        Text(l10n.bdMullak, style: TextStyle(fontSize: 13, color: t.textMuted)),
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              RkField(
                key: const Key('buildingName'),
                label: l10n.bdBuildingName,
                controller: _name,
              ),
              const SizedBox(height: 12),
              RkButton(
                key: const Key('addBuilding'),
                label: l10n.bdAddBuilding,
                onPressed: scope == null
                    ? null
                    : () async {
                        if (_name.text.trim().length < 2) return;
                        await ref
                            .read(buildingRepositoryProvider)
                            .addBuilding(scope.orgId, _name.text.trim());
                        _name.clear();
                      },
              ),
            ],
          ),
        ),
        if (list != null && list.length > 1)
          RkSelect<String>(
            key: ValueKey('pick-${current?.id}'),
            label: l10n.bdBuilding,
            value: current?.id,
            options: [for (final b in list) RkSelectOption(b.id, b.data)],
            onChanged: (v) => setState(() => _picked = v),
          ),
        if (list == null)
          const Skeleton(height: 100)
        else if (current == null || scope == null)
          EmptyState(title: l10n.bdNone)
        else
          _Board(orgId: scope.orgId, id: current.id, name: current.data),
      ],
    );
  }
}

class _Board extends ConsumerStatefulWidget {
  const _Board({required this.orgId, required this.id, required this.name});
  final String orgId, id, name;

  @override
  ConsumerState<_Board> createState() => _BoardState();
}

class _BoardState extends ConsumerState<_Board> {
  final _mName = TextEditingController();
  final _mUnit = TextEditingController();
  final _mShare = TextEditingController();
  final _eTitle = TextEditingController();
  final _eAmount = TextEditingController();
  final _cAmount = TextEditingController();
  final _qReq = TextEditingController();
  final _qVendor = TextEditingController();
  final _qAmount = TextEditingController();
  final _vTitle = TextEditingController();
  String _vRule = 'majority';
  String? _payer;
  PickedFile? _receipt;
  String? _error;

  BuildingRepository get _repo => ref.read(buildingRepositoryProvider);

  @override
  void dispose() {
    for (final c in [
      _mName,
      _mUnit,
      _mShare,
      _eTitle,
      _eAmount,
      _cAmount,
      _qReq,
      _qVendor,
      _qAmount,
      _vTitle,
    ]) {
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
      if (mounted) setState(() => _error = l10n.bdFailed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final at = (orgId: widget.orgId, id: widget.id);
    final members =
        ref.watch(bMembersProvider(at)).value ?? const <Doc<BMember>>[];
    final expenses =
        ref.watch(bExpensesProvider(at)).value ?? const <Doc<BExpense>>[];
    final contribs =
        ref.watch(bContributionsProvider(at)).value ??
        const <Doc<BContribution>>[];
    final quotes =
        ref.watch(bQuotesProvider(at)).value ?? const <Doc<BQuote>>[];
    final votes = ref.watch(bVotesProvider(at)).value ?? const <Doc<BVote>>[];
    final today = riyadhToday();

    final shares = [for (final m in members) Share(m.id, m.data.shareBp)];
    final bal = balances(
      shares,
      [for (final e in expenses) e.data.amount],
      [
        for (final c in contribs)
          (memberId: c.data.memberId, amount: c.data.amount),
      ],
    );
    final shareTotal = shares.fold<int>(0, (s, x) => s + x.shareBp);
    final stmt = monthlyStatement(
      today.substring(0, 7),
      [for (final e in expenses) (date: e.data.date, amount: e.data.amount)],
      [for (final c in contribs) (date: c.data.date, amount: c.data.amount)],
    );
    final payer = _payer ?? members.firstOrNull?.id;
    BMember? member(String id) =>
        members.where((m) => m.id == id).firstOrNull?.data;

    Widget h(String s) => Semantics(
      header: true,
      child: Text(
        s,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
      ),
    );
    const gap = SizedBox(height: 12);

    return Column(
      key: const Key('buildingBoard'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          widget.name,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        ),
        if (_error != null)
          Text(
            _error!,
            key: const Key('buildingError'),
            style: TextStyle(color: t.danger),
          ),
        gap,
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              h(l10n.bdMembers),
              for (final m in members)
                Text(
                  '${m.data.name} · ${m.data.unitLabel} · ${m.data.shareBp / 100}%',
                  key: Key('member-${m.data.unitLabel}'),
                ),
              if (members.isNotEmpty && shareTotal != 10000)
                Text(
                  l10n.bdSharesWarn('${shareTotal / 100}'),
                  key: const Key('sharesWarn'),
                  style: TextStyle(color: t.warning, fontSize: 13),
                ),
              gap,
              RkField(
                key: const Key('mName'),
                label: l10n.bdOwnerName,
                controller: _mName,
              ),
              gap,
              RkField(
                key: const Key('mUnit'),
                label: l10n.bdUnitLabel,
                controller: _mUnit,
              ),
              gap,
              RkField(
                key: const Key('mShare'),
                label: l10n.bdSharePct,
                controller: _mShare,
                ltr: true,
                keyboardType: TextInputType.number,
              ),
              gap,
              RkButton(
                key: const Key('addMember'),
                label: l10n.bdAddMember,
                variant: RkButtonVariant.quiet,
                onPressed: () => _guard(() async {
                  final pct = parseAmount(_mShare.text);
                  if (_mName.text.trim().length < 2 ||
                      _mUnit.text.trim().isEmpty ||
                      pct == null ||
                      pct <= 0 ||
                      pct > 100) {
                    throw StateError('invalid');
                  }
                  await _repo.addMember(
                    widget.orgId,
                    widget.id,
                    BMember(
                      _mName.text.trim(),
                      _mUnit.text.trim(),
                      (pct * 100).round(),
                    ),
                  );
                  _mName.clear();
                  _mUnit.clear();
                  _mShare.clear();
                }),
              ),
            ],
          ),
        ),
        gap,
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              h(l10n.bdExpenses),
              for (final e in expenses)
                Text(
                  '${e.data.date} · ${e.data.title} · ${money(e.data.amount)} ${l10n.bdSar}',
                  key: Key('expense-${e.id}'),
                ),
              gap,
              RkField(
                key: const Key('eTitle'),
                label: l10n.bdExpenseTitle,
                controller: _eTitle,
              ),
              gap,
              RkField(
                key: const Key('eAmount'),
                label: l10n.bdAmount,
                controller: _eAmount,
                ltr: true,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              gap,
              RkButton(
                key: const Key('pickReceipt'),
                label: _receipt == null
                    ? l10n.bdPickReceipt
                    : '${l10n.bdReceipt} ✓',
                variant: RkButtonVariant.quiet,
                onPressed: () async {
                  final p = await ref.read(photoPickerProvider).pick();
                  if (p != null) setState(() => _receipt = p);
                },
              ),
              gap,
              RkButton(
                key: const Key('addExpense'),
                label: l10n.bdAddExpense,
                variant: RkButtonVariant.quiet,
                onPressed: () {
                  if (_receipt == null) {
                    showRkToast(
                      context,
                      l10n.bdReceiptRequired,
                      tone: RkToastTone.danger,
                    );
                    return;
                  }
                  _guard(() async {
                    final amount = parseAmount(_eAmount.text);
                    if (_eTitle.text.trim().length < 2 ||
                        amount == null ||
                        amount <= 0) {
                      throw StateError('invalid');
                    }
                    await _repo.addExpense(
                      widget.orgId,
                      widget.id,
                      _eTitle.text.trim(),
                      amount,
                      today,
                      _receipt!,
                    );
                    _eTitle.clear();
                    _eAmount.clear();
                    setState(() => _receipt = null);
                  });
                },
              ),
            ],
          ),
        ),
        gap,
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              h(l10n.bdBalances),
              for (final b in bal)
                Text(
                  '${member(b.id)?.name} · ${l10n.bdOwed} ${money(b.owed)} · ${l10n.bdPaid} ${money(b.paid)} · ${l10n.bdRemaining} ${money(b.balance)} ${l10n.bdSar}',
                  key: Key('balance-${member(b.id)?.unitLabel}'),
                ),
              if (members.isNotEmpty) ...[
                gap,
                RkSelect<String>(
                  key: ValueKey('payer-$payer'),
                  label: l10n.bdOwnerName,
                  value: payer,
                  options: [
                    for (final m in members)
                      RkSelectOption(
                        m.id,
                        '${m.data.name} · ${m.data.unitLabel}',
                      ),
                  ],
                  onChanged: (v) => setState(() => _payer = v),
                ),
                gap,
                RkField(
                  key: const Key('cAmount'),
                  label: l10n.bdAmount,
                  controller: _cAmount,
                  ltr: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                ),
                gap,
                RkButton(
                  key: const Key('addContribution'),
                  label: l10n.bdAddContribution,
                  variant: RkButtonVariant.quiet,
                  onPressed: () => _guard(() async {
                    final amount = parseAmount(_cAmount.text);
                    if (payer == null || amount == null || amount <= 0) {
                      throw StateError('invalid');
                    }
                    await _repo.addContribution(
                      widget.orgId,
                      widget.id,
                      BContribution(payer, amount, today),
                    );
                    _cAmount.clear();
                  }),
                ),
              ],
              const SizedBox(height: 6),
              Text(
                l10n.bdRecordsOnly,
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
            ],
          ),
        ),
        gap,
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              h(l10n.bdQuotes),
              for (final req in {for (final q in quotes) q.data.request}) ...[
                Text(req, style: const TextStyle(fontWeight: FontWeight.w500)),
                for (final r in compareQuotes([
                  for (final q in quotes.where((q) => q.data.request == req))
                    (id: q.id, vendor: q.data.vendor, amount: q.data.amount),
                ]))
                  Text(
                    '${r.vendor} · ${money(r.amount)} ${l10n.bdSar} ${r.cheapest ? '· ${l10n.bdCheapest}' : '· +${money(r.extra)}'}',
                    key: Key(r.cheapest ? 'quote-cheapest' : 'quote-other'),
                  ),
              ],
              gap,
              RkField(
                key: const Key('qReq'),
                label: l10n.bdQuoteFor,
                controller: _qReq,
              ),
              gap,
              RkField(
                key: const Key('qVendor'),
                label: l10n.bdVendor,
                controller: _qVendor,
              ),
              gap,
              RkField(
                key: const Key('qAmount'),
                label: l10n.bdAmount,
                controller: _qAmount,
                ltr: true,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              gap,
              RkButton(
                key: const Key('addQuote'),
                label: l10n.bdAddQuote,
                variant: RkButtonVariant.quiet,
                onPressed: () => _guard(() async {
                  final amount = parseAmount(_qAmount.text);
                  if (_qReq.text.trim().length < 2 ||
                      _qVendor.text.trim().length < 2 ||
                      amount == null ||
                      amount <= 0) {
                    throw StateError('invalid');
                  }
                  await _repo.addQuote(
                    widget.orgId,
                    widget.id,
                    BQuote(_qReq.text.trim(), _qVendor.text.trim(), amount),
                  );
                  _qVendor.clear();
                  _qAmount.clear();
                }),
              ),
            ],
          ),
        ),
        gap,
        RkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              h(l10n.bdVotes),
              for (final v in votes)
                _VoteBox(at: at, vote: v, members: members),
              gap,
              RkField(
                key: const Key('vTitle'),
                label: l10n.bdVoteTitle,
                controller: _vTitle,
              ),
              gap,
              RkSelect<String>(
                label: l10n.bdRule,
                value: _vRule,
                options: [
                  RkSelectOption('majority', l10n.bdRuleMajority),
                  RkSelectOption('three_quarters', l10n.bdRuleThreeQuarters),
                ],
                onChanged: (v) => setState(() => _vRule = v ?? 'majority'),
              ),
              gap,
              RkButton(
                key: const Key('addVote'),
                label: l10n.bdAddVote,
                variant: RkButtonVariant.quiet,
                onPressed: () => _guard(() async {
                  if (_vTitle.text.trim().length < 2) {
                    throw StateError('invalid');
                  }
                  await _repo.addVote(
                    widget.orgId,
                    widget.id,
                    _vTitle.text.trim(),
                    _vRule,
                  );
                  _vTitle.clear();
                }),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.bdRuleNote,
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
            ],
          ),
        ),
        gap,
        RkCard(
          child: Column(
            key: const Key('statement'),
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              h('${l10n.bdStatement} · ${today.substring(0, 7)}'),
              Text(
                '${l10n.bdStExpenses}: ${money(stmt.expenses)} ${l10n.bdSar}',
                key: const Key('stmt-expenses'),
              ),
              Text(
                '${l10n.bdStContributions}: ${money(stmt.contributions)} ${l10n.bdSar}',
                key: const Key('stmt-contributions'),
              ),
              Text(
                '${l10n.bdStNet}: ${money(stmt.net)} ${l10n.bdSar}',
                key: const Key('stmt-net'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _VoteBox extends ConsumerWidget {
  const _VoteBox({required this.at, required this.vote, required this.members});
  final BuildingRef at;
  final Doc<BVote> vote;
  final List<Doc<BMember>> members;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final ballots =
        ref
            .watch(
              bBallotsProvider((orgId: at.orgId, id: at.id, vote: vote.id)),
            )
            .value ??
        const <Doc<String>>[];
    final res = voteResult(vote.data.rule, members.length, [
      for (final b in ballots) b.data,
    ]);
    final voted = {for (final b in ballots) b.id};
    final next = members.where((m) => !voted.contains(m.id)).firstOrNull;
    final repo = ref.read(buildingRepositoryProvider);
    final status = switch (res.status) {
      'passed' => l10n.bdVotePassed,
      'failed' => l10n.bdVoteFailed,
      _ => l10n.bdVoteOpen,
    };
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        key: Key('vote-${vote.id}'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${vote.data.title} · ${vote.data.rule == 'majority' ? l10n.bdRuleMajority : l10n.bdRuleThreeQuarters}',
          ),
          Text(
            '$status · ${l10n.bdYes} ${res.yes} · ${l10n.bdNo} ${res.no} · ${l10n.bdAbstain} ${res.abstain} · ${l10n.bdMissing} ${res.missing}',
            key: Key('voteResult-${vote.id}'),
          ),
          if (!vote.data.closed && next != null) ...[
            Text('${next.data.name} · ${next.data.unitLabel}'),
            Wrap(
              spacing: 8,
              children: [
                for (final (c, label) in [
                  ('yes', l10n.bdYes),
                  ('no', l10n.bdNo),
                  ('abstain', l10n.bdAbstain),
                ])
                  OutlinedButton(
                    key: Key('ballot-${vote.id}-$c'),
                    onPressed: () =>
                        repo.castBallot(at.orgId, at.id, vote.id, next.id, c),
                    child: Text(label),
                  ),
              ],
            ),
          ],
          if (!vote.data.closed)
            TextButton(
              key: Key('closeVote-${vote.id}'),
              onPressed: () => repo.closeVote(at.orgId, at.id, vote.id),
              child: Text(l10n.bdCloseVote),
            ),
        ],
      ),
    );
  }
}
