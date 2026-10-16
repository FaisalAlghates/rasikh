import { exteriorEdges } from './layout.js';
import { HABITABLE, WET, type DesignPlan, type PlanRoom } from './schemas.js';

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

type Edge = 'front' | 'back' | 'left' | 'right';

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
 * Doors open onto the corridor (or the entrance hall, or the largest neighbour); windows sit centred on each
 * outside wall of habitable and wet rooms; the entrance gets the front door. Deterministic.
 */
/**
 * The room a room's door opens into: the corridor, else the entrance hall, else its largest neighbour. The drawings,
 * the 3D model and the access check all use this one rule.
 */
export function doorTarget(r: PlanRoom, sameFloor: PlanRoom[]): PlanRoom | undefined {
  const same = sameFloor.filter((o) => o.id !== r.id);
  return (
    same.find((o) => o.type === 'corridor' && sharedEdge(r, o)) ??
    same.find((o) => o.type === 'entrance' && sharedEdge(r, o)) ??
    [...same].sort((a, b) => b.w * b.h - a.w * a.h).find((o) => sharedEdge(r, o))
  );
}

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

  for (const r of plan.rooms) {
    if (r.type === 'corridor' || r.type === 'elevator') continue;
    const same = plan.rooms.filter((o) => o.floor === r.floor && o.id !== r.id);
    if (r.type === 'entrance' && r.floor === 0) {
      push('entry', r, segment(r, 'front', 1.4), 0, 2.4);
    }
    // the separate guest entrance: straight from outside into the men's majlis, on the street facade
    if (
      plan.guestEntry &&
      r.type === 'majlis_men' &&
      r.floor === 0 &&
      Math.abs(r.y - plan.footprint.y) < 0.05
    )
      push('entry', r, segment(r, 'front', 1.2), 0, 2.4);
    if (r.type !== 'stair' || r.floor >= 0) {
      const target = doorTarget(r, same);
      const edge = target ? sharedEdge(r, target) : null;
      if (edge && r.type !== 'entrance')
        push('door', r, segment(r, edge, r.type === 'stair' ? 1.2 : 0.9, 0.3), 0, 2.2);
    }
    if (
      HABITABLE.includes(r.type) ||
      WET.includes(r.type) ||
      r.type === 'apartment' ||
      r.type === 'shop'
    ) {
      const wet = WET.includes(r.type);
      for (const edge of exteriorEdges(r, plan.footprint)) {
        if (r.type === 'entrance') continue;
        push(
          'window',
          r,
          segment(r, edge, wet ? 0.6 : r.type === 'shop' ? 3 : 1.6),
          wet ? 1.6 : 0.9,
          wet ? 2.2 : 2.3,
        );
      }
    }
  }
  return out;
}

export const openingWidth = (o: Opening) => Math.hypot(o.x2 - o.x1, o.y2 - o.y1);

/** Window area over outside wall area (for the energy check and the office's review). */
export function windowToWallRatio(plan: DesignPlan, openings = openingsOf(plan)): number {
  const perimeter = 2 * (plan.footprint.w + plan.footprint.h);
  const wall = perimeter * plan.floorHeight * plan.floors;
  const win = openings
    .filter((o) => o.kind === 'window')
    .reduce((s, o) => s + openingWidth(o) * (o.head - o.sill), 0);
  return wall > 0 ? win / wall : 0;
}
