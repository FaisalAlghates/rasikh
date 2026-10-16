'use client';

import { BUILDING_TYPES, RegulationSchema, type Regulation } from '@rasikh/shared';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SourceBox } from '@/components/eng/RegulationPicker';
import { Button } from '@/components/ui/Button';
import { firebaseDb } from '@/lib/firebase';
import { useRegulationLibrary, type LibraryEntry } from '@/lib/eng/regulations';
import { useUser } from '@/lib/use-user';

type Form = {
  id?: string;
  title: string;
  cities: string;
  types: Regulation['buildingTypes'];
  issuer: string;
  document: string;
  reference: string;
  url: string;
  issued: string;
  frontPct: number;
  frontMin: number;
  sidePct: number;
  sideMin: number;
  neighbour: number;
  groundPct: number;
  upperPct: number;
  annexPct: number;
  maxFloors: number;
  maxHeightM: number;
  parkingPerUnit: number;
  notes: string;
};

const EMPTY: Form = {
  title: '',
  cities: '',
  types: ['villa'],
  issuer: '',
  document: '',
  reference: '',
  url: '',
  issued: '',
  frontPct: 20,
  frontMin: 3,
  sidePct: 20,
  sideMin: 2,
  neighbour: 1.5,
  groundPct: 75,
  upperPct: 75,
  annexPct: 70,
  maxFloors: 0,
  maxHeightM: 0,
  parkingPerUnit: 0,
  notes: '',
};

const toForm = (e: LibraryEntry): Form => ({
  id: e.id,
  title: e.title,
  cities: e.cities.join('، '),
  types: e.buildingTypes,
  issuer: e.source.issuer,
  document: e.source.document,
  reference: e.source.reference,
  url: e.source.url ?? '',
  issued: e.source.issued,
  frontPct: Math.round(e.setbacks.front.fraction * 100),
  frontMin: e.setbacks.front.min,
  sidePct: Math.round(e.setbacks.streetSide.fraction * 100),
  sideMin: e.setbacks.streetSide.min,
  neighbour: e.setbacks.neighbour,
  groundPct: Math.round(e.coverage.ground * 100),
  upperPct: Math.round(e.coverage.upper * 100),
  annexPct: Math.round((e.roofAnnexShare ?? 0) * 100),
  maxFloors: e.maxFloors ?? 0,
  maxHeightM: e.maxHeightM ?? 0,
  parkingPerUnit: e.parking.perUnit ?? 0,
  notes: e.notes,
});

/**
 * The Rasikh team keeps each Amanah's own building requirements, each with its official source: offices then apply
 * them to plots in that Amanah's cities. The Ministry's national requirements are built in and read-only here.
 */
