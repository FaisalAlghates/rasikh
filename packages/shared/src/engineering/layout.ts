import { programRooms, type RoomSpec } from './brief.js';
import {
  HABITABLE,
  WET,
  type DesignPlan,
  type PlanRoom,
  type Plot,
  type Program,
  type Rect,
  type Zoning,
} from './schemas.js';

/**
 * Deterministic layout engine. The model never draws geometry: this places rectangular rooms inside the buildable
 * envelope (plot minus setbacks) in a front band, a corridor and a back band around a stair core, on every floor.
 * Options differ by core position, band split, footprint width and coverage. Same input, same plans.
 */

export const CORRIDOR = 1.4;
export const STAIR_W = 3.0;
export const ELEVATOR_W = 2.2;
/** Narrowest column a room (or a stack of small rooms) may get in a band (m). */
export const MIN_COLUMN = 2.2;

export interface Variant {
  id: string;
  core: 'left' | 'center' | 'right';
  /** Share of the band depth given to the front band. */
  front: number;
  /** Share of the envelope width the footprint uses (1 = full frontage). */
  widthShare: number;
  /** Extra coverage on top of what the programme needs (0.1 = 10 % more). */
  slack: number;
}

export const VARIANTS: Variant[] = [
  { id: 'A', core: 'right', front: 0.55, widthShare: 1, slack: 0.1 },
  { id: 'B', core: 'left', front: 0.5, widthShare: 1, slack: 0.15 },
  { id: 'C', core: 'center', front: 0.6, widthShare: 1, slack: 0.1 },
  { id: 'D', core: 'right', front: 0.5, widthShare: 0.85, slack: 0.2 },
  { id: 'E', core: 'left', front: 0.45, widthShare: 1, slack: 0.3 },
  { id: 'F', core: 'center', front: 0.55, widthShare: 0.9, slack: 0.2 },
];

