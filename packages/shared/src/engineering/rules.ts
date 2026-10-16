import {
  area,
  builtUpArea,
  coveredArea,
  floorArea,
  floorBox,
  innerCourts,
  onFloor,
  outsideSides,
} from './geometry.js';
import { envelopeOf } from './layout.js';
import { openingsOf, openingWidth } from './openings.js';
import {
  HABITABLE,
  type DesignPlan,
  type Discipline,
  type Plot,
  type Program,
  type Zoning,
} from './schemas.js';

/**
 * The versioned rule engine. Compliance is decided only here, never by a model.
 *
 * Zoning rules use the municipal values the office entered for the plot, so they report passed/failed directly.
 * Building-code rules carry STARTING parameters that are not taken from the code text (Rasikh does not hold the
 * licensed SBC text): until a licensed engineer of the office enters/confirms each rule's parameters from the licensed
 * code and marks them verified, the rule reports "not_checked" with a preview, never "passed".
 */

export const RULE_PACK_VERSION = 'rasikh-residential-2026.10';

export type RuleStatus = 'passed' | 'failed' | 'not_checked';
export type RulePack = 'zoning' | 'code';

export interface RuleContext {
  plan: DesignPlan;
  plot: Pick<Plot, 'width' | 'depth'> & Partial<Pick<Plot, 'streets'>>;
  zoning: Zoning;
  program: Program;
}

export interface RuleOutcome {
  ok: boolean;
  /** Rooms (ids) that break the rule, to highlight on the plan. */
  rooms?: string[];
  /** The measured value, for the report. */
  value?: number;
}

export interface RuleDef {
  id: string;
  pack: RulePack;
  discipline: Discipline;
  /** The code part the rule belongs to; the clause is entered by the office's engineer from the licensed text. */
  ref: string;
  /** Starting parameters (code rules) — to be confirmed by a licensed engineer. */
  params: Record<string, number>;
  /** null: Rasikh cannot check this automatically; it always needs an engineer. */
  check: ((ctx: RuleContext, p: Record<string, number>) => RuleOutcome) | null;
}

/** What a licensed engineer of the office confirmed for a rule (offices/{id}/rulePacks/{version}). */
export interface RuleOverride {
  params?: Record<string, number>;
  clause?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}
export type RuleOverrides = Record<string, RuleOverride>;

export interface RuleResult {
  id: string;
  pack: RulePack;
  discipline: Discipline;
  ref: string;
  clause?: string;
  status: RuleStatus;
  /** For not_checked rules that can run: what the result would be with the starting parameters. */
  preview?: 'would_pass' | 'would_fail';
  rooms: string[];
  value?: number;
  params: Record<string, number>;
  verified: boolean;
}

const habitable = (ctx: RuleContext) => ctx.plan.rooms.filter((r) => HABITABLE.includes(r.type));
const units = (p: Program) => (p.type === 'apartments' ? p.unitsPerFloor * p.floors : 1);

