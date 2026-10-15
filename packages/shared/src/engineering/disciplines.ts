import { area } from './layout.js';
import { openingsOf, openingWidth } from './openings.js';
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
  const columns = gridX.flatMap((x) => gridY.map((y) => ({ x, y })));
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
  concretePerM3: [number, number];
  blockworkPerM2: [number, number];
  plasterPerM2: [number, number];
  tilingPerM2: [number, number];
  paintPerM2: [number, number];
  doorEach: [number, number];
  windowPerM2: [number, number];
  mepPerM2: [number, number];
}
export const DEFAULT_RATES: Rates = {
  concretePerM3: [650, 900],
  blockworkPerM2: [55, 80],
  plasterPerM2: [25, 40],
  tilingPerM2: [90, 220],
  paintPerM2: [18, 35],
  doorEach: [900, 2500],
  windowPerM2: [450, 1100],
  mepPerM2: [250, 450],
};

export interface BoqLine {
  item: keyof Rates;
  qty: number;
  unit: 'm3' | 'm2' | 'each';
  min: number;
  max: number;
}

export function boq(
  plan: DesignPlan,
  scheme = structuralScheme(plan),
  rates: Rates = DEFAULT_RATES,
) {
  const fp = plan.footprint;
  const floorArea = plan.rooms.reduce((s, r) => s + area(r), 0);
  const slabs = area(fp) * scheme.slabThickness * (plan.floors + 1);
  const cols = scheme.columns.length * plan.floors * plan.floorHeight * 0.3 * 0.6;
  const beams =
    (scheme.gridX.length * fp.h + scheme.gridY.length * fp.w) *
    (plan.floors + 1) *
    0.3 *
    scheme.beamDepth;
  const ops = openingsOf(plan);
  const winArea = ops
    .filter((o) => o.kind === 'window')
    .reduce((s, o) => s + openingWidth(o) * (o.head - o.sill), 0);
  const doors = ops.filter((o) => o.kind !== 'window').length;
  // wall length per floor: every room's perimeter, shared walls counted once (≈ half the sum + half the outside)
  const outside = 2 * (fp.w + fp.h);
  const inner =
    plan.rooms.reduce((s, r) => s + 2 * (r.w + r.h), 0) / 2 - (outside * plan.floors) / 2;
  const wallArea = (outside * plan.floors + Math.max(0, inner)) * plan.floorHeight - winArea;
  const q = (item: keyof Rates, qty: number, unit: BoqLine['unit']): BoqLine => ({
    item,
    qty: Math.round(qty * 10) / 10,
    unit,
    min: Math.round(qty * rates[item][0]),
    max: Math.round(qty * rates[item][1]),
  });
  const lines = [
    q('concretePerM3', slabs + cols + beams, 'm3'),
    q('blockworkPerM2', wallArea, 'm2'),
    q('plasterPerM2', wallArea * 2, 'm2'),
    q('tilingPerM2', floorArea, 'm2'),
    q('paintPerM2', wallArea * 2 + floorArea, 'm2'),
    q('doorEach', doors, 'each'),
    q('windowPerM2', winArea, 'm2'),
    q('mepPerM2', floorArea, 'm2'),
  ];
  return {
    lines,
    min: lines.reduce((s, l) => s + l.min, 0),
    max: lines.reduce((s, l) => s + l.max, 0),
    floorArea: Math.round(floorArea),
  };
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
