'use client';

import {
  area,
  builtUpArea,
  generateOptions,
  requiredDisciplines,
  runRules,
  scorePlan,
  summarize,
  type PlanRoom,
  type RuleOverrides,
} from '@rasikh/shared';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { firebaseDb } from '@/lib/firebase';
import { planSha, type ProjectDoc, type VersionDoc } from '@/lib/eng/data';
import type { Row } from '@/lib/ops/hooks';
import { PlanView } from './PlanView';

const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

/**
 * 3–6 options from the deterministic layout engine, ranked; the office shares them and the client picks one.
 * The model never draws: the options come only from the engine.
 */
export function ConceptsPanel({
  pid,
  project,
  versions,
  officeMember,
  isClient,
  uid,
  overrides,
  roomLabel,
}: {
  pid: string;
  project: ProjectDoc;
  versions: Row<VersionDoc>[];
  officeMember: boolean;
  isClient: boolean;
  uid: string;
  overrides: RuleOverrides;
  roomLabel: (r: PlanRoom) => string;
}) {
  const t = useTranslations('eng');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const concepts = versions.filter((v) => v.data.kind === 'concept');
  const required = project.required ?? requiredDisciplines(project.kind);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(undefined);
    try {
      await fn();
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(undefined);
    }
  };

  const generate = () =>
    run('gen', async () => {
      if (!project.zoning) throw new Error('zoning');
      const plans = generateOptions(project.plot, project.zoning, project.program, 4);
      const db = firebaseDb();
      const batch = writeBatch(db);
      for (const plan of plans) {
        batch.set(doc(collection(db, `designProjects/${pid}/versions`)), {
          label: String(plan.variant.id),
          kind: 'concept',
          status: 'draft',
          plan,
          sha256: await planSha(plan),
          required,
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    });

  const shareAll = () =>
    run('share', async () => {
      const db = firebaseDb();
      const batch = writeBatch(db);
      for (const v of concepts)
        if (v.data.status === 'draft')
          batch.update(doc(db, `designProjects/${pid}/versions/${v.id}`), { status: 'shared' });
      batch.update(doc(db, 'designProjects', pid), {
        status: 'concepts',
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    });

  const pick = (vid: string) =>
    run(vid, () =>
      updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        status: 'picked',
        pickedVersionId: vid,
        updatedAt: serverTimestamp(),
      }),
    );

  const develop = () =>
    run('dev', async () => {
      const picked = versions.find((v) => v.id === project.pickedVersionId) ?? concepts[0];
      if (!picked) return;
      const plan = picked.data.plan;
      await addDoc(collection(firebaseDb(), `designProjects/${pid}/versions`), {
        label: `${t('tabs.plan')} 1`,
        kind: 'development',
        status: 'draft',
        plan,
        sha256: await planSha(plan),
        required,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        status: 'development',
        updatedAt: serverTimestamp(),
      });
    });

  return (
    <div className="flex flex-col gap-4" data-testid="concepts">
      {officeMember && (
        <div className="flex flex-wrap items-center gap-2">
          {!project.zoning ? (
            <p className="text-small text-warning">{t('zoningRequired')}</p>
          ) : (
            concepts.length === 0 && (
              <Button onClick={() => void generate()} loading={busy === 'gen'}>
                {t('generate')}
              </Button>
            )
          )}
          {concepts.some((v) => v.data.status === 'draft') && (
            <Button variant="quiet" onClick={() => void shareAll()} loading={busy === 'share'}>
              {t('shareAll')}
            </Button>
          )}
          {project.status === 'picked' && (
            <Button onClick={() => void develop()} loading={busy === 'dev'}>
              {t('startDevelopment')}
            </Button>
          )}
        </div>
      )}
      {concepts.length === 0 && (
        <p className="text-small text-text-muted">
          {isClient ? t('waitConcepts') : t('noConcepts')}
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {concepts.map((v) => {
          const plan = v.data.plan;
          const s = scorePlan(plan);
          const checks = project.zoning
            ? summarize(
                runRules(
                  { plan, plot: project.plot, zoning: project.zoning, program: project.program },
                  overrides,
                ),
              )
            : null;
          const chosen = project.pickedVersionId === v.id;
          return (
            <li
              key={v.id}
              data-testid={`concept-${v.data.label}`}
              className={cn(
                'hairline flex flex-col gap-2 rounded-xl bg-surface p-3',
                chosen && 'border-brand',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-body font-semibold">{t('option', { id: v.data.label })}</h3>
                <span className="text-caption text-text-muted">
                  {t(`vstatus.${v.data.status}`)}
                </span>
              </div>
              <PlanView
                plan={plan}
                floor={0}
                label={roomLabel}
                watermark={t('watermark')}
                title={t('option', { id: v.data.label })}
                compact
              />
              <p className="tabular text-caption text-text-muted">
                {t('builtUp', { area: Math.round(builtUpArea(plan)) })} ·{' '}
                {t('coverage', {
                  pct: pct.format(area(plan.footprint) / (plan.plot.width * plan.plot.depth)),
                })}{' '}
                · {t('score', { score: s.score })}
                {s.daylightMissing > 0 && <> · {t('daylightMissing', { n: s.daylightMissing })}</>}
              </p>
              {checks && officeMember && (
                <p className="tabular text-caption">{t('summary', checks)}</p>
              )}
              {chosen && <p className="text-small font-semibold text-brand-text">{t('picked')}</p>}
              {isClient && project.status === 'concepts' && (
                <Button onClick={() => void pick(v.id)} loading={busy === v.id}>
                  {t('pick')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
