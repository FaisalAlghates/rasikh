'use client';

import {
  ROOM_TYPES,
  diffRenovation,
  runRules,
  type DesignPlan,
  type PlanRoom,
  type RoomType,
  type RuleOverrides,
} from '@rasikh/shared';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { firebaseDb } from '@/lib/firebase';
import { planSha, type ProjectDoc, type VersionDoc } from '@/lib/eng/data';
import { ChecksReport } from './ChecksReport';
import { PlanView } from './PlanView';

/**
 * The office's plan editor: pick a room, change its size, position or use; every edit re-runs every check at once.
 * A saved edit gives the version a new fingerprint, so earlier approvals no longer match it.
 */
export function PlanEditor({
  pid,
  vid,
  version,
  project,
  canEdit,
  overrides,
  existing,
  roomLabel,
}: {
  pid: string;
  vid: string;
  version: VersionDoc;
  project: ProjectDoc;
  canEdit: boolean;
  overrides: RuleOverrides;
  existing?: DesignPlan;
  roomLabel: (r: PlanRoom) => string;
}) {
  const t = useTranslations('eng');
  const [plan, setPlan] = useState(version.plan);
  const [floor, setFloor] = useState(0);
  const [sel, setSel] = useState<string>();
  const [focus, setFocus] = useState<string[]>([]);
  const [diff, setDiff] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => setPlan(version.plan), [version.plan]);

  const room = plan.rooms.find((r) => r.id === sel);
  const [form, setForm] = useState({ x: 0, y: 0, w: 0, h: 0, type: 'bedroom' as RoomType });
  useEffect(() => {
    if (room) setForm({ x: room.x, y: room.y, w: room.w, h: room.h, type: room.type });
  }, [room]);

  const results = useMemo(
    () =>
      project.zoning
        ? runRules(
            { plan, plot: project.plot, zoning: project.zoning, program: project.program },
            overrides,
          )
        : [],
    [plan, project, overrides],
  );
  const failedRooms = results
    .filter((r) => r.status === 'failed' || r.preview === 'would_fail')
    .flatMap((r) => r.rooms);
  const reno = useMemo(() => (existing ? diffRenovation(existing, plan) : null), [existing, plan]);

  const save = async (next: DesignPlan, status?: VersionDoc['status']) => {
    setPlan(next);
    setError(undefined);
    try {
      await updateDoc(doc(firebaseDb(), `designProjects/${pid}/versions/${vid}`), {
        plan: next,
        sha256: await planSha(next),
        // editing a version under review sends it back to development (its approvals stop matching)
        ...(status ? { status } : version.status === 'review' ? { status: 'draft' } : {}),
      });
      if (version.status === 'review' && !status)
        await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
          status: 'development',
          updatedAt: serverTimestamp(),
        });
    } catch {
      setError(t('failed'));
    }
  };

  const apply = () => {
    if (!room) return;
    const r = (v: number) => Math.round(v * 100) / 100;
    void save({
      ...plan,
      rooms: plan.rooms.map((x) =>
        x.id === room.id
          ? {
              ...x,
              x: r(form.x),
              y: r(form.y),
              w: Math.max(0.5, r(form.w)),
              h: Math.max(0.5, r(form.h)),
              type: form.type,
            }
          : x,
      ),
    });
  };
  const toReview = async () => {
    await updateDoc(doc(firebaseDb(), `designProjects/${pid}/versions/${vid}`), {
      status: 'review',
    });
    await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
      status: 'review',
      updatedAt: serverTimestamp(),
    });
  };
  const backToDraft = async () => {
    await updateDoc(doc(firebaseDb(), `designProjects/${pid}/versions/${vid}`), {
      status: 'draft',
    });
    await updateDoc(doc(firebaseDb(), 'designProjects', pid), {
      status: 'development',
      updatedAt: serverTimestamp(),
    });
  };

  const viewPlan: DesignPlan = diff && reno ? { ...plan, rooms: reno.rooms } : plan;
  const num = (k: 'x' | 'y' | 'w' | 'h', label: string) => (
    <label className="flex flex-col gap-1 text-small">
      {label}
      <input
        type="number"
        step={0.1}
        inputMode="decimal"
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
        className="hairline min-h-11 rounded-md bg-surface px-3 tabular"
      />
    </label>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]" data-testid="plan-editor">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t('floorLabel')} className="flex flex-wrap gap-1">
            {Array.from({ length: plan.floors }, (_, f) => (
              <button
                key={f}
                type="button"
                aria-pressed={floor === f}
                onClick={() => setFloor(f)}
                className={cn(
                  'hairline min-h-10 rounded-full px-3 text-small',
                  floor === f ? 'bg-brand text-on-brand' : 'hover:bg-surface',
                )}
              >
                {f === 0 ? t('ground') : t('floorN', { n: f })}
              </button>
            ))}
          </div>
          {reno && (
            <button
              type="button"
              aria-pressed={diff}
              onClick={() => setDiff((d) => !d)}
              className={cn(
                'hairline min-h-10 rounded-full px-3 text-small',
                diff ? 'bg-brand text-on-brand' : 'hover:bg-surface',
              )}
            >
              {t('existingSet')}
            </button>
          )}
          <span className="text-caption text-text-muted">{t(`vstatus.${version.status}`)}</span>
        </div>
        <PlanView
          plan={viewPlan}
          floor={floor}
          label={roomLabel}
          selectedId={sel}
          onSelect={canEdit ? setSel : undefined}
          highlight={[...focus, ...failedRooms]}
          watermark={version.status === 'released' ? null : t('watermark')}
          title={floor === 0 ? t('ground') : t('floorN', { n: floor })}
          northDeg={project.plot.northDeg}
        />
        {diff && reno && (
          <div className="flex flex-col gap-1 text-caption">
            <p>
              {(['existing', 'demolish', 'new'] as const)
                .map((s) => t(`stateLegend.${s}`))
                .join(' · ')}
            </p>
            {reno.flags.map((f, i) => (
              <p key={i} className="text-danger">
                {t('structuralFlag')} —{' '}
                {roomLabel(
                  plan.rooms.find((r) => r.id === f.roomId) ??
                    existing!.rooms.find((r) => r.id === f.roomId)!,
                )}
              </p>
            ))}
          </div>
        )}
        <p className="text-caption text-text-muted">{t('liveChecks')}</p>
      </div>
      <div className="flex flex-col gap-4">
        {canEdit && version.status !== 'released' && (
          <section
            className="hairline flex flex-col gap-3 rounded-xl bg-surface p-4"
            aria-labelledby="ed-h"
          >
            <h3 id="ed-h" className="text-body font-semibold">
              {room ? roomLabel(room) : t('tabs.plan')}
            </h3>
            <label className="flex flex-col gap-1 text-small">
              {t('selectRoom')}
              <select
                value={sel ?? ''}
                onChange={(e) => setSel(e.target.value || undefined)}
                className="hairline min-h-11 rounded-md bg-bg px-2"
              >
                <option value="">—</option>
                {plan.rooms
                  .filter((r) => r.floor === floor)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {roomLabel(r)} ({r.id})
                    </option>
                  ))}
              </select>
            </label>
            {room && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {num('x', t('roomX'))}
                  {num('y', t('roomY'))}
                  {num('w', t('roomW'))}
                  {num('h', t('roomH'))}
                </div>
                <label className="flex flex-col gap-1 text-small">
                  {t('roomType')}
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}
                    className="hairline min-h-11 rounded-md bg-bg px-2"
                  >
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {t(`room.${rt}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={apply}>{t('apply')}</Button>
              </>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border/20 pt-3">
              {version.status !== 'review' ? (
                <Button variant="quiet" onClick={() => void toReview()}>
                  {t('sendReview')}
                </Button>
              ) : (
                <Button variant="quiet" onClick={() => void backToDraft()}>
                  {t('backToDraft')}
                </Button>
              )}
            </div>
            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
          </section>
        )}
        {project.zoning ? (
          <ChecksReport results={results} onFocus={setFocus} />
        ) : (
          <p className="text-small text-warning">{t('zoningRequired')}</p>
        )}
      </div>
    </div>
  );
}
