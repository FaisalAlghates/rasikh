'use client';

import { yearTotals, type Reminder } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { Card, StatTile } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/Card';
import { today, type Row } from '@/lib/ops/hooks';
import { Reminders } from './Reminders';
import {
  money,
  type ExpenseDoc,
  type LeaseDoc,
  type PaymentDoc,
  type UnitDoc,
} from '@/lib/ops/types';

export function Overview({
  units,
  leases,
  payments,
  expenses,
  reminders,
}: {
  units: Row<UnitDoc>[];
  leases: Row<LeaseDoc>[];
  payments: Row<PaymentDoc>[];
  expenses: Row<ExpenseDoc>[];
  reminders: Reminder[];
}) {
  const t = useTranslations('ops');
  const now = today();
  const year = Number(now.slice(0, 4));
  const totals = yearTotals(
    year,
    payments.map((p) => p.data),
    expenses.map((e) => e.data),
  );
  const upcoming = payments
    .filter((p) => p.data.status === 'due')
    .sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate))
    .slice(0, 5);
  const leaseOf = (id: string) => leases.find((l) => l.id === id)?.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t('units')} value={units.length} />
        <StatTile label={t('activeLeases')} value={leases.length} />
        <StatTile label={t('collected')} value={money(totals.collected)} note={t('sar')} />
        <StatTile label={t('outstanding')} value={money(totals.outstanding)} note={t('sar')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h3 className="text-body font-semibold">{t('upcoming')}</h3>
          {upcoming.length === 0 ? (
            <p className="text-small text-text-muted">{t('noUpcoming')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((p) => {
                const l = leaseOf(p.data.leaseId);
                const late = p.data.dueDate < now;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-small">
                    <span>
                      {l?.propertyName} · {l?.unitLabel}
                    </span>
                    <span className="tabular" dir="ltr">
                      {p.data.dueDate} · {money(p.data.amount)}
                    </span>
                    <StatusDot
                      status={late ? 'late' : 'warn'}
                      label={late ? t('statusLate') : t('statusDue')}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Reminders reminders={reminders} leases={leases} />
      </div>
    </div>
  );
}
