import type { DesignPlan, PlanRoom, Rect, RoomType, Side } from './schemas.js';

/**
 * Plan geometry that does not assume one rectangular block: open spaces (a courtyard, a roof terrace, a garden
 * between two blocks) are rooms of their own type, and a room's outside walls are the parts of its sides that no
 * built room on the same floor covers (the street, a yard, a courtyard or a terrace).
 */

/** Spaces open to the sky: never built-up area, no walls of their own; the rooms around them see daylight. */
export const OPEN_TYPES: readonly RoomType[] = ['courtyard', 'terrace'];
export const isOpen = (t: RoomType) => OPEN_TYPES.includes(t);

export const area = (r: Rect) => r.w * r.h;

/** A stretch of a room's side, from–to along the side (x for front/back, y for left/right). */
export interface Run {
  side: Side;
  from: number;
  to: number;
}

const EPS = 0.05;

/** The stretches of a side that a built neighbour covers. */
function covered(r: Rect, side: Side, others: Rect[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const o of others) {
    let touches = false;
    if (side === 'front') touches = Math.abs(o.y + o.h - r.y) < EPS;
    else if (side === 'back') touches = Math.abs(o.y - (r.y + r.h)) < EPS;
    else if (side === 'left') touches = Math.abs(o.x + o.w - r.x) < EPS;
    else touches = Math.abs(o.x - (r.x + r.w)) < EPS;
    if (!touches) continue;
    const [a, b] = side === 'front' || side === 'back' ? [r.x, r.x + r.w] : [r.y, r.y + r.h];
    const [oa, ob] = side === 'front' || side === 'back' ? [o.x, o.x + o.w] : [o.y, o.y + o.h];
    const lo = Math.max(a, oa);
    const hi = Math.min(b, ob);
    if (hi - lo > EPS) out.push([lo, hi]);
  }
  return out.sort((p, q) => p[0] - q[0]);
}

/** The outside stretches of every side of a room (not covered by a built room on the same floor). */
export function freeRuns(r: PlanRoom, sameFloor: readonly PlanRoom[]): Run[] {
  const others = sameFloor.filter((o) => o.id !== r.id && o.floor === r.floor && !isOpen(o.type));
  const runs: Run[] = [];
  for (const side of ['front', 'back', 'left', 'right'] as const) {
    const [a, b] = side === 'front' || side === 'back' ? [r.x, r.x + r.w] : [r.y, r.y + r.h];
    let at = a;
    for (const [lo, hi] of covered(r, side, others)) {
      if (lo - at > EPS) runs.push({ side, from: at, to: lo });
      at = Math.max(at, hi);
    }
    if (b - at > EPS) runs.push({ side, from: at, to: b });
  }
  return runs;
}

/** Sides with an outside stretch at least `min` long (room for a window). */
export function outsideSides(r: PlanRoom, sameFloor: readonly PlanRoom[], min = 0.9): Side[] {
  const sides = new Set<Side>();
  for (const run of freeRuns(r, sameFloor))
    if (run.to - run.from >= min - 1e-6) sides.add(run.side);
  return [...sides];
}

/** The rooms of one floor. */
export const onFloor = (plan: Pick<DesignPlan, 'rooms'>, f: number) =>
  plan.rooms.filter((r) => r.floor === f);

/** The bounding box of a floor's built rooms (undefined when the floor has none). */
export function floorBox(plan: Pick<DesignPlan, 'rooms'>, f: number): Rect | undefined {
  const built = onFloor(plan, f).filter((r) => !isOpen(r.type));
  if (built.length === 0) return undefined;
  const x = Math.min(...built.map((r) => r.x));
  const y = Math.min(...built.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...built.map((r) => r.x + r.w)) - x,
    h: Math.max(...built.map((r) => r.y + r.h)) - y,
  };
}

/** Built area of a floor: the box of its built rooms less the open spaces inside it. */
export function floorArea(plan: Pick<DesignPlan, 'rooms'>, f: number): number {
  const box = floorBox(plan, f);
  if (!box) return 0;
  let open = 0;
  for (const r of onFloor(plan, f).filter((x) => isOpen(x.type))) {
    const w = Math.min(r.x + r.w, box.x + box.w) - Math.max(r.x, box.x);
    const h = Math.min(r.y + r.h, box.y + box.h) - Math.max(r.y, box.y);
    if (w > 0 && h > 0) open += w * h;
  }
  return area(box) - open;
}

/** Built-up area: every floor's built area. */
export function builtUpArea(plan: Pick<DesignPlan, 'rooms' | 'floors'>): number {
  let s = 0;
  for (let f = 0; f < plan.floors; f++) s += floorArea(plan, f);
  return s;
}

/** Ground coverage: the ground floor's built area. */
export const coveredArea = (plan: Pick<DesignPlan, 'rooms'>) => floorArea(plan, 0);

/** Courtyards enclosed on at least three sides by built rooms (courts that rooms take daylight from). */
export function innerCourts(plan: Pick<DesignPlan, 'rooms'>): PlanRoom[] {
  return plan.rooms.filter((r) => {
    if (r.type !== 'courtyard') return false;
    const same = onFloor(plan, r.floor);
    const runs = freeRuns(r, same);
    let enclosed = 0;
    for (const side of ['front', 'back', 'left', 'right'] as const) {
      const len = side === 'front' || side === 'back' ? r.w : r.h;
      const free = runs.filter((x) => x.side === side).reduce((t, x) => t + (x.to - x.from), 0);
      if (free <= len / 2) enclosed++;
    }
    return enclosed >= 3;
  });
}
