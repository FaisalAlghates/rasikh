'use client';

import {
  AD_CAPACITIES,
  AD_PURPOSES,
  adIsReady,
  checkAd,
  type AdDraft,
} from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Field, NativeSelect } from '@/components/ui/Input';
import { today } from '@/lib/ops/hooks';

/**
 * Checks an ad draft against the mandatory ad data. Nothing is stored or published: it is a live checklist.
 * "Ready" only means the data is complete; the broker still reviews the ad on the approved platform.
 */
export function AdChecker() {
  const t = useTranslations('broker');
  const [f, setF] = useState({
    purpose: '',
    advertiserName: '',
    capacity: '',
    adLicenseNo: '',
    adLicenseExpiry: '',
    city: '',
    district: '',
    propertyType: '',
    areaSqm: '',
    priceSar: '',
    phone: '',
    description: '',
    enc: '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const issues = useMemo(() => {
    const draft: AdDraft = {
      ...(f.purpose ? { purpose: f.purpose as AdDraft['purpose'] } : {}),
      ...(f.capacity ? { capacity: f.capacity as AdDraft['capacity'] } : {}),
      advertiserName: f.advertiserName,
      adLicenseNo: f.adLicenseNo,
      adLicenseExpiry: f.adLicenseExpiry,
      city: f.city,
      district: f.district,
      propertyType: f.propertyType,
      areaSqm: Number(f.areaSqm) || 0,
      priceSar: Number(f.priceSar) || 0,
      phone: f.phone,
      description: f.description,
      ...(f.enc ? { disclosesEncumbrances: f.enc === 'yes' } : {}),
    };
    return checkAd(draft, today());
  }, [f]);
  const ready = adIsReady(issues);

  return (
    <Card className="flex flex-col gap-4" data-testid="ad-checker">
      <h2 className="text-h3 font-semibold">{t('adTitle')}</h2>
      <p className="text-small text-text-muted">{t('adIntro')}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <NativeSelect
          id="ad-purpose"
          label={t('adPurpose')}
          value={f.purpose}
          onChange={set('purpose')}
          options={[{ value: '', label: '—' }, ...AD_PURPOSES.map((v) => ({ value: v, label: t(`adPurpose_${v}`) }))]}
        />
        <Field id="ad-adv" label={t('adAdvertiser')} value={f.advertiserName} onChange={set('advertiserName')} />
        <NativeSelect
          id="ad-cap"
          label={t('adCapacity')}
          value={f.capacity}
          onChange={set('capacity')}
          options={[{ value: '', label: '—' }, ...AD_CAPACITIES.map((v) => ({ value: v, label: t(`adCapacity_${v}`) }))]}
        />
        <Field
          id="ad-lic"
          label={t('adLicenseNo')}
          inputMode="numeric"
          value={f.adLicenseNo}
          onChange={set('adLicenseNo')}
        />
        <Field
          id="ad-exp"
          type="date"
          label={t('adLicenseExpiry')}
          value={f.adLicenseExpiry}
          onChange={set('adLicenseExpiry')}
        />
        <Field id="ad-city" label={t('adCity')} value={f.city} onChange={set('city')} />
        <Field id="ad-dist" label={t('adDistrict')} value={f.district} onChange={set('district')} />
        <Field id="ad-type" label={t('adType')} value={f.propertyType} onChange={set('propertyType')} />
        <Field id="ad-area" label={t('adArea')} inputMode="decimal" value={f.areaSqm} onChange={set('areaSqm')} />
        <Field id="ad-price" label={t('adPrice')} inputMode="decimal" value={f.priceSar} onChange={set('priceSar')} />
        <Field id="ad-phone" label={t('adPhone')} dir="ltr" value={f.phone} onChange={set('phone')} />
        <NativeSelect
          id="ad-enc"
          label={t('adEncumbrances')}
          value={f.enc}
          onChange={set('enc')}
          options={[
            { value: '', label: t('adEnc_unset') },
            { value: 'no', label: t('adEnc_no') },
            { value: 'yes', label: t('adEnc_yes') },
          ]}
        />
        <div className="sm:col-span-3">
          <Field
            id="ad-desc"
            label={t('adDescription')}
            value={f.description}
            onChange={set('description')}
          />
        </div>
      </div>

      <p
        data-testid="ad-verdict"
        className={ready ? 'text-small font-semibold text-success' : 'text-small font-semibold text-danger'}
      >
        {ready ? t('adReady') : t('adNotReady')}
      </p>
      <ul className="flex flex-col gap-1 text-small" aria-live="polite">
        {issues.map((i) => (
          <li
            key={i.code}
            data-testid="ad-issue"
            className={i.severity === 'error' ? 'text-danger' : 'text-warning'}
          >
            <b>{i.severity === 'error' ? t('adError') : t('adWarning')}</b> · {t(`issue_${i.code}`)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
