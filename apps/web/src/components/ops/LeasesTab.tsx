'use client';

import { renewalNoticeDate } from '@rasikh/shared';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Input';
import { firebaseFunctions } from '@/lib/firebase';
import type { Row } from '@/lib/ops/hooks';
import { money, type LeaseDoc, type PaymentDoc } from '@/lib/ops/types';
import { ScheduleTable } from './ScheduleTable';

export function LeasesTab({
  orgId,
  leases,
  payments,
  selectedId,
  onSelect,
  banner,
}: {
  orgId: string;
  leases: Row<LeaseDoc>[];
  payments: Row<PaymentDoc>[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  banner?: string;
}) {
  const t = useTranslations('ops');
  const current = leases.find((l) => l.id === selectedId);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string>();

  const invite = async () => {
    if (!current) return;
    setMsg(undefined);
    try {
      const res = await httpsCallable<unknown, { status: 'linked' | 'pending' }>(
        firebaseFunctions(),
        'inviteTenant',
      )({
        orgId,
        leaseId: current.id,
        email,
      });
      setMsg(res.data.status === 'linked' ? t('inviteLinked') : t('invitePending'));
    } catch {
      setMsg(t('errorGeneric'));
    }
  };

  if (leases.length === 0) return <EmptyState title={t('noLeases')} />;

  return (
    <div className="flex flex-col gap-5">
      {banner && (
        <p role="status" className="rounded-md border border-success p-3 text-small text-success">
          {banner}
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {leases.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              data-testid={`lease-${l.data.ejarContractNo}`}
              aria-pressed={l.id === selectedId}
              onClick={() => onSelect(l.id === selectedId ? undefined : l.id)}
              className={`hairline w-full rounded-lg bg-surface p-4 text-start ${l.id === selectedId ? 'border-brand' : ''}`}
            >
              <span className="block text-body font-medium">
                {l.data.propertyName} · {l.data.unitLabel}
              </span>
              <span className="block text-small text-text-muted">{l.data.tenantName}</span>
              <span className="tabular block text-caption text-text-muted" dir="ltr">
                {l.data.ejarContractNo} · {l.data.startDate} → {l.data.endDate}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <Card className="flex flex-col gap-4" data-testid="lease-detail">
          <div>
            <h3 className="text-h3 font-semibold">
              {current.data.propertyName} · {current.data.unitLabel}
            </h3>
            <p className="text-small text-text-muted">
              {money(current.data.annualRent)} {t('sar')} · {t(current.data.cycle)}
            </p>
            <p className="tabular text-caption text-text-muted" dir="ltr">
              {t('renewalNotice', { date: renewalNoticeDate(current.data.endDate) })}
            </p>
          </div>
          <h4 className="text-body font-semibold">{t('schedule')}</h4>
          <ScheduleTable
            orgId={orgId}
            payments={payments.filter((p) => p.data.leaseId === current.id)}
            canMarkPaid
            canUpload
          />
          <form
            className="flex flex-wrap items-end gap-3"
            aria-label={t('inviteTenant')}
            onSubmit={(e) => {
              e.preventDefault();
              void invite();
            }}
          >
            <div className="min-w-56 flex-1">
              <Field
                id="inv"
                type="email"
                label={t('tenantEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>
            <Button type="submit" variant="quiet">
              {t('inviteTenant')}
            </Button>
          </form>
          {msg && (
            <p role="status" className="text-small text-text-muted">
              {msg}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
