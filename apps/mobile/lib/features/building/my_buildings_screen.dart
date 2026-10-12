import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/building_providers.dart';
import '../../app/ops_providers.dart';
import '../../data/building_repository.dart';
import '../../data/ops_models.dart' show Doc;
import '../../domain/building.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import '../ops/labels.dart' show money;

/// What a unit owner sees: the ledger of their building, their own balance (a free in-app reminder when they
/// still owe), and the votes they can cast for their own unit.
class MyBuildingsScreen extends ConsumerWidget {
  const MyBuildingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final scope = ref.watch(opsScopeProvider);
    final list = ref.watch(myBuildingsProvider).value;
    return SubPage(
      title: l10n.bdMyBuildings,
      children: [
        if (list == null || scope == null)
          const Skeleton(height: 120)
        else if (list.where((m) => m.data.orgId == scope.orgId).isEmpty)
          EmptyState(title: l10n.bdNone)
        else
          for (final m in list.where((m) => m.data.orgId == scope.orgId))
            _OwnerBuilding(m: m.data),
      ],
    );
  }
}

class _OwnerBuilding extends ConsumerWidget {
  const _OwnerBuilding({required this.m});
  final BMembership m;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final at = (orgId: m.orgId, id: m.buildingId);
    final members =
        ref.watch(bMembersProvider(at)).value ?? const <Doc<BMember>>[];
    final expenses =
        ref.watch(bExpensesProvider(at)).value ?? const <Doc<BExpense>>[];
    final contribs =
        ref.watch(bContributionsProvider(at)).value ??
        const <Doc<BContribution>>[];
    final votes = ref.watch(bVotesProvider(at)).value ?? const <Doc<BVote>>[];
    final bal = balances(
      [for (final x in members) Share(x.id, x.data.shareBp)],
      [for (final e in expenses) e.data.amount],
      [
        for (final c in contribs)
          (memberId: c.data.memberId, amount: c.data.amount),
      ],
    ).where((b) => b.id == m.memberId).firstOrNull;

    return RkCard(
      child: Column(
        key: const Key('ownerBuilding'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            m.name,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          Text(
            l10n.bdMullak,
            style: TextStyle(fontSize: 13, color: t.textMuted),
          ),
          if (bal != null) ...[
            const SizedBox(height: 12),
            Semantics(
              liveRegion: bal.balance > 0,
              child: Text(
                bal.balance > 0
                    ? l10n.bdYouOwe(money(bal.balance))
                    : l10n.bdNothingOwed,
                key: const Key('myBalance'),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: bal.balance > 0 ? t.warning : t.success,
                ),
              ),
            ),
            Text(
              '${l10n.bdOwed} ${money(bal.owed)} · ${l10n.bdPaid} ${money(bal.paid)} ${l10n.bdSar}',
            ),
          ],
          const SizedBox(height: 12),
          for (final e in expenses)
            Text(
              '${e.data.date} · ${e.data.title} · ${money(e.data.amount)} ${l10n.bdSar}',
              key: Key('ownerExpense-${e.id}'),
            ),
          for (final v in votes)
            _MyVote(at: at, vote: v, members: members, memberId: m.memberId),
        ],
      ),
    );
  }
}

class _MyVote extends ConsumerWidget {
  const _MyVote({
    required this.at,
    required this.vote,
    required this.members,
    required this.memberId,
  });
  final BuildingRef at;
  final Doc<BVote> vote;
  final List<Doc<BMember>> members;
  final String memberId;

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
    final voted = ballots.any((b) => b.id == memberId);
    final status = switch (res.status) {
      'passed' => l10n.bdVotePassed,
      'failed' => l10n.bdVoteFailed,
      _ => l10n.bdVoteOpen,
    };
    final repo = ref.read(buildingRepositoryProvider);
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        key: Key('myVote-${vote.id}'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${vote.data.title} · ${vote.data.rule == 'majority' ? l10n.bdRuleMajority : l10n.bdRuleThreeQuarters}',
          ),
          Text(
            '$status · ${l10n.bdYes} ${res.yes} · ${l10n.bdNo} ${res.no} · ${l10n.bdAbstain} ${res.abstain} · ${l10n.bdMissing} ${res.missing}',
            key: Key('myVoteResult-${vote.id}'),
          ),
          if (!vote.data.closed && !voted)
            Wrap(
              spacing: 8,
              children: [
                for (final (c, label) in [
                  ('yes', l10n.bdYes),
                  ('no', l10n.bdNo),
                  ('abstain', l10n.bdAbstain),
                ])
                  OutlinedButton(
                    key: Key('myBallot-${vote.id}-$c'),
                    onPressed: () =>
                        repo.castBallot(at.orgId, at.id, vote.id, memberId, c),
                    child: Text(label),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
