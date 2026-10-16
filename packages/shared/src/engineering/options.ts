import { programRooms } from './brief.js';
import { detectClashes, structuralScheme, unstackedWetRooms } from './disciplines.js';
import { envelopeOf, generatePlan, scorePlan, variantCode, type Variant } from './layout.js';
import { area, builtUpArea, floorArea, isOpen } from './geometry.js';
import { doorTarget, hasOwnEntry } from './openings.js';
import { runRules, type RuleOverrides, type RuleResult } from './rules.js';
import { siteShortfall, yards } from './site.js';
import {
  WET,
  type DesignPlan,
  type PlanRoom,
  type Plot,
  type Program,
  type RoomType,
  type Zoning,
} from './schemas.js';

/**
 * The option search behind "give me more than five different designs that match the brief and the code".
 *
 * It walks hundreds of variants of the deterministic layout engine and keeps a variant only when:
 *  - every room the client's programme asks for is in the plan (programme complete),
 *  - every zoning rule passes and every automatic building-code rule passes (with the parameters the office's engineer
 *    verified, or else would pass with the starting parameters),
 *  - every room has a proper door (no bedroom reached through another bedroom, no WC off the kitchen, the entrance
 *    hall reaches the corridor),
 *  - the corridor duct clears the beams.
 * From the survivors it picks the options that differ most from each other in what a client sees (core side,
 * entrance, yard, side passage, dining, master suite, size), best first. Nothing here is a model: same brief, same
 * options. Code rules that only an engineer can check (fire, energy, structure, electrical, plumbing) stay open for
 * the office's engineers on every option.
 */

const CORES = ['right', 'left', 'center'] as const;
const FRONTS = [0.45, 0.55, 0.62];
const SLACKS = [0.1, 0.25];
const PLACEMENTS: Array<Pick<Variant, 'widthShare' | 'align'>> = [
  { widthShare: 1, align: 'center' },
  { widthShare: 0.86, align: 'left' },
  { widthShare: 0.86, align: 'right' },
  // passages on both sides (room for tandem parking down each)
  { widthShare: 0.8, align: 'center' },
];

/** Every variant worth trying for a programme (knobs that cannot change this programme are left out). */
export function candidateVariants(program: Program): Variant[] {
  const house = program.type !== 'apartments' && program.type !== 'commercial';
  const sites = ['front', 'back'] as const;
  const mirrors = [false, true];
  const entries = house ? (['side', 'middle'] as const) : (['side'] as const);
  const dinings = house && program.dining ? (['back', 'front'] as const) : (['back'] as const);
  const masters =
    house && program.floors > 1 && program.bedrooms > 0
      ? (['front', 'back'] as const)
      : (['front'] as const);
  const out: Variant[] = [];
  for (const core of CORES)
    for (const front of FRONTS)
      for (const place of PLACEMENTS)
        for (const slack of SLACKS)
          for (const site of sites)
            for (const mirror of mirrors)
              for (const entry of entries)
                for (const dining of dinings)
                  for (const master of masters) {
                    const v = {
                      core,
                      front,
                      slack,
                      site,
                      mirror,
                      entry,
                      dining,
                      master,
                      ...place,
                    } as Variant;
                    out.push({ ...v, id: variantCode(v) });
                  }
  if (!house) return out;

  // the other design types, with the knobs that change them
  const more = (
    typology: Variant['typology'],
    knobs: Partial<Record<keyof Variant, readonly unknown[]>>,
  ) => {
    const keys = Object.keys(knobs) as Array<keyof Variant>;
    const walk = (i: number, acc: Partial<Variant>) => {
      if (i === keys.length) {
        const v = {
          typology,
          core: 'right',
          front: 0.55,
          widthShare: 1,
          slack: 0.15,
          ...acc,
        } as Variant;
        out.push({ ...v, id: variantCode(v) });
        return;
      }
      for (const val of knobs[keys[i]!]!) walk(i + 1, { ...acc, [keys[i]!]: val });
    };
    walk(0, {});
  };
  const common = { core: CORES, slack: SLACKS, site: sites, dining: dinings, master: masters };
  // a courtyard house, and a U-shaped one with the court open to the side (both hands)
  more('court', { ...common, front: [0.45, 0.6], widthShare: [1, 0.9] });
  more('sidecourt', { ...common, front: [0.45, 0.6], mirror: mirrors });
  // upper floors stepped back behind a roof terrace
  if (program.floors > 1)
    more('terrace', { ...common, front: [0.55, 0.62], mirror: mirrors, widthShare: [1, 0.86] });
  // the men's majlis in its own pavilion by the gate (either hand)
  if (program.majlisMen)
    more('pavilion', { ...common, front: [0.5, 0.6], mirror: mirrors, site: ['front'] });
  return out;
}