export const RULES: RuleDef[] = [
  // ------------------------------------------------------------------ zoning (municipal values entered per plot)
  {
    id: 'Z-SETBACK',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: {},
    check: ({ plan, plot, zoning }) => {
      const e = envelopeOf(plot, zoning);
      const f = plan.footprint;
      const eps = 0.01;
      return {
        ok:
          f.x >= e.x - eps &&
          f.y >= e.y - eps &&
          f.x + f.w <= e.x + e.w + eps &&
          f.y + f.h <= e.y + e.h + eps,
      };
    },
  },
  {
    id: 'Z-COVERAGE',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: {},
    check: ({ plan, plot, zoning }) => {
      const v = coveredArea(plan) / (plot.width * plot.depth);
      return { ok: v <= zoning.coverageMax + 1e-6, value: Math.round(v * 1000) / 1000 };
    },
  },
  {
    id: 'Z-FAR',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: {},
    check: ({ plan, plot, zoning }) => {
      const v = builtUpArea(plan) / (plot.width * plot.depth);
      return { ok: v <= zoning.farMax + 1e-6, value: Math.round(v * 100) / 100 };
    },
  },
  {
    id: 'Z-FLOORS',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: {},
    // a roof annex is not counted as a floor (its own rule follows)
    check: ({ plan, zoning }) => {
      const v = plan.floors - (plan.annex ? 1 : 0);
      return { ok: v <= zoning.maxFloors, value: v };
    },
  },
  {
    // the roof annex: no more than the allowed share of the floor below, and 1.5 m off every facade on a street
    id: 'Z-ANNEX',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: { streetSetback: 1.5 },
    check: ({ plan, plot, zoning }, p) => {
      if (!plan.annex) return { ok: true };
      const L = plan.floors - 1;
      const share = floorArea(plan, L) / Math.max(1, floorArea(plan, L - 1));
      const box = floorBox(plan, L);
      const below = floorBox(plan, L - 1);
      const s = plot.streets;
      const keep = p.streetSetback ?? 0;
      const off = (gap: number, street: number | undefined) => !street || gap >= keep - 0.01;
      const clear =
        !!box &&
        !!below &&
        box.y - below.y >= keep - 0.01 &&
        off(below.y + below.h - (box.y + box.h), s?.back) &&
        off(box.x - below.x, s?.left) &&
        off(below.x + below.w - (box.x + box.w), s?.right);
      return {
        ok: share <= (zoning.roofAnnexShare ?? 0) + 1e-6 && clear,
        value: Math.round(share * 100) / 100,
      };
    },
  },
  {
    id: 'Z-HEIGHT',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: { parapet: 1 },
    check: ({ plan, zoning }, p) => {
      const v = plan.floors * plan.floorHeight + (p.parapet ?? 1);
      return { ok: v <= zoning.maxHeightM + 1e-6, value: Math.round(v * 10) / 10 };
    },
  },
  {
    id: 'Z-PARKING',
    pack: 'zoning',
    discipline: 'architectural',
    ref: 'zoning',
    params: {},
    check: ({ program, zoning }) => ({
      ok: program.parking >= Math.ceil(zoning.parkingPerUnit * units(program)),
      value: program.parking,
    }),
  },
  // ------------------------------------------------------------------ building code (parameters need an engineer)
  {
    id: 'C-ROOM-AREA',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minArea: 9 },
    check: (ctx, p) => {
      const bad = habitable(ctx).filter((r) => area(r) < (p.minArea ?? 0) - 1e-6);
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    id: 'C-ROOM-DIM',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minDim: 2.4 },
    check: (ctx, p) => {
      const bad = habitable(ctx).filter((r) => Math.min(r.w, r.h) < (p.minDim ?? 0) - 1e-6);
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    id: 'C-CEILING',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minClear: 2.7 },
    check: ({ plan }, p) => ({
      ok: plan.clearHeight >= (p.minClear ?? 0) - 1e-6,
      value: plan.clearHeight,
    }),
  },
  {
    id: 'C-DAYLIGHT',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: {},
    check: (ctx) => {
      const bad = habitable(ctx).filter(
        (r) => outsideSides(r, onFloor(ctx.plan, r.floor)).length === 0,
      );
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    id: 'C-WET-VENT',
    pack: 'code',
    discipline: 'mechanical',
    ref: 'SBC 501',
    params: {},
    check: ({ plan }) => {
      const bad = plan.rooms.filter(
        (r) =>
          (r.type === 'bathroom' || r.type === 'guest_wc') &&
          outsideSides(r, onFloor(plan, r.floor)).length === 0,
      );
      // an inner bathroom is allowed with mechanical extract; until that is designed it is flagged
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    id: 'C-CORRIDOR',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minWidth: 1.1 },
    check: ({ plan }, p) => {
      const bad = plan.rooms.filter(
        (r) => r.type === 'corridor' && Math.min(r.w, r.h) < (p.minWidth ?? 0) - 1e-6,
      );
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    id: 'C-STAIR',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minFlight: 1.0 },
    check: ({ plan }, p) => {
      // a two-flight stair in its core: each flight takes half of the core width
      const bad = plan.rooms.filter(
        (r) => r.type === 'stair' && r.w / 2 < (p.minFlight ?? 0) - 1e-6,
      );
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    id: 'C-EGRESS',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: {},
    check: ({ plan }) => {
      const missing = Array.from({ length: plan.floors }, (_, f) => f).filter(
        (f) => f > 0 && !plan.rooms.some((r) => r.floor === f && r.type === 'stair'),
      );
      return { ok: missing.length === 0, value: missing.length };
    },
  },
  {
    id: 'C-ACCESSIBLE-WC',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: {},
    check: ({ plan }) => ({
      ok: plan.rooms.some(
        (r) =>
          r.floor === 0 &&
          (r.type === 'guest_wc' ||
            r.type === 'bathroom' ||
            r.type === 'apartment' ||
            r.type === 'shop'),
      ),
    }),
  },
  {
    // an inner court that rooms take their daylight from: wide enough to light them
    id: 'C-COURT',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minWidth: 3 },
    check: ({ plan }, p) => {
      const bad = innerCourts(plan).filter((r) => Math.min(r.w, r.h) < (p.minWidth ?? 0) - 1e-6);
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    // natural light: the glazed area of every habitable room against its floor area
    id: 'C-GLAZING',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { minRatio: 0.08 },
    check: ({ plan }, p) => {
      const glass = new Map<string, number>();
      for (const o of openingsOf(plan))
        if (o.kind === 'window')
          glass.set(o.roomId, (glass.get(o.roomId) ?? 0) + openingWidth(o) * (o.head - o.sill));
      const bad = plan.rooms.filter(
        (r) =>
          HABITABLE.includes(r.type) && (glass.get(r.id) ?? 0) < area(r) * (p.minRatio ?? 0) - 1e-6,
      );
      return { ok: bad.length === 0, rooms: bad.map((r) => r.id) };
    },
  },
  {
    // the stair fits its steps: two flights of risers no higher than maxRiser and treads no shorter than minTread,
    // with a landing at each end
    id: 'C-STAIR-RUN',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 201',
    params: { maxRiser: 0.18, minTread: 0.28, minLanding: 1 },
    check: ({ plan }, p) => {
      const risers = Math.ceil(plan.floorHeight / (p.maxRiser ?? 1));
      const run = (Math.ceil(risers / 2) - 1) * (p.minTread ?? 0) + 2 * (p.minLanding ?? 0);
      const bad = plan.rooms.filter(
        (r) => r.type === 'stair' && r.floor < plan.floors - 1 && Math.max(r.w, r.h) < run - 1e-6,
      );
      return {
        ok: bad.length === 0,
        rooms: bad.map((r) => r.id),
        value: Math.round(run * 100) / 100,
      };
    },
  },
  // areas Rasikh does not check automatically: always "needs engineer"
  { id: 'C-FIRE', pack: 'code', discipline: 'mechanical', ref: 'SBC 801', params: {}, check: null },
  {
    id: 'C-ENERGY',
    pack: 'code',
    discipline: 'architectural',
    ref: 'SBC 602',
    params: {},
    check: null,
  },
  {
    id: 'C-STRUCTURE',
    pack: 'code',
    discipline: 'structural',
    ref: 'SBC 301',
    params: {},
    check: null,
  },
  {
    id: 'C-ELECTRICAL',
    pack: 'code',
    discipline: 'electrical',
    ref: 'SBC 401',
    params: {},
    check: null,
  },
  {
    id: 'C-PLUMBING',
    pack: 'code',
    discipline: 'mechanical',
    ref: 'SBC 701',
    params: {},
    check: null,
  },
];

/** Runs every rule. Zoning: passed/failed. Code: passed/failed only when an engineer verified the parameters. */
export function runRules(ctx: RuleContext, overrides: RuleOverrides = {}): RuleResult[] {
  return RULES.map((r) => {
    const o = overrides[r.id];
    const params = { ...r.params, ...(o?.params ?? {}) };
    const verified = r.pack === 'zoning' || !!o?.verifiedBy;
    const base = {
      id: r.id,
      pack: r.pack,
      discipline: r.discipline,
      ref: r.ref,
      clause: o?.clause,
      params,
      verified,
    };
    if (!r.check) return { ...base, status: 'not_checked' as const, rooms: [] };
    const out = r.check(ctx, params);
    if (!verified)
      return {
        ...base,
        status: 'not_checked' as const,
        preview: out.ok ? ('would_pass' as const) : ('would_fail' as const),
        rooms: out.rooms ?? [],
        value: out.value,
      };
    return {
      ...base,
      status: out.ok ? ('passed' as const) : ('failed' as const),
      rooms: out.rooms ?? [],
      value: out.value,
    };
  });
}

export function summarize(results: RuleResult[]) {
  const s = { checked: 0, passed: 0, failed: 0, notChecked: 0 };
  for (const r of results) {
    if (r.status === 'not_checked') s.notChecked++;
    else {
      s.checked++;
      if (r.status === 'passed') s.passed++;
      else s.failed++;
    }
  }
  return s;
}
