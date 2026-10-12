'use client';

import { InspectionSchema, templateFor } from '@rasikh/shared';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, StatusDot } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb } from '@/lib/firebase';
import { riyadhDay, type InspectionDoc } from '@/lib/inspect/types';
import type { Row } from '@/lib/ops/hooks';
import type { LeaseDoc, UnitDoc } from '@/lib/ops/types';
import { InspectionEditor } from './InspectionEditor';

const leaseName = (l?: LeaseDoc) =>
  l ? [l.propertyName, l.unitLabel].filter(Boolean).join(' · ') : '';

export function InspectionsTab({
  orgId,
  uid,
  staff,
  inspections,
  leases,
  units,
}: {
  orgId: string;
  uid: string;
  staff: boolean;
  inspections: Row<InspectionDoc>[];
  leases: Row<LeaseDoc>[];
  units: Row<UnitDoc>[];
}) {
  const t = useTranslations('inspect');
  const [selected, setSelected] = useState<string>();
  const current = inspections.find((i) => i.id === selected);

  if (current) {
    const lease = leases.find((l) => l.id === current.data.leaseId);
    return (
      <InspectionEditor
        orgId={orgId}
        id={current.id}
        inspection={current.data}
        uid={uid}
        staff={staff}
        leaseLabel={leaseName(lease?.data)}
        onBack={() => setSelected(undefined)}
      />
    );
  }

  const sorted = [...inspections].sort(
    (a, b) =>
      (b.data.createdAt?.toDate().getTime() ?? 0) - (a.data.createdAt?.toDate().getTime() ?? 0),
  );

  return (
    <div className="flex flex-col gap-6">
      {staff && (
        <StartForm
          orgId={orgId}
          uid={uid}
          leases={leases}
          units={units}
          inspections={inspections}
          onCreated={setSelected}
        />
      )}
      {sorted.length === 0 ? (
        <EmptyState title={t('none')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sorted.map((i) => {
            const lease = leases.find((l) => l.id === i.data.leaseId);
            return (
              <li key={i.id}>
                <button
                  type="button"
                  data-testid={`inspection-${i.data.kind}`}
                  onClick={() => setSelected(i.id)}
                  className="hairline w-full rounded-lg bg-surface p-4 text-start"
                >
                  <span className="block text-body font-medium">{leaseName(lease?.data)}</span>
                  <span className="block text-small text-text-muted">{t(i.data.kind)}</span>
                  <span className="mt-1 flex items-center justify-between gap-3">
                    <StatusDot
                      status={i.data.status === 'sealed' ? 'ok' : 'warn'}
                      label={t(`status_${i.data.status}`)}
                    />
                    <span className="tabular text-caption text-text-muted" dir="ltr">
                      {riyadhDay(i.data.sealedAt ?? i.data.createdAt) ?? ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StartForm({
  orgId,
  uid,
  leases,
  units,
  inspections,
  onCreated,
}: {
  orgId: string;
  uid: string;
  leases: Row<LeaseDoc>[];
  units: Row<UnitDoc>[];
  inspections: Row<InspectionDoc>[];
  onCreated: (id: string) => void;
}) {
  const t = useTranslations('inspect');
  const [leaseId, setLeaseId] = useState('');
  const [kind, setKind] = useState<'move_in' | 'move_out'>('move_in');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const active = useMemo(() => leases.filter((l) => l.data.status !== 'ended'), [leases]);
  const lease = leases.find((l) => l.id === leaseId);
  const unit = units.find((u) => u.id === lease?.data.unitId);
  const sealedMoveIn = inspections
    .filter(
      (i) => i.data.leaseId === leaseId && i.data.kind === 'move_in' && i.data.status === 'sealed',
    )
    .at(0);

  const start = async () => {
    setError(undefined);
    if (!lease || !unit) return setError(t('pickLease'));
    const rooms = templateFor(unit.data.type, {
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
    }).map((r) => r.key);
    const parsed = InspectionSchema.safeParse({
      unitId: lease.data.unitId,
      propertyId: lease.data.propertyId,
      leaseId: lease.id,
      kind,
      rooms,
      ...(kind === 'move_out' && sealedMoveIn ? { moveInId: sealedMoveIn.id } : {}),
    });
    if (!parsed.success) return setError(t('saveFailed'));
    setBusy(true);
    try {
      const res = await addDoc(collection(firebaseDb(), `orgs/${orgId}/inspections`), {
        ...parsed.data,
        ...(lease.data.tenantUid ? { tenantUid: lease.data.tenantUid } : {}),
        status: 'draft',
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      onCreated(res.id);
    } catch {
      setError(t('saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (active.length === 0) return <EmptyState title={t('needLease')} />;

  return (
    <Card>
      <form
        className="grid gap-4 sm:grid-cols-2"
        aria-label={t('start')}
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <NativeSelect
          id="insp-lease"
          label={t('lease')}
          value={leaseId}
          onChange={(e) => setLeaseId(e.target.value)}
          options={[
            { value: '', label: t('choose') },
            ...active.map((l) => ({
              value: l.id,
              label: `${leaseName(l.data)} · ${l.data.tenantName}`,
            })),
          ]}
        />
        <NativeSelect
          id="insp-kind"
          label={t('kind')}
          value={kind}
          onChange={(e) => setKind(e.target.value as 'move_in' | 'move_out')}
          options={[
            { value: 'move_in', label: t('move_in') },
            { value: 'move_out', label: t('move_out') },
          ]}
        />
        {unit && unit.data.type !== 'studio' && (
          <>
            <Field
              id="insp-bed"
              type="number"
              min="1"
              max="12"
              label={t('bedrooms')}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              dir="ltr"
            />
            <Field
              id="insp-bath"
              type="number"
              min="1"
              max="10"
              label={t('bathrooms')}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              dir="ltr"
            />
          </>
        )}
        {kind === 'move_out' && leaseId && (
          <p className="text-caption text-text-muted sm:col-span-2">
            {sealedMoveIn ? t('comparedWithMoveIn') : t('noSealedMoveIn')}
          </p>
        )}
        {error && (
          <p role="alert" className="text-small text-danger sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy}>
            {t('start')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
