import { z } from 'zod';

/**
 * Building / owners-association bookkeeping. Rasikh complements the official Mullak platform: these are
 * the association's own records, not an official registration. Money is handled in halalas (integers).
 */

const toHalalas = (sar: number) => Math.round(sar * 100);

export const BuildingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  propertyId: z.string().optional(),
});

export const BuildingMemberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  unitLabel: z.string().trim().min(1).max(40),
  /** Share of common expenses in basis points (10000 = 100 %), e.g. by floor area. */
  shareBp: z.number().int().min(1).max(10000),
});
export type BuildingMember = z.infer<typeof BuildingMemberSchema>;

export const SharedExpenseSchema = z.object({
  title: z.string().trim().min(2).max(100),
  amount: z.number().positive().max(100_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** A receipt is required for every shared expense so each owner can see what was paid. */
  receiptPath: z.string().min(1),
});
export type SharedExpense = z.infer<typeof SharedExpenseSchema>;

interface Share {
  id: string;
  shareBp: number;
}

/**
 * Splits an amount over the members by share, to the halala, with the leftover halalas given to the largest
 * remainders so the parts always add up to the total.
 */
export function splitByShare(amountSar: number, members: Share[]): Record<string, number> {
  const total = toHalalas(amountSar);
  const weight = members.reduce((s, m) => s + m.shareBp, 0);
  if (weight <= 0) return {};
  const parts = members.map((m) => {
    const exact = (total * m.shareBp) / weight;
    return { id: m.id, base: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = total - parts.reduce((s, p) => s + p.base, 0);
  for (const p of [...parts].sort((a, b) => b.rem - a.rem || a.id.localeCompare(b.id))) {
    if (left <= 0) break;
    p.base += 1;
    left -= 1;
  }
  return Object.fromEntries(parts.map((p) => [p.id, p.base / 100]));
}

export interface MemberBalance {
  id: string;
  owed: number;
  paid: number;
  /** Positive = still owes the association. */
  balance: number;
}

export function balances(
  members: Share[],
  expenses: Array<{ amount: number }>,
  contributions: Array<{ memberId: string; amount: number }>,
): MemberBalance[] {
  const owed = new Map(members.map((m) => [m.id, 0]));
  for (const e of expenses) {
    for (const [id, v] of Object.entries(splitByShare(e.amount, members))) {
      owed.set(id, Math.round(((owed.get(id) ?? 0) + v) * 100) / 100);
    }
  }
  return members.map((m) => {
    const paid = contributions
      .filter((c) => c.memberId === m.id)
      .reduce((s, c) => s + toHalalas(c.amount), 0);
    const o = toHalalas(owed.get(m.id) ?? 0);
    return { id: m.id, owed: o / 100, paid: paid / 100, balance: (o - paid) / 100 };
  });
}

export interface Quote {
  id: string;
  vendor: string;
  amount: number;
}

/** Sorted cheapest first, with each quote's difference from the cheapest. */
export function compareQuotes(quotes: Quote[]) {
  const sorted = [...quotes].sort(
    (a, b) => a.amount - b.amount || a.vendor.localeCompare(b.vendor),
  );
  const best = sorted[0]?.amount ?? 0;
  return sorted.map((q, i) => ({
    ...q,
    cheapest: i === 0,
    extra: (toHalalas(q.amount) - toHalalas(best)) / 100,
  }));
}

export const VOTE_RULES = { majority: 0.5, three_quarters: 0.75 } as const;
export type VoteRule = keyof typeof VOTE_RULES;
export type Ballot = 'yes' | 'no' | 'abstain';

export interface VoteResult {
  yes: number;
  no: number;
  abstain: number;
  missing: number;
  status: 'passed' | 'failed' | 'open';
}

/**
 * One vote per unit. Majority = more than half of ALL units say yes; three-quarters = at least 75 % of all
 * units. The rule is the association's own setting, not legal advice. `open` while the outcome can still change.
 */
export function voteResult(rule: VoteRule, eligible: number, ballots: Ballot[]): VoteResult {
  const yes = ballots.filter((b) => b === 'yes').length;
  const no = ballots.filter((b) => b === 'no').length;
  const abstain = ballots.filter((b) => b === 'abstain').length;
  const missing = Math.max(0, eligible - ballots.length);
  const need = (yesCount: number) =>
    rule === 'majority' ? yesCount > eligible * 0.5 : yesCount >= eligible * 0.75;
  const status = need(yes) ? 'passed' : need(yes + missing) ? 'open' : 'failed';
  return { yes, no, abstain, missing, status };
}

export function monthlyStatement(
  month: string,
  expenses: Array<{ date: string; amount: number }>,
  contributions: Array<{ date: string; amount: number }>,
) {
  const sum = (xs: Array<{ amount: number }>) =>
    xs.reduce((s, x) => s + toHalalas(x.amount), 0) / 100;
  const e = expenses.filter((x) => x.date.startsWith(month));
  const c = contributions.filter((x) => x.date.startsWith(month));
  return {
    expenses: sum(e),
    contributions: sum(c),
    net: (toHalalas(sum(c)) - toHalalas(sum(e))) / 100,
    count: e.length,
  };
}