// ------------------------------------------------------------------------------------------------ the checks

/** Rooms the programme asks for that the plan lacks (by type and count). */
export function missingRooms(
  plan: DesignPlan,
  program: Program,
): Array<{ type: RoomType; want: number; have: number }> {
  const want = new Map<RoomType, number>();
  for (const s of programRooms({ ...program, floors: plan.floors }))
    want.set(s.type, (want.get(s.type) ?? 0) + 1);
  const out: Array<{ type: RoomType; want: number; have: number }> = [];
  for (const [type, n] of want) {
    const have = plan.rooms.filter((r) => r.type === type).length;
    if (have < n) out.push({ type, want: n, have });
  }
  return out;
}

const SERVICE: readonly RoomType[] = [
  'closet',
  'maid_room',
  'driver_room',
  'laundry',
  'storage',
  'prep_kitchen',
];
const GUEST: readonly RoomType[] = [
  'majlis_men',
  'majlis_women',
  'guest_room',
  'prayer_room',
  'dining',
];

/** May `room` be entered through `via`? (Through the corridor or the entrance hall: always.) */
export function allowedThrough(room: RoomType, via: RoomType): boolean {
  if (via === 'corridor' || via === 'entrance') return true;
  // a closet or store opens off any dry room or the stair hall (a dressing room, a store behind the lift)
  if (room === 'closet') return !WET.includes(via) && via !== 'elevator';
  if (room === 'bathroom' || room === 'guest_wc')
    return ![
      'kitchen',
      'prep_kitchen',
      'dining',
      'bathroom',
      'guest_wc',
      'laundry',
      'storage',
    ].includes(via);
  // the annex room opens off the stair landing on the roof
  if (room === 'annex_room') return via === 'stair' || via === 'living';
  if (SERVICE.includes(room))
    return ['kitchen', 'prep_kitchen', 'laundry', 'storage', 'living', 'dining'].includes(via);
  if (GUEST.includes(room)) return ['majlis_men', 'majlis_women', 'living', 'dining'].includes(via);
  if (room === 'kitchen') return via === 'dining' || via === 'living';
  // bedrooms, office, gym, the family hall, apartments, shops: from the family hall at most
  return via === 'living';
}

/** Rooms whose door is missing or opens through a room it should not (ids). */
export function accessIssues(plan: DesignPlan): string[] {
  const out: string[] = [];
  for (const r of plan.rooms) {
    if (r.type === 'corridor' || r.type === 'elevator' || r.type === 'stair' || isOpen(r.type))
      continue;
    const same = plan.rooms.filter((o) => o.floor === r.floor);
    const via = doorTarget(r, same);
    if (r.type === 'entrance') {
      if (via?.type !== 'corridor') out.push(r.id);
    } else if (hasOwnEntry(plan, r))
      continue; // its own door from outside (a guest majlis)
    else if (!via || !allowedThrough(r.type, via.type)) out.push(r.id);
  }
  return out;
}

