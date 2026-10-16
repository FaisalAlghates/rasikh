'use client';

import {
  isOpen,
  openingsOf,
  openingWidth,
  toDxf,
  toIfc,
  type DesignPlan,
  type Plot,
  type PlanRoom,
  type Program,
} from '@rasikh/shared';
import { Download, Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { download } from '@/lib/eng/data';
import { PlanView } from './PlanView';
import { floorLabel } from '@/lib/eng/labels';

type Side = 'front' | 'back' | 'left' | 'right';
type Span = [number, number];

/** Merges overlapping stretches. */
function merge(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const [a, b] of [...spans].sort((p, q) => p[0] - q[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 0.05) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** What is left of `spans` once `cover` is taken away. */
function minus(spans: Span[], cover: Span[]): Span[] {
  let out = spans;
  for (const [c0, c1] of cover)
    out = out.flatMap(([a, b]): Span[] => {
      if (c1 <= a || c0 >= b) return [[a, b]];
      const keep: Span[] = [];
      if (c0 > a + 0.05) keep.push([a, c0]);
      if (c1 < b - 0.05) keep.push([c1, b]);
      return keep;
    });
  return out;
}

/**
 * A façade as seen from one side: each floor's own silhouette (a floor set back, a roof annex, a guest pavilion), its
 * parapets (with the Najdi crenellation for Najdi styles) where nothing is built above, floor lines, and the openings
 * on the walls facing that way that nothing in front hides.
 */
function Elevation({
  plan,
  side,
  style,
  title,
}: {
  plan: DesignPlan;
  side: Side;
  style: Program['style'];
  title: string;
}) {
  const fp = plan.footprint;
  const across = side === 'front' || side === 'back';
  const width = across ? fp.w : fp.h;
  const fh = plan.floorHeight;
  const height = plan.floors * fh + 1;
  // position along the façade as seen from outside (the viewer's left first)
  const pos = (u: number) => {
    const a = across ? u - fp.x : u - fp.y;
    return side === 'back' || side === 'left' ? width - a : a;
  };
  const span = (u0: number, u1: number): Span => {
    const a = pos(u0);
    const b = pos(u1);
    return [Math.min(a, b), Math.max(a, b)];
  };
  const built = (f: number) => plan.rooms.filter((r) => r.floor === f && !isOpen(r.type));
  const extent = (f: number) =>
    merge(built(f).map((r) => (across ? span(r.x, r.x + r.w) : span(r.y, r.y + r.h))));
  // how close to the viewer a room's facing side is (bigger is nearer)
  const near = (r: PlanRoom) =>
    side === 'front' ? -r.y : side === 'back' ? r.y + r.h : side === 'left' ? -r.x : r.x + r.w;
  const ops = openingsOf(plan).filter((o) => {
    const r = plan.rooms.find((x) => x.id === o.roomId);
    if (!r) return false;
    const eps = 0.05;
    const onSide =
      side === 'front'
        ? Math.abs(o.y1 - r.y) < eps && Math.abs(o.y2 - r.y) < eps
        : side === 'back'
          ? Math.abs(o.y1 - (r.y + r.h)) < eps && Math.abs(o.y2 - (r.y + r.h)) < eps
          : side === 'left'
            ? Math.abs(o.x1 - r.x) < eps && Math.abs(o.x2 - r.x) < eps
            : Math.abs(o.x1 - (r.x + r.w)) < eps && Math.abs(o.x2 - (r.x + r.w)) < eps;
    if (!onSide) return false;
    // hidden when a built room on the same floor stands in front of it
    const [a, b] = across
      ? span(Math.min(o.x1, o.x2), Math.max(o.x1, o.x2))
      : span(Math.min(o.y1, o.y2), Math.max(o.y1, o.y2));
    return !built(o.floor).some((x) => {
      if (x.id === r.id || near(x) <= near(r) + 0.05) return false;
      const [xa, xb] = across ? span(x.x, x.x + x.w) : span(x.y, x.y + x.h);
      return xa < b - 0.05 && xb > a + 0.05;
    });
  });
  const M = 1.5;
  const najdi = style === 'modern_najdi' || style === 'salmani';
  const Y = (z: number) => height - z;
  return (
    <svg
      viewBox={`${-M} ${-M} ${width + 2 * M} ${height + 2 * M}`}
      role="img"
      aria-label={title}
      className="h-auto w-full"
      style={{ direction: 'ltr' }}
    >
      <rect x={-M} y={-M} width={width + 2 * M} height={height + 2 * M} fill="#fffdf9" />
      <line x1={-M} x2={width + M} y1={height} y2={height} stroke="#1A1815" strokeWidth={0.08} />
      {Array.from({ length: plan.floors }, (_, f) => {
        const mine = extent(f);
        const roof = minus(mine, f + 1 < plan.floors ? extent(f + 1) : []);
        return (
          <g key={f}>
            {mine.map(([a, b]) => (
              <rect
                key={`w${a}`}
                x={a}
                y={Y((f + 1) * fh)}
                width={b - a}
                height={fh}
                fill="#efe1cc"
                stroke="#1A1815"
                strokeWidth={0.06}
              />
            ))}
            {roof.map(([a, b]) => (
              <g key={`p${a}`}>
                <rect
                  x={a}
                  y={Y((f + 1) * fh + 1)}
                  width={b - a}
                  height={1}
                  fill="#e6d3b8"
                  stroke="#1A1815"
                  strokeWidth={0.05}
                />
                {najdi &&
                  Array.from({ length: Math.floor((b - a) / 0.8) }, (_, i) => (
                    <path
                      key={i}
                      d={`M ${a + i * 0.8 + 0.1} ${Y((f + 1) * fh + 1)} L ${a + i * 0.8 + 0.4} ${Y((f + 1) * fh + 1.5)} L ${a + i * 0.8 + 0.7} ${Y((f + 1) * fh + 1)} Z`}
                      fill="#c9a27e"
                    />
                  ))}
              </g>
            ))}
          </g>
        );
      })}
      {ops.map((o) => {
        const [a, b] = across
          ? span(Math.min(o.x1, o.x2), Math.max(o.x1, o.x2))
          : span(Math.min(o.y1, o.y2), Math.max(o.y1, o.y2));
        return (
          <rect
            key={o.id}
            x={a}
            y={Y(o.floor * fh + 0.25 + o.head)}
            width={b - a}
            height={o.head - o.sill}
            fill={o.kind === 'window' ? '#cfe0ec' : '#8C6A4E'}
            stroke="#1A1815"
            strokeWidth={0.04}
          />
        );
      })}
      <text x={width / 2} y={height + 1.1} fontSize={0.5} textAnchor="middle" fill="#1A1815">
        ±0.00 · +{(plan.floors * fh).toFixed(2)}
      </text>
    </svg>
  );
}

/**
 * A section through the middle of the building: for each floor the rooms the cut passes through (a courtyard shows
 * as a gap open to the sky), their slabs, roofs where nothing is above, end walls, levels and the clear height.
 */
function Section({ plan, along, title }: { plan: DesignPlan; along: 'x' | 'y'; title: string }) {
  const fp = plan.footprint;
  const width = along === 'x' ? fp.w : fp.h;
  const fh = plan.floorHeight;
  const height = plan.floors * fh + 1;
  const M = 2;
  const Y = (z: number) => height - z;
  // the cut runs through the middle of the footprint
  const at = along === 'x' ? fp.y + fp.h / 2 : fp.x + fp.w / 2;
  const cut = (f: number) =>
    merge(
      plan.rooms
        .filter(
          (r) =>
            r.floor === f &&
            !isOpen(r.type) &&
            (along === 'x' ? r.y <= at && r.y + r.h >= at : r.x <= at && r.x + r.w >= at),
        )
        .map((r): Span =>
          along === 'x' ? [r.x - fp.x, r.x + r.w - fp.x] : [r.y - fp.y, r.y + r.h - fp.y],
        ),
    );
  return (
    <svg
      viewBox={`${-M} ${-M} ${width + 2 * M} ${height + 2 * M}`}
      role="img"
      aria-label={title}
      className="h-auto w-full"
      style={{ direction: 'ltr' }}
    >
      <rect x={-M} y={-M} width={width + 2 * M} height={height + 2 * M} fill="#fffdf9" />
      <rect x={-M} y={height} width={width + 2 * M} height={0.6} fill="#d8cfc2" />
      {Array.from({ length: plan.floors }, (_, f) => {
        const mine = cut(f);
        const roof = minus(mine, f + 1 < plan.floors ? cut(f + 1) : []);
        return (
          <g key={f}>
            <text x={-0.3} y={Y(f * fh) - 0.1} fontSize={0.4} textAnchor="end" fill="#1A1815">
              +{(f * fh).toFixed(2)}
            </text>
            {mine.map(([a, b]) => (
              <g key={a}>
                <rect x={a} y={Y(f * fh + 0.25)} width={b - a} height={0.25} fill="#1A1815" />
                <rect x={a} y={Y((f + 1) * fh)} width={0.25} height={fh} fill="#1A1815" />
                <rect x={b - 0.25} y={Y((f + 1) * fh)} width={0.25} height={fh} fill="#1A1815" />
                <line
                  x1={a}
                  x2={b}
                  y1={Y(f * fh + 0.25 + plan.clearHeight)}
                  y2={Y(f * fh + 0.25 + plan.clearHeight)}
                  stroke="#8C8478"
                  strokeWidth={0.03}
                  strokeDasharray="0.2 0.15"
                />
              </g>
            ))}
            {roof.map(([a, b]) => (
              <g key={`r${a}`}>
                <rect x={a} y={Y((f + 1) * fh + 0.25)} width={b - a} height={0.25} fill="#1A1815" />
                <rect
                  x={a - 0.1}
                  y={Y((f + 1) * fh + 1.25)}
                  width={b - a + 0.2}
                  height={1}
                  fill="none"
                  stroke="#1A1815"
                  strokeWidth={0.06}
                />
              </g>
            ))}
          </g>
        );
      })}
      <text x={-0.3} y={Y(plan.floors * fh) - 0.1} fontSize={0.4} textAnchor="end" fill="#1A1815">
        +{(plan.floors * fh).toFixed(2)}
      </text>
    </svg>
  );
}

export interface SheetsProps {
  plan: DesignPlan;
  plot: Plot;
  program: Program;
  officeName: string;
  projectTitle: string;
  versionLabel: string;
  sha256: string;
  released: boolean;
  /** Approval lines shown on released sets (never a stamp). */
  approvals: string[];
  roomLabel: (r: PlanRoom) => string;
}

/** The drawing set as sheets with a title block; prints as A3 landscape (browser print to PDF). */
export function Sheets(p: SheetsProps) {
  const t = useTranslations('eng');
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
    dateStyle: 'medium',
  }).format(new Date());
  const wm = p.released ? null : t('watermark');
  const ops = openingsOf(p.plan);
  const fileBase = p.projectTitle.replace(/[^\p{L}\p{N}]+/gu, '-');

  const sheet = (id: string, title: string, body: ReactNode, n: number) => (
    <section
      key={id}
      className="eng-sheet hairline flex flex-col gap-3 rounded-xl bg-[#fffdf9] p-4 text-night"
      aria-labelledby={`sh-${id}`}
      data-testid={`sheet-${id}`}
    >
      <div className="relative">{body}</div>
      <footer className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-night/20 pt-2 text-caption sm:grid-cols-6">
        <p className="sm:col-span-2">
          <span className="text-stone">{t('tb.office')}: </span>
          {p.officeName}
        </p>
        <p className="sm:col-span-2">
          <span className="text-stone">{t('tb.project')}: </span>
          {p.projectTitle}
        </p>
        <p id={`sh-${id}`}>
          <span className="text-stone">{t('tb.sheet')}: </span>
          {title} · A-{String(n).padStart(2, '0')}
        </p>
        <p>
          <span className="text-stone">{t('tb.scale')}: </span>1:100
        </p>
        <p>
          <span className="text-stone">{t('tb.date')}: </span>
          {date}
        </p>
        <p className="sm:col-span-3" dir="ltr">
          <span className="text-stone">{t('tb.version')}: </span>
          {p.versionLabel} · {p.sha256.slice(0, 16)}
        </p>
        <p
          className={
            p.released ? 'text-success sm:col-span-6' : 'font-semibold text-danger sm:col-span-6'
          }
        >
          {p.released ? p.approvals.join(' · ') + ' — ' + t('approvalRecord') : t('watermark')}
        </p>
      </footer>
    </section>
  );

  let n = 0;
  const sheets: ReactNode[] = [];
  sheets.push(
    sheet(
      'site',
      t('sheets.site'),
      <PlanView
        plan={{ ...p.plan, rooms: p.plan.rooms.filter((r) => r.floor === 0) }}
        floor={0}
        label={p.roomLabel}
        watermark={wm}
        title={t('sheets.site')}
        northDeg={p.plot.northDeg}
        streetLabel={`${p.plot.streets.front} m`}
      />,
      ++n,
    ),
  );
  for (let f = 0; f < p.plan.floors; f++)
    sheets.push(
      sheet(
        `plan-${f}`,
        `${t('sheets.plans')} — ${floorLabel(t, p.plan, f)}`,
        <PlanView
          plan={p.plan}
          floor={f}
          label={p.roomLabel}
          watermark={wm}
          title={floorLabel(t, p.plan, f)}
          northDeg={p.plot.northDeg}
        />,
        ++n,
      ),
    );
  sheets.push(
    sheet(
      'elevations',
      t('sheets.elevations'),
      <div className="grid gap-3 sm:grid-cols-2">
        {(['front', 'back', 'left', 'right'] as Side[]).map((s) => (
          <figure key={s} className="flex flex-col gap-1">
            <Elevation plan={p.plan} side={s} style={p.program.style} title={t(`elevation.${s}`)} />
            <figcaption className="text-center text-caption">{t(`elevation.${s}`)}</figcaption>
          </figure>
        ))}
      </div>,
      ++n,
    ),
  );
  sheets.push(
    sheet(
      'sections',
      t('sheets.sections'),
      <div className="grid gap-3 sm:grid-cols-2">
        <figure>
          <Section plan={p.plan} along="x" title={t('sectionAA')} />
          <figcaption className="text-center text-caption">{t('sectionAA')}</figcaption>
        </figure>
        <figure>
          <Section plan={p.plan} along="y" title={t('sectionBB')} />
          <figcaption className="text-center text-caption">{t('sectionBB')}</figcaption>
        </figure>
      </div>,
      ++n,
    ),
  );
  sheets.push(
    sheet(
      'schedules',
      t('sheets.schedules'),
      <div className="overflow-x-auto">
        <table className="w-full text-caption">
          <thead>
            <tr className="border-b border-night/20 text-start">
              {(['mark', 'kind', 'room', 'width', 'height'] as const).map((k) => (
                <th key={k} scope="col" className="p-1.5 text-start font-semibold">
                  {t(`schedule.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ops.map((o, i) => {
              const r = p.plan.rooms.find((x) => x.id === o.roomId)!;
              return (
                <tr key={o.id} className="border-b border-night/10">
                  <td className="tabular p-1.5" dir="ltr">
                    {o.kind === 'window' ? 'W' : 'D'}
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="p-1.5">{t(`schedule.${o.kind}`)}</td>
                  <td className="p-1.5">
                    {p.roomLabel(r)} · {floorLabel(t, p.plan, r.floor)}
                  </td>
                  <td className="tabular p-1.5">{openingWidth(o).toFixed(2)}</td>
                  <td className="tabular p-1.5">{(o.head - o.sill).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>,
      ++n,
    ),
  );
  const perFloor = Array.from({ length: p.plan.floors }, (_, f) => {
    const rooms = p.plan.rooms.filter((r) => r.floor === f);
    return { f, rooms: rooms.length, area: rooms.reduce((s, r) => s + r.w * r.h, 0) };
  });
  sheets.push(
    sheet(
      'areas',
      t('sheets.areas'),
      <table className="w-full max-w-xl text-small" data-testid="area-table">
        <thead>
          <tr className="border-b border-night/20">
            <th scope="col" className="p-1.5 text-start">
              {t('areaTable.floor')}
            </th>
            <th scope="col" className="p-1.5 text-start">
              {t('areaTable.rooms')}
            </th>
            <th scope="col" className="p-1.5 text-start">
              {t('areaTable.area')}
            </th>
          </tr>
        </thead>
        <tbody>
          {perFloor.map((x) => (
            <tr key={x.f} className="border-b border-night/10">
              <td className="p-1.5">{floorLabel(t, p.plan, x.f)}</td>
              <td className="tabular p-1.5">{x.rooms}</td>
              <td className="tabular p-1.5">{x.area.toFixed(1)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="p-1.5">{t('areaTable.total')}</td>
            <td className="tabular p-1.5">{perFloor.reduce((s, x) => s + x.rooms, 0)}</td>
            <td className="tabular p-1.5">{perFloor.reduce((s, x) => s + x.area, 0).toFixed(1)}</td>
          </tr>
        </tbody>
      </table>,
      ++n,
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="quiet" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          {t('print')}
        </Button>
        <Button
          variant="quiet"
          onClick={() => download(`${fileBase}.dxf`, toDxf(p.plan, p.roomLabel), 'application/dxf')}
        >
          <Download size={16} aria-hidden="true" />
          {t('dxf')}
        </Button>
        <Button
          variant="quiet"
          onClick={() =>
            download(
              `${fileBase}.ifc`,
              toIfc(p.plan, {
                project: p.projectTitle,
                label: p.roomLabel,
                when: new Date().toISOString().slice(0, 19),
              }),
              'application/x-step',
            )
          }
        >
          <Download size={16} aria-hidden="true" />
          {t('ifc')}
        </Button>
      </div>
      <div className="eng-print flex flex-col gap-4">{sheets}</div>
    </div>
  );
}
