import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/domain/building.dart';

// Same fixtures as packages/shared/src/building.test.ts.
void main() {
  const members = [Share('a', 5000), Share('b', 3000), Share('c', 2000)];

  test('splitByShare adds up to the total, to the halala', () {
    expect(splitByShare(1000, members), {'a': 500, 'b': 300, 'c': 200});
    final odd = splitByShare(100.01, const [
      Share('x', 3333),
      Share('y', 3333),
      Share('z', 3334),
    ]);
    expect(odd.values.fold<int>(0, (s, v) => s + (v * 100).round()), 10001);
    expect(splitByShare(10, const []), isEmpty);
  });

  test('balances after contributions', () {
    final b = balances(
      members,
      [1000, 200],
      [(memberId: 'a', amount: 600), (memberId: 'b', amount: 100)],
    );
    expect((b[0].owed, b[0].paid, b[0].balance), (600.0, 600.0, 0.0));
    expect((b[1].owed, b[1].paid, b[1].balance), (360.0, 100.0, 260.0));
    expect(b[2].balance, 240);
  });

  test('quotes: cheapest first with the difference', () {
    final r = compareQuotes([
      (id: '1', vendor: 'ب', amount: 5200),
      (id: '2', vendor: 'أ', amount: 4800.5),
    ]);
    expect(r.map((q) => q.id), ['2', '1']);
    expect(r[0].cheapest, isTrue);
    expect(r[1].extra, 399.5);
  });

  test('votes', () {
    List<String> n(int c, String v) => List.filled(c, v);
    expect(voteResult('majority', 10, n(6, 'yes')).status, 'passed');
    expect(voteResult('majority', 10, n(5, 'yes')).status, 'open');
    expect(
      voteResult('majority', 10, [...n(5, 'yes'), ...n(5, 'no')]).status,
      'failed',
    );
    expect(voteResult('three_quarters', 8, n(6, 'yes')).status, 'passed');
    expect(
      voteResult('three_quarters', 8, [...n(5, 'yes'), 'no', 'no']).status,
      'open',
    );
    expect(
      voteResult('three_quarters', 8, [
        ...n(5, 'yes'),
        'no',
        'no',
        'abstain',
      ]).status,
      'failed',
    );
    expect(voteResult('majority', 4, ['yes']).missing, 3);
  });

  test('monthly statement', () {
    final s = monthlyStatement(
      '2026-10',
      [(date: '2026-10-03', amount: 1000), (date: '2026-09-30', amount: 50)],
      [(date: '2026-10-10', amount: 400.5)],
    );
    expect(
      (s.expenses, s.contributions, s.net, s.count),
      (1000.0, 400.5, -599.5, 1),
    );
  });
}
