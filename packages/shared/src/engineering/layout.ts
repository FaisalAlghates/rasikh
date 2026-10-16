import { programRooms, type RoomSpec } from './brief.js';
import { coveredArea, onFloor, outsideSides } from './geometry.js';
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

/** The widest a service or wet room's column may get (m): a bathroom never becomes a hall. */
export function maxWidth(t: RoomType): number {
  switch (t) {
    case 'bathroom':
      return 3.2;
    case 'guest_wc':
      return 2.4;
    case 'closet':
      return 3;
    case 'laundry':
    case 'storage':
      return 3.6;
    case 'prep_kitchen':
      return 4;
    case 'entrance':
      return 4.5;
    case 'kitchen':
      return 6.5;
    default:
      return Infinity;
  }
}

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

/** The design types the engine draws. */
export const TYPOLOGIES = ['bands', 'court', 'sidecourt', 'terrace', 'pavilion'] as const;
export type Typology = (typeof TYPOLOGIES)[number];

export interface Variant {
  id: string;
  /** The design type: front and back bands (default), a courtyard house, a side-court (U) house, upper floors
   *  stepped back behind a roof terrace, or a guest pavilion by the gate with the family house behind a garden. */
  typology?: Typology;
  /** A library design whose pattern this variant re-lays (for the credit). */
  inspiredBy?: string;
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
    (v.typology ?? 'bands')[0],
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
    // service and wet rooms keep to a sensible width; what they give up goes to the rooms people live in, or to a
    // store room when nothing else can take it
    const caps = columns.map((c) => Math.max(...c.map((r) => maxWidth(r.type))));
    for (let pass = 0; pass < 4; pass++) {
      let surplus = 0;
      ws = ws.map((w, k) => {
        if (w <= caps[k]! + 1e-9) return w;
        surplus += w - caps[k]!;
        return caps[k]!;
      });
      if (surplus < 1e-6) break;
      const open = ws.map((w, k) => (w < caps[k]! - 1e-6 ? k : -1)).filter((k) => k >= 0);
      if (open.length === 0) {
        columns.push([{ type: 'storage', area: 1, zone: 'service', floor }]);
        caps.push(Infinity);
        ws.push(surplus);
        break;
      }
      const tot = open.reduce((t, k) => t + ws[k]!, 0);
      for (const k of open) ws[k]! += (surplus * ws[k]!) / tot;
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

/** Room numbering per floor, shared by every block on that floor. */
type Ids = Map<string, number>[];

interface Ctx {
  plot: Plot;
  zoning: Zoning;
  program: Program;
  v: Variant;
  env: Rect;
  floors: number;
  /** The rooms of each floor (ground first). */
  perFloor: RoomSpec[][];
  coreW: number;
  plotArea: number;
  ids: Ids;
}

const sumArea = (specs: readonly RoomSpec[]) => specs.reduce((s, r) => s + r.area, 0);

/** Where a footprint of this width sits across the envelope. */
function placeX(ctx: Ctx, width: number): number {
  const { env, v } = ctx;
  const align = v.align ?? 'center';
  return round(
    align === 'left'
      ? env.x
      : align === 'right'
        ? env.x + env.w - width
        : env.x + (env.w - width) / 2,
  );
}

/** Where a footprint of this depth sits in the envelope: by the front setback, or at the back (a front yard). */
const placeY = (ctx: Ctx, depth: number) =>
  round(ctx.v.site === 'back' ? ctx.env.y + ctx.env.h - depth : ctx.env.y);

/** The core in a band: the stair, the lift and the store behind it, so the core leaves no hole in the plan. */
function coreRooms(
  f: number,
  coreX: number,
  y: number,
  depth: number,
  elevator: boolean,
): PlanRoom[] {
  const out: PlanRoom[] = [
    {
      id: `${f}-stair-1`,
      type: 'stair',
      floor: f,
      x: round(coreX),
      y: round(y),
      w: STAIR_W,
      h: depth,
    },
  ];
  if (elevator) {
    const lift = Math.min(2.4, depth);
    out.push({
      id: `${f}-elevator-1`,
      type: 'elevator',
      floor: f,
      x: round(coreX + STAIR_W),
      y: round(y),
      w: ELEVATOR_W,
      h: lift,
    });
    if (depth - lift > 0.3)
      out.push({
        id: `${f}-closet-lift`,
        type: 'closet',
        floor: f,
        x: round(coreX + STAIR_W),
        y: round(y + lift),
        w: ELEVATOR_W,
        h: round(depth - lift),
      });
  }
  return out;
}

/** The core's x in a band of this width, by the variant (left, centre or right). */
function coreXIn(ctx: Ctx, x: number, width: number): number {
  return ctx.v.core === 'left'
    ? x
    : ctx.v.core === 'right'
      ? x + width - ctx.coreW
      : x + (width - ctx.coreW) / 2;
}

/** The parts of a band left beside the core. */
function besideCore(x: number, width: number, coreX: number, coreW: number): Segment[] {
  return [
    { x, w: coreX - x },
    { x: coreX + coreW, w: x + width - (coreX + coreW) },
  ].filter((s) => s.w > 0.5);
}

/**
 * The bands block: a front band, a corridor and a back band around the core, on every floor. With `terrace`, the
 * upper floors step back from the front by that depth and leave a roof terrace over the rooms below.
 */
function bandsBlock(
  ctx: Ctx,
  block: Rect,
  perFloor: RoomSpec[][],
  opts: { terrace?: number } = {},
): PlanRoom[] {
  const { v, program } = ctx;
  const width = block.w;
  const frontDepth = round((block.h - CORRIDOR) * v.front);
  const backY = block.y + frontDepth + CORRIDOR;
  const backDepth = round(block.y + block.h - backY);
  const coreX = coreXIn(ctx, block.x, width);
  const backSegments = besideCore(block.x, width, coreX, ctx.coreW);
  const backW = backSegments.reduce((t, g) => t + g.w, 0);
  const rooms: PlanRoom[] = [];
  perFloor.forEach((specs, f) => {
    const ids = ctx.ids[f]!;
    const t = f > 0 && opts.terrace ? opts.terrace : 0;
    const [front, back] = splitBands(specs, v, f === 0, {
      frontW: width,
      backW,
      frontArea: width * (frontDepth - t),
      backArea: backW * backDepth,
    });
    rooms.push(...fillBand(front, [{ x: block.x, w: width }], block.y + t, frontDepth - t, f, ids));
    rooms.push(...fillBand(back, backSegments, backY, backDepth, f, ids, 'end'));
    rooms.push({
      id: `${f}-corridor-1`,
      type: 'corridor',
      floor: f,
      x: block.x,
      y: round(block.y + frontDepth),
      w: width,
      h: CORRIDOR,
    });
    rooms.push(...coreRooms(f, coreX, backY, backDepth, program.elevator));
    if (t > 0)
      rooms.push({
        id: `${f}-terrace-1`,
        type: 'terrace',
        floor: f,
        x: block.x,
        y: block.y,
        w: width,
        h: t,
      });
  });
  return rooms;
}

/** Depth a block of this width needs for its busiest floor (and the client's target area), within the limits. */
function blockDepth(
  ctx: Ctx,
  width: number,
  perFloor: RoomSpec[][],
  extra: { perUpperFloor?: number; maxDepth: number; coveredAlready?: number },
): number {
  const { v, zoning, program, plotArea } = ctx;
  const need = Math.max(
    ...perFloor.map(
      (specs, f) =>
        (sumArea(specs) * (1 + v.slack)) / width +
        CORRIDOR +
        2 +
        (f > 0 ? (extra.perUpperFloor ?? 0) : 0),
    ),
  );
  const target = program.targetAreaM2 ? program.targetAreaM2 / (perFloor.length * width) : 0;
  const covered = extra.coveredAlready ?? 0;
  const coverageDepth = (zoning.coverageMax * plotArea - covered) / width;
  const farDepth = (zoning.farMax * plotArea - covered) / (perFloor.length * width);
  return round(
    Math.max(8, Math.min(extra.maxDepth, coverageDepth, farDepth, Math.max(need, target))),
  );
}

/** The classic plan, and the terrace plan (upper floors stepped back from the street). */
function bandsPlan(ctx: Ctx, terrace: boolean): { footprint: Rect; rooms: PlanRoom[] } {
  const width = round(ctx.env.w * ctx.v.widthShare);
  // a terrace deep enough to sit on (2–4 m), leaving the upper front rooms at least 3 m deep
  const probeFront = (d: number) => (d - CORRIDOR) * ctx.v.front;
  let depth = blockDepth(ctx, width, ctx.perFloor, {
    maxDepth: ctx.env.h,
    perUpperFloor: terrace ? 3 : 0,
  });
  let t = terrace ? round(Math.min(4, probeFront(depth) - 3)) : 0;
  if (t < 2) t = 0;
  if (!t) depth = blockDepth(ctx, width, ctx.perFloor, { maxDepth: ctx.env.h });
  const footprint: Rect = { x: placeX(ctx, width), y: placeY(ctx, depth), w: width, h: depth };
  return { footprint, rooms: bandsBlock(ctx, footprint, ctx.perFloor, { terrace: t }) };
}

// ------------------------------------------------------------------------------------------- courtyard houses

/** A band the rooms of a floor are shared out to: its usable length (for room widths) and its area. */
interface Slot {
  key: string;
  len: number;
  area: number;
}

/**
 * Shares a floor's rooms out to the slots: each suite goes to the slot it prefers (lower is better) that still has
 * length for it, the emptiest of equally preferred slots first; nothing is lost when nothing fits.
 */
function shareOut(
  specs: RoomSpec[],
  slots: Slot[],
  prefer: (g: RoomSpec[], slot: string) => number,
): Map<string, RoomSpec[]> {
  const out = new Map(slots.map((s) => [s.key, [] as RoomSpec[]]));
  const used = new Map(slots.map((s) => [s.key, { len: 0, area: 0 }]));
  for (const g of suites(specs)) {
    const len = g.reduce((t, r) => t + minWidth(r.type), 0);
    const a = sumArea(g);
    const fill = (s: Slot) => (used.get(s.key)!.area + a) / Math.max(1, s.area);
    const fits = slots.filter((s) => used.get(s.key)!.len + len <= s.len + 1e-6);
    const pick =
      [...fits].sort((p, q) => prefer(g, p.key) - prefer(g, q.key) || fill(p) - fill(q))[0] ??
      [...slots].sort((p, q) => q.len - used.get(q.key)!.len - (p.len - used.get(p.key)!.len))[0]!;
    out.get(pick.key)!.push(...g);
    const u = used.get(pick.key)!;
    u.len += len;
    u.area += a;
  }
  return out;
}

/** Rooms laid along y in a vertical band (a wing): the band filler, turned a quarter. */
function fillWing(
  specs: RoomSpec[],
  x: number,
  depth: number,
  y: number,
  length: number,
  floor: number,
  ids: Map<string, number>,
  outside: 'start' | 'end',
): PlanRoom[] {
  return fillBand(specs, [{ x: y, w: length }], x, depth, floor, ids, outside).map((r) => ({
    ...r,
    x: r.y,
    y: r.x,
    w: r.h,
    h: r.w,
  }));
}

/**
 * A courtyard house: rooms in a front band, a back band and side wings around an open court, each wing opening onto
 * a shaded gallery (riwaq) that rings the court; the court is open to the sky on every floor. The side-court variant
 * keeps one wing only, so the court opens onto the side yard (a U-shaped house).
 */
function courtPlan(ctx: Ctx, oneSided: boolean): { footprint: Rect; rooms: PlanRoom[] } | null {
  const { v, env, program, zoning, plotArea } = ctx;
  const C = CORRIDOR;
  const W = round(env.w * v.widthShare);
  const wings = oneSided ? 1 : 2;
  // wings one room deep; narrower on a narrow plot, so the court keeps at least 4 m across
  const wd = W - wings * (4.2 + C) >= 5 ? 4.2 : 3.4;
  const cw = round(W - wings * (wd + C));
  if (cw < 4) return null;
  // the court is the heart of the house: about as long as it is wide (longer in the 'long' variant)
  let mh = Math.min(10, Math.max(5, cw * (v.front > 0.5 ? 1.15 : 0.85)));
  const busiest = Math.max(...ctx.perFloor.map(sumArea)) * (1 + v.slack);
  // the rest of the rooms share the front and back bands, each at least one room deep
  const rest = Math.max(0, busiest - wings * wd * mh);
  let fd = Math.max(4.2, rest / 2 / W);
  let bd = Math.max(4.6, rest / 2 / Math.max(1, W - ctx.coreW));
  const built = () => W * (fd + 2 * C + mh + bd) - cw * mh;
  if (program.targetAreaM2) {
    // aim at the client's area: deepen the bands
    const short = program.targetAreaM2 / ctx.floors - built();
    if (short > 0) {
      fd += short / 2 / W;
      bd += short / 2 / W;
    }
  }
  // within the envelope, the coverage and the floor area ratio: the court gives first (down to 4 m), then the bands
  const maxBuilt = Math.min(zoning.coverageMax * plotArea, (zoning.farMax * plotArea) / ctx.floors);
  const depth = () => fd + 2 * C + mh + bd;
  for (let i = 0; i < 60 && (depth() > env.h + 1e-6 || built() > maxBuilt + 1e-6); i++) {
    if (mh > 4) mh = Math.max(4, mh - 0.5);
    else if (fd > 3.4 || bd > 3.8) {
      fd = Math.max(3.4, fd - 0.3);
      bd = Math.max(3.8, bd - 0.3);
    } else break;
  }
  mh = round(mh);
  fd = round(fd);
  bd = round(bd);
  const D = round(fd + 2 * C + mh + bd);
  const fp: Rect = { x: placeX(ctx, W), y: placeY(ctx, D), w: W, h: D };
  const x0 = fp.x;
  const y0 = fp.y;
  const y1 = round(y0 + fd + C);
  const y2 = round(y1 + mh + C);
  const coreX = coreXIn(ctx, x0, W);
  const backSegments = besideCore(x0, W, coreX, ctx.coreW);

  const rooms: PlanRoom[] = [];
  ctx.perFloor.forEach((specs, f) => {
    const ids = ctx.ids[f]!;
    const ground = f === 0;
    const slots: Slot[] = [
      { key: 'front', len: W, area: W * fd },
      { key: 'back', len: W - ctx.coreW, area: (W - ctx.coreW) * bd },
      { key: 'wingR', len: mh, area: wd * mh },
      ...(oneSided ? [] : [{ key: 'wingL', len: mh, area: wd * mh }]),
    ];
    const shared = shareOut(specs, slots, (g, slot) => {
      const s = g[0]!;
      const wing = slot.startsWith('wing');
      if (s.type === 'entrance') return slot === 'front' ? 0 : 9;
      if (!ground) {
        if (s.type === 'master_bedroom')
          return slot === (v.master === 'back' ? 'back' : 'front') ? 0 : 1;
        if (s.type === 'living') return wing ? 0 : 1; // the family hall looks onto the court
        return 0;
      }
      // the rooms the family and guests sit in look onto the court
      if (s.type === 'dining') {
        if (v.dining === 'front') return slot === 'front' ? 0 : wing ? 1 : 3;
        return wing ? 0 : slot === 'back' ? 1 : 3;
      }
      if (s.type === 'living' || s.type === 'guest_room') return wing ? 0 : 1;
      if (s.zone === 'public') return slot === 'front' ? 0 : wing ? 1 : 4;
      if (s.zone === 'service') return slot === 'back' ? 0 : wing ? 2 : 4;
      return wing ? 0 : slot === 'back' ? 1 : 2; // single-storey private rooms: the quiet wings
    });
    const front = shared.get('front')!;
    if (ground && v.entry === 'middle') {
      const i = front.findIndex((s) => s.type === 'entrance');
      if (i >= 0) front.splice(Math.floor(front.length / 2), 0, front.splice(i, 1)[0]!);
    }
    rooms.push(...fillBand(front, [{ x: x0, w: W }], y0, fd, f, ids));
    rooms.push(...fillBand(shared.get('back')!, backSegments, y2, bd, f, ids, 'end'));
    // a wing with no rooms on this floor joins the court (with its gallery): open to the sky
    const right = shared.get('wingR')!.length > 0;
    const left = !oneSided && shared.get('wingL')!.length > 0;
    if (right)
      rooms.push(...fillWing(shared.get('wingR')!, round(x0 + W - wd), wd, y1, mh, f, ids, 'end'));
    if (left) rooms.push(...fillWing(shared.get('wingL')!, x0, wd, y1, mh, f, ids, 'start'));
    const gallery = (n: number, x: number, y: number, w: number, h: number): PlanRoom => ({
      id: `${f}-corridor-${n}`,
      type: 'corridor',
      floor: f,
      x: round(x),
      y: round(y),
      w: round(w),
      h: round(h),
    });
    rooms.push(gallery(1, x0, y0 + fd, W, C));
    rooms.push(gallery(2, x0, y1 + mh, W, C));
    if (right) rooms.push(gallery(3, x0 + W - wd - C, y1, C, mh));
    if (left) rooms.push(gallery(4, x0 + wd, y1, C, mh));
    const courtX = left ? x0 + wd + C : x0;
    const courtR = right ? x0 + W - wd - C : x0 + W;
    rooms.push({
      id: `${f}-courtyard-1`,
      type: 'courtyard',
      floor: f,
      x: round(courtX),
      y: y1,
      w: round(courtR - courtX),
      h: mh,
    });
    rooms.push(...coreRooms(f, coreX, y2, bd, program.elevator));
  });
  return { footprint: fp, rooms };
}

/**
 * A guest pavilion: the men's majlis and its WC in their own block by the gate, with the guest entrance; a garden
 * court; then the family house (bands) behind it with its own entrance. Upper floors only over the house.
 */
function pavilionPlan(
  ctx: Ctx,
): { footprint: Rect; rooms: PlanRoom[]; guestEntry: boolean } | null {
  const { v, env } = ctx;
  const ground = ctx.perFloor[0]!;
  const majlis = ground.find((s) => s.type === 'majlis_men');
  const wc = ground.find((s) => s.type === 'guest_wc');
  if (!majlis || !wc) return null;
  const guest = [majlis, wc];
  const W = round(env.w * v.widthShare);
  const gd = 5.6;
  const garden = 4;
  const gw = round(Math.max(7, Math.min(W - 3, (sumArea(guest) * (1 + v.slack)) / gd)));
  const house = [ground.filter((s) => !guest.includes(s)), ...ctx.perFloor.slice(1)];
  const mainDepth = blockDepth(ctx, W, house, {
    maxDepth: env.h - gd - garden,
    coveredAlready: gw * gd,
  });
  const D = round(gd + garden + mainDepth);
  const fp: Rect = { x: placeX(ctx, W), y: placeY(ctx, D), w: W, h: D };
  const ids = ctx.ids[0]!;
  const rooms: PlanRoom[] = [
    ...fillBand(guest, [{ x: fp.x, w: gw }], fp.y, gd, 0, ids),
    // the open ground beside the pavilion (the way in to the house) and the garden court behind it
    {
      id: '0-courtyard-1',
      type: 'courtyard',
      floor: 0,
      x: round(fp.x + gw),
      y: fp.y,
      w: round(W - gw),
      h: gd,
    },
    {
      id: '0-courtyard-2',
      type: 'courtyard',
      floor: 0,
      x: fp.x,
      y: round(fp.y + gd),
      w: W,
      h: garden,
    },
    ...bandsBlock(ctx, { x: fp.x, y: round(fp.y + gd + garden), w: W, h: mainDepth }, house),
  ];
  return { footprint: fp, rooms, guestEntry: true };
}

/** What a roof annex holds: a sitting room and its bathroom. */
export const ANNEX_ROOMS: RoomSpec[] = [
  { type: 'annex_room', area: 24, zone: 'private', floor: 'upper' },
  { type: 'bathroom', area: 4.5, zone: 'private', floor: 'upper' },
];
/** How far a roof annex keeps from a facade on a street (m). */
export const ANNEX_STREET_SETBACK = 1.5;

/**
 * A roof annex over the top floor's core: the stair carries on up, the annex rooms sit beside it in the core's band,
 * no larger than the share the requirements allow of the floor below and at least 1.5 m from every facade on a
 * street; the rest of the roof in front of it is a roof terrace.
 */
function roofAnnex(ctx: Ctx, rooms: PlanRoom[], share: number): PlanRoom[] {
  const top = ctx.floors - 1;
  const L = ctx.floors;
  const below = rooms.filter((r) => r.floor === top);
  const stair = below.find((r) => r.type === 'stair');
  const box = floorBoxOf(below);
  if (!stair || !box) return [];
  const core = below.filter(
    (r) =>
      (r.type === 'stair' || r.type === 'elevator' || r.id.endsWith('closet-lift')) &&
      Math.abs(r.y - stair.y) < 0.05,
  );
  const coreX0 = Math.min(...core.map((r) => r.x));
  const coreX1 = Math.max(...core.map((r) => r.x + r.w));
  const s = ctx.plot.streets;
  const inset = (street: number) => (street > 0 ? ANNEX_STREET_SETBACK : 0);
  // the band the core sits in, kept off facades on streets
  const y0 = stair.y;
  const y1 = Math.min(stair.y + stair.h, box.y + box.h - inset(s.back ?? 0));
  const xMin = box.x + inset(s.left ?? 0);
  const xMax = box.x + box.w - inset(s.right ?? 0);
  const depth = round(y1 - y0);
  if (depth < 2.6) return [];
  const belowArea = below
    .filter((r) => r.type !== 'courtyard' && r.type !== 'terrace')
    .reduce((t, r) => t + r.w * r.h, 0);
  const coreArea = (coreX1 - coreX0) * depth;
  const want = ANNEX_ROOMS.reduce((t, r) => t + r.area, 0) * (1 + ctx.v.slack);
  const room = Math.min(want, share * belowArea - coreArea - 0.5);
  const width = room / depth;
  if (width < 2.6 + 1.6) return [];
  // beside the core, on whichever side has room
  const right = xMax - coreX1 >= width;
  const x = right ? coreX1 : Math.max(xMin, coreX0 - width);
  const w = right ? width : coreX0 - x;
  if (w < 2.6 + 1.6) return [];
  const ids = new Map<string, number>();
  const out: PlanRoom[] = [
    ...fillBand(ANNEX_ROOMS, [{ x: round(x), w: round(w) }], y0, depth, L, ids, 'end'),
    // the core carries on up (cut to the annex band where it is shorter)
    ...core
      .map((r) => ({
        ...r,
        id: r.id.replace(/^d+-/, `${L}-`),
        floor: L,
        h: round(Math.min(r.h, y0 + depth - r.y)),
      }))
      .filter((r) => r.h > 0.3),
  ];
  // the roof in front of the annex: a terrace to sit on (never over a courtyard, which stays open to the sky)
  if (y0 - box.y >= 2 && !below.some((r) => r.type === 'courtyard'))
    out.push({
      id: `${L}-terrace-1`,
      type: 'terrace',
      floor: L,
      x: box.x,
      y: box.y,
      w: box.w,
      h: round(y0 - box.y),
    });
  return out;
}

const floorBoxOf = (rooms: PlanRoom[]): Rect | undefined => {
  const built = rooms.filter((r) => r.type !== 'courtyard' && r.type !== 'terrace');
  if (!built.length) return undefined;
  const x = Math.min(...built.map((r) => r.x));
  const y = Math.min(...built.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...built.map((r) => r.x + r.w)) - x,
    h: Math.max(...built.map((r) => r.y + r.h)) - y,
  };
};

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

