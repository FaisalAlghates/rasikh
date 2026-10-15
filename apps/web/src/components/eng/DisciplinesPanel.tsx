'use client';

import {
  boq,
  coolingLoads,
  detectClashes,
  electricalLoad,
  plumbingFixtures,
  schedule,
  structuralScheme,
  type DesignPlan,
  type PlanRoom,
  type Rates,
} from '@rasikh/shared';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { BoqTable } from './BoqTable';
import { PlanView } from './PlanView';

const fmt = new Intl.NumberFormat('en-US');

/** Preliminary numbers for the structural, mechanical, electrical and industrial engineers, plus coordination. */
export function DisciplinesPanel({
  plan,
  rates,
  roomLabel,
}: {
  plan: DesignPlan;
  rates?: Partial<Rates>;
  roomLabel: (r: PlanRoom) => string;
}) {
  const t = useTranslations('eng');
  const scheme = useMemo(() => structuralScheme(plan), [plan]);
  const cooling = useMemo(() => coolingLoads(plan), [plan]);
  const elec = useMemo(() => electricalLoad(plan), [plan]);
  const fixtures = useMemo(() => plumbingFixtures(plan), [plan]);
  const clashes = useMemo(() => detectClashes(plan, scheme), [plan, scheme]);
  const cost = useMemo(() => boq(plan, scheme, rates), [plan, scheme, rates]);
  const sched = useMemo(() => schedule(plan), [plan]);
  const points = elec.points.reduce(
    (s, p) => ({ lights: s.lights + p.lights, sockets: s.sockets + p.sockets }),
    { lights: 0, sockets: 0 },
  );

  const card = 'hairline flex flex-col gap-2 rounded-xl bg-surface p-4';
  return (
    <div className="flex flex-col gap-4" data-testid="disciplines">
      <p className="text-caption text-warning">{t('preliminary')}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card} aria-labelledby="d-str">
          <h3 id="d-str" className="text-body font-semibold">
            {t('structural.title')}
          </h3>
          <ul className="flex flex-col gap-1 text-small">
            <li>{t('structural.grid', { x: scheme.gridX.length, y: scheme.gridY.length })}</li>
            <li>{t('structural.spans', { x: scheme.spanX, y: scheme.spanY })}</li>
            <li>
              {t(`structural.slab.${scheme.slab}`)} ·{' '}
              {t('structural.slabThickness', { t: scheme.slabThickness })}
            </li>
            <li>
              {t('structural.columnSize', { s: scheme.columnSize })} ·{' '}
              {t('structural.columns', { n: scheme.columns.length })}
            </li>
            <li>{t('structural.foundation')}</li>
          </ul>
          <PlanView
            plan={plan}
            floor={0}
            label={roomLabel}
            scheme={scheme}
            clashes={clashes}
            title={t('structural.title')}
            compact
          />
        </section>
        <section className={card} aria-labelledby="d-mech">
          <h3 id="d-mech" className="text-body font-semibold">
            {t('mechanical.title')}
          </h3>
          <p className="text-small font-semibold">
            {t('mechanical.total', { tr: cooling.totalTr })}
          </p>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-caption">
              <thead>
                <tr className="border-b border-border/20">
                  <th scope="col" className="p-1 text-start">
                    {t('mechanical.room')}
                  </th>
                  <th scope="col" className="p-1 text-start">
                    {t('mechanical.tr')}
                  </th>
                  <th scope="col" className="p-1 text-start">
                    {t('mechanical.system')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cooling.rows.map((r) => (
                  <tr key={r.roomId} className="border-b border-border/10">
                    <td className="p-1">
                      {t(`room.${r.type}`)} ·{' '}
                      {r.floor === 0 ? t('ground') : t('floorN', { n: r.floor })}
                    </td>
                    <td className="tabular p-1">{r.tr}</td>
                    <td className="p-1">{t(`mechanical.${r.system}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-small font-semibold">{t('mechanical.fixtures')}</p>
          <p className="text-small">
            {Object.entries(fixtures)
              .map(([k, n]) => `${t(`fixtures.${k}`)} ${n}`)
              .join(' · ')}
          </p>
        </section>
        <section className={card} aria-labelledby="d-elec">
          <h3 id="d-elec" className="text-body font-semibold">
            {t('electrical.title')}
          </h3>
          <ul className="flex flex-col gap-1 text-small">
            <li>{t('electrical.lighting', { kva: elec.lightingKva })}</li>
            <li>{t('electrical.power', { kva: elec.powerKva })}</li>
            <li>{t('electrical.cooling', { kva: elec.coolingKva })}</li>
            <li className="font-semibold">{t('electrical.total', { kva: elec.totalKva })}</li>
            <li>{t('electrical.panels', { n: elec.panels })}</li>
            <li>{t('electrical.points', points)}</li>
          </ul>
        </section>
        <section className={card} aria-labelledby="d-clash">
          <h3 id="d-clash" className="text-body font-semibold">
            {t('clashTitle')}
          </h3>
          {clashes.length === 0 ? (
            <p className="text-small text-success" data-testid="no-clashes">
              {t('noClashes')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-small text-danger" data-testid="clashes">
              {clashes.map((c, i) => (
                <li key={i}>
                  {t('clash', {
                    floor: c.floor,
                    x: c.x.toFixed(1),
                    y: c.y.toFixed(1),
                    m: c.overlap,
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className={card} aria-labelledby="d-ind">
        <h3 id="d-ind" className="text-body font-semibold">
          {t('industrial.title')}
        </h3>
        <p className="text-small font-semibold" data-testid="cost-range">
          {t('industrial.total', { min: fmt.format(cost.min), max: fmt.format(cost.max) })}
        </p>
        <BoqTable bill={cost} fileName="rasikh-boq.csv" />
        <p className="text-small font-semibold">{t('industrial.weeks', { w: sched.totalWeeks })}</p>
        <ol
          className="flex flex-col gap-1"
          aria-label={t('industrial.weeks', { w: sched.totalWeeks })}
        >
          {sched.bars.map((b) => (
            <li key={b.phase} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-caption">
              <span>{t(`phase.${b.phase}`)}</span>
              <span className="relative h-3 rounded-full bg-bg" aria-hidden="true">
                <span
                  className="absolute inset-y-0 rounded-full bg-brand"
                  style={{
                    insetInlineStart: `${(b.start / sched.totalWeeks) * 100}%`,
                    width: `${(b.weeks / sched.totalWeeks) * 100}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
