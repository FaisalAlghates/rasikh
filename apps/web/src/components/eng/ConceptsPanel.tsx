'use client';

import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  boq,
  catalogEntry,
  coveredArea,
  builtUpArea,
  deferredItems,
  designTips,
  explainOption,
  optionLabel,
  programCounts,
  requiredDisciplines,
  runRules,
  schedule,
  searchOptions,
  structuralScheme,
  type Boq,
  type DesignPlan,
  type PlanRoom,
  type Rates,
  type RuleOverrides,
  type RuleResult,
  type Zoning,
} from '@rasikh/shared';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { firebaseDb } from '@/lib/firebase';
import { planSha, type CheckSummary, type ProjectDoc, type VersionDoc } from '@/lib/eng/data';
import { floorLabel } from '@/lib/eng/labels';
import { officePatterns, useDesignLibrary } from '@/lib/eng/library';
import type { Row } from '@/lib/ops/hooks';
import { BoqTable } from './BoqTable';
import { PlanView } from './PlanView';

const fmt = new Intl.NumberFormat('en-US');
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
const COUNTS = [6, 8, 10, 12].filter((n) => n >= MIN_OPTIONS && n <= MAX_OPTIONS);

export function checkSummary(results: RuleResult[]): CheckSummary {
  const zoning = results.filter((r) => r.pack === 'zoning');
  // automatic code rules: those that ran (a preview, or a verified pass/fail)
  const auto = results.filter(
    (r) => r.pack === 'code' && (r.preview || r.status !== 'not_checked'),
  );
  return {
    zoning: { passed: zoning.filter((r) => r.status === 'passed').length, total: zoning.length },
    code: {
      passed: auto.filter((r) => r.status === 'passed' || r.preview === 'would_pass').length,
      total: auto.length,
      verified: auto.length > 0 && auto.every((r) => r.verified),
    },
    manual: results.filter((r) => r.pack === 'code' && r.status === 'not_checked' && !r.preview)
      .length,
  };
}

type Summary = {
  tried: number;
  compliant: number;
  chosen: number;
  blocking: Array<{ id: string; count: number }>;
  floorsReduced: boolean;
  libraryMatches: number;
  inspired: number;
};

/**
 * The design options. The office asks the assistant for 6–12 options: the deterministic search keeps only designs
 * that hold the client's whole programme and pass every zoning and automatic code check, picks the most different
 * ones, and prices each with a bill of quantities. The model never draws; the client compares, then picks one.
 */
