import { describe, expect, it } from 'vitest';
import {
  SharedExpenseSchema,
  balances,
  compareQuotes,
  monthlyStatement,
  splitByShare,
  voteResult,
} from './building.js';

const members = [
  { id: 'a', shareBp: 5000 },
  { id: 'b', shareBp: 3000 },
  { id: 'c', shareBp: 2000 },
];

describe('splitByShare', () => {
  it('splits by share and always adds up to the total, to the halala', () => {
    expect(splitByShare(1000, members)).toEqual({ a: 500, b: 300, c: 200 });
    const odd = splitByShare(100.01, [
      { id: 'x', shareBp: 3333 },
      { id: 'y', shareBp: 3333 },
      { id: 'z', shareBp: 3334 },
    ]);
    expect(Math.round(Object.values(odd).reduce((s, v) => s + v * 100, 0))).toBe(10001);
  });
  it('returns nothing without members', () => expect(splitByShare(10, [])).toEqual({}));
});

describe('balances', () => {
  it('shows what each owner still owes after contributions', () => {
    const b = balances(
      members,
      [{ amount: 1000 }, { amount: 200 }],
      [
        { memberId: 'a', amount: 600 },
        { memberId: 'b', amount: 100 },
      ],
    );
    expect(b.find((x) => x.id === 'a')).toEqual({ id: 'a', owed: 600, paid: 600, balance: 0 });
    expect(b.find((x) => x.id === 'b')).toMatchObject({ owed: 360, paid: 100, balance: 260 });
    expect(b.find((x) => x.id === 'c')).toMatchObject({ owed: 240, balance: 240 });
  });
});

describe('quotes', () => {
  it('ranks cheapest first with the difference', () => {
    const r = compareQuotes([
      { id: '1', vendor: 'ب', amount: 5200 },
      { id: '2', vendor: 'أ', amount: 4800.5 },
    ]);
    expect(r.map((q) => q.id)).toEqual(['2', '1']);
    expect(r[0]).toMatchObject({ cheapest: true, extra: 0 });
    expect(r[1]!.extra).toBe(399.5);
  });
});

describe('votes', () => {
  it('majority needs more than half of all units', () => {
    expect(voteResult('majority', 10, Array(6).fill('yes')).status).toBe('passed');
    expect(voteResult('majority', 10, Array(5).fill('yes')).status).toBe('open');
    expect(
      voteResult('majority', 10, [...Array(5).fill('yes'), ...Array(5).fill('no')]).status,
    ).toBe('failed');
  });
  it('three quarters needs at least 75 %', () => {
    expect(voteResult('three_quarters', 8, Array(6).fill('yes')).status).toBe('passed');
    expect(voteResult('three_quarters', 8, [...Array(5).fill('yes'), 'no', 'no']).status).toBe(
      'open',
    );
    expect(
      voteResult('three_quarters', 8, [...Array(5).fill('yes'), 'no', 'no', 'abstain']).status,
    ).toBe('failed');
  });
  it('counts missing ballots', () => expect(voteResult('majority', 4, ['yes']).missing).toBe(3));
});

describe('statement and expenses', () => {
  it('summarises one month', () => {
    expect(
      monthlyStatement(
        '2026-10',
        [
          { date: '2026-10-03', amount: 1000 },
          { date: '2026-09-30', amount: 50 },
        ],
        [{ date: '2026-10-10', amount: 400.5 }],
      ),
    ).toEqual({ expenses: 1000, contributions: 400.5, net: -599.5, count: 1 });
  });
  it('requires a receipt', () => {
    expect(
      SharedExpenseSchema.safeParse({
        title: 'مصعد',
        amount: 10,
        date: '2026-10-01',
        receiptPath: '',
      }).success,
    ).toBe(false);
  });
});
