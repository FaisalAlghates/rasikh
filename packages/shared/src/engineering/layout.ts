import { programRooms, type RoomSpec } from './brief.js';
import { placeSite } from './site.js';
import {
  HABITABLE,
  WET,
  type DesignPlan,
  type PlanRoom,
  type Plot,
  type Program,
  type Rect,
  type RoomType,
  type Zoning,
} from './schemas.js';

/**
 * Deterministic layout engine. The model never draws geometry: this places rectangular rooms inside the buildable
 * envelope (plot minus setbacks) in a front band, a corridor and a back band around a stair core, on every floor.
 * Options differ by core position, band split, footprint width and position, coverage, mirroring, where the entrance,
 * the dining room and the master suite sit. Same input, same plans.
 */

export const CORRIDOR = 1.4;
export const STAIR_W = 3.0;
export const ELEVATOR_W = 2.2;
/** Below this width (m) a store room shares its column with another one. */
export const MIN_COLUMN = 2.2;
/** Small rooms that may share a column (one of them then has no outside wall, which they do not need). */
const STACKABLE: readonly RoomType[] = ['storage', 'laundry', 'prep_kitchen'];

/** The narrowest a room's column may get (m): a habitable room keeps clear of the code's minimum dimension. */
export function minWidth(t: RoomType): number {
  if (HABITABLE.includes(t)) return 2.6;
  if (t === 'apartment' || t === 'shop') return 4;
  if (t === 'kitchen') return 2.4;
  if (t === 'entrance') return 2;
  if (t === 'bathroom') return 1.6;
  if (t === 'guest_wc') return 1.3;
  return 1.2;
}

export interface Variant {
  id: string;
  core: 'left' | 'center' | 'right';
  /** Share of the band depth given to the front band. */
  front: number;
  /** Share of the envelope width the footprint uses (1 = full frontage). */
  widthShare: number;
  /** Extra coverage on top of what the programme needs (0.1 = 10 % more). */
  slack: number;
  /** Where the footprint sits in the buildable depth: by the front setback (a back yard) or at the back (a front yard). */
  site?: 'front' | 'back';
  /** Where a narrower footprint sits across the plot (the side passage is on the other side). */
  align?: 'left' | 'center' | 'right';
  /** Mirror every floor left ↔ right. */
  mirror?: boolean;
  /** Ground floor: entrance at one end of the facade or in its middle. */
  entry?: 'side' | 'middle';
  /** Ground floor: the dining room by the majlis (serving guests) or with the family at the back. */
  dining?: 'front' | 'back';
  /** Upper floors: the master suite toward the street or the back yard. */
  master?: 'front' | 'back';
}

