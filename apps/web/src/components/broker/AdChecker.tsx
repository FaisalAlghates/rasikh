'use client';

import { AD_CAPACITIES, AD_PURPOSES, adIsReady, checkAd, type AdDraft } from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AiAnswer } from '@/components/ai/AiAnswer';
import { useAssist } from '@/components/ai/useAssist';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, NativeSelect } from '@/components/ui/Input';
import { today } from '@/lib/ops/hooks';

/**
 * Checks an ad draft against the mandatory ad data. Nothing is stored or published: it is a live checklist.
 * "Ready" only means the data is complete; the broker still reviews the ad on the approved platform.
 */
type AdForm = {
  purpose: string;
  advertiserName: string;
  capacity: string;
  adLicenseNo: string;
  adLicenseExpiry: string;
  city: string;
  district: string;
  propertyType: string;
  areaSqm: string;
  priceSar: string;
  phone: string;
  description: string;
  enc: string;
};

function draftOf(f: AdForm): AdDraft {
  return {
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
}

export function AdChecker({ orgId }: { orgId: string }) {
  const t = useTranslations('broker');
  const ai = useTranslations('ai');
  const help = useAssist(orgId);
  const [f, setF] = useState<AdForm>({
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

  const issues = useMemo(() => checkAd(draftOf(f), today()), [f]);
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
          options={[
            { value: '', label: '—' },
            ...AD_PURPOSES.map((v) => ({ value: v, label: t(`adPurpose_${v}`) })),
          ]}
        />
        <Field
          id="ad-adv"
          label={t('adAdvertiser')}
          value={f.advertiserName}
          onChange={set('advertiserName')}
        />
        <NativeSelect
          id="ad-cap"
          label={t('adCapacity')}
          value={f.capacity}
          onChange={set('capacity')}
          options={[
            { value: '', label: '—' },
            ...AD_CAPACITIES.map((v) => ({ value: v, label: t(`adCapacity_${v}`) })),
          ]}
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
        <Field
          id="ad-type"
          label={t('adType')}
          value={f.propertyType}
          onChange={set('propertyType')}
        />
        <Field
          id="ad-area"
          label={t('adArea')}
          inputMode="decimal"
          value={f.areaSqm}
          onChange={set('areaSqm')}
        />
        <Field
          id="ad-price"
          label={t('adPrice')}
          inputMode="decimal"
          value={f.priceSar}
          onChange={set('priceSar')}
        />
        <Field
          id="ad-phone"
          label={t('adPhone')}
          dir="ltr"
          value={f.phone}
          onChange={set('phone')}
        />
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

      <div className="flex flex-col gap-2">
        <div>
          <Button
            type="button"
            variant="quiet"
            loading={help.busy}
            onClick={() => void help.run('adHelper', { draft: draftOf(f) })}
          >
            {ai('suggestDescription')}
          </Button>
        </div>
        <AiAnswer result={help.result} error={help.error}>
          {help.result?.ok && typeof help.result.suggestion?.description === 'string' && (
            <div className="flex flex-col gap-2">
              <p className="text-small text-text-muted">{ai('suggestedDescription')}</p>
              <p data-testid="ad-suggested">{help.result.suggestion.description}</p>
              <div>
                <Button
                  type="button"
                  variant="quiet"
                  data-testid="use-description"
                  onClick={() => {
                    const d = help.result?.ok ? help.result.suggestion?.description : undefined;
                    if (typeof d === 'string') setF((p) => ({ ...p, description: d }));
                  }}
                >
                  {ai('useDescription')}
                </Button>
              </div>
            </div>
          )}
        </AiAnswer>
      </div>

      <p
        data-testid="ad-verdict"
        className={
          ready ? 'text-small font-semibold text-success' : 'text-small font-semibold text-danger'
        }
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
