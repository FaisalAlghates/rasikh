'use client';

import {
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

type Side = 'front' | 'back' | 'left' | 'right';

/** A façade: the building outline, floor lines, parapet (with Najdi crenellation for Najdi styles) and its openings. */
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
  const width = side === 'front' || side === 'back' ? fp.w : fp.h;
  const height = plan.floors * plan.floorHeight + 1;
  const ops = openingsOf(plan).filter((o) => {
    const eps = 0.05;
    if (side === 'front') return Math.abs(o.y1 - fp.y) < eps && Math.abs(o.y2 - fp.y) < eps;
    if (side === 'back')
      return Math.abs(o.y1 - (fp.y + fp.h)) < eps && Math.abs(o.y2 - (fp.y + fp.h)) < eps;
    if (side === 'left') return Math.abs(o.x1 - fp.x) < eps && Math.abs(o.x2 - fp.x) < eps;
    return Math.abs(o.x1 - (fp.x + fp.w)) < eps && Math.abs(o.x2 - (fp.x + fp.w)) < eps;
  });
  // position along the façade as seen from outside
  const along = (o: (typeof ops)[number]) => {
    const a =
      side === 'front' || side === 'back'
        ? Math.min(o.x1, o.x2) - fp.x
        : Math.min(o.y1, o.y2) - fp.y;
    const w = openingWidth(o);
    return side === 'back' || side === 'left' ? width - a - w : a;
  };
  const M = 1.5;
  const najdi = style === 'modern_najdi' || style === 'salmani';
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
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#efe1cc"
        stroke="#1A1815"
        strokeWidth={0.07}
      />
      {Array.from({ length: plan.floors - 1 }, (_, i) => (
        <line
          key={i}
          x1={0}
          x2={width}
          y1={height - (i + 1) * plan.floorHeight}
          y2={height - (i + 1) * plan.floorHeight}
          stroke="#8C8478"
          strokeWidth={0.03}
          strokeDasharray="0.3 0.2"
        />
      ))}
      {najdi &&
        Array.from({ length: Math.floor(width / 0.8) }, (_, i) => (
          <path
            key={i}
            d={`M ${i * 0.8 + 0.1} 0 L ${i * 0.8 + 0.4} -0.5 L ${i * 0.8 + 0.7} 0 Z`}
            fill="#c9a27e"
          />
        ))}
      {ops.map((o) => {
        const x = along(o);
        const w = openingWidth(o);
        const y = height - o.floor * plan.floorHeight - 0.25 - o.head;
        return (
          <rect
            key={o.id}
            x={x}
            y={y}
            width={w}
            height={o.head - o.sill}
            fill={o.kind === 'window' ? '#cfe0ec' : '#8C6A4E'}
            stroke="#1A1815"
            strokeWidth={0.04}
          />
        );
      })}
      <text x={width / 2} y={height + 1.1} fontSize={0.5} textAnchor="middle" fill="#1A1815">
        ±0.00 · +{(plan.floors * plan.floorHeight).toFixed(2)}
      </text>
    </svg>
  );
}

/** A section through the building: slabs, floor heights and levels. */
function Section({ plan, along, title }: { plan: DesignPlan; along: 'x' | 'y'; title: string }) {
  const fp = plan.footprint;
  const width = along === 'x' ? fp.w : fp.h;
  const height = plan.floors * plan.floorHeight + 1;
  const M = 2;
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
      {Array.from({ length: plan.floors + 1 }, (_, f) => {
        const y = height - f * plan.floorHeight;
        return (
          <g key={f}>
            <rect x={0} y={y - 0.25} width={width} height={0.25} fill="#1A1815" />
            <text x={-0.3} y={y - 0.1} fontSize={0.4} textAnchor="end" fill="#1A1815">
              +{(f * plan.floorHeight).toFixed(2)}
            </text>
            {f < plan.floors && (
              <line
                x1={0}
                x2={width}
                y1={y - 0.25 - plan.clearHeight}
                y2={y - 0.25 - plan.clearHeight}
                stroke="#8C8478"
                strokeWidth={0.03}
                strokeDasharray="0.2 0.15"
              />
            )}
          </g>
        );
      })}
      <rect x={0} y={0} width={0.25} height={height} fill="#1A1815" />
      <rect x={width - 0.25} y={0} width={0.25} height={height} fill="#1A1815" />
      <rect
        x={-0.1}
        y={-1}
        width={width + 0.2}
        height={1}
        fill="none"
        stroke="#1A1815"
        strokeWidth={0.06}
      />
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
        `${t('sheets.plans')} — ${f === 0 ? t('ground') : t('floorN', { n: f })}`,
        <PlanView
          plan={p.plan}
          floor={f}
          label={p.roomLabel}
          watermark={wm}
          title={t('floorN', { n: f })}
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
                    {p.roomLabel(r)} · {r.floor === 0 ? t('ground') : t('floorN', { n: r.floor })}
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
              <td className="p-1.5">{x.f === 0 ? t('ground') : t('floorN', { n: x.f })}</td>
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