  const ctx: Ctx = {
    plot,
    zoning,
    program,
    v,
    env,
    floors,
    perFloor,
    coreW: STAIR_W + (program.elevator ? ELEVATOR_W : 0),
    plotArea: plot.width * plot.depth,
    ids: Array.from({ length: floors }, () => new Map<string, number>()),
  };
  const asked = v.typology ?? 'bands';
  const special =
    asked === 'court' || asked === 'sidecourt'
      ? courtPlan(ctx, asked === 'sidecourt')
      : asked === 'pavilion'
        ? pavilionPlan(ctx)
        : null;
  // a type that cannot be drawn on this plot (too narrow for a court, no majlis for a pavilion) falls back to bands
  const typology = special || asked === 'terrace' ? asked : 'bands';
  const laid = special ?? bandsPlan(ctx, asked === 'terrace');
  const { footprint } = laid;

  // the roof annex (when the brief asks for it and the plot's requirements allow one): a partial level over the core
  const annexRooms =
    program.roofAnnex && (zoning.roofAnnexShare ?? 0) > 0 && program.type !== 'apartments'
      ? roofAnnex(ctx, laid.rooms, zoning.roofAnnexShare!)
      : [];
  if (annexRooms.length) laid.rooms.push(...annexRooms);
  const levels = floors + (annexRooms.length ? 1 : 0);

