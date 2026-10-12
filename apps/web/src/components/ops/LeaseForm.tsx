'use client';

import { LeaseSchema, buildSchedule, rentFreezeCheck } from '@rasikh/shared';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb, firebaseFunctions } from '@/lib/firebase';
import { money, type PropertyDoc, type UnitDoc } from '@/lib/ops/types';

export function LeaseForm({
  orgId,
  propertyId,
  property,
  unitId,
  unit,
  onDone,
}: {
  orgId: string;
  propertyId: string;
  property: PropertyDoc;
  unitId: string;
  unit: UnitDoc;
  onDone: (leaseId: string, invite?: 'linked' | 'pending') => void;
}) {
  const t = useTranslations('ops');
  const [f, setF] = useState({
    ejarNo: '',
    tenantName: '',
    tenantEmail: '',
    start: '',
    end: '',
    rent: '',
    prev: '',
    deposit: '',
    cycle: 'monthly',
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const freeze = useMemo(() => {
    const prev = Number(f.prev);
    const next = Number(f.rent);
    if (!prev || !next || !f.start) return undefined;
    const r = rentFreezeCheck({
      city: property.city,
      previousAnnualRent: prev,
      newAnnualRent: next,
      newStartDate: f.start,
    });
    return r.warn ? r : undefined;
  }, [f.prev, f.rent, f.start, property.city]);

  const submit = async () => {
    setError(undefined);
    const parsed = LeaseSchema.safeParse({
      unitId,
      propertyId,
      ejarContractNo: f.ejarNo,
      tenantName: f.tenantName,
      tenantEmail: f.tenantEmail || undefined,
      propertyName: property.name,
      unitLabel: unit.label,
      startDate: f.start,
      endDate: f.end,
      annualRent: Number(f.rent),
      cycle: f.cycle,
      depositAmount: Number(f.deposit || 0),
    });
    if (!parsed.success) {
      setError(t('required'));
      return;
    }
    setBusy(true);
    try {
      const db = firebaseDb();
      const lease = parsed.data;
      const leaseRef = doc(collection(db, `orgs/${orgId}/leases`));
      const batch = writeBatch(db);
      batch.set(leaseRef, { ...lease, status: 'active', createdAt: serverTimestamp() });
      for (const i of buildSchedule(lease)) {
        batch.set(doc(collection(db, `orgs/${orgId}/payments`)), {
          leaseId: leaseRef.id,
          unitId,
          dueDate: i.dueDate,
          amount: i.amount,
          status: 'due',
        });
      }
      await batch.commit();
      let invite: 'linked' | 'pending' | undefined;
      if (lease.tenantEmail) {
        try {
          const res = await httpsCallable<unknown, { status: 'linked' | 'pending' }>(
            firebaseFunctions(),
            'inviteTenant',
          )({ orgId, leaseId: leaseRef.id, email: lease.tenantEmail });
          invite = res.data.status;
        } catch {
          /* the lease is saved; the owner can invite again from the lease page */
        }
      }
      onDone(leaseRef.id, invite);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="hairline mt-3 flex flex-col gap-4 rounded-lg bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      aria-label={t('addLease')}
    >
      <Field
        id="ejar"
        label={t('ejarNo')}
        hint={t('ejarHint')}
        value={f.ejarNo}
        onChange={set('ejarNo')}
        dir="ltr"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tn" label={t('tenantName')} value={f.tenantName} onChange={set('tenantName')} />
        <Field
          id="te"
          type="email"
          label={t('tenantEmail')}
          value={f.tenantEmail}
          onChange={set('tenantEmail')}
          dir="ltr"
        />
        <Field
          id="sd"
          type="date"
          label={t('startDate')}
          value={f.start}
          onChange={set('start')}
          dir="ltr"
        />
        <Field
          id="ed"
          type="date"
          label={t('endDate')}
          value={f.end}
          onChange={set('end')}
          dir="ltr"
        />
        <Field
          id="ar"
          type="number"
          min="0"
          label={t('annualRent')}
          value={f.rent}
          onChange={set('rent')}
          dir="ltr"
        />
        <Field
          id="pr"
          type="number"
          min="0"
          label={t('previousRent')}
          value={f.prev}
          onChange={set('prev')}
          dir="ltr"
        />
        <NativeSelect
          id="cy"
          label={t('cycle')}
          value={f.cycle}
          onChange={set('cycle')}
          options={[
            { value: 'monthly', label: t('monthly') },
            { value: 'quarterly', label: t('quarterly') },
            { value: 'semiannual', label: t('semiannual') },
            { value: 'annual', label: t('annual') },
          ]}
        />
        <Field
          id="dp"
          type="number"
          min="0"
          label={t('deposit')}
          hint={t('depositNote')}
          value={f.deposit}
          onChange={set('deposit')}
          dir="ltr"
        />
      </div>
      {freeze && (
        <div
          role="alert"
          data-testid="freeze-warning"
          className="rounded-md border border-warning p-3 text-small text-warning"
        >
          <p>{t('freezeWarn', { max: money(freeze.maxAnnualRent ?? 0) })}</p>
          <p className="mt-1 text-text-muted">{t('freezeNote')}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <Button type="submit" loading={busy}>
        {t('saveLease')}
      </Button>
    </form>
  );
}