/** A short, stable code for a variant (used to tell options apart and never generate the same one twice). */
export function variantCode(v: Variant): string {
  return [
    v.core[0],
    Math.round(v.front * 100),
    Math.round(v.widthShare * 100),
    Math.round(v.slack * 100),
    (v.site ?? 'front')[0],
    (v.align ?? 'center')[0],
    v.mirror ? 'm' : 'n',
    (v.entry ?? 'side')[0],
    (v.dining ?? 'back')[0],
    (v.master ?? 'front')[0],
  ].join('');
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
 * Lays rooms left to right in a band; widths follow the target areas and exactly fill the segments.
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
    const width = (rooms: RoomSpec[]) => (rooms.reduce((t, r) => t + r.area, 0) / sum) * seg.w;
    // Every room people use, every bathroom and the entrance hall gets a column of its own across the whole band,
    // so it reaches both the corridor (its door) and the outside wall (daylight, ventilation). Only small store
    // rooms share a column, two at most, so none becomes a sliver.
    const columns: RoomSpec[][] = [];
    for (const r of mine) {
      const prev = columns[columns.length - 1];
      if (
        STACKABLE.includes(r.type) &&
        width([r]) < MIN_COLUMN &&
        prev?.length === 1 &&
        STACKABLE.includes(prev[0]!.type) &&
        width(prev) < MIN_COLUMN
      )
        prev.push(r);
      else columns.push([r]);
    }
    // widths follow the target areas, raised to each room's narrowest usable width and taken from the roomier ones
    const mins = columns.map((c) => Math.max(...c.map((r) => minWidth(r.type))));
    let ws = columns.map((c, k) => Math.max(width(c), mins[k]!));
    const over = ws.reduce((s, w) => s + w, 0) - seg.w;
    if (over > 1e-9) {
      const flex = ws.map((w, k) => w - mins[k]!);
      const flexSum = flex.reduce((s, f) => s + f, 0);
      ws =
        flexSum >= over
          ? ws.map((w, k) => w - (over * flex[k]!) / flexSum)
          : ws.map((w) => (w * seg.w) / (seg.w + over)); // cannot fit: the checks will reject this option
    }
    // boundaries are rounded once, so neighbours share an exact edge (no slivers, no overlaps)
    const xs = [round(seg.x)];
    let accX = seg.x;
    columns.forEach((_, k) => {
      accX += ws[k]!;
      xs.push(k === columns.length - 1 ? round(seg.x + seg.w) : round(accX));
    });
    // a bathroom across a deep band would be a long strip: it keeps about 3 m by the outside wall and a closet
    // (dressing) takes the corridor side
    for (const col of columns) {
      const r = col[0]!;
      if (col.length === 1 && (r.type === 'bathroom' || r.type === 'guest_wc') && depth > 4.4)
        col.push({
          type: 'closet',
          area: (r.area * (depth - 3)) / 3,
          zone: r.zone,
          floor: r.floor,
        });
    }
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
  v: Variant,
  groundFloor: boolean,
  /** Usable band widths (the back band loses the core) and areas, for a balanced and buildable split. */
  band: { frontW: number; backW: number; frontArea: number; backArea: number },
): [RoomSpec[], RoomSpec[]] {
  if (groundFloor) {
    // public rooms face the street (majlis by the entrance), service rooms at the back
    const toFront = (s: RoomSpec) =>
      s.zone === 'public' || (s.type === 'dining' && v.dining === 'front');
    const front = specs.filter(toFront);
    if (v.entry === 'middle') {
      // a central entrance between the two majlis (or in the middle of the guest rooms)
      const i = front.findIndex((s) => s.type === 'entrance');
      if (i >= 0) {
        const [e] = front.splice(i, 1);
        front.splice(Math.floor(front.length / 2), 0, e!);
      }
    }
    return [front, specs.filter((s) => !toFront(s))];
  }
  const total = specs.reduce((s, r) => s + r.area, 0);
  const share = band.frontArea / Math.max(1e-6, band.frontArea + band.backArea);
  const out = { front: [] as RoomSpec[], back: [] as RoomSpec[] };
  const used = { front: 0, back: 0 };
  const cap = { front: band.frontW, back: band.backW };
  let acc = 0;
  const put = (side: 'front' | 'back', rooms: RoomSpec[]) => {
    out[side].push(...rooms);
    used[side] += rooms.reduce((t, r) => t + minWidth(r.type), 0);
    if (side === 'front') acc += rooms.reduce((t, r) => t + r.area, 0);
  };
  const fits = (side: 'front' | 'back', rooms: RoomSpec[]) =>
    used[side] + rooms.reduce((t, r) => t + minWidth(r.type), 0) <= cap[side] + 1e-6;
  // suites stay together (a bedroom with its bathroom); the master suite goes first to whichever side the variant
  // gives it, the other rooms fill the street side up to its share of the floor; a suite that fits whole in neither
  // band is split (its bathroom across the corridor)
  const isMaster = (g: RoomSpec[]) => g[0]!.type === 'master_bedroom';
  const first = (g: RoomSpec[]) => isMaster(g) && v.master !== 'back';
  const ordered = suites(specs).sort((a, b) => Number(!first(a)) - Number(!first(b)));
  for (const g of ordered) {
    const a = g.reduce((t, r) => t + r.area, 0);
    const wantFront = acc + a / 2 <= total * share && !(isMaster(g) && v.master === 'back');
    const sides = wantFront ? (['front', 'back'] as const) : (['back', 'front'] as const);
    const side = sides.find((sd) => fits(sd, g));
    if (side) put(side, g);
    else
      for (const r of g)
        put(cap.front - used.front >= cap.back - used.back ? 'front' : 'back', [r]);
  }
  return [out.front, out.back];
}

