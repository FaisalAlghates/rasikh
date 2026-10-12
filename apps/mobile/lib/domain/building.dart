// Dart port of packages/shared/src/building.ts (same rules, same fixtures in test/building_domain_test.dart).
// Money is handled in halalas (integers) so parts always add up to the total.

int _h(double sar) => (sar * 100).round();

class Share {
  const Share(this.id, this.shareBp);
  final String id;
  final int shareBp;
}

/// Splits an amount by share, to the halala; leftover halalas go to the largest remainders.
Map<String, double> splitByShare(double amountSar, List<Share> members) {
  final total = _h(amountSar);
  final weight = members.fold<int>(0, (s, m) => s + m.shareBp);
  if (weight <= 0) return {};
  final parts = [
    for (final m in members)
      () {
        final exact = total * m.shareBp / weight;
        return (id: m.id, base: exact.floor(), rem: exact - exact.floor());
      }(),
  ];
  var left = total - parts.fold<int>(0, (s, p) => s + p.base);
  final bonus = <String, int>{};
  final order = [...parts]
    ..sort((a, b) {
      final c = b.rem.compareTo(a.rem);
      return c != 0 ? c : a.id.compareTo(b.id);
    });
  for (final p in order) {
    if (left <= 0) break;
    bonus[p.id] = 1;
    left--;
  }
  return {for (final p in parts) p.id: (p.base + (bonus[p.id] ?? 0)) / 100};
}

class MemberBalance {
  const MemberBalance(this.id, this.owed, this.paid, this.balance);
  final String id;
  final double owed, paid, balance;
}

List<MemberBalance> balances(
  List<Share> members,
  List<double> expenses,
  List<({String memberId, double amount})> contributions,
) {
  final owed = {for (final m in members) m.id: 0};
  for (final e in expenses) {
    splitByShare(
      e,
      members,
    ).forEach((id, v) => owed[id] = (owed[id] ?? 0) + _h(v));
  }
  return [
    for (final m in members)
      () {
        final paid = contributions
            .where((c) => c.memberId == m.id)
            .fold<int>(0, (s, c) => s + _h(c.amount));
        final o = owed[m.id] ?? 0;
        return MemberBalance(m.id, o / 100, paid / 100, (o - paid) / 100);
      }(),
  ];
}

class QuoteRank {
  const QuoteRank(this.id, this.vendor, this.amount, this.cheapest, this.extra);
  final String id, vendor;
  final double amount, extra;
  final bool cheapest;
}

/// Cheapest first, with each quote's difference from the cheapest.
List<QuoteRank> compareQuotes(
  List<({String id, String vendor, double amount})> quotes,
) {
  final sorted = [...quotes]
    ..sort((a, b) {
      final c = a.amount.compareTo(b.amount);
      return c != 0 ? c : a.vendor.compareTo(b.vendor);
    });
  final best = sorted.isEmpty ? 0.0 : sorted.first.amount;
  return [
    for (var i = 0; i < sorted.length; i++)
      QuoteRank(
        sorted[i].id,
        sorted[i].vendor,
        sorted[i].amount,
        i == 0,
        (_h(sorted[i].amount) - _h(best)) / 100,
      ),
  ];
}

class VoteResult {
  const VoteResult(this.yes, this.no, this.abstain, this.missing, this.status);
  final int yes, no, abstain, missing;
  final String status; // passed | failed | open
}

/// One vote per unit. Majority = more than half of ALL units say yes; three_quarters = at least 75 %.
/// The rule is the association's own setting, not legal advice. `open` while the outcome can still change.
VoteResult voteResult(String rule, int eligible, List<String> ballots) {
  final yes = ballots.where((b) => b == 'yes').length;
  final no = ballots.where((b) => b == 'no').length;
  final abstain = ballots.where((b) => b == 'abstain').length;
  final missing = eligible - ballots.length < 0 ? 0 : eligible - ballots.length;
  bool need(int y) =>
      rule == 'majority' ? y > eligible * 0.5 : y >= eligible * 0.75;
  final status = need(yes)
      ? 'passed'
      : need(yes + missing)
      ? 'open'
      : 'failed';
  return VoteResult(yes, no, abstain, missing, status);
}

({double expenses, double contributions, double net, int count})
monthlyStatement(
  String month,
  List<({String date, double amount})> expenses,
  List<({String date, double amount})> contributions,
) {
  final e = expenses.where((x) => x.date.startsWith(month)).toList();
  final c = contributions.where((x) => x.date.startsWith(month)).toList();
  final es = e.fold<int>(0, (s, x) => s + _h(x.amount));
  final cs = c.fold<int>(0, (s, x) => s + _h(x.amount));
  return (
    expenses: es / 100,
    contributions: cs / 100,
    net: (cs - es) / 100,
    count: e.length,
  );
}
