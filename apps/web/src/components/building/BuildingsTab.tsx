'use client';

import {
  BuildingMemberSchema,
  SharedExpenseSchema,
  balances,
  compareQuotes,
  monthlyStatement,
  voteResult,
  type Ballot,
  type VoteRule,
} from '@rasikh/shared';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb, firebaseStorage } from '@/lib/firebase';
import { today, useCollectionAt, useOrgCollection } from '@/lib/ops/hooks';
import { money } from '@/lib/ops/types';

interface BuildingDoc {
  name: string;
}
interface MemberDoc {
  name: string;
  unitLabel: string;
  shareBp: number;
}
interface ExpenseDoc {
  title: string;
  amount: number;
  date: string;
  receiptPath: string;
}
interface ContribDoc {
  memberId: string;
  amount: number;
  date: string;
}
interface QuoteDoc {
  request: string;
  vendor: string;
  amount: number;
}
interface VoteDoc {
  title: string;
  rule: VoteRule;
  closed: boolean;
}

/** Owners-association bookkeeping. Complements the official Mullak platform; it is not an official registration. */
export function BuildingsTab({ orgId }: { orgId: string }) {
  const t = useTranslations('bldg');
  const buildings = useOrgCollection<BuildingDoc>(orgId, 'buildings');
  const [selected, setSelected] = useState<string>();
  const [name, setName] = useState('');
  const current = buildings.rows.find((b) => b.id === (selected ?? buildings.rows[0]?.id));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-text-muted">{t('mullak')}</p>
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          aria-label={t('addBuilding')}
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2) return;
            void addDoc(collection(firebaseDb(), `orgs/${orgId}/buildings`), {
              name: name.trim(),
            }).then(() => setName(''));
          }}
        >
          <div className="min-w-56 flex-1">
            <Field
              id="bd-name"
              label={t('buildingName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit">{t('addBuilding')}</Button>
        </form>
      </Card>
      {buildings.rows.length > 1 && (
        <NativeSelect
          id="bd-pick"
          label={t('building')}
          value={current?.id}
          onChange={(e) => setSelected(e.target.value)}
          options={buildings.rows.map((b) => ({ value: b.id, label: b.data.name }))}
        />
      )}
      {current ? (
        <BuildingBoard orgId={orgId} id={current.id} name={current.data.name} />
      ) : (
        <EmptyState title={t('none')} />
      )}
    </div>
  );
}