/** A bedroom and the bathroom listed right after it travel together (an en-suite). */
function suites(specs: RoomSpec[]): RoomSpec[][] {
  const out: RoomSpec[][] = [];
  for (const s of specs) {
    const prev = out[out.length - 1];
    if (
      s.type === 'bathroom' &&
      prev?.length === 1 &&
      (prev[0]!.type === 'bedroom' || prev[0]!.type === 'master_bedroom')
    )
      prev.push(s);
    else out.push([s]);
  }
  return out;
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
    for (const g of suites(upper)) {
      const f = sizes.indexOf(Math.min(...sizes));
      sizes[f]! += g.reduce((t, r) => t + r.area, 0);
      perFloor[f + 1]!.push(...g);
    }
  } else perFloor[0]!.push(...upper);

  const coreW = STAIR_W + (program.elevator ? ELEVATOR_W : 0);
  const busiest = Math.max(...perFloor.map((f) => f.reduce((s, r) => s + r.area, 0)));
  const plotArea = plot.width * plot.depth;
  const width = round(env.w * v.widthShare);
  const neededDepth = (busiest * (1 + v.slack)) / width + CORRIDOR + 2;
  // the client's built-up target, when the brief gives one, may ask for more room than the programme needs
  const targetDepth = program.targetAreaM2 ? program.targetAreaM2 / (floors * width) : 0;
  const coverageDepth = (zoning.coverageMax * plotArea) / width;
  const farDepth = (zoning.farMax * plotArea) / (floors * width);
  const depth = round(
    Math.max(8, Math.min(env.h, coverageDepth, farDepth, Math.max(neededDepth, targetDepth))),
  );
  const align = v.align ?? 'center';
  const footprint: Rect = {
    x: round(
      align === 'left'
        ? env.x
        : align === 'right'
          ? env.x + env.w - width
          : env.x + (env.w - width) / 2,
    ),
    y: round(v.site === 'back' ? env.y + env.h - depth : env.y),
    w: width,
    h: depth,
  };

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
    const [front, back] = splitBands(perFloor[f]!, v, f === 0, {
      frontW: width,
      backW: backSegments.reduce((t, g) => t + g.w, 0),
      frontArea: width * frontDepth,
      backArea: backSegments.reduce((t, g) => t + g.w, 0) * backDepth,
    });
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

  // mirroring flips every room about the footprint's centre line (the core moves with it)
  const placed = v.mirror
    ? rooms.map((r) => ({ ...r, x: round(2 * footprint.x + width - r.x - r.w) }))
    : rooms;

  const plan: DesignPlan = {
    plot: { width: plot.width, depth: plot.depth },
    envelope: env,
    footprint,
    floors,
    floorHeight,
    clearHeight: 2.9,
    rooms: placed,
    // Firestore stores no undefined values: the flag is present only when asked for
    ...(program.separateGuestEntry ? { guestEntry: true } : {}),
    variant: {
      id: v.id,
      code: variantCode(v),
      core: v.core,
      front: v.front,
      widthShare: v.widthShare,
      slack: v.slack,
      site: v.site ?? 'front',
      align,
      mirror: v.mirror ? 1 : 0,
      entry: v.entry ?? 'side',
      dining: v.dining ?? 'back',
      master: v.master ?? 'front',
    },
  };
  // parking bays and the pool go in the yards once the building is placed
  return { ...plan, site: placeSite(plan, program) };
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