export interface OptionCheck {
  ok: boolean;
  /** Rule ids that failed (or would fail), plus PROGRAM / ACCESS / CLASH / SITE. */
  failing: string[];
  missing: ReturnType<typeof missingRooms>;
  access: string[];
  results: RuleResult[];
}

/** Everything an option must pass to be offered to the client. */
export function checkOption(
  plan: DesignPlan,
  ctx: { plot: Plot; zoning: Zoning; program: Program },
  overrides: RuleOverrides = {},
): OptionCheck {
  const failing: string[] = [];
  const missing = missingRooms(plan, ctx.program);
  if (missing.length) failing.push('PROGRAM');
  const results = runRules({ plan, ...ctx }, overrides);
  for (const r of results)
    if (r.status === 'failed' || r.preview === 'would_fail') failing.push(r.id);
  const access = accessIssues(plan);
  if (access.length) failing.push('ACCESS');
  if (detectClashes(plan, structuralScheme(plan)).length) failing.push('CLASH');
  const site = siteShortfall(plan, ctx.program);
  if (site.parking > 0 || site.pool || site.guestEntry) failing.push('SITE');
  // the annex the brief asks for, where the plot's requirements allow one
  if (ctx.program.roofAnnex && (ctx.zoning.roofAnnexShare ?? 0) > 0 && !plan.annex)
    failing.push('ANNEX');
  return { ok: failing.length === 0, failing, missing, access, results };
}

// ------------------------------------------------------------------------------------------------ difference

type Third = 'left' | 'middle' | 'right';
const third = (x: number, fp: { x: number; w: number }): Third => {
  const t = (x - fp.x) / fp.w;
  return t < 1 / 3 ? 'left' : t > 2 / 3 ? 'right' : 'middle';
};
const centreX = (r: PlanRoom) => r.x + r.w / 2;

/** What a client sees of an option, read from its geometry (not from the knobs that made it). */
export function optionTraits(plan: DesignPlan) {
  const fp = plan.footprint;
  const env = plan.envelope;
  const on = (f: number, t: RoomType) => plan.rooms.find((r) => r.floor === f && r.type === t);
  const stair = on(0, 'stair');
  const entrance = on(0, 'entrance');
  const corridor = on(0, 'corridor');
  const majlis = on(0, 'majlis_men') ?? on(0, 'majlis_women') ?? on(0, 'apartment');
  const dining = on(0, 'dining');
  const master = plan.rooms.find((r) => r.type === 'master_bedroom');
  const band = (r: PlanRoom | undefined) => {
    const c = plan.rooms.find((o) => o.type === 'corridor' && o.floor === r?.floor) ?? corridor;
    return !r || !c ? 'none' : r.y + r.h / 2 < c.y ? 'front' : 'back';
  };
  const leftGap = fp.x - env.x;
  const rightGap = env.x + env.w - (fp.x + fp.w);
  const passage =
    fp.w >= env.w - 0.05
      ? 'none'
      : Math.abs(leftGap - rightGap) < 0.1
        ? 'both'
        : leftGap > rightGap
          ? 'left'
          : 'right';
  const frontYard = fp.y;
  const backYard = plan.plot.depth - (fp.y + fp.h);
  const typology = String(plan.variant.typology ?? 'bands');
  const coreSide = stair ? third(centreX(stair), fp) : 'none';
  const entrySide = entrance ? third(centreX(entrance), fp) : 'none';
  return {
    /** The design type: the biggest difference there is. */
    typology,
    /** Absolute sides, seen from the street (for the explanation). */
    coreSide,
    entrySide,
    /** Mirror-free traits: a mirrored plan is the same design for the client. */
    entry: entrySide === 'none' ? 'none' : entrySide === 'middle' ? 'middle' : 'side',
    core:
      coreSide === 'middle' || entrySide === 'none' || entrySide === 'middle'
        ? coreSide === 'middle'
          ? 'middle'
          : 'side'
        : coreSide === entrySide
          ? 'with_entry'
          : 'opposite_entry',
    hand: majlis ? third(centreX(majlis), fp) : 'none',
    yard: backYard >= frontYard ? 'back' : 'front',
    passage,
    dining: band(dining),
    master: band(master),
    /** Where the corridor runs, as a share of the depth. */
    split: corridor ? (corridor.y - fp.y) / fp.h : 0,
    area: builtUpArea(plan),
  } as const;
}