function BuildingBoard({ orgId, id, name }: { orgId: string; id: string; name: string }) {
  const t = useTranslations('bldg');
  const base = `orgs/${orgId}/buildings/${id}`;
  const members = useCollectionAt<MemberDoc>(`${base}/members`);
  const expenses = useCollectionAt<ExpenseDoc>(`${base}/expenses`);
  const contribs = useCollectionAt<ContribDoc>(`${base}/contributions`);
  const quotes = useCollectionAt<QuoteDoc>(`${base}/quotes`);
  const votes = useCollectionAt<VoteDoc>(`${base}/votes`);
  const db = firebaseDb();
  const [error, setError] = useState<string>();

  // member form
  const [m, setM] = useState({ name: '', unit: '', share: '' });
  // expense form
  const [e, setE] = useState({ title: '', amount: '', date: today() });
  const [receipt, setReceipt] = useState<File>();
  // contribution
  const [c, setC] = useState({ memberId: '', amount: '' });
  // quote
  const [q, setQ] = useState({ request: '', vendor: '', amount: '' });
  // vote
  const [v, setV] = useState({ title: '', rule: 'majority' });
  const [month, setMonth] = useState(today().slice(0, 7));

  const fail = () => setError(t('failed'));
  const guard = async (fn: () => Promise<void>) => {
    setError(undefined);
    try {
      await fn();
    } catch {
      fail();
    }
  };

  const shares = members.rows.map((x) => ({ id: x.id, shareBp: x.data.shareBp }));
  const bal = balances(
    shares,
    expenses.rows.map((x) => x.data),
    contribs.rows.map((x) => x.data),
  );
  const shareTotal = shares.reduce((s, x) => s + x.shareBp, 0);
  const memberName = (mid: string) => members.rows.find((x) => x.id === mid)?.data;

  return (
    <div className="flex flex-col gap-6" data-testid="building-board">
      <h2 className="text-h3 font-semibold">{name}</h2>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <Card className="flex flex-col gap-4">
        <h3 className="text-body font-semibold">{t('members')}</h3>
        <ul className="flex flex-col gap-1 text-small">
          {members.rows.map((x) => (
            <li key={x.id} data-testid="member-row">
              {x.data.name} · {x.data.unitLabel} · {x.data.shareBp / 100}%
            </li>
          ))}
        </ul>
        {shareTotal !== 10000 && members.rows.length > 0 && (
          <p className="text-caption text-warning">{t('sharesWarn', { pct: shareTotal / 100 })}</p>
        )}
        <form
          className="grid gap-3 sm:grid-cols-4"
          aria-label={t('addMember')}
          onSubmit={(ev) => {
            ev.preventDefault();
            const parsed = BuildingMemberSchema.safeParse({
              name: m.name,
              unitLabel: m.unit,
              shareBp: Math.round(Number(m.share) * 100),
            });
            if (!parsed.success) return fail();
            void guard(async () => {
              await addDoc(collection(db, `${base}/members`), parsed.data);
              setM({ name: '', unit: '', share: '' });
            });
          }}
        >
          <Field
            id="bm-name"
            label={t('ownerName')}
            value={m.name}
            onChange={(x) => setM({ ...m, name: x.target.value })}
          />
          <Field
            id="bm-unit"
            label={t('unitLabel')}
            value={m.unit}
            onChange={(x) => setM({ ...m, unit: x.target.value })}
          />
          <Field
            id="bm-share"
            type="number"
            label={t('sharePct')}
            value={m.share}
            onChange={(x) => setM({ ...m, share: x.target.value })}
            dir="ltr"
          />
          <div className="flex items-end">
            <Button type="submit" variant="quiet">
              {t('addMember')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-body font-semibold">{t('expenses')}</h3>
        <ul className="flex flex-col gap-1 text-small">
          {expenses.rows
            .sort((a, b) => b.data.date.localeCompare(a.data.date))
            .map((x) => (
              <li key={x.id} data-testid="bexpense-row">
                {x.data.date} · {x.data.title} · {money(x.data.amount)} {t('sar')}
              </li>
            ))}
        </ul>
        <form
          className="grid gap-3 sm:grid-cols-4"
          aria-label={t('addExpense')}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!receipt) return setError(t('receiptRequired'));
            void guard(async () => {
              const path = `orgs/${orgId}/receipts/b-${Date.now()}-${receipt.name.replace(/[^\w.-]/g, '_')}`;
              const parsed = SharedExpenseSchema.safeParse({
                title: e.title,
                amount: Number(e.amount),
                date: e.date,
                receiptPath: path,
              });
              if (!parsed.success) throw new Error('invalid');
              await uploadBytes(ref(firebaseStorage(), path), receipt, {
                contentType: receipt.type,
              });
              await addDoc(collection(db, `${base}/expenses`), {
                ...parsed.data,
                createdAt: serverTimestamp(),
              });
              setE({ title: '', amount: '', date: today() });
              setReceipt(undefined);
            });
          }}
        >
          <Field
            id="be-title"
            label={t('expenseTitle')}
            value={e.title}
            onChange={(x) => setE({ ...e, title: x.target.value })}
          />
          <Field
            id="be-amount"
            type="number"
            label={t('amount')}
            value={e.amount}
            onChange={(x) => setE({ ...e, amount: x.target.value })}
            dir="ltr"
          />
          <Field
            id="be-date"
            type="date"
            label={t('date')}
            value={e.date}
            onChange={(x) => setE({ ...e, date: x.target.value })}
            dir="ltr"
          />
          <div>
            <label htmlFor="be-receipt" className="text-small text-text-muted">
              {t('receipt')}
            </label>
            <input
              id="be-receipt"
              type="file"
              accept="image/*,application/pdf"
              className="mt-1 block text-small"
              onChange={(x) => setReceipt(x.target.files?.[0])}
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" variant="quiet">
              {t('addExpense')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-body font-semibold">{t('balances')}</h3>
        <ul className="flex flex-col gap-1 text-small">
          {bal.map((b) => (
            <li key={b.id} data-testid={`balance-${memberName(b.id)?.unitLabel}`}>
              {memberName(b.id)?.name} · {t('owed')} {money(b.owed)} · {t('paid')} {money(b.paid)} ·{' '}
              {t('remaining')} {money(b.balance)} {t('sar')}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-3"
          aria-label={t('addContribution')}
          onSubmit={(ev) => {
            ev.preventDefault();
            const mid = c.memberId || members.rows[0]?.id;
            const amount = Number(c.amount);
            if (!mid || !(amount > 0)) return fail();
            void guard(async () => {
              await addDoc(collection(db, `${base}/contributions`), {
                memberId: mid,
                amount,
                date: today(),
                createdAt: serverTimestamp(),
              });
              setC({ memberId: mid, amount: '' });
            });
          }}
        >
          <NativeSelect
            id="bc-member"
            label={t('ownerName')}
            value={c.memberId || members.rows[0]?.id || ''}
            onChange={(x) => setC({ ...c, memberId: x.target.value })}
            options={members.rows.map((x) => ({
              value: x.id,
              label: `${x.data.name} · ${x.data.unitLabel}`,
            }))}
          />
          <Field
            id="bc-amount"
            type="number"
            label={t('amount')}
            value={c.amount}
            onChange={(x) => setC({ ...c, amount: x.target.value })}
            dir="ltr"
          />
          <Button type="submit" variant="quiet">
            {t('addContribution')}
          </Button>
        </form>
        <p className="text-caption text-text-muted">{t('recordsOnly')}</p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-body font-semibold">{t('quotes')}</h3>
        {Array.from(new Set(quotes.rows.map((x) => x.data.request))).map((req) => (
          <div key={req} data-testid="quote-group">
            <p className="text-small font-medium">{req}</p>
            <ul className="text-small">
              {compareQuotes(
                quotes.rows
                  .filter((x) => x.data.request === req)
                  .map((x) => ({ id: x.id, vendor: x.data.vendor, amount: x.data.amount })),
              ).map((x) => (
                <li key={x.id} data-testid={x.cheapest ? 'quote-cheapest' : 'quote-other'}>
                  {x.vendor} · {money(x.amount)} {t('sar')}{' '}
                  {x.cheapest ? `· ${t('cheapest')}` : `· +${money(x.extra)}`}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <form
          className="grid gap-3 sm:grid-cols-4"
          aria-label={t('addQuote')}
          onSubmit={(ev) => {
            ev.preventDefault();
            const amount = Number(q.amount);
            if (q.request.trim().length < 2 || q.vendor.trim().length < 2 || !(amount > 0))
              return fail();
            void guard(async () => {
              await addDoc(collection(db, `${base}/quotes`), {
                request: q.request.trim(),
                vendor: q.vendor.trim(),
                amount,
              });
              setQ({ ...q, vendor: '', amount: '' });
            });
          }}
        >
          <Field
            id="bq-req"
            label={t('quoteFor')}
            value={q.request}
            onChange={(x) => setQ({ ...q, request: x.target.value })}
          />
          <Field
            id="bq-vendor"
            label={t('vendor')}
            value={q.vendor}
            onChange={(x) => setQ({ ...q, vendor: x.target.value })}
          />
          <Field
            id="bq-amount"
            type="number"
            label={t('amount')}
            value={q.amount}
            onChange={(x) => setQ({ ...q, amount: x.target.value })}
            dir="ltr"
          />
          <div className="flex items-end">
            <Button type="submit" variant="quiet">
              {t('addQuote')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-body font-semibold">{t('votes')}</h3>
        {votes.rows.map((x) => (
          <VoteBox key={x.id} path={`${base}/votes/${x.id}`} vote={x.data} members={members.rows} />
        ))}
        <form
          className="flex flex-wrap items-end gap-3"
          aria-label={t('addVote')}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (v.title.trim().length < 2) return fail();
            void guard(async () => {
              await addDoc(collection(db, `${base}/votes`), {
                title: v.title.trim(),
                rule: v.rule,
                closed: false,
                createdAt: serverTimestamp(),
              });
              setV({ ...v, title: '' });
            });
          }}
        >
          <div className="min-w-56 flex-1">
            <Field
              id="bv-title"
              label={t('voteTitle')}
              value={v.title}
              onChange={(x) => setV({ ...v, title: x.target.value })}
            />
          </div>
          <NativeSelect
            id="bv-rule"
            label={t('rule')}
            value={v.rule}
            onChange={(x) => setV({ ...v, rule: x.target.value })}
            options={[
              { value: 'majority', label: t('ruleMajority') },
              { value: 'three_quarters', label: t('ruleThreeQuarters') },
            ]}
          />
          <Button type="submit" variant="quiet">
            {t('addVote')}
          </Button>
        </form>
        <p className="text-caption text-text-muted">{t('ruleNote')}</p>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="no-print flex flex-wrap items-end gap-3">
          <Field
            id="bs-month"
            type="month"
            label={t('month')}
            value={month}
            onChange={(x) => setMonth(x.target.value)}
            dir="ltr"
          />
          <Button variant="quiet" onClick={() => window.print()}>
            {t('print')}
          </Button>
        </div>
        <Statement
          month={month}
          name={name}
          expenses={expenses.rows.map((x) => x.data)}
          contributions={contribs.rows.map((x) => x.data)}
          balances={bal.map((b) => ({ ...b, name: memberName(b.id)?.name ?? '' }))}
        />
      </div>
    </div>
  );
}

function VoteBox({
  path,
  vote,
  members,
}: {
  path: string;
  vote: VoteDoc;
  members: Array<{ id: string; data: MemberDoc }>;
}) {
  const t = useTranslations('bldg');
  const ballots = useCollectionAt<{ choice: Ballot }>(`${path}/ballots`);
  const res = voteResult(
    vote.rule,
    members.length,
    ballots.rows.map((b) => b.data.choice),
  );
  const voted = new Set(ballots.rows.map((b) => b.id));
  const [who, setWho] = useState('');
  const pick = who || members.find((x) => !voted.has(x.id))?.id || '';
  const cast = (choice: Ballot) => {
    if (pick) void setDoc(doc(firebaseDb(), `${path}/ballots/${pick}`), { choice });
  };
  return (
    <div className="flex flex-col gap-2 border-t border-border/20 pt-3" data-testid="vote-box">
      <p className="text-small font-medium">
        {vote.title} · {vote.rule === 'majority' ? t('ruleMajority') : t('ruleThreeQuarters')}
      </p>
      <p data-testid="vote-result" className="text-small">
        {t(`vote_${res.status}`)} · {t('yes')} {res.yes} · {t('no')} {res.no} · {t('abstain')}{' '}
        {res.abstain} · {t('missing')} {res.missing}
      </p>
      {!vote.closed && pick && (
        <div className="flex flex-wrap items-end gap-2">
          <NativeSelect
            id={`vw-${path}`}
            label={t('ownerName')}
            value={pick}
            onChange={(x) => setWho(x.target.value)}
            options={members
              .filter((x) => !voted.has(x.id))
              .map((x) => ({ value: x.id, label: `${x.data.name} · ${x.data.unitLabel}` }))}
          />
          <Button size="md" variant="quiet" onClick={() => cast('yes')}>
            {t('yes')}
          </Button>
          <Button size="md" variant="quiet" onClick={() => cast('no')}>
            {t('no')}
          </Button>
          <Button size="md" variant="quiet" onClick={() => cast('abstain')}>
            {t('abstain')}
          </Button>
        </div>
      )}
      {!vote.closed && (
        <Button
          size="md"
          variant="ghost"
          onClick={() => void updateDoc(doc(firebaseDb(), path), { closed: true })}
        >
          {t('closeVote')}
        </Button>
      )}
    </div>
  );
}

function Statement({
  month,
  name,
  expenses,
  contributions,
  balances: bal,
}: {
  month: string;
  name: string;
  expenses: ExpenseDoc[];
  contributions: ContribDoc[];
  balances: Array<{ id: string; name: string; owed: number; paid: number; balance: number }>;
}) {
  const t = useTranslations('bldg');
  const s = monthlyStatement(month, expenses, contributions);
  return (
    <Card className="print-area flex flex-col gap-4 p-8" data-testid="statement">
      <header className="flex items-center justify-between gap-4 border-b border-border/30 pb-4">
        <span className="flex items-center gap-3 text-brand-text">
          <BrandMark size={28} />
          <span className="display-font text-h2 text-text">راسخ</span>
        </span>
        <span className="text-end">
          <span className="block text-h3 font-semibold">{t('statement')}</span>
          <span className="block text-small text-text-muted">
            {name} · <span className="tabular">{month}</span>
          </span>
        </span>
      </header>
      <dl className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['expenses', s.expenses],
            ['contributions', s.contributions],
            ['net', s.net],
          ] as const
        ).map(([k, val]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 border-b border-border/20 pb-2"
          >
            <dt className="text-text-muted">{t(`st_${k}`)}</dt>
            <dd data-testid={`stmt-${k}`} className="tabular font-semibold">
              {money(val)} {t('sar')}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="text-small">
        {bal.map((b) => (
          <li key={b.id}>
            {b.name}: {t('remaining')} {money(b.balance)} {t('sar')}
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-muted">{t('mullak')}</p>
    </Card>
  );
}