export function ConceptsPanel({
  pid,
  project,
  versions,
  officeMember,
  isClient,
  uid,
  overrides,
  rates,
  roomLabel,
  officeName,
}: {
  officeName: string;
  pid: string;
  project: ProjectDoc;
  versions: Row<VersionDoc>[];
  officeMember: boolean;
  isClient: boolean;
  uid: string;
  overrides: RuleOverrides;
  rates?: Partial<Rates>;
  roomLabel: (r: PlanRoom) => string;
}) {
  const t = useTranslations('eng');
  const locale = useLocale();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [count, setCount] = useState(8);
  const [summary, setSummary] = useState<Summary>();
  // A, B, ... Z, AA: options made in one batch share a timestamp, so the label gives the order
  const shared = useDesignLibrary(project.program.type, officeMember);
  const concepts = useMemo(
    () =>
      versions
        .filter((v) => v.data.kind === 'concept')
        .sort(
          (a, b) =>
            a.data.label.length - b.data.label.length || a.data.label.localeCompare(b.data.label),
        ),
    [versions],
  );
  const required = project.required ?? requiredDisciplines(project.kind);
  const budget = project.program.budgetSar;

  const act = async (key: string, fn: () => Promise<void>) => {
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

  const generate = (more: boolean) =>
    act(more ? 'more' : 'gen', async () => {
      const zoning = project.zoning;
      if (!zoning) throw new Error('zoning');
      // what the engine learns from: designs offices shared (with their clients' consent) and this office's own
      // released projects (they never leave the office)
      const own = await officePatterns(
        project.officeId,
        officeName,
        project.program.type,
        pid,
      ).catch(() => []);
      // let the busy state paint before the search runs on this thread
      await new Promise((r) => setTimeout(r, 30));
      const r = searchOptions(project.plot, zoning, project.program, {
        count,
        overrides,
        existing: more ? concepts.map((v) => v.data.plan) : [],
        library: [...shared.items, ...own],
      });
      setSummary({
        tried: r.tried,
        compliant: r.compliant,
        chosen: r.options.length,
        blocking: r.blocking,
        floorsReduced: r.floorsReduced,
        libraryMatches: r.libraryMatches,
        inspired: r.inspired,
      });
      if (r.options.length === 0) return;
      const db = firebaseDb();
      const batch = writeBatch(db);
      for (const [i, plan] of r.options.entries()) {
        const results = runRules(
          { plan, plot: project.plot, zoning, program: project.program },
          overrides,
        );
        batch.set(doc(collection(db, `designProjects/${pid}/versions`)), {
          label: optionLabel(concepts.length + i),
          kind: 'concept',
          status: 'draft',
          plan,
          sha256: await planSha(plan),
          required,
          // priced and checked now, with the office's rates and verified parameters, so the client sees the same
          boq: JSON.parse(JSON.stringify(boq(plan, structuralScheme(plan), rates))) as Boq,
          checks: checkSummary(results),
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    });

  const shareAll = () =>
    act('share', async () => {
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
    act(vid, () =>
      updateDoc(doc(firebaseDb(), 'designProjects', pid), {
        status: 'picked',
        pickedVersionId: vid,
        updatedAt: serverTimestamp(),
      }),
    );

  const develop = () =>
    act('dev', async () => {
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

  // per option: the bill, the schedule, the checks and why it fits
  const rows = useMemo(
    () =>
      concepts.map((v) => {
        const plan = v.data.plan;
        const bill: Boq = v.data.boq ?? boq(plan, structuralScheme(plan), rates);
        const results = project.zoning
          ? runRules(
              { plan, plot: project.plot, zoning: project.zoning, program: project.program },
              overrides,
            )
          : null;
        const stored = v.data.checks;
        return {
          v,
          plan,
          bill,
          weeks: schedule(plan).totalWeeks,
          // the office sees the live checks; the client the ones recorded when the option was made
          checks: (officeMember || !stored) && results ? checkSummary(results) : stored,
          notes: project.zoning
            ? explainOption(plan, project.program, project.plot, project.zoning)
            : [],
        };
      }),
    [concepts, rates, overrides, project, officeMember],
  );

  const tips = designTips({ style: project.program.style, type: project.program.type });
  const budgetFit = (b: Boq) =>
    !budget ? null : b.max <= budget.max ? 'within' : b.min > budget.max ? 'over' : 'near';
  const roomsText = programCounts(project.program)
    .map(({ type, n }) => (n > 1 ? `${t(`room.${type}`)} ×${n}` : t(`room.${type}`)))
    .join('، ');
  const deferredText = (plan: DesignPlan) => {
    const items = deferredItems(project.program, plan);
    return items.length
      ? t('designs.deferred', {
          items: items.map((d) => t(`designs.deferredItem.${d}`)).join('، '),
        })
      : undefined;
  };
  const blockText = (id: string) =>
    id === 'PROGRAM' || id === 'ACCESS' || id === 'CLASH'
      ? t(`designs.block.${id}`)
      : t(`rule.${id}`);

  return (
    <div className="flex flex-col gap-4" data-testid="concepts">
      {officeMember && (
        <section className="flex flex-col gap-3" aria-label={t('tabs.concepts')}>
          <p className="max-w-3xl text-small text-text-muted">{t('designs.lead')}</p>
          {catalogEntry(project.program.buildingType)?.family === 'specialist' ? (
            <p className="text-small text-warning" data-testid="specialist">
              {t('uses.specialistOffice')}
            </p>
          ) : !project.zoning ? (
            <p className="text-small text-warning">{t('zoningRequired')}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              {project.status !== 'picked' && project.status !== 'development' && (
                <>
                  <label className="flex flex-col gap-1 text-small">
                    {t('designs.count')}
                    <select
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="hairline min-h-11 rounded-md bg-surface px-2 tabular"
                      data-testid="option-count"
                    >
                      {COUNTS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {concepts.length === 0 ? (
                    <Button onClick={() => void generate(false)} loading={busy === 'gen'}>
                      {t('designs.generate', { n: count })}
                    </Button>
                  ) : (
                    <Button
                      variant="quiet"
                      onClick={() => void generate(true)}
                      loading={busy === 'more'}
                    >
                      {t('designs.more')}
                    </Button>
                  )}
                </>
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
          {summary && (
            <div
              role="status"
              className="flex flex-col gap-1 text-small"
              data-testid="search-summary"
            >
              {summary.chosen > 0 ? (
                <p>
                  {t('designs.result', {
                    tried: summary.tried,
                    compliant: summary.compliant,
                    chosen: summary.chosen,
                  })}
                </p>
              ) : (
                <p className="text-warning">
                  {t('designs.none', {
                    reasons: summary.blocking
                      .slice(0, 3)
                      .map((b) => blockText(b.id))
                      .join('، '),
                  })}
                </p>
              )}
              {summary.chosen > 0 && summary.chosen < Math.min(count, MIN_OPTIONS) && (
                <p className="text-warning">{t('designs.fewer', { n: summary.chosen })}</p>
              )}
              <p className="text-text-muted" data-testid="library-summary">
                {summary.libraryMatches > 0
                  ? t('designs.fromLibrary', {
                      matches: summary.libraryMatches,
                      inspired: summary.inspired,
                    })
                  : t('designs.libraryEmpty')}
              </p>
              {summary.floorsReduced && project.zoning && (
                <p className="text-warning">
                  {t('designs.floorsReduced', { n: project.zoning.maxFloors })}
                </p>
              )}
            </div>
          )}
        </section>
      )}
      {concepts.length === 0 && !(officeMember && project.zoning) && (
        <p className="text-small text-text-muted">
          {isClient ? t('waitConcepts') : t('noConcepts')}
        </p>
      )}

      {rows.length > 1 && (
        <section className="flex min-w-0 flex-col gap-2" aria-labelledby="compare-h">
          <h3 id="compare-h" className="text-body font-semibold">
            {t('designs.compare')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-small" data-testid="compare">
              <thead>
                <tr className="border-b border-border/20 text-text-muted">
                  {(
                    [
                      'colOption',
                      'colType',
                      'colArea',
                      'colCoverage',
                      'colCost',
                      'colWeeks',
                    ] as const
                  ).map((k) => (
                    <th key={k} scope="col" className="p-2 text-start font-medium">
                      {t(`designs.${k}`)}
                    </th>
                  ))}
                  {budget && (
                    <th scope="col" className="p-2 text-start font-medium">
                      {t('designs.colBudget')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ v, plan, bill, weeks }) => {
                  const fit = budgetFit(bill);
                  return (
                    <tr key={v.id} className="border-b border-border/10">
                      <th scope="row" className="p-2 text-start font-semibold">
                        <a
                          href={`#opt-${v.id}`}
                          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                        >
                          {t('option', { id: v.data.label })}
                        </a>
                      </th>
                      <td className="p-2">
                        {t(`designs.type.${String(plan.variant.typology ?? 'bands')}`)}
                      </td>
                      <td className="tabular p-2">{fmt.format(Math.round(builtUpArea(plan)))}</td>
                      <td className="tabular p-2">
                        {pct.format(coveredArea(plan) / (plan.plot.width * plan.plot.depth))}
                      </td>
                      <td className="tabular whitespace-nowrap p-2">
                        {fmt.format(bill.min)} – {fmt.format(bill.max)}
                      </td>
                      <td className="tabular p-2">{weeks}</td>
                      {budget && (
                        <td
                          className={cn(
                            'p-2',
                            fit === 'within' && 'text-success',
                            fit === 'over' && 'text-danger',
                            fit === 'near' && 'text-warning',
                          )}
                        >
                          {fit && t(`designs.budget.${fit}`)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tips.length > 0 && (
        <section
          className="hairline flex flex-col gap-2 rounded-xl bg-surface p-4"
          aria-labelledby="design-tips"
          data-testid="design-tips"
        >
          <h3 id="design-tips" className="text-body font-semibold">
            {t('designs.tipsTitle')}
          </h3>
          <ul className="flex flex-col gap-1 text-small">
            {tips.map((e) => (
              <li key={e.id} className="border-s-2 border-brand ps-3">
                {locale === 'ar' ? e.ar : e.en}
              </li>
            ))}
          </ul>
          <p className="text-caption text-text-muted">{t('designs.tipsNote')}</p>
        </section>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map(({ v, plan, bill, checks, notes }) => (
          <OptionCard
            key={v.id}
            id={v.id}
            label={v.data.label}
            status={v.data.status}
            plan={plan}
            bill={bill}
            checks={checks}
            notes={notes.map((n) =>
              n.key === 'program'
                ? t('designs.fit.program', { rooms: roomsText })
                : n.key === 'inspired' && String(plan.variant.inspiredBy).startsWith('own-')
                  ? t('designs.fit.inspiredOwn')
                  : t(`designs.fit.${n.key}`, n.values),
            )}
            deferred={deferredText(plan)}
            chosen={project.pickedVersionId === v.id}
            canPick={isClient && project.status === 'concepts'}
            picking={busy === v.id}
            onPick={() => void pick(v.id)}
            roomLabel={roomLabel}
            source={project.zoning?.source}
          />
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function OptionCard({
  id,
  label,
  status,
  plan,
  bill,
  checks,
  notes,
  deferred,
  chosen,
  canPick,
  picking,
  onPick,
  roomLabel,
  source,
}: {
  source?: Zoning['source'];
  id: string;
  label: string;
  status: VersionDoc['status'];
  plan: DesignPlan;
  bill: Boq;
  checks?: CheckSummary;
  notes: string[];
  deferred?: string;
  chosen: boolean;
  canPick: boolean;
  picking: boolean;
  onPick: () => void;
  roomLabel: (r: PlanRoom) => string;
}) {
  const t = useTranslations('eng');
  const [floor, setFloor] = useState(0);
  const title = t('option', { id: label });
  const floorName = (f: number) => floorLabel(t, plan, f);
  return (
    <li
      id={`opt-${id}`}
      data-testid={`concept-${label}`}
      className={cn(
        'hairline flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-xl bg-surface p-3',
        chosen && 'border-brand',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body font-semibold">{title}</h3>
        <span className="text-caption text-text-muted">{t(`vstatus.${status}`)}</span>
      </div>
      {plan.floors > 1 && (
        <div role="group" aria-label={t('designs.floors')} className="flex flex-wrap gap-1">
          {Array.from({ length: plan.floors }, (_, f) => (
            <button
              key={f}
              type="button"
              aria-pressed={floor === f}
              onClick={() => setFloor(f)}
              className={cn(
                'hairline min-h-11 rounded-md px-3 text-small',
                floor === f ? 'bg-brand text-on-brand' : 'bg-bg',
              )}
            >
              {floorName(f)}
            </button>
          ))}
        </div>
      )}
      <PlanView
        plan={plan}
        floor={floor}
        label={roomLabel}
        watermark={t('watermark')}
        title={`${title} · ${floorName(floor)}`}
        compact
      />
      <section className="flex flex-col gap-1">
        <h4 className="text-small font-semibold">{t('designs.fitTitle')}</h4>
        <ul className="flex flex-col gap-1 text-small" data-testid="fit-notes">
          {notes.map((n) => (
            <li key={n} className="flex items-start gap-2">
              <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
        {deferred && <p className="text-caption text-text-muted">{deferred}</p>}
      </section>
      {checks && (
        <ul className="flex flex-col gap-0.5 text-caption" data-testid="option-checks">
          <li>{t('designs.checksZoning', checks.zoning)}</li>
          {source && (
            <li className="text-text-muted">
              {t('regs.zoningFrom', {
                document: source.document,
                reference: source.reference ? ` (${source.reference})` : '',
              })}
            </li>
          )}
          <li>
            {t('designs.checksCode', { passed: checks.code.passed, total: checks.code.total })} —{' '}
            {checks.code.verified ? t('designs.codeVerified') : t('designs.codeStarting')}
          </li>
          <li className="text-text-muted">{t('designs.checksManual', { n: checks.manual })}</li>
        </ul>
      )}
      <div className="flex flex-col gap-1">
        <p className="tabular text-small font-semibold" data-testid="option-cost">
          {t('industrial.total', { min: fmt.format(bill.min), max: fmt.format(bill.max) })}
        </p>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-small font-semibold text-brand-text">
            {t('boqShow', { n: bill.lines.length })}
          </summary>
          <div className="pt-2">
            <BoqTable bill={bill} fileName={`rasikh-boq-${label}.csv`} />
          </div>
        </details>
      </div>
      {chosen && <p className="text-small font-semibold text-brand-text">{t('picked')}</p>}
      {canPick && (
        <Button onClick={onPick} loading={picking}>
          {t('pick')}
        </Button>
      )}
    </li>
  );
}
