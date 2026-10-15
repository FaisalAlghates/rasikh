'use client';

import { yearTotals, type Reminder } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Card, StatusDot } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { today, type Row } from '@/lib/ops/hooks';
import { buildTwinPlan } from '@/lib/scene/twinPlan';
import { PortfolioTwin } from './PortfolioTwin';
import { Reminders } from './Reminders';
import {
  money,
  type ExpenseDoc,
  type LeaseDoc,
  type PaymentDoc,
  type PropertyDoc,
  type UnitDoc,
} from '@/lib/ops/types';

/** A key figure: large tabular number, a thin clay rule that fills with `ratio` (0..1) when given. */
function Kpi({
  label,
  value,
  note,
  ratio,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  note?: string;
  ratio?: number;
  tone?: 'brand' | 'danger';
}) {
  return (
    <Card className="relative flex flex-col gap-1 overflow-hidden">
      <span className="text-small text-text-muted">{label}</span>
      <span className="display-font tabular text-h1 text-text">{value}</span>
      {note && <span className="text-caption text-text-muted">{note}</span>}
      {ratio !== undefined && (
        <span aria-hidden="true" className="mt-2 block h-1 w-full rounded-full bg-text/10">
          <span
            className={cn(
              'block h-full rounded-full transition-[width] duration-700 ease-rk',
              tone === 'danger' ? 'bg-danger' : 'bg-brand',
            )}
            style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
          />
        </span>
      )}
    </Card>
  );
}

export function Overview({
  properties,
  units,
  leases,
  payments,
  expenses,
  reminders,
}: {
  properties: Row<PropertyDoc>[];
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
  const plan = useMemo(
    () =>
      buildTwinPlan(
        properties.map((p) => ({ id: p.id, name: p.data.name, kind: p.data.kind })),
        units.map((u) => ({ id: u.id, propertyId: u.data.propertyId, label: u.data.label })),
        leases.map((l) => ({
          id: l.id,
          unitId: l.data.unitId,
          status: l.data.status,
          endDate: l.data.endDate,
          tenantName: l.data.tenantName,
        })),
        payments.map((p) => ({
          leaseId: p.data.leaseId,
          dueDate: p.data.dueDate,
          amount: p.data.amount,
          status: p.data.status,
        })),
        now,
      ),
    [properties, units, leases, payments, now],
  );
  const upcoming = payments
    .filter((p) => p.data.status === 'due')
    .sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate))
    .slice(0, 5);
  const leaseOf = (id: string) => leases.find((l) => l.id === id)?.data;
  const leased = units.length ? (units.length - plan.counts.vacant) / units.length : undefined;
  const expected = totals.collected + totals.outstanding;
  const collectedRatio = expected > 0 ? totals.collected / expected : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PortfolioTwin plan={plan} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t('units')} value={units.length} ratio={leased} />
        <Kpi label={t('activeLeases')} value={leases.length} />
        <Kpi
          label={t('collected')}
          value={money(totals.collected)}
          note={t('sar')}
          ratio={collectedRatio}
        />
        <Kpi
          label={t('outstanding')}
          value={money(totals.outstanding)}
          note={t('sar')}
          ratio={expected > 0 ? totals.outstanding / expected : undefined}
          tone="danger"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="flex flex-col gap-3 lg:col-span-3">
          <h3 className="text-body font-semibold">{t('upcoming')}</h3>
          {upcoming.length === 0 ? (
            <p className="text-small text-text-muted">{t('noUpcoming')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-text/10">
              {upcoming.map((p) => {
                const l = leaseOf(p.data.leaseId);
                const late = p.data.dueDate < now;
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-small"
                  >
                    <span className="min-w-0 flex-1 truncate">
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
        <div className="lg:col-span-2">
          <Reminders reminders={reminders} leases={leases} />
        </div>
      </div>
    </div>
  );
}
