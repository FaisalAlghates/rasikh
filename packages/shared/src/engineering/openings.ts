import { freeRuns, isOpen, onFloor, type Run } from './geometry.js';
import { HABITABLE, WET, type DesignPlan, type PlanRoom, type Side } from './schemas.js';

/** A door or window on one edge of a room, in plot coordinates (a segment) with its height. */
export interface Opening {
  id: string;
  kind: 'door' | 'window' | 'entry';
  roomId: string;
  floor: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Bottom and top above the floor (m). */
  sill: number;
  head: number;
}

type Edge = Side;

function segment(
  r: PlanRoom,
  edge: Edge,
  width: number,
  at = 0.5,
): [number, number, number, number] {
  const w = Math.min(width, (edge === 'front' || edge === 'back' ? r.w : r.h) - 0.3);
  if (edge === 'front' || edge === 'back') {
    const y = edge === 'front' ? r.y : r.y + r.h;
    const c = r.x + r.w * at;
    return [c - w / 2, y, c + w / 2, y];
  }
  const x = edge === 'left' ? r.x : r.x + r.w;
  const c = r.y + r.h * at;
  return [x, c - w / 2, x, c + w / 2];
}

/** A segment centred in an outside stretch of a side. */
function inRun(r: PlanRoom, run: Run, width: number): [number, number, number, number] {
  const w = Math.min(width, run.to - run.from - 0.3);
  const c = (run.from + run.to) / 2;
  if (run.side === 'front' || run.side === 'back') {
    const y = run.side === 'front' ? r.y : r.y + r.h;
    return [c - w / 2, y, c + w / 2, y];
  }
  const x = run.side === 'left' ? r.x : r.x + r.w;
  return [x, c - w / 2, x, c + w / 2];
}

/** Edge of `r` shared with `o` (they touch), if any. */
function sharedEdge(r: PlanRoom, o: PlanRoom): Edge | null {
  const eps = 0.05;
  const overlapX = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
  const overlapY = Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y);
  if (overlapX > 0.9 && Math.abs(r.y - (o.y + o.h)) < eps) return 'front';
  if (overlapX > 0.9 && Math.abs(r.y + r.h - o.y) < eps) return 'back';
  if (overlapY > 0.9 && Math.abs(r.x - (o.x + o.w)) < eps) return 'left';
  if (overlapY > 0.9 && Math.abs(r.x + r.w - o.x) < eps) return 'right';
  return null;
}

/**
 * The room a room's door opens into: the corridor, else the entrance hall, else its largest built neighbour (never
 * an open courtyard or terrace). The drawings, the 3D model and the access check all use this one rule.
 */
export function doorTarget(r: PlanRoom, sameFloor: PlanRoom[]): PlanRoom | undefined {
  const same = sameFloor.filter((o) => o.id !== r.id && !isOpen(o.type));
  return (
    same.find((o) => o.type === 'corridor' && sharedEdge(r, o)) ??
    same.find((o) => o.type === 'entrance' && sharedEdge(r, o)) ??
    [...same].sort((a, b) => b.w * b.h - a.w * a.h).find((o) => sharedEdge(r, o))
  );
}

/** Rooms with their own door from outside: the entrance hall, and the men's majlis when it has a guest entrance. */
export function hasOwnEntry(plan: DesignPlan, r: PlanRoom): boolean {
  if (r.floor !== 0) return false;
  if (r.type === 'entrance') return true;
  return (
    !!plan.guestEntry &&
    r.type === 'majlis_men' &&
    freeRuns(r, onFloor(plan, 0)).some((x) => x.side === 'front' && x.to - x.from >= 1.5)
  );
}

/** Window width by style: narrow Najdi openings, wide contemporary glazing. */
const WINDOW_W: Record<NonNullable<DesignPlan['style']>, number> = {
  modern_najdi: 1.2,
  salmani: 1.4,
  classic: 1.4,
  contemporary: 2.2,
};

/** Rooms that open onto a terrace or a ground-floor courtyard, best first. */
const OPENS_ONTO: readonly PlanRoom['type'][] = [
  'corridor',
  'stair',
  'annex_room',
  'living',
  'majlis_men',
  'majlis_women',
  'dining',
  'master_bedroom',
  'bedroom',
  'guest_room',
];

/**
 * Doors open onto the corridor (or the entrance hall, or the largest neighbour); windows sit centred in the outside
 * stretches of habitable and wet rooms (to the street, a yard, a courtyard or a terrace); the entrance gets the front
 * door; a terrace and a ground-floor courtyard get a door from the best room beside them. Deterministic.
 */
