'use client';

import {
  PropertyLocationSchema,
  PropertySchema,
  UnitSchema,
  type PropertyLocation,
} from '@rasikh/shared';
import { Crosshair, MapPin, X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, NativeSelect } from '@/components/ui/Input';
import { Link } from '@/i18n/navigation';
import { firebaseDb } from '@/lib/firebase';
import { CITIES, cityIdFor } from '@/lib/map/kingdom';
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
  const cityName = useTranslations('cities');
  const [p, setP] = useState({
    name: '',
    city: cityName('riyadh'),
    district: '',
    kind: 'building',
  });
  // the city comes from the Kingdom list (so the map can place it); "other" opens a free-text field
  const [cityId, setCityId] = useState<string>('riyadh');
  const [location, setLocation] = useState<PropertyLocation>();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [leaseFor, setLeaseFor] = useState<string>();

  const useMyLocation = () => {
    setLocError(undefined);
    if (!('geolocation' in navigator)) return setLocError(t('locationDenied'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = PropertyLocationSchema.safeParse({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          source: 'gps',
        });
        if (!loc.success) return setLocError(t('locationOutside'));
        setLocation(loc.data);
      },
      () => {
        setLocating(false);
        setLocError(t('locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const addProperty = async () => {
    setError(undefined);
    const parsed = PropertySchema.safeParse({ ...p, ...(location ? { location } : {}) });
    if (!parsed.success) return setError(t('required'));
    setBusy(true);
    // Clear the form now: the new card appears at once (local write), and someone may start typing the
    // next property before the server confirms. Put the input back if the save fails.
    const typed = p;
    const pinned = location;
    setP((s) => ({ ...s, name: '', district: '' }));
    setLocation(undefined);
    try {
      await addDoc(collection(firebaseDb(), `orgs/${orgId}/properties`), {
        ...parsed.data,
        createdAt: serverTimestamp(),
      });
    } catch {
      setP(typed);
      setLocation(pinned);
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
        <NativeSelect
          id="pc"
          label={t('city')}
          value={cityId}
          onChange={(e) => {
            const v = e.target.value;
            setCityId(v);
            setP({ ...p, city: v === 'other' ? '' : cityName(v) });
          }}
          options={[
            ...CITIES.map((c) => ({ value: c.id, label: cityName(c.id) })),
            { value: 'other', label: t('cityOther') },
          ]}
        />
        {cityId === 'other' && (
          <Field
            id="pco"
            label={t('cityOtherLabel')}
            value={p.city}
            onChange={(e) => setP({ ...p, city: e.target.value })}
          />
        )}
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
        <div className="flex flex-col gap-2 sm:col-span-2">
          {location ? (
            <p
              data-testid="new-property-location"
              className="flex flex-wrap items-center gap-2 text-small text-success"
            >
              <MapPin size={16} aria-hidden="true" />
              {t('locationSet')}
              <span dir="ltr" className="tabular text-text-muted">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={() => setLocation(undefined)}
                className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-text-muted hover:text-text"
              >
                <X size={14} aria-hidden="true" />
                {t('locationClear')}
              </button>
            </p>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <Button type="button" variant="quiet" loading={locating} onClick={useMyLocation}>
                <Crosshair size={16} aria-hidden="true" />
                {t('useMyLocation')}
              </Button>
              <p className="text-caption text-text-muted">{t('useMyLocationHint')}</p>
            </div>
          )}
          {locError && (
            <p role="alert" className="text-small text-danger">
              {locError}
            </p>
          )}
        </div>
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
        {cityIdFor(property.city) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
            <span className="flex items-center gap-1 text-text-muted">
              <MapPin size={14} aria-hidden="true" />
              {property.location ? t('pinExact') : t('pinApprox')}
            </span>
            <Link
              href={`/map?property=${id}`}
              className="font-semibold text-brand-text underline-offset-4 hover:underline"
            >
              {t('showOnMap')}
            </Link>
          </p>
        )}
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
