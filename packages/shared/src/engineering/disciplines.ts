import { area, floorArea as levelArea, isOpen } from './geometry.js';
import { openingsOf, openingWidth, outsideWallLength } from './openings.js';
import { walkways } from './site.js';
import { WET, type DesignPlan, type PlanRoom, type RoomType } from './schemas.js';

/**
 * Preliminary numbers for the office's discipline engineers. Every figure is a rule-of-thumb starting point
 * ("preliminary — final design and calculations by the office's engineer"); the office can change every factor.
 */

// ------------------------------------------------------------------------------------------------ structural

export interface StructuralFactors {
  /** Largest span the office wants between columns (m). */
  maxSpan: number;
  /** Beam depth below the slab (m). */
  beamDepth: number;
}
export const DEFAULT_STRUCTURAL: StructuralFactors = { maxSpan: 5.5, beamDepth: 0.6 };

/** Clear height under the lowered corridor ceiling where ducts run (m). */
export const CORRIDOR_CLEAR = 2.5;

export interface StructuralScheme {
  gridX: number[];
  gridY: number[];
  columns: Array<{ x: number; y: number }>;
  /** Largest bay span in each direction. */
  spanX: number;
  spanY: number;
  slab: 'solid' | 'ribbed_hollow_block' | 'flat_slab';
  slabThickness: number;
  columnSize: string;
  foundation: string;
  beamDepth: number;
}

function gridLines(start: number, length: number, maxSpan: number): number[] {
  const bays = Math.max(1, Math.ceil(length / maxSpan));
  return Array.from(
    { length: bays + 1 },
    (_, i) => Math.round((start + (length * i) / bays) * 100) / 100,
  );
}

export function structuralScheme(
  plan: DesignPlan,
  f: StructuralFactors = DEFAULT_STRUCTURAL,
): StructuralScheme {
  const fp = plan.footprint;
  const gridX = gridLines(fp.x, fp.w, f.maxSpan);
  const gridY = gridLines(fp.y, fp.h, f.maxSpan);
  const spanX = fp.w / (gridX.length - 1);
  const spanY = fp.h / (gridY.length - 1);
  const span = Math.max(spanX, spanY);
  const slab = span <= 5 ? 'solid' : span <= 7.5 ? 'ribbed_hollow_block' : 'flat_slab';
  // span/depth starting ratios (solid ~28, ribbed ~22, flat ~30): to be checked by the structural engineer
  const ratio = slab === 'solid' ? 28 : slab === 'ribbed_hollow_block' ? 22 : 30;
  const slabThickness = Math.max(0.15, (Math.ceil(((span / ratio) * 100) / 5) * 5) / 100);
  const columnSize = plan.floors <= 2 ? '30×50' : plan.floors <= 4 ? '30×60' : '40×80';
  // columns only where the building stands (never in a courtyard or a garden between blocks)
  const ground = plan.rooms.filter((r) => r.floor === 0 && !isOpen(r.type));
  const inside = (x: number, y: number) =>
    ground.some(
      (r) => x >= r.x - 0.05 && x <= r.x + r.w + 0.05 && y >= r.y - 0.05 && y <= r.y + r.h + 0.05,
    );
  const columns = gridX
    .flatMap((x) => gridY.map((y) => ({ x, y })))
    .filter((c) => inside(c.x, c.y));
  return {
    gridX,
    gridY,
    columns,
    spanX: Math.round(spanX * 100) / 100,
    spanY: Math.round(spanY * 100) / 100,
    slab,
    slabThickness,
    columnSize,
    foundation: 'isolated_footings_subject_to_soil_report',
    beamDepth: f.beamDepth,
  };
}

// ------------------------------------------------------------------------------------------------ mechanical

/** Cooling W/m² by room type for a hot-arid climate (Riyadh default) — the mechanical engineer adjusts. */
export const COOLING_W_PER_M2: Partial<Record<RoomType, number>> = {
  majlis_men: 220,
  majlis_women: 220,
  living: 200,
  dining: 200,
  kitchen: 240,
  bedroom: 170,
  master_bedroom: 170,
  maid_room: 170,
  driver_room: 170,
  guest_room: 170,
  annex_room: 170,
  office: 180,
  prayer_room: 200,
  gym: 220,
  prep_kitchen: 240,
  apartment: 180,
  shop: 260,
};
const W_PER_TR = 3517;

