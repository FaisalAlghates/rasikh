'use client';

import {
  DISCIPLINES,
  ZoningSchema,
  requiredDisciplines,
  allowedOn,
  zoningFromRegulation,
  type Discipline,
  type Zoning,
} from '@rasikh/shared';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { firebaseDb } from '@/lib/firebase';
import type { ProjectDoc } from '@/lib/eng/data';
import type { LibraryEntry } from '@/lib/eng/regulations';
import { RegulationPicker } from './RegulationPicker';

const fmt = new Intl.NumberFormat('en-US');

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
  // values the applied requirements leave to the plot's approved local plan: the office confirms them
  const [local, setLocal] = useState<string[]>([]);
  const p = project.program;
  const apply = (entry: LibraryEntry) => {
    const r = zoningFromRegulation(entry, project.plot, project.program, z);
    setZ({
      ...r.zoning,
      source: {
        id: entry.id,
        title: entry.title,
        document: entry.source.document,
        reference: entry.source.reference,
      },
    });
    setLocal(r.fromLocalPlan);
  };
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const save = async (status?: 'accepted' | 'declined') => {
    setMsg(undefined);
    const parsed = ZoningSchema.safeParse(z);
    if (!parsed.success && status !== 'declined')
      return setMsg({ ok: false, text: t('zoningRequired') });
    try {
      await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        // Firestore stores no undefined values
        ...(parsed.success ? { zoning: JSON.parse(JSON.stringify(parsed.data)) as Zoning } : {}),
        ...(status ? { status } : {}),
        required: req.length ? req : requiredDisciplines(project.kind),
        updatedAt: serverTimestamp(),
      });
      setMsg({ ok: true, text: t('saved') });
    } catch {
      setMsg({ ok: false, text: t('failed') });
    }
  };

  const field = (
    id: string,
    label: string,
    value: number,
    on: (n: number) => void,
    step = 0.1,
    confirm = false,
  ) => (
    <label key={id} htmlFor={id} className="flex flex-col gap-1 text-small">
      {label}
      {confirm && <span className="text-caption text-warning">{t('regs.confirmLocal')}</span>}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={value}
        onChange={(e) => on(num(e.target.value))}
        disabled={!officeMember}
        className={
          confirm
            ? 'hairline min-h-11 rounded-md border-warning bg-surface px-3 tabular'
            : 'hairline min-h-11 rounded-md bg-surface px-3 tabular'
        }
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
          <dt className="text-text-muted">{t('uses.kind')}</dt>
          <dd>{p.buildingType ? t(`kind.${p.buildingType}`) : t(`type.${p.type}`)}</dd>
          <dt className="text-text-muted">{t('uses.landUse')}</dt>
          <dd data-testid="land-use">
            {t(`uses.land.${project.plot.landUse ?? 'residential'}`)}
            {p.buildingType &&
              (allowedOn(p.buildingType, project.plot.landUse ?? 'residential', z.allowedTypes) ? (
                <span className="text-success"> · {t('uses.allowed')}</span>
              ) : (
                <span className="text-danger"> · {t('uses.notAllowed')}</span>
              ))}
          </dd>
          {(p.tags ?? []).length > 0 && (
            <>
              <dt className="text-text-muted">{t('uses.tags')}</dt>
              <dd>{(p.tags ?? []).map((x) => t(`tag.${x}`)).join(' · ')}</dd>
            </>
          )}
          <dt className="text-text-muted">{t('floors')}</dt>
          <dd>{p.floors}</dd>
          <dt className="text-text-muted">{t('bedrooms')}</dt>
          <dd>{p.bedrooms}</dd>
          <dt className="text-text-muted">{t('bathrooms')}</dt>
          <dd>{p.bathrooms ?? t('bathroomsAuto')}</dd>
          <dt className="text-text-muted">{t('styleLabel')}</dt>
          <dd>{t(`style.${p.style}`)}</dd>
          <dt className="text-text-muted">{t('plotTitle')}</dt>
          <dd className="tabular" dir="ltr">
            {project.plot.width} × {project.plot.depth} m · {project.plot.city}
          </dd>
          <dt className="text-text-muted">{t('parking')}</dt>
          <dd>{p.parking}</dd>
          {p.targetAreaM2 !== undefined && (
            <>
              <dt className="text-text-muted">{t('targetAreaM2')}</dt>
              <dd className="tabular">{fmt.format(p.targetAreaM2)}</dd>
            </>
          )}
          {p.budgetSar && (
            <>
              <dt className="text-text-muted">{t('budgetLabel')}</dt>
              <dd className="tabular">
                {fmt.format(p.budgetSar.min)} – {fmt.format(p.budgetSar.max)} {t('sar')}
              </dd>
            </>
          )}
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
              'guestRoom',
              'office',
              'prayerRoom',
              'gym',
              'storage',
              'prepKitchen',
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
        <RegulationPicker project={project} zoning={z} canApply={officeMember} onApply={apply} />
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
            local.includes('maxFloors'),
          )}
          {field(
            'z-height',
            t('maxHeightM'),
            z.maxHeightM,
            (n) => setZ({ ...z, maxHeightM: n }),
            0.1,
            local.includes('maxHeightM'),
          )}
          {field(
            'z-park',
            t('parkingPerUnit'),
            z.parkingPerUnit,
            (n) => setZ({ ...z, parkingPerUnit: n }),
            0.5,
          )}
          {field(
            'z-annex',
            t('roofAnnexShare'),
            Math.round((z.roofAnnexShare ?? 0) * 100),
            (n) => setZ({ ...z, roofAnnexShare: n > 0 ? n / 100 : undefined }),
            1,
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