export function openingsOf(plan: DesignPlan): Opening[] {
  const out: Opening[] = [];
  let n = 0;
  const push = (
    kind: Opening['kind'],
    r: PlanRoom,
    seg: [number, number, number, number],
    sill: number,
    head: number,
  ) =>
    out.push({
      id: `${kind}-${++n}`,
      kind,
      roomId: r.id,
      floor: r.floor,
      x1: seg[0],
      y1: seg[1],
      x2: seg[2],
      y2: seg[3],
      sill,
      head,
    });
  const winW = WINDOW_W[plan.style ?? 'modern_najdi'];

  for (const r of plan.rooms) {
    if (r.type === 'corridor' || r.type === 'elevator' || isOpen(r.type)) continue;
    const same = onFloor(plan, r.floor);
    const runs = freeRuns(r, same);
    const own = hasOwnEntry(plan, r);
    if (own) {
      // the front door on the longest outside stretch of the front (the street, or the garden before the house)
      const front = runs
        .filter((x) => x.side === 'front')
        .sort((a, b) => b.to - b.from - (a.to - a.from))[0];
      push(
        'entry',
        r,
        front ? inRun(r, front, r.type === 'entrance' ? 1.4 : 1.2) : segment(r, 'front', 1.4),
        0,
        2.4,
      );
    }
    const target = doorTarget(r, same);
    const edge = target ? sharedEdge(r, target) : null;
    // a room with its own door from outside needs no inner door unless it opens onto the corridor or hall
    const inner =
      edge &&
      r.type !== 'entrance' &&
      (!own || target!.type === 'corridor' || target!.type === 'entrance');
    if (inner) push('door', r, segment(r, edge, r.type === 'stair' ? 1.2 : 0.9, 0.3), 0, 2.2);
    if (
      HABITABLE.includes(r.type) ||
      WET.includes(r.type) ||
      r.type === 'apartment' ||
      r.type === 'shop' ||
      r.type === 'hall' ||
      r.type === 'reception'
    ) {
      const wet = WET.includes(r.type);
      // one window per outside side, in its longest stretch
      const best = new Map<Side, Run>();
      for (const run of runs) {
        const cur = best.get(run.side);
        if (!cur || run.to - run.from > cur.to - cur.from) best.set(run.side, run);
      }
      for (const run of best.values()) {
        if (r.type === 'entrance' || run.to - run.from < 0.9) continue;
        // a long wall gets a row of windows, about one every 2.6 m (a WC or a shop front keeps one)
        const len = run.to - run.from;
        const n = wet || r.type === 'shop' ? 1 : Math.max(1, Math.round(len / 2.6));
        // a habitable room's windows reach a tenth of its floor in glass where the wall allows (wider windows)
        const need = HABITABLE.includes(r.type) ? (0.1 * r.w * r.h) / (best.size * n * 1.4) : 0;
        const w = wet ? 0.6 : r.type === 'shop' ? 3 : Math.min(Math.max(winW, need), len / n - 0.4);
        for (let k = 0; k < n; k++) {
          const from = run.from + (len * k) / n;
          push(
            'window',
            r,
            inRun(r, { side: run.side, from, to: from + len / n }, w),
            wet ? 1.6 : 0.9,
            wet ? 2.2 : 2.3,
          );
        }
      }
    }
  }

  // a terrace, and a courtyard you can walk into, get a glazed door from the best room beside them
  for (const o of plan.rooms.filter(
    (x) => x.type === 'terrace' || (x.type === 'courtyard' && x.floor === 0),
  )) {
    const beside = onFloor(plan, o.floor)
      .filter((r) => !isOpen(r.type) && OPENS_ONTO.includes(r.type) && sharedEdge(r, o))
      .sort((a, b) => OPENS_ONTO.indexOf(a.type) - OPENS_ONTO.indexOf(b.type));
    const from = beside[0];
    if (!from) continue;
    const edge = sharedEdge(from, o)!;
    // the door sits in the stretch the two share
    const horizontal = edge === 'front' || edge === 'back';
    const lo = horizontal ? Math.max(from.x, o.x) : Math.max(from.y, o.y);
    const hi = horizontal
      ? Math.min(from.x + from.w, o.x + o.w)
      : Math.min(from.y + from.h, o.y + o.h);
    push('door', from, inRun(from, { side: edge, from: lo, to: hi }, 1.2), 0, 2.4);
  }
  return out;
}

export const openingWidth = (o: Opening) => Math.hypot(o.x2 - o.x1, o.y2 - o.y1);

/** Length of a floor's outside walls: every built room's outside stretches. */
export function outsideWallLength(plan: DesignPlan, f: number): number {
  const same = onFloor(plan, f);
  return same
    .filter((r) => !isOpen(r.type))
    .reduce((s, r) => s + freeRuns(r, same).reduce((t, x) => t + (x.to - x.from), 0), 0);
}

/** Window area over outside wall area (for the energy check and the office's review). */
export function windowToWallRatio(plan: DesignPlan, openings = openingsOf(plan)): number {
  let perimeter = 0;
  for (let f = 0; f < plan.floors; f++) perimeter += outsideWallLength(plan, f);
  const wall = perimeter * plan.floorHeight;
  const win = openings
    .filter((o) => o.kind === 'window')
    .reduce((s, o) => s + openingWidth(o) * (o.head - o.sill), 0);
  return wall > 0 ? win / wall : 0;
}