/**
 * How different two options look to a client: one point per changed trait (entrance, stair, yard, side passage,
 * dining, master suite, size), half a point for a mirror image or a moved corridor.
 */
export function optionDistance(a: DesignPlan, b: DesignPlan): number {
  const ta = optionTraits(a);
  const tb = optionTraits(b);
  let d = ta.typology !== tb.typology ? 2 : 0;
  for (const k of ['entry', 'core', 'yard', 'passage', 'dining', 'master'] as const)
    if (ta[k] !== tb[k]) d += 1;
  if (ta.hand !== tb.hand) d += 0.5;
  if (Math.abs(ta.split - tb.split) >= 0.07) d += 0.5;
  if (Math.abs(ta.area - tb.area) / Math.max(ta.area, tb.area, 1) >= 0.08) d += 1;
  return d;
}

const geometryKey = (p: DesignPlan) =>
  `${p.footprint.x},${p.footprint.y},${p.footprint.w},${p.footprint.h}|` +
  p.rooms.map((r) => `${r.id}:${r.x},${r.y},${r.w},${r.h}`).join(';');

/** Ranking: daylight and proportions (scorePlan), closeness to the client's area, stacked plumbing. */
export function rankOption(plan: DesignPlan, program: Program): number {
  let s = scorePlan(plan).score;
  if (program.targetAreaM2)
    s -= (Math.abs(builtUpArea(plan) - program.targetAreaM2) / program.targetAreaM2) * 30;
  s -= unstackedWetRooms(plan).length * 1.5;
  return Math.round(s * 10) / 10;
}

// ------------------------------------------------------------------------------------------------ the search

export interface OptionSearch {
  /** The chosen options, best first; labels A, B, C ... follow this order. */
  options: DesignPlan[];
  /** Variants tried, distinct plans among them, and how many passed every check. */
  tried: number;
  distinct: number;
  compliant: number;
  /** Why candidates were dropped, most frequent first (rule ids, PROGRAM, ACCESS, CLASH, SITE). */
  blocking: Array<{ id: string; count: number }>;
  /** The zoning allows fewer floors than the brief asks for (the rooms were spread over the allowed floors). */
  floorsReduced: boolean;
}

export const MIN_OPTIONS = 6;
export const MAX_OPTIONS = 12;
/** Two offered options differ in at least this many visible traits. */
export const MIN_DIFFERENCE = 2;

