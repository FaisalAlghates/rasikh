'use client';

import { balances } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { useCollectionAt } from '@/lib/ops/hooks';
import { money } from '@/lib/ops/types';
import { VoteBox } from './BuildingsTab';

interface Membership {
  name?: string;
  orgId: string;
  buildingId: string;
  memberId: string;
}

/** What a unit owner sees: their buildings' ledger, their own balance, and the votes they can cast for their unit. */
export function MyBuildings({ orgId, uid }: { orgId: string; uid: string }) {
  const mine = useCollectionAt<Membership>(`users/${uid}/memberships`);
  const list = mine.rows.filter((m) => m.data.orgId === orgId);
  return (
    <div className="flex flex-col gap-4" data-testid="my-buildings">
      {list.map((m) => (
        <OwnerBuilding
          key={m.id}
          orgId={orgId}
          buildingId={m.data.buildingId}
          memberId={m.data.memberId}
          name={m.data.name ?? ''}
        />
      ))}
    </div>
  );
}

function OwnerBuilding({
  orgId,
  buildingId,
  memberId,
  name,
}: {
  orgId: string;
  buildingId: string;
  memberId: string;
  name: string;
}) {
  const t = useTranslations('bldg');
  const base = `orgs/${orgId}/buildings/${buildingId}`;
  const members = useCollectionAt<{ name: string; unitLabel: string; shareBp: number }>(
    `${base}/members`,
  );
  const expenses = useCollectionAt<{ title: string; amount: number; date: string }>(
    `${base}/expenses`,
  );
  const contribs = useCollectionAt<{ memberId: string; amount: number }>(`${base}/contributions`);
  const votes = useCollectionAt<{
    title: string;
    rule: 'majority' | 'three_quarters';
    closed: boolean;
  }>(`${base}/votes`);

  const bal = balances(
    members.rows.map((x) => ({ id: x.id, shareBp: x.data.shareBp })),
    expenses.rows.map((x) => x.data),
    contribs.rows.map((x) => x.data),
  ).find((b) => b.id === memberId);

  return (
    <Card className="flex flex-col gap-4" data-testid="owner-building">
      <h3 className="text-h3 font-semibold">{name}</h3>
      <p className="text-caption text-text-muted">{t('mullak')}</p>
      {bal && (
        <p
          data-testid="my-balance"
          role={bal.balance > 0 ? 'status' : undefined}
          className={`text-body font-medium ${bal.balance > 0 ? 'text-warning' : 'text-success'}`}
        >
          {bal.balance > 0 ? t('youOwe', { amount: money(bal.balance) }) : t('nothingOwed')}
        </p>
      )}
      <ul className="flex flex-col gap-1 text-small">
        {bal && (
          <li>
            {t('owed')} {money(bal.owed)} · {t('paid')} {money(bal.paid)} {t('sar')}
          </li>
        )}
        {expenses.rows
          .sort((a, b) => b.data.date.localeCompare(a.data.date))
          .map((x) => (
            <li key={x.id} data-testid="owner-expense">
              {x.data.date} · {x.data.title} · {money(x.data.amount)} {t('sar')}
            </li>
          ))}
      </ul>
      {votes.rows.map((v) => (
        <VoteBox
          key={v.id}
          path={`${base}/votes/${v.id}`}
          vote={v.data}
          members={members.rows}
          mine={memberId}
        />
      ))}
    </Card>
  );
}