export function envelopeOf(plot: Pick<Plot, 'width' | 'depth'>, z: Pick<Zoning, 'setbacks'>): Rect {
  const s = z.setbacks;
  return {
    x: s.left,
    y: s.front,
    w: Math.max(1, plot.width - s.left - s.right),
    h: Math.max(1, plot.depth - s.front - s.back),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

interface Segment {
  x: number;
  w: number;
}

/**
 * Lays rooms left to right in a band; widths follow the target areas and exactly fill the segments. Small rooms are
 * stacked front-to-back in a shared column so none becomes a sliver.
 */
function fillBand(
  specs: RoomSpec[],
  segments: Segment[],
  y: number,
  depth: number,
  floor: number,
  ids: Map<string, number>,
  /** Which edge of the band is an outside wall: wet rooms in a stack go there (daylight and ventilation). */
  outside: 'start' | 'end' = 'start',
): PlanRoom[] {
  if (specs.length === 0 || depth <= 0) return [];
  const total = segments.reduce((s, g) => s + g.w, 0);
  const areaSum = specs.reduce((s, r) => s + r.area, 0);
  // assign rooms to segments in order, roughly by the share of width each segment offers
  const out: PlanRoom[] = [];
  let i = 0;
  segments.forEach((seg, si) => {
    const share = seg.w / total;
    const last = si === segments.length - 1;
    const mine: RoomSpec[] = [];
    let acc = 0;
    while (
      i < specs.length &&
      (last || acc + specs[i]!.area / 2 <= share * areaSum || mine.length === 0)
    ) {
      acc += specs[i]!.area;
      mine.push(specs[i]!);
      i++;
      if (!last && acc >= share * areaSum) break;
    }
    const sum = mine.reduce((s, r) => s + r.area, 0) || 1;
    // Small rooms (a WC, a laundry) would become slivers across the whole band depth: stack them in one
    // column until the column is at least MIN_COLUMN wide; big rooms take a column of their own.
    const width = (rooms: RoomSpec[]) => (rooms.reduce((t, r) => t + r.area, 0) / sum) * seg.w;
    const columns: RoomSpec[][] = [];
    let cur: RoomSpec[] = [];
    for (const r of mine) {
      cur.push(r);
      if (width(cur) >= MIN_COLUMN) {
        columns.push(cur);
        cur = [];
      }
    }
    if (cur.length) {
      if (columns.length && width(cur) < MIN_COLUMN) columns[columns.length - 1]!.push(...cur);
      else columns.push(cur);
    }
    // boundaries are rounded once, so neighbours share an exact edge (no slivers, no overlaps)
    const xs = [round(seg.x)];
    let accX = 0;
    columns.forEach((col, k) => {
      accX += col.reduce((t, r) => t + r.area, 0);
      xs.push(
        k === columns.length - 1 ? round(seg.x + seg.w) : round(seg.x + (accX / sum) * seg.w),
      );
    });
    const wetFirst = (a: RoomSpec, b: RoomSpec) =>
      Number(WET.includes(b.type)) - Number(WET.includes(a.type));
    for (const col of columns) col.sort(outside === 'start' ? wetFirst : (a, b) => wetFirst(b, a));
    columns.forEach((col, k) => {
      const colArea = col.reduce((t, r) => t + r.area, 0) || 1;
      const ys = [round(y)];
      let accY = 0;
      col.forEach((r, j) => {
        accY += r.area;
        ys.push(j === col.length - 1 ? round(y + depth) : round(y + (accY / colArea) * depth));
      });
      col.forEach((r, j) => {
        const n = (ids.get(r.type) ?? 0) + 1;
        ids.set(r.type, n);
        out.push({
          id: `${floor}-${r.type}-${n}`,
          type: r.type,
          floor,
          x: xs[k]!,
          y: ys[j]!,
          w: round(xs[k + 1]! - xs[k]!),
          h: round(ys[j + 1]! - ys[j]!),
        });
      });
    });
  });
  return out;
}

/** Splits a floor's rooms between the front and back band, keeping zones together and the areas balanced. */
function splitBands(
  specs: RoomSpec[],
  frontShare: number,
  groundFloor: boolean,
): [RoomSpec[], RoomSpec[]] {
  if (groundFloor) {
    // public rooms face the street (majlis by the entrance), service rooms at the back
    return [specs.filter((s) => s.zone === 'public'), specs.filter((s) => s.zone !== 'public')];
  }
  const total = specs.reduce((s, r) => s + r.area, 0);
  const front: RoomSpec[] = [];
  const back: RoomSpec[] = [];
  let acc = 0;
  // bedrooms first to the front (street light), wet rooms to the back near the stacked core
  const ordered = [...specs].sort(
    (a, b) => Number(a.type === 'bathroom') - Number(b.type === 'bathroom'),
  );
  for (const s of ordered) {
    if (acc + s.area / 2 <= total * frontShare && s.type !== 'bathroom') {
      front.push(s);
      acc += s.area;
    } else back.push(s);
  }
  return [front, back];
}

export function generatePlan(plot: Plot, zoning: Zoning, program: Program, v: Variant): DesignPlan {
  const env = envelopeOf(plot, zoning);
  const floors = Math.max(1, Math.min(program.floors, zoning.maxFloors));
  const floorHeight = 3.3;
  const specs = programRooms({ ...program, floors });

  // which floor each room sits on: 'upper' rooms are spread across the floors above ground
  const perFloor: RoomSpec[][] = Array.from({ length: floors }, () => []);
  const upper = specs.filter((s) => s.floor === 'upper');
  for (const s of specs)
    if (s.floor !== 'upper') perFloor[Math.min(floors - 1, Math.max(0, s.floor))]!.push(s);
  if (floors > 1) {
    const upperFloors = floors - 1;
    const sizes = Array.from({ length: upperFloors }, () => 0);
    for (const s of upper) {
      const f = sizes.indexOf(Math.min(...sizes));
      sizes[f]! += s.area;
      perFloor[f + 1]!.push(s);
    }
  } else perFloor[0]!.push(...upper);

  const coreW = STAIR_W + (program.elevator ? ELEVATOR_W : 0);
  const busiest = Math.max(...perFloor.map((f) => f.reduce((s, r) => s + r.area, 0)));
  const plotArea = plot.width * plot.depth;
  const width = round(env.w * v.widthShare);
  const neededDepth = (busiest * (1 + v.slack)) / width + CORRIDOR + 2;
  const coverageDepth = (zoning.coverageMax * plotArea) / width;
  const depth = round(Math.max(8, Math.min(env.h, coverageDepth, neededDepth)));
  const footprint: Rect = { x: round(env.x + (env.w - width) / 2), y: env.y, w: width, h: depth };

  const bands = depth - CORRIDOR;
  const frontDepth = round(bands * v.front);
  const backY = footprint.y + frontDepth + CORRIDOR;
  const backDepth = round(footprint.y + depth - backY);
  const coreX =
    v.core === 'left'
      ? footprint.x
      : v.core === 'right'
        ? footprint.x + width - coreW
        : footprint.x + (width - coreW) / 2;
  const backSegments: Segment[] = [
    { x: footprint.x, w: coreX - footprint.x },
    { x: coreX + coreW, w: footprint.x + width - (coreX + coreW) },
  ].filter((s) => s.w > 0.5);

  const rooms: PlanRoom[] = [];
  for (let f = 0; f < floors; f++) {
    const ids = new Map<string, number>();
    const [front, back] = splitBands(perFloor[f]!, v.front, f === 0);
    rooms.push(...fillBand(front, [{ x: footprint.x, w: width }], footprint.y, frontDepth, f, ids));
    rooms.push(...fillBand(back, backSegments, backY, backDepth, f, ids, 'end'));
    rooms.push({
      id: `${f}-corridor-1`,
      type: 'corridor',
      floor: f,
      x: footprint.x,
      y: round(footprint.y + frontDepth),
      w: width,
      h: CORRIDOR,
    });
    rooms.push({
      id: `${f}-stair-1`,
      type: 'stair',
      floor: f,
      x: round(coreX),
      y: round(backY),
      w: STAIR_W,
      h: backDepth,
    });
    if (program.elevator)
      rooms.push({
        id: `${f}-elevator-1`,
        type: 'elevator',
        floor: f,
        x: round(coreX + STAIR_W),
        y: round(backY),
        w: ELEVATOR_W,
        h: Math.min(2.4, backDepth),
      });
  }

  return {
    plot: { width: plot.width, depth: plot.depth },
    envelope: env,
    footprint,
    floors,
    floorHeight,
    clearHeight: 2.9,
    rooms,
    variant: { id: v.id, core: v.core, front: v.front, widthShare: v.widthShare, slack: v.slack },
  };
}

// ------------------------------------------------------------------------------------------- geometry helpers

export const area = (r: Rect) => r.w * r.h;

/** Edges of a room that lie on the outside of the footprint (where windows can go). */
export function exteriorEdges(r: Rect, fp: Rect): Array<'front' | 'back' | 'left' | 'right'> {
  const e: Array<'front' | 'back' | 'left' | 'right'> = [];
  const eps = 0.05;
  if (Math.abs(r.y - fp.y) < eps) e.push('front');
  if (Math.abs(r.y + r.h - (fp.y + fp.h)) < eps) e.push('back');
  if (Math.abs(r.x - fp.x) < eps) e.push('left');
  if (Math.abs(r.x + r.w - (fp.x + fp.w)) < eps) e.push('right');
  return e;
}

export function builtUpArea(plan: DesignPlan): number {
  return area(plan.footprint) * plan.floors;
}

/**
 * Ranks options: daylight for habitable rooms, sensible proportions and closeness to the programme. Deterministic;
 * an AI may explain the ranking but never changes it.
 */
export function scorePlan(plan: DesignPlan): {
  score: number;
  daylightMissing: number;
  narrowRooms: number;
} {
  let daylightMissing = 0;
  let narrowRooms = 0;
  for (const r of plan.rooms) {
    if (HABITABLE.includes(r.type) && exteriorEdges(r, plan.footprint).length === 0)
      daylightMissing++;
    const ratio = Math.max(r.w, r.h) / Math.min(r.w, r.h);
    if (HABITABLE.includes(r.type) && ratio > 2.5) narrowRooms++;
  }
  const coverage = area(plan.footprint) / (plan.plot.width * plan.plot.depth);
  const score = 100 - daylightMissing * 15 - narrowRooms * 8 - Math.abs(coverage - 0.55) * 20;
  return { score: Math.round(score * 10) / 10, daylightMissing, narrowRooms };
}

/** 3–6 options for a brief, best first. */
export function generateOptions(
  plot: Plot,
  zoning: Zoning,
  program: Program,
  count = 4,
): DesignPlan[] {
  const n = Math.max(3, Math.min(6, count));
  return VARIANTS.slice(0, n)
    .map((v) => generatePlan(plot, zoning, program, v))
    .sort((a, b) => scorePlan(b).score - scorePlan(a).score);
}