export interface CoolingRow {
  roomId: string;
  type: RoomType;
  floor: number;
  area: number;
  tr: number;
  system: 'split' | 'ducted';
}

export function coolingLoads(
  plan: DesignPlan,
  factors = COOLING_W_PER_M2,
): { rows: CoolingRow[]; totalTr: number } {
  const rows = plan.rooms
    .filter((r) => factors[r.type])
    .map((r) => {
      const a = area(r);
      const tr = Math.round(((a * (factors[r.type] ?? 0)) / W_PER_TR) * 10) / 10;
      return {
        roomId: r.id,
        type: r.type,
        floor: r.floor,
        area: Math.round(a * 10) / 10,
        tr,
        system: tr > 3 ? ('ducted' as const) : ('split' as const),
      };
    });
  return { rows, totalTr: Math.round(rows.reduce((s, r) => s + r.tr, 0) * 10) / 10 };
}

/** Plumbing fixtures per wet room. */
export function plumbingFixtures(plan: DesignPlan) {
  const per: Partial<Record<RoomType, Record<string, number>>> = {
    bathroom: { wc: 1, basin: 1, shower: 1 },
    guest_wc: { wc: 1, basin: 1 },
    kitchen: { sink: 1 },
    prep_kitchen: { sink: 1 },
    laundry: { washer: 1, floorDrain: 1 },
  };
  const totals: Record<string, number> = {};
  for (const r of plan.rooms)
    for (const [k, n] of Object.entries(per[r.type] ?? {})) totals[k] = (totals[k] ?? 0) + n;
  return totals;
}

// ------------------------------------------------------------------------------------------------ electrical

export interface ElectricalFactors {
  lightingVaPerM2: number;
  powerVaPerM2: number;
  /** kVA drawn per TR of cooling. */
  kvaPerTr: number;
}
export const DEFAULT_ELECTRICAL: ElectricalFactors = {
  lightingVaPerM2: 10,
  powerVaPerM2: 25,
  kvaPerTr: 1.4,
};

export function electricalLoad(plan: DesignPlan, f: ElectricalFactors = DEFAULT_ELECTRICAL) {
  const floorArea = plan.rooms.reduce((s, r) => s + area(r), 0);
  const lightingKva = (floorArea * f.lightingVaPerM2) / 1000;
  const powerKva = (floorArea * f.powerVaPerM2) / 1000;
  const coolingKva = coolingLoads(plan).totalTr * f.kvaPerTr;
  const points = plan.rooms.map((r) => ({
    roomId: r.id,
    lights: Math.max(1, Math.round(area(r) / 8)),
    sockets:
      r.type === 'corridor' || r.type === 'stair'
        ? 1
        : Math.max(2, Math.round((2 * (r.w + r.h)) / 4)),
  }));
  const total = lightingKva + powerKva + coolingKva;
  return {
    lightingKva: Math.round(lightingKva * 10) / 10,
    powerKva: Math.round(powerKva * 10) / 10,
    coolingKva: Math.round(coolingKva * 10) / 10,
    totalKva: Math.round(total * 10) / 10,
    panels: plan.floors,
    points,
  };
}

// ------------------------------------------------------------------------------------------------ coordination

export interface Duct {
  id: string;
  floor: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Duct depth (m); it runs right under the slab, above the false ceiling. */
  depth: number;
}

/** A supply duct along each floor's corridor (where ducted units serve the rooms). */
export function ductRuns(plan: DesignPlan, depth = 0.2): Duct[] {
  return plan.rooms
    .filter((r) => r.type === 'corridor')
    .map((r, i) => ({
      id: `duct-${i + 1}`,
      floor: r.floor,
      x1: r.x,
      y1: r.y + r.h / 2,
      x2: r.x + r.w,
      y2: r.y + r.h / 2,
      depth,
    }));
}

export interface Clash {
  ductId: string;
  floor: number;
  /** Where the duct crosses the beam line. */
  x: number;
  y: number;
  /** How much deeper duct + beam are than the ceiling void (m). */
  overlap: number;
}

/**
 * Duct vs beam: where a corridor duct crosses a beam line, the duct and the beam's drop below the slab must both fit
 * in the void above the lowered corridor ceiling. Seeded clashes are caught before any release.
 */
