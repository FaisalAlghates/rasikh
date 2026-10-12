'use client';

import { PropertySchema, UnitSchema } from '@rasikh/shared';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { firebaseDb } from '@/lib/firebase';
import type { Row } from '@/lib/ops/hooks';
import type { PropertyDoc, UnitDoc } from '@/lib/ops/types';
import { LeaseForm } from './LeaseForm';

export function PropertiesTab({
  orgId,
  properties,
  units,
  onLeaseCreated,
}: {
  orgId: string;
  properties: Row<PropertyDoc>[];
  units: Row<UnitDoc>[];
  onLeaseCreated: (leaseId: string, invite?: 'linked' | 'pending') => void;
}) {
  const t = useTranslations('ops');
  const [p, setP] = useState({ name: '', city: 'الرياض', district: '', kind: 'building' });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [leaseFor, setLeaseFor] = useState<string>();

  const addProperty = async () => {
    setError(undefined);
    const parsed = PropertySchema.safeParse(p);
    if (!parsed.success) return setError(t('required'));
    setBusy(true);
    try {
      await addDoc(collection(firebaseDb(), `orgs/${orgId}/properties`), {
        ...parsed.data,
        createdAt: serverTimestamp(),
      });
      setP((s) => ({ ...s, name: '', district: '' }));
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        className="hairline grid gap-4 rounded-lg bg-surface p-5 sm:grid-cols-2"
        aria-label={t('addProperty')}
        onSubmit={(e) => {
          e.preventDefault();
          void addProperty();
        }}
      >
        <Field
          id="pn"
          label={t('name')}
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
        />
        <Field
          id="pc"
          label={t('city')}
          value={p.city}
          onChange={(e) => setP({ ...p, city: e.target.value })}
        />
        <Field
          id="pd"
          label={t('district')}
          value={p.district}
          onChange={(e) => setP({ ...p, district: e.target.value })}
        />
        <NativeSelect
          id="pk"
          label={t('addProperty')}
          value={p.kind}
          onChange={(e) => setP({ ...p, kind: e.target.value })}
          options={[
            { value: 'building', label: t('kindBuilding') },
            { value: 'villa', label: t('kindVilla') },
          ]}
        />
        {error && (
          <p role="alert" className="text-small text-danger sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy}>
            {t('addProperty')}
          </Button>
        </div>
      </form>

      {properties.length === 0 ? (
        <EmptyState title={t('noProperties')} />
      ) : (
        properties.map((pr) => (
          <PropertyCard
            key={pr.id}
            orgId={orgId}
            id={pr.id}
            property={pr.data}
            units={units.filter((u) => u.data.propertyId === pr.id)}
            leaseFor={leaseFor}
            setLeaseFor={setLeaseFor}
            onLeaseCreated={(id, inv) => {
              setLeaseFor(undefined);
              onLeaseCreated(id, inv);
            }}
          />
        ))
      )}
    </div>
  );
}

function PropertyCard({
  orgId,
  id,
  property,
  units,
  leaseFor,
  setLeaseFor,
  onLeaseCreated,
}: {
  orgId: string;
  id: string;
  property: PropertyDoc;
  units: Row<UnitDoc>[];
  leaseFor?: string;
  setLeaseFor: (u?: string) => void;
  onLeaseCreated: (leaseId: string, invite?: 'linked' | 'pending') => void;
}) {
  const t = useTranslations('ops');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('apartment');
  const [error, setError] = useState<string>();

  const addUnit = async () => {
    setError(undefined);
    const parsed = UnitSchema.safeParse({ propertyId: id, label, type });
    if (!parsed.success) return setError(t('required'));
    try {
      await addDoc(collection(firebaseDb(), `orgs/${orgId}/units`), {
        ...parsed.data,
        createdAt: serverTimestamp(),
      });
      setLabel('');
    } catch {
      setError(t('errorGeneric'));
    }
  };

  return (
    <Card data-testid={`property-${property.name}`} className="flex flex-col gap-4">
      <div>
        <h3 className="text-h3 font-semibold">{property.name}</h3>
        <p className="text-small text-text-muted">
          {property.city}
          {property.district ? `، ${property.district}` : ''}
        </p>
      </div>
      {units.length === 0 ? (
        <p className="text-small text-text-muted">{t('noUnits')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {units.map((u) => (
            <li key={u.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span data-testid={`unit-${u.data.label}`}>{u.data.label}</span>
                <Button
                  size="md"
                  variant="quiet"
                  onClick={() => setLeaseFor(leaseFor === u.id ? undefined : u.id)}
                >
                  {t('addLease')}
                </Button>
              </div>
              {leaseFor === u.id && (
                <LeaseForm
                  orgId={orgId}
                  propertyId={id}
                  property={property}
                  unitId={u.id}
                  unit={u.data}
                  onDone={onLeaseCreated}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        aria-label={`${t('addUnit')} ${property.name}`}
        onSubmit={(e) => {
          e.preventDefault();
          void addUnit();
        }}
      >
        <div className="min-w-40 flex-1">
          <Field
            id={`ul-${id}`}
            label={t('unitLabel')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="min-w-40">
          <NativeSelect
            id={`ut-${id}`}
            label={t('addUnit')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'studio', label: t('typeStudio') },
              { value: 'apartment', label: t('typeApartment') },
              { value: 'villa', label: t('typeVilla') },
            ]}
          />
        </div>
        <Button type="submit" variant="quiet">
          {t('addUnit')}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
