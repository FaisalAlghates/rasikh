import { structuralCalc, type DesignPlan, type StructuralScheme } from '@rasikh/shared';
import { useTranslations } from 'next-intl';

/** Replaces {name} placeholders. */
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

/** The general notes of the structural set, filled from the scheme the engine chose. */
export function StNotesBody({ scheme, plan }: { scheme: StructuralScheme; plan: DesignPlan }) {
  const t = useTranslations('eng.set.st');
  const values = {
    slab: t(`scheme.${scheme.slab}`),
    thick: Math.round(scheme.slabThickness * 100),
    span: Math.max(scheme.spanX, scheme.spanY).toFixed(1),
    beam: Math.round(scheme.beamDepth * 100),
    col: scheme.columnSize,
    n: scheme.columns.length,
  };
  const notes = t.raw('notes') as string[];
  return (
    <div className="flex flex-col gap-4" data-testid="st-notes">
      <ol className="flex max-w-3xl list-decimal flex-col gap-2 ps-6 text-small">
        {notes.map((n, i) => (
          <li key={i}>{fill(n, values)}</li>
        ))}
      </ol>
      <p className="text-caption text-[#5f594f]">
        {plan.floors} · {scheme.gridX.length - 1}×{scheme.gridY.length - 1}
      </p>
    </div>
  );
}

/** The columns of the scheme, grouped by size, with the approximate load of the biggest. */
export function StColumnsBody({ scheme, plan }: { scheme: StructuralScheme; plan: DesignPlan }) {
  const t = useTranslations('eng.set.st');
  const calc = structuralCalc(plan, scheme);
  return (
    <table className="w-full max-w-2xl text-small" data-testid="column-schedule">
      <thead>
        <tr className="border-b border-night/40">
          {(['mark', 'size', 'count', 'span', 'load'] as const).map((k) => (
            <th key={k} scope="col" className="p-1.5 text-start font-semibold">
              {t(k)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-night/10">
          <td className="tabular p-1.5">C1</td>
          <td className="tabular p-1.5" dir="ltr">
            {scheme.columnSize}
          </td>
          <td className="tabular p-1.5">{scheme.columns.length}</td>
          <td className="tabular p-1.5">{Math.max(scheme.spanX, scheme.spanY).toFixed(2)}</td>
          <td className="tabular p-1.5">{calc.axial}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** The slab and beam layout drawn over the plan: beams on every axis, a mark in each bay. */
export function SlabLayer({
  scheme,
  Y,
  label,
}: {
  scheme: StructuralScheme;
  Y: (y: number) => number;
  label: string;
}) {
  const xs = scheme.gridX;
  const ys = scheme.gridY;
  const has = (x: number, y: number) =>
    scheme.columns.some((c) => Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01);
  const bays: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++) {
      const corners = [
        has(xs[i]!, ys[j]!),
        has(xs[i + 1]!, ys[j]!),
        has(xs[i]!, ys[j + 1]!),
        has(xs[i + 1]!, ys[j + 1]!),
      ];
      if (corners.filter(Boolean).length >= 3)
        bays.push({ x: xs[i]!, y: ys[j]!, w: xs[i + 1]! - xs[i]!, h: ys[j + 1]! - ys[j]! });
    }
  const bw = Math.max(0.2, scheme.beamDepth / 3);
  return (
    <g data-testid="slab-layer">
      {bays.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x}
            y={Y(b.y + b.h)}
            width={b.w}
            height={b.h}
            fill="#B5532C"
            fillOpacity={0.05}
            stroke="#B5532C"
            strokeOpacity={0.6}
            strokeWidth={0.04}
            strokeDasharray="0.3 0.2"
          />
          <text
            x={b.x + b.w / 2}
            y={Y(b.y + b.h / 2)}
            fontSize={0.42}
            textAnchor="middle"
            fill="#9C4522"
          >
            {label}
          </text>
        </g>
      ))}
      {bays.flatMap((b, i) => [
        <rect
          key={`bx${i}`}
          x={b.x}
          y={Y(b.y) - bw / 2}
          width={b.w}
          height={bw}
          fill="#1A1815"
          fillOpacity={0.55}
        />,
        <rect
          key={`by${i}`}
          x={b.x - bw / 2}
          y={Y(b.y + b.h)}
          width={bw}
          height={b.h}
          fill="#1A1815"
          fillOpacity={0.55}
        />,
      ])}
    </g>
  );
}

/** The preliminary calculation summary: contents, criteria, loads and the biggest column and footing. */
export function StCalcBody({ scheme, plan }: { scheme: StructuralScheme; plan: DesignPlan }) {
  const t = useTranslations('eng.set.st.calc');
  const c = structuralCalc(plan, scheme);
  const sections = t.raw('sections') as string[];
  const rows: Array<[string, string]> = [
    [t('dead'), `${c.selfWeight} ${t('unit')}`],
    [t('live'), `2 ${t('unit')}`],
    [t('liveRoof'), `1 ${t('unit')}`],
    [t('service'), `${c.serviceFloor} / ${c.serviceRoof} ${t('unit')}`],
    [t('factored'), `${c.factoredFloor} ${t('unit')}`],
    [t('tributary'), String(c.tributary)],
    [t('axial'), String(c.axial)],
    [t('bearing'), String(c.soilBearing)],
    [t('footing'), String(c.footingArea)],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]" data-testid="st-calc">
      <nav aria-label={t('toc')}>
        <h4 className="mb-1 text-small font-semibold">{t('toc')}</h4>
        <ol className="list-decimal ps-5 text-small">
          {sections.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-col gap-3">
        <p className="max-w-2xl text-small">{t('intro')}</p>
        <p className="max-w-2xl text-small text-[#5f594f]">{t('criteria')}</p>
        <table className="w-full max-w-2xl text-small">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-night/10">
                <th scope="row" className="p-1.5 text-start font-normal">
                  {k}
                </th>
                <td className="tabular p-1.5 text-end" dir="ltr">
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-caption text-warning">{t('bearingNote')}</p>
      </div>
    </div>
  );
}