  // mirroring flips every room about the footprint's centre line (the core moves with it)
  const placed = v.mirror
    ? laid.rooms.map((r) => ({ ...r, x: round(2 * footprint.x + footprint.w - r.x - r.w) }))
    : laid.rooms;
  const guestEntry = program.separateGuestEntry || ('guestEntry' in laid && laid.guestEntry);

  const plan: DesignPlan = {
    plot: { width: plot.width, depth: plot.depth },
    envelope: env,
    footprint,
    floors: levels,
    floorHeight,
    clearHeight: 2.9,
    rooms: placed,
    ...(annexRooms.length ? { annex: true } : {}),
    // Firestore stores no undefined values: the flag is present only when asked for
    ...(guestEntry ? { guestEntry: true } : {}),
    style: program.style,
    variant: {
      id: v.id,
      code: variantCode(v),
      typology,
      core: v.core,
      front: v.front,
      widthShare: v.widthShare,
      slack: v.slack,
      site: v.site ?? 'front',
      align: v.align ?? 'center',
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

/** Edges of a room on the outside of a rectangular footprint. Plans with courtyards or set-back floors use
 * outsideSides (geometry.ts), which every check and drawing relies on. */
export function exteriorEdges(r: Rect, fp: Rect): Array<'front' | 'back' | 'left' | 'right'> {
  const e: Array<'front' | 'back' | 'left' | 'right'> = [];
  const eps = 0.05;
  if (Math.abs(r.y - fp.y) < eps) e.push('front');
  if (Math.abs(r.y + r.h - (fp.y + fp.h)) < eps) e.push('back');
  if (Math.abs(r.x - fp.x) < eps) e.push('left');
  if (Math.abs(r.x + r.w - (fp.x + fp.w)) < eps) e.push('right');
  return e;
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
    if (HABITABLE.includes(r.type) && outsideSides(r, onFloor(plan, r.floor)).length === 0)
      daylightMissing++;
    const ratio = Math.max(r.w, r.h) / Math.min(r.w, r.h);
    if (HABITABLE.includes(r.type) && ratio > 2.5) narrowRooms++;
  }
  const coverage = coveredArea(plan) / (plan.plot.width * plan.plot.depth);
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
