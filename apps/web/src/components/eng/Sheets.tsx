'use client';

import {
  countSymbols,
  electricalSymbols,
  isOpen,
  mechanicalSymbols,
  openingsOf,
  openingWidth,
  safetySymbols,
  sheetSet,
  structuralScheme,
  toDxf,
  toIfc,
  type DesignPlan,
  type Discipline,
  type MepKind,
  type Plot,
  type PlanRoom,
  type Program,
  type SheetSpec,
} from '@rasikh/shared';
import { Download, Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { download } from '@/lib/eng/data';
import { floorLabel } from '@/lib/eng/labels';
import { PlanView } from './PlanView';
import { Elevation, type Side } from './sheets/Elevation';
import { SheetFrame, type FrameInfo } from './sheets/Frame';
import { merge, minus, type Span } from './sheets/spans';
import { StCalcBody, StColumnsBody, StNotesBody, SlabLayer } from './sheets/Structural';
import { MepLayer, SYMBOL_GROUPS, SymbolLegend } from './sheets/symbols';
import { LevelsBody } from './sheets/Levels';
import { ThermalBody } from './sheets/Thermal';

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
  /** The disciplines the project needs: each adds its own sheets to the set. */
  disciplines?: readonly Discipline[];
}

/**
 * The drawing set as a consultant's office issues it: one framed sheet per drawing with the title block at its right,
 * coded by discipline (AR, ST, EL, ME, FS). It prints as A3 landscape, one sheet per page (browser print to PDF).
 */