export function detectClashes(
  plan: DesignPlan,
  scheme: StructuralScheme,
  ducts = ductRuns(plan),
  corridorClear = CORRIDOR_CLEAR,
): Clash[] {
  const voidDepth = plan.floorHeight - scheme.slabThickness - corridorClear;
  const drop = Math.max(0, scheme.beamDepth - scheme.slabThickness);
  const out: Clash[] = [];
  for (const d of ducts) {
    const horizontal = Math.abs(d.y1 - d.y2) < 1e-6;
    const lines = horizontal ? scheme.gridX : scheme.gridY;
    for (const g of lines) {
      const lo = horizontal ? Math.min(d.x1, d.x2) : Math.min(d.y1, d.y2);
      const hi = horizontal ? Math.max(d.x1, d.x2) : Math.max(d.y1, d.y2);
      if (g <= lo || g >= hi) continue;
      const need = d.depth + drop;
      if (need > voidDepth + 1e-6)
        out.push({
          ductId: d.id,
          floor: d.floor,
          x: horizontal ? g : d.x1,
          y: horizontal ? d.y1 : g,
          overlap: Math.round((need - voidDepth) * 100) / 100,
        });
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ industrial

/** Unit rates in SAR (min/max) maintained by the office; these defaults are placeholders, never a quote. */
export interface Rates {
  excavationPerM3: [number, number];
  concretePerM3: [number, number];
  rebarPerTon: [number, number];
  blockworkPerM2: [number, number];
  plasterPerM2: [number, number];
  waterproofingPerM2: [number, number];
  insulationPerM2: [number, number];
  tilingPerM2: [number, number];
  ceilingPerM2: [number, number];
  paintPerM2: [number, number];
  facadePerM2: [number, number];
  doorEach: [number, number];
  windowPerM2: [number, number];
  mepPerM2: [number, number];
  pavingPerM2: [number, number];
  poolPerM2: [number, number];
}
export const DEFAULT_RATES: Rates = {
  excavationPerM3: [25, 45],
  concretePerM3: [650, 900],
  rebarPerTon: [3000, 4000],
  blockworkPerM2: [55, 80],
  plasterPerM2: [25, 40],
  waterproofingPerM2: [40, 85],
  insulationPerM2: [35, 80],
  tilingPerM2: [90, 220],
  ceilingPerM2: [45, 95],
  paintPerM2: [18, 35],
  facadePerM2: [90, 400],
  doorEach: [900, 2500],
  windowPerM2: [450, 1100],
  mepPerM2: [250, 450],
  pavingPerM2: [60, 140],
  poolPerM2: [2500, 5000],
};

/** Rebar per m³ of concrete by element (kg): rule-of-thumb starting values for the structural engineer. */
export const REBAR_KG_PER_M3 = { foundations: 80, columns: 160, beams: 130, slabs: 90 };

export const BOQ_SECTIONS = [
  'earthworks',
  'concrete',
  'masonry',
  'insulation',
  'finishes',
  'openings',
  'mep',
  'external',
] as const;
export type BoqSection = (typeof BOQ_SECTIONS)[number];

export type BoqItem =
  | 'excavation'
  | 'concreteFoundations'
  | 'concreteColumns'
  | 'concreteBeams'
  | 'concreteSlabs'
  | 'rebar'
  | 'blockwork'
  | 'plaster'
  | 'waterproofing'
  | 'insulation'
  | 'tiling'
  | 'ceiling'
  | 'paint'
  | 'facade'
  | 'doors'
  | 'windows'
  | 'mep'
  | 'paving'
  | 'pool';

export interface BoqLine {
  /** Item number in the bill (1.1, 2.3 ...). */
  no: string;
  section: BoqSection;
  item: BoqItem;
  /** The rate the line is priced with. */
  rate: keyof Rates;
  qty: number;
  unit: 'm3' | 'm2' | 't' | 'each';
  min: number;
  max: number;
}

/**
 * A preliminary bill of quantities from the plan and the structural scheme, priced with the office's rates as a
 * min–max range. Quantities are measured from the concept geometry; never a quote or a tender document.
 */
export function boq(
  plan: DesignPlan,
  scheme = structuralScheme(plan),
  rates: Partial<Rates> = DEFAULT_RATES,
) {
  const r: Rates = { ...DEFAULT_RATES, ...rates };
  const fp = plan.footprint;
  const floorArea = plan.rooms.filter((x) => !isOpen(x.type)).reduce((s, x) => s + area(x), 0);
  // built area of each floor, and the roofs: the top floor, plus wherever a floor is larger than the one above
  // (a terrace over the majlis, the pavilion)
  const levels = Array.from({ length: plan.floors }, (_, f) => levelArea(plan, f));
  const roof = levels.reduce(
    (s, a, f) => s + (f === plan.floors - 1 ? a : Math.max(0, a - levels[f + 1]!)),
    0,
  );
  // the share of the footprint box the building stands on (courtyards and gardens excluded)
  const solid = area(fp) > 0 ? levels[0]! / area(fp) : 1;
  // structure
  const footings = scheme.columns.length * 2.0 * 2.0 * 0.6;
  const tieBeams = (scheme.gridX.length * fp.h + scheme.gridY.length * fp.w) * solid * 0.3 * 0.6;
  const foundations = footings + tieBeams;
  const columns = scheme.columns.length * plan.floors * plan.floorHeight * 0.3 * 0.6;
  const beams =
    (scheme.gridX.length * fp.h + scheme.gridY.length * fp.w) *
    solid *
    plan.floors *
    0.3 *
    Math.max(0, scheme.beamDepth - scheme.slabThickness);
  // the ground slab on grade, a suspended slab under every upper floor, and the roofs
  const slabs = (levels.reduce((s, a) => s + a, 0) + roof) * scheme.slabThickness;
  const rebarT =
    (foundations * REBAR_KG_PER_M3.foundations +
      columns * REBAR_KG_PER_M3.columns +
      beams * REBAR_KG_PER_M3.beams +
      slabs * REBAR_KG_PER_M3.slabs) /
    1000;
  // the ground floor plus a metre of working space around it
  const excavation = (levels[0]! + outsideWallLength(plan, 0) + 4) * 1.5;
  // openings
  const ops = openingsOf(plan);
  const winArea = ops
    .filter((o) => o.kind === 'window')
    .reduce((s, o) => s + openingWidth(o) * (o.head - o.sill), 0);
  const doors = ops.filter((o) => o.kind !== 'window').length;
  // walls: the outside skin, and inner walls (every room's perimeter, shared walls counted once)
  let outsideLen = 0;
  for (let f = 0; f < plan.floors; f++) outsideLen += outsideWallLength(plan, f);
  const innerLen = Math.max(
    0,
    plan.rooms.filter((x) => !isOpen(x.type)).reduce((s, x) => s + 2 * (x.w + x.h), 0) / 2 -
      outsideLen / 2,
  );
  const outsideWall = Math.max(0, outsideLen * plan.floorHeight - winArea);
  const innerWall = innerLen * plan.floorHeight;
  const wetFloors = plan.rooms.filter((x) => WET.includes(x.type)).reduce((s, x) => s + area(x), 0);

  const q = (
    no: string,
    section: BoqSection,
    item: BoqItem,
    rate: keyof Rates,
    qty: number,
    unit: BoqLine['unit'],
  ): BoqLine => ({
    no,
    section,
    item,
    rate,
    qty: Math.round(qty * 10) / 10,
    unit,
    // priced on the quantity the bill shows, so quantity × rate always adds up
    min: Math.round((Math.round(qty * 10) / 10) * r[rate][0]),
    max: Math.round((Math.round(qty * 10) / 10) * r[rate][1]),
  });
  const lines: BoqLine[] = [
    q('1.1', 'earthworks', 'excavation', 'excavationPerM3', excavation, 'm3'),
    q('2.1', 'concrete', 'concreteFoundations', 'concretePerM3', foundations, 'm3'),
    q('2.2', 'concrete', 'concreteColumns', 'concretePerM3', columns, 'm3'),
    q('2.3', 'concrete', 'concreteBeams', 'concretePerM3', beams, 'm3'),
    q('2.4', 'concrete', 'concreteSlabs', 'concretePerM3', slabs, 'm3'),
    q('2.5', 'concrete', 'rebar', 'rebarPerTon', rebarT, 't'),
    q('3.1', 'masonry', 'blockwork', 'blockworkPerM2', outsideWall + innerWall, 'm2'),
    q('4.1', 'insulation', 'waterproofing', 'waterproofingPerM2', roof + wetFloors, 'm2'),
    q('4.2', 'insulation', 'insulation', 'insulationPerM2', roof + outsideWall, 'm2'),
    q('5.1', 'finishes', 'plaster', 'plasterPerM2', outsideWall + innerWall * 2, 'm2'),
    q('5.2', 'finishes', 'tiling', 'tilingPerM2', floorArea, 'm2'),
    q('5.3', 'finishes', 'ceiling', 'ceilingPerM2', floorArea, 'm2'),
    q('5.4', 'finishes', 'paint', 'paintPerM2', outsideWall + innerWall * 2 + floorArea, 'm2'),
    q('5.5', 'finishes', 'facade', 'facadePerM2', outsideWall, 'm2'),
    q('6.1', 'openings', 'doors', 'doorEach', doors, 'each'),
    q('6.2', 'openings', 'windows', 'windowPerM2', winArea, 'm2'),
    q('7.1', 'mep', 'mep', 'mepPerM2', floorArea, 'm2'),
  ];
  // external works, when the site has them: paved parking bays and walkways, and the pool (per m² of water)
  const site = plan.site ?? [];
  const paving =
    site.filter((s) => s.type === 'parking').reduce((t, s) => t + area(s), 0) +
    walkways(plan).reduce((t, w) => t + area(w), 0);
  const pool = site.filter((s) => s.type === 'pool').reduce((t, s) => t + area(s), 0);
  if (paving > 0) lines.push(q('8.1', 'external', 'paving', 'pavingPerM2', paving, 'm2'));
  if (pool > 0) lines.push(q('8.2', 'external', 'pool', 'poolPerM2', pool, 'm2'));
  const min = lines.reduce((s, l) => s + l.min, 0);
  const max = lines.reduce((s, l) => s + l.max, 0);
  return {
    lines,
    min,
    max,
    floorArea: Math.round(floorArea),
    /** Cost per m² of floor (min–max). */
    perM2: floorArea > 0 ? [Math.round(min / floorArea), Math.round(max / floorArea)] : [0, 0],
  };
}

export type Boq = ReturnType<typeof boq>;

/** The bill as CSV (UTF-8 with a BOM so spreadsheet apps read Arabic), labelled by the caller. */
export function boqCsv(
  b: Boq,
  label: { item: (i: BoqItem) => string; unit: (u: BoqLine['unit']) => string; head: string[] },
): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: Array<Array<string | number>> = [
    label.head,
    ...b.lines.map((l) => [l.no, label.item(l.item), l.qty, label.unit(l.unit), l.min, l.max]),
    ['', '', '', '', b.min, b.max],
  ];
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export const PHASES = [
  'mobilisation',
  'excavation',
  'foundations',
  'structure',
  'masonry',
  'mep_rough_in',
  'finishes',
  'external_works',
  'handover',
] as const;

/** A first construction schedule (weeks), sequential with overlaps typical for a villa or small building. */
export function schedule(plan: DesignPlan) {
  const a = plan.rooms.reduce((s, r) => s + area(r), 0);
  const w: Record<(typeof PHASES)[number], number> = {
    mobilisation: 1,
    excavation: 2,
    foundations: 3,
    structure: 3 * plan.floors,
    masonry: Math.ceil(a / 150),
    mep_rough_in: Math.ceil(a / 200) + 1,
    finishes: Math.ceil(a / 90),
    external_works: 2,
    handover: 1,
  };
  let start = 0;
  const bars = PHASES.map((p) => {
    const overlap = p === 'mep_rough_in' ? Math.floor(w.masonry / 2) : 0;
    const s = Math.max(0, start - overlap);
    start = s + w[p];
    return { phase: p, start: s, weeks: w[p] };
  });
  return { bars, totalWeeks: start };
}

/** Rooms that share wet walls vertically help the plumbing; this lists wet rooms not stacked over another wet room. */
export function unstackedWetRooms(plan: DesignPlan): PlanRoom[] {
  return plan.rooms.filter((r) => {
    if (!WET.includes(r.type) || r.floor === 0) return false;
    return !plan.rooms.some(
      (o) =>
        o.floor === r.floor - 1 &&
        WET.includes(o.type) &&
        Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x) > 0.5 &&
        Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y) > 0.5,
    );
  });
}