export function RegulationsAdmin() {
  const t = useTranslations('eng.regs');
  const user = useUser();
  const { entries } = useRegulationLibrary();
  const [f, setF] = useState<Form>(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });
  const num = (id: keyof Form, label: string, step = 0.5) => (
    <label key={id} className="flex flex-col gap-1 text-small">
      {label}
      <input
        type="number"
        min={0}
        step={step}
        value={f[id] as number}
        onChange={(e) => set(id, Number(e.target.value) as never)}
        className="hairline min-h-11 rounded-md bg-surface px-3 tabular"
      />
    </label>
  );
  const text = (id: keyof Form, label: string, dir?: 'ltr') => (
    <label key={id} className="flex flex-col gap-1 text-small">
      {label}
      <input
        value={f[id] as string}
        dir={dir}
        onChange={(e) => set(id, e.target.value as never)}
        className="hairline min-h-11 rounded-md bg-surface px-3"
      />
    </label>
  );

  const save = async (status: 'draft' | 'verified') => {
    setMsg(undefined);
    if (!user) return;
    const reg: Regulation = {
      title: f.title.trim(),
      scope: 'amanah',
      cities: f.cities
        .split(/[,،]/)
        .map((c) => c.trim())
        .filter(Boolean),
      buildingTypes: f.types,
      source: {
        issuer: f.issuer.trim(),
        document: f.document.trim(),
        reference: f.reference.trim(),
        ...(f.url.trim() ? { url: f.url.trim() } : {}),
        issued: f.issued.trim(),
      },
      setbacks: {
        front: { fraction: f.frontPct / 100, min: f.frontMin },
        streetSide: { fraction: f.sidePct / 100, min: f.sideMin },
        neighbour: f.neighbour,
      },
      coverage: { ground: f.groundPct / 100, upper: f.upperPct / 100 },
      ...(f.annexPct > 0 ? { roofAnnexShare: f.annexPct / 100 } : {}),
      ...(f.maxFloors > 0 ? { maxFloors: Math.round(f.maxFloors) } : {}),
      ...(f.maxHeightM > 0 ? { maxHeightM: f.maxHeightM } : {}),
      parking: f.parkingPerUnit > 0 ? { perUnit: f.parkingPerUnit } : {},
      clauses: {},
      notes: f.notes.trim(),
    };
    const parsed = RegulationSchema.safeParse(reg);
    if (!parsed.success || parsed.data.cities.length === 0)
      return setMsg({ ok: false, text: t('admin.invalid') });
    const data = {
      ...JSON.parse(JSON.stringify(parsed.data)),
      status,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    };
    try {
      if (f.id) await setDoc(doc(firebaseDb(), 'regulations', f.id), data);
      else await addDoc(collection(firebaseDb(), 'regulations'), data);
      setF(EMPTY);
      setMsg({ ok: true, text: t('admin.saved') });
    } catch {
      setMsg({ ok: false, text: t('admin.failed') });
    }
  };

  const verify = (e: LibraryEntry, status: 'draft' | 'verified') =>
    user &&
    void updateDoc(doc(firebaseDb(), 'regulations', e.id), {
      status,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });

  return (
    <section className="flex flex-col gap-6" data-testid="regulations-admin">
      <p className="max-w-3xl text-small text-text-muted">{t('admin.lead')}</p>
      <ul className="flex flex-col gap-3">
        {entries.map((e) => (
          <li
            key={e.id}
            data-testid="regulation-entry"
            className="hairline flex flex-col gap-2 rounded-xl bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-body font-semibold">
                {e.title}
                {e.cities.length > 0 && (
                  <span className="text-small font-normal text-text-muted">
                    {' '}
                    · {e.cities.join('، ')}
                  </span>
                )}
              </p>
              {e.status !== 'national' && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="quiet" onClick={() => setF(toForm(e))}>
                    {t('admin.edit')}
                  </Button>
                  <Button
                    variant={e.status === 'verified' ? 'ghost' : 'primary'}
                    onClick={() => verify(e, e.status === 'verified' ? 'draft' : 'verified')}
                  >
                    {e.status === 'verified' ? t('admin.unverify') : t('admin.verify')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void deleteDoc(doc(firebaseDb(), 'regulations', e.id))}
                  >
                    {t('admin.delete')}
                  </Button>
                </div>
              )}
            </div>
            <SourceBox entry={e} />
          </li>
        ))}
      </ul>

      <form
        className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
        aria-labelledby="reg-form-h"
        onSubmit={(e) => {
          e.preventDefault();
          void save('draft');
        }}
      >
        <h3 id="reg-form-h" className="text-body font-semibold">
          {f.id ? t('admin.editTitle') : t('admin.addTitle')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {text('title', t('admin.title'))}
          {text('cities', t('admin.cities'))}
          {text('issuer', t('admin.issuer'))}
          {text('document', t('admin.document'))}
          {text('reference', t('admin.reference'))}
          {text('issued', t('admin.issued'))}
          {text('url', t('admin.url'), 'ltr')}
        </div>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
          <legend className="mb-1 text-small font-semibold">{t('admin.types')}</legend>
          {BUILDING_TYPES.map((b) => (
            <label key={b} className="flex min-h-10 items-center gap-1.5 text-small">
              <input
                type="checkbox"
                checked={f.types.includes(b)}
                onChange={(e) =>
                  set('types', e.target.checked ? [...f.types, b] : f.types.filter((x) => x !== b))
                }
                className="size-5 accent-[var(--rk-brand)]"
              />
              {t(`admin.type.${b}`)}
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {num('frontPct', t('admin.frontPct'), 1)}
          {num('frontMin', t('admin.frontMin'))}
          {num('sidePct', t('admin.sidePct'), 1)}
          {num('sideMin', t('admin.sideMin'))}
          {num('neighbour', t('admin.neighbour'))}
          {num('groundPct', t('admin.groundPct'), 1)}
          {num('upperPct', t('admin.upperPct'), 1)}
          {num('annexPct', t('admin.annexPct'), 1)}
          {num('maxFloors', t('admin.maxFloors'), 1)}
          {num('maxHeightM', t('admin.maxHeightM'))}
          {num('parkingPerUnit', t('admin.parkingPerUnit'))}
        </div>
        <label className="flex flex-col gap-1 text-small">
          {t('admin.notes')}
          <textarea
            value={f.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className="hairline rounded-md bg-surface p-3"
          />
        </label>
        <p className="text-caption text-text-muted">{t('admin.zeroMeans')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t('admin.saveDraft')}</Button>
          <Button type="button" variant="quiet" onClick={() => void save('verified')}>
            {t('admin.saveVerified')}
          </Button>
          {f.id && (
            <Button type="button" variant="ghost" onClick={() => setF(EMPTY)}>
              {t('admin.cancel')}
            </Button>
          )}
        </div>
        {msg && (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={msg.ok ? 'text-small text-success' : 'text-small text-danger'}
          >
            {msg.text}
          </p>
        )}
      </form>
    </section>
  );
}