export function Sheets(p: SheetsProps) {
  const t = useTranslations('eng');
  const locale = useLocale();
  const lang = locale === 'ar' ? 'ar' : 'en';
  const date = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
    dateStyle: 'medium',
  }).format(new Date());
  const wm = p.released ? null : t('watermark');
  const ops = openingsOf(p.plan);
  const fileBase = p.projectTitle.replace(/[^\p{L}\p{N}]+/gu, '-');
  const scheme = useMemo(() => structuralScheme(p.plan), [p.plan]);
  const electrical = useMemo(() => electricalSymbols(p.plan), [p.plan]);
  const mechanical = useMemo(() => mechanicalSymbols(p.plan), [p.plan]);
  const safety = useMemo(() => safetySymbols(p.plan), [p.plan]);
  const specs = useMemo(
    () => sheetSet(p.plan, p.disciplines ?? ['architectural']),
    [p.plan, p.disciplines],
  );

  const info: FrameInfo = {
    officeName: p.officeName,
    projectTitle: p.projectTitle,
    date,
    versionLabel: p.versionLabel,
    sha256: p.sha256,
    released: p.released,
    approvals: p.approvals,
    northDeg: p.plot.northDeg,
    notes: t.raw('set.titleNotes') as string[],
    watermark: t('watermark'),
    approvalRecord: t('approvalRecord'),
  };

  const symbolName = (k: MepKind) => t(`set.symbol.${k}`);
  const mepPlan = (
    spec: SheetSpec,
    symbols: typeof electrical,
    kinds: readonly MepKind[],
    note: string,
  ) => {
    const f = spec.floor ?? 0;
    return (
      <div className="flex flex-col gap-2">
        <PlanView
          plan={p.plan}
          floor={f}
          label={p.roomLabel}
          watermark={wm}
          title={spec.en}
          northDeg={p.plot.northDeg}
          mute
          overlay={(Y) => <MepLayer symbols={symbols} floor={f} Y={Y} kinds={kinds} />}
        />
        <div className="flex flex-wrap items-start gap-6">
          <SymbolLegend
            kinds={kinds}
            counts={countSymbols(symbols, f)}
            name={symbolName}
            title={t('set.legend')}
            countLabel={t('set.count')}
          />
          <p className="max-w-md text-caption text-[#5f594f]">{note}</p>
        </div>
      </div>
    );
  };

  const perFloor = Array.from({ length: p.plan.floors }, (_, f) => {
    const rooms = p.plan.rooms.filter((r) => r.floor === f);
    return { f, rooms: rooms.length, area: rooms.reduce((s, r) => s + r.w * r.h, 0) };
  });

  const body = (spec: SheetSpec): ReactNode => {
    switch (spec.kind) {
      case 'site':
        return (
          <PlanView
            plan={{ ...p.plan, rooms: p.plan.rooms.filter((r) => r.floor === 0) }}
            floor={0}
            label={p.roomLabel}
            watermark={wm}
            title={t('sheets.site')}
            northDeg={p.plot.northDeg}
            streetLabel={`${p.plot.streets.front} m`}
          />
        );
      case 'plan':
        return (
          <PlanView
            plan={p.plan}
            floor={spec.floor ?? 0}
            label={p.roomLabel}
            watermark={wm}
            title={floorLabel(t, p.plan, spec.floor ?? 0)}
            northDeg={p.plot.northDeg}
          />
        );
      case 'elevations':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {(['front', 'back', 'left', 'right'] as Side[]).map((s) => (
              <figure key={s} className="flex flex-col gap-1">
                <Elevation
                  plan={p.plan}
                  side={s}
                  style={p.program.style}
                  title={t(`elevation.${s}`)}
                  lang={lang}
                />
                <figcaption className="text-center text-caption">{t(`elevation.${s}`)}</figcaption>
              </figure>
            ))}
          </div>
        );
      case 'sections':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <figure>
              <Section plan={p.plan} along="x" title={t('sectionAA')} />
              <figcaption className="text-center text-caption">{t('sectionAA')}</figcaption>
            </figure>
            <figure>
              <Section plan={p.plan} along="y" title={t('sectionBB')} />
              <figcaption className="text-center text-caption">{t('sectionBB')}</figcaption>
            </figure>
          </div>
        );
      case 'levels':
        return <LevelsBody plan={p.plan} lang={lang} />;
      case 'thermal':
        return <ThermalBody />;
      case 'access': {
        const wc = p.plan.rooms.find((r) => r.floor === 0 && r.type === 'guest_wc');
        const entry = ops.find((o) => o.floor === 0 && o.kind === 'entry');
        return (
          <div className="flex flex-col gap-2">
            <PlanView
              plan={p.plan}
              floor={0}
              label={p.roomLabel}
              watermark={wm}
              title={spec.en}
              northDeg={p.plot.northDeg}
              mute
              overlay={(Y) => (
                <g data-testid="access-layer">
                  {entry && (
                    <path
                      d={`M ${(entry.x1 + entry.x2) / 2} ${Y(0)} L ${(entry.x1 + entry.x2) / 2} ${Y((entry.y1 + entry.y2) / 2)}`}
                      stroke="#2f7d4f"
                      strokeWidth={0.2}
                      strokeDasharray="0.5 0.3"
                      fill="none"
                    />
                  )}
                  {wc && (
                    <circle
                      cx={wc.x + wc.w / 2}
                      cy={Y(wc.y + wc.h / 2)}
                      r={Math.max(0.3, Math.min(0.75, wc.w / 2 - 0.05, wc.h / 2 - 0.05))}
                      fill="#2f7d4f"
                      fillOpacity={0.2}
                      stroke="#2f7d4f"
                      strokeWidth={0.05}
                    />
                  )}
                </g>
              )}
            />
            <ul className="flex flex-col gap-1 text-caption">
              <li className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-6 border-t-2 border-dashed border-[#2f7d4f]"
                  aria-hidden="true"
                />
                {t('set.access.route')}
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full border border-[#2f7d4f] bg-[#2f7d4f]/20"
                  aria-hidden="true"
                />
                {wc ? t('set.access.wc') : t('set.access.none')}
              </li>
              <li className="text-[#5f594f]">{t('set.access.note')}</li>
            </ul>
          </div>
        );
      }
      case 'schedules':
        return (
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
          </div>
        );
      case 'areas':
        return (
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
                <td className="tabular p-1.5">
                  {perFloor.reduce((s, x) => s + x.area, 0).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        );
      case 'st-notes':
        return <StNotesBody scheme={scheme} plan={p.plan} />;
      case 'st-grid':
        return (
          <PlanView
            plan={p.plan}
            floor={0}
            label={p.roomLabel}
            watermark={wm}
            title={spec.en}
            northDeg={p.plot.northDeg}
            scheme={scheme}
            mute
          />
        );
      case 'st-slab':
        return (
          <PlanView
            plan={p.plan}
            floor={0}
            label={p.roomLabel}
            watermark={wm}
            title={spec.en}
            northDeg={p.plot.northDeg}
            scheme={scheme}
            mute
            overlay={(Y) => (
              <SlabLayer
                scheme={scheme}
                Y={Y}
                label={t('set.st.bay', { t: Math.round(scheme.slabThickness * 100) })}
              />
            )}
          />
        );
      case 'st-columns':
        return <StColumnsBody scheme={scheme} plan={p.plan} />;
      case 'st-calc':
        return <StCalcBody scheme={scheme} plan={p.plan} />;
      case 'el-plan':
        return mepPlan(spec, electrical, SYMBOL_GROUPS.electrical, t('set.note.el'));
      case 'me-plan':
        return mepPlan(spec, mechanical, SYMBOL_GROUPS.mechanical, t('set.note.me'));
      case 'fs-plan':
        return mepPlan(spec, safety, SYMBOL_GROUPS.safety, t('set.note.fs'));
    }
  };

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
      <div className="eng-print flex flex-col gap-4" data-testid="sheet-set">
        {specs.map((spec) => (
          <SheetFrame key={spec.id} spec={spec} info={info}>
            {body(spec)}
          </SheetFrame>
        ))}
      </div>
    </div>
  );
}