export function searchOptions(
  plot: Plot,
  zoning: Zoning,
  program: Program,
  opts: { count?: number; overrides?: RuleOverrides; existing?: DesignPlan[] } = {},
): OptionSearch {
  const count = Math.max(1, Math.min(MAX_OPTIONS, opts.count ?? 8));
  const existing = opts.existing ?? [];
  const seen = new Set(existing.map(geometryKey));
  const blocking = new Map<string, number>();
  const pool: Array<{ plan: DesignPlan; rank: number }> = [];
  const variants = candidateVariants(program);
  let distinct = 0;
  for (const v of variants) {
    const plan = generatePlan(plot, zoning, program, v);
    const key = geometryKey(plan);
    if (seen.has(key)) continue;
    seen.add(key);
    distinct++;
    const c = checkOption(plan, { plot, zoning, program }, opts.overrides);
    if (!c.ok) {
      for (const f of c.failing) blocking.set(f, (blocking.get(f) ?? 0) + 1);
      continue;
    }
    pool.push({ plan, rank: rankOption(plan, program) });
  }
  pool.sort((a, b) => b.rank - a.rank);

  // farthest-first: each next option is the one that differs most from everything already chosen (up to three
  // traits); among equally different ones, the better ranked
  const chosen: Array<{ plan: DesignPlan; rank: number }> = [];
  const left = [...pool];
  // the range first: the best design of each type the brief allows (a courtyard house, a terrace, a guest
  // pavilion ...), then the most different of the rest
  const kind = (p: DesignPlan) => String(p.variant.typology ?? 'bands');
  const shown = new Set(existing.map(kind));
  for (const c of pool) {
    if (chosen.length >= count) break;
    if (shown.has(kind(c.plan))) continue;
    const others = [...existing, ...chosen.map((x) => x.plan)];
    if (others.some((o) => optionDistance(c.plan, o) < MIN_DIFFERENCE)) continue;
    chosen.push(c);
    left.splice(left.indexOf(c), 1);
    shown.add(kind(c.plan));
  }
  while (chosen.length < count && left.length) {
    let best = -1;
    let bestScore = -Infinity;
    left.forEach((c, i) => {
      const d = Math.min(
        3,
        ...[...existing, ...chosen.map((x) => x.plan)].map((o) => optionDistance(c.plan, o)),
      );
      if (d < MIN_DIFFERENCE) return;
      const score = d * 100 + c.rank;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best < 0) break;
    chosen.push(left.splice(best, 1)[0]!);
  }
  chosen.sort((a, b) => b.rank - a.rank);

  return {
    options: chosen.map((c) => c.plan),
    tried: variants.length,
    distinct,
    compliant: pool.length,
    blocking: [...blocking.entries()]
      .map(([id, n]) => ({ id, count: n }))
      .sort((a, b) => b.count - a.count),
    floorsReduced: program.floors > zoning.maxFloors,
  };
}

/** Option labels: A, B, ... Z, then AA, AB ... */
export function optionLabel(i: number): string {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return i < 26 ? a[i]! : a[Math.floor(i / 26) - 1]! + a[i % 26]!;
}

// ------------------------------------------------------------------------------------------------ explanation

export interface FitNote {
  key:
    | 'program'
    | 'typology'
    | 'core'
    | 'entry'
    | 'guestEntry'
    | 'yard'
    | 'passage'
    | 'dining'
    | 'master'
    | 'parking'
    | 'annex'
    | 'pool'
    | 'area'
    | 'plumbing';
  values: Record<string, string | number>;
}

/** The rooms the programme asks for, counted by type, for "everything you asked for is here". */
export function programCounts(program: Program, floors = program.floors) {
  const m = new Map<RoomType, number>();
  for (const s of programRooms({ ...program, floors }))
    if (s.type !== 'entrance') m.set(s.type, (m.get(s.type) ?? 0) + 1);
  return [...m.entries()].map(([type, n]) => ({ type, n }));
}

/** What the brief asks for that concept plans do not draw yet (added during design development). */
export function deferredItems(program: Program, plan?: Pick<DesignPlan, 'annex'>) {
  return (['basement', 'roofAnnex'] as const).filter(
    (k) => program[k] && !(k === 'roofAnnex' && plan?.annex),
  );
}

/** What makes the design type special, measured on the plan. */
function typologyNote(plan: DesignPlan): FitNote[] {
  const t = String(plan.variant.typology ?? 'bands');
  if (t === 'bands') return [];
  const m = (n: number) => Math.round(n * 10) / 10;
  if (t === 'court' || t === 'sidecourt') {
    const court = plan.rooms.find((r) => r.floor === 0 && r.type === 'courtyard');
    return court ? [{ key: 'typology', values: { kind: t, w: m(court.w), h: m(court.h) } }] : [];
  }
  if (t === 'terrace') {
    const terrace = plan.rooms.find((r) => r.type === 'terrace');
    return terrace
      ? [{ key: 'typology', values: { kind: t, w: m(terrace.w), h: m(terrace.h) } }]
      : [];
  }
  const garden = plan.rooms.find((r) => r.id === '0-courtyard-2');
  return garden ? [{ key: 'typology', values: { kind: t, w: m(garden.w), h: m(garden.h) } }] : [];
}

/** Why an option fits the brief, as translatable notes. Deterministic; a model may only reword them. */
export function explainOption(plan: DesignPlan, program: Program, plot: Plot, zoning: Zoning) {
  const t = optionTraits(plan);
  const fp = plan.footprint;
  const env = envelopeOf(plot, zoning);
  const notes: FitNote[] = [
    { key: 'program', values: { n: programCounts(program, plan.floors).length } },
    ...typologyNote(plan),
    { key: 'core', values: { side: t.coreSide } },
  ];
  if (t.entrySide !== 'none') notes.push({ key: 'entry', values: { side: t.entrySide } });
  const yardDepth = t.yard === 'back' ? plot.depth - (fp.y + fp.h) : fp.y;
  notes.push({ key: 'yard', values: { where: t.yard, m: Math.round(yardDepth * 10) / 10 } });
  if (t.passage !== 'none') {
    const w = t.passage === 'left' ? fp.x : plot.width - (fp.x + fp.w);
    notes.push({ key: 'passage', values: { side: t.passage, m: Math.round(w * 10) / 10 } });
  }
  if (t.dining !== 'none') notes.push({ key: 'dining', values: { where: t.dining } });
  if (t.master !== 'none' && plan.floors > 1)
    notes.push({ key: 'master', values: { where: t.master } });
  notes.push({
    key: 'area',
    values: {
      m2: Math.round(builtUpArea(plan)),
      target: program.targetAreaM2 ?? 0,
      footprint: Math.round(area(fp)),
      coverage: Math.round((area(fp) / (plot.width * plot.depth)) * 100),
      envelope: Math.round(area(env)),
    },
  });
  if (plan.guestEntry) notes.push({ key: 'guestEntry', values: {} });
  if (plan.annex) {
    const L = plan.floors - 1;
    const a = floorArea(plan, L);
    notes.push({
      key: 'annex',
      values: {
        m2: Math.round(a),
        pct: Math.round((a / Math.max(1, floorArea(plan, L - 1))) * 100),
      },
    });
  }
  const site = plan.site ?? [];
  const bays = site.filter((s) => s.type === 'parking');
  if (bays.length) {
    const ys = yards(plan);
    const inFront = bays.filter((b) => b.y + b.h <= ys.front.h + 0.01);
    notes.push({
      key: 'parking',
      values: {
        n: bays.length,
        where: inFront.length === bays.length ? 'front' : inFront.length ? 'front_side' : 'side',
        // bays across the street line are perpendicular (2.5 m wide), along it parallel
        layout: inFront.length && inFront[0]!.w < inFront[0]!.h ? 'perpendicular' : 'parallel',
      },
    });
  }
  const pool = site.find((s) => s.type === 'pool');
  if (pool) {
    const ys = yards(plan);
    const where =
      pool.y >= ys.back.y - 0.01 ? 'back' : pool.y + pool.h <= ys.front.h + 0.01 ? 'front' : 'side';
    notes.push({
      key: 'pool',
      values: { where, size: `${Math.max(pool.w, pool.h)}×${Math.min(pool.w, pool.h)}` },
    });
  }
  if (plan.floors > 1) {
    const wet = plan.rooms.filter(
      (r) => r.floor > 0 && (r.type === 'bathroom' || r.type === 'guest_wc'),
    ).length;
    const stacked = wet - unstackedWetRooms(plan).filter((r) => r.type === 'bathroom').length;
    if (wet > 0) notes.push({ key: 'plumbing', values: { stacked, wet } });
  }
  return notes;
}
