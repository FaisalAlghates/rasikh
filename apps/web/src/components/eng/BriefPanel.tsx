'use client';

import {
  DISCIPLINES,
  ZoningSchema,
  requiredDisciplines,
  type Discipline,
  type Zoning,
} from '@rasikh/shared';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { firebaseDb } from '@/lib/firebase';
import type { ProjectDoc } from '@/lib/eng/data';

const DEFAULT_ZONING: Zoning = {
  use: 'residential',
  setbacks: { front: 0, back: 0, left: 0, right: 0 },
  coverageMax: 0.6,
  farMax: 1.2,
  maxFloors: 2,
  maxHeightM: 10,
  parkingPerUnit: 1,
};

/** The client's brief and programme, and (for the office) the municipal zoning entered from the city's regulations. */
export function BriefPanel({
  pid,
  project,
  officeMember,
}: {
  pid: string;
  project: ProjectDoc;
  officeMember: boolean;
}) {
  const t = useTranslations('eng');
  const [z, setZ] = useState<Zoning>(project.zoning ?? DEFAULT_ZONING);
  // which disciplines must approve before release (the office decides; new versions copy this list)
  const [req, setReq] = useState<Discipline[]>(
    project.required ?? requiredDisciplines(project.kind),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const p = project.program;
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const save = async (status?: 'accepted' | 'declined') => {
    setMsg(undefined);
    const parsed = ZoningSchema.safeParse(z);
    if (!parsed.success && status !== 'declined')
      return setMsg({ ok: false, text: t('zoningRequired') });
    try {
      await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        ...(parsed.success ? { zoning: parsed.data } : {}),
        ...(status ? { status } : {}),
        required: req.length ? req : requiredDisciplines(project.kind),
        updatedAt: serverTimestamp(),
      });
      setMsg({ ok: true, text: t('saved') });
    } catch {
      setMsg({ ok: false, text: t('failed') });
    }
  };

  const field = (id: string, label: string, value: number, on: (n: number) => void, step = 0.1) => (
    <label key={id} htmlFor={id} className="flex flex-col gap-1 text-small">
      {label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={value}
        onChange={(e) => on(num(e.target.value))}
        disabled={!officeMember}
        className="hairline min-h-11 rounded-md bg-surface px-3 tabular"
      />
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3" aria-labelledby="brief-h">
        <h3 id="brief-h" className="text-body font-semibold">
          {t('clientBrief')}
        </h3>
        <p className="text-caption text-text-muted">
          {t('client')}: {project.clientName}
        </p>
        <blockquote
          className="hairline whitespace-pre-wrap rounded-lg bg-surface p-4 text-body"
          data-testid="client-brief"
        >
          {project.brief}
        </blockquote>
        <dl className="grid grid-cols-2 gap-2 text-small">
          <dt className="text-text-muted">{t('typeLabel')}</dt>
          <dd>{t(`type.${p.type}`)}</dd>
          <dt className="text-text-muted">{t('floors')}</dt>
          <dd>{p.floors}</dd>
          <dt className="text-text-muted">{t('bedrooms')}</dt>
          <dd>{p.bedrooms}</dd>
          <dt className="text-text-muted">{t('styleLabel')}</dt>
          <dd>{t(`style.${p.style}`)}</dd>
          <dt className="text-text-muted">{t('plotTitle')}</dt>
          <dd className="tabular" dir="ltr">
            {project.plot.width} × {project.plot.depth} m · {project.plot.city}
          </dd>
          <dt className="text-text-muted">{t('parking')}</dt>
          <dd>{p.parking}</dd>
        </dl>
        <p className="text-small">
          {(
            [
              'majlisMen',
              'majlisWomen',
              'dining',
              'maidRoom',
              'driverRoom',
              'familyLiving',
              'roofAnnex',
              'basement',
              'pool',
              'elevator',
              'separateGuestEntry',
            ] as const
          )
            .filter((k) => p[k])
            .map((k) => t(`toggles.${k}`))
            .join(' · ')}
        </p>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="zone-h" data-testid="zoning-form">
        <h3 id="zone-h" className="text-body font-semibold">
          {t('zoningTitle')}
        </h3>
        <p className="text-caption text-text-muted">{t('zoningNote')}</p>
        <div className="grid grid-cols-2 gap-3">
          {(['front', 'back', 'left', 'right'] as const).map((s) =>
            field(`zs-${s}`, t('setback', { side: t(`side.${s}`) }), z.setbacks[s], (n) =>
              setZ({ ...z, setbacks: { ...z.setbacks, [s]: n } }),
            ),
          )}
          {field(
            'z-cov',
            t('coverageMax'),
            Math.round(z.coverageMax * 100),
            (n) => setZ({ ...z, coverageMax: n / 100 }),
            1,
          )}
          {field('z-far', t('farMax'), z.farMax, (n) => setZ({ ...z, farMax: n }))}
          {field(
            'z-floors',
            t('maxFloors'),
            z.maxFloors,
            (n) => setZ({ ...z, maxFloors: Math.round(n) }),
            1,
          )}
          {field('z-height', t('maxHeightM'), z.maxHeightM, (n) => setZ({ ...z, maxHeightM: n }))}
          {field(
            'z-park',
            t('parkingPerUnit'),
            z.parkingPerUnit,
            (n) => setZ({ ...z, parkingPerUnit: n }),
            0.5,
          )}
        </div>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
          <legend className="mb-1 text-small font-semibold">{t('required')}</legend>
          {DISCIPLINES.map((d) => (
            <label key={d} className="flex min-h-10 items-center gap-1.5 text-small">
              <input
                type="checkbox"
                disabled={!officeMember}
                checked={req.includes(d)}
                onChange={(e) =>
                  setReq(e.target.checked ? [...req, d] : req.filter((x) => x !== d))
                }
                className="size-5 accent-[var(--rk-brand)]"
              />
              {t(`discipline.${d}`)}
            </label>
          ))}
        </fieldset>
        {officeMember && (
          <div className="flex flex-wrap gap-2">
            {project.status === 'brief' ? (
              <>
                <Button onClick={() => void save('accepted')}>{t('accept')}</Button>
                <Button variant="quiet" onClick={() => void save('declined')}>
                  {t('decline')}
                </Button>
              </>
            ) : (
              <Button variant="quiet" onClick={() => void save()}>
                {t('saveZoning')}
              </Button>
            )}
          </div>
        )}
        {msg && (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={msg.ok ? 'text-small text-success' : 'text-small text-danger'}
          >
            {msg.text}
          </p>
        )}
      </section>
    </div>
  );
}
