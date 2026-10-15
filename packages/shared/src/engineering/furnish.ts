import { openingsOf, type Opening } from './openings.js';
import type { DesignPlan, PlanRoom, RoomType } from './schemas.js';

/**
 * Deterministic furniture placer for the "furnished" view. A style preset chooses the look; this decides where
 * pieces go so no item blocks a door, a window or the walkway. Furniture lives on its own layer: it never changes
 * the plan or the code checks, and it is never exported to permit drawings.
 */

export interface Piece {
  id: string;
  roomId: string;
  floor: number;
  kind:
    'bed' | 'sofa' | 'table' | 'chair' | 'counter' | 'wardrobe' | 'wc' | 'basin' | 'shower' | 'tv';
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
}

/** What each room type gets, as [kind, width, depth, height] (m). */
const KIT: Partial<Record<RoomType, Array<[Piece['kind'], number, number, number]>>> = {
  master_bedroom: [
    ['bed', 1.8, 2.0, 0.5],
    ['wardrobe', 2.4, 0.6, 2.2],
  ],
  bedroom: [
    ['bed', 1.2, 2.0, 0.5],
    ['wardrobe', 1.6, 0.6, 2.2],
  ],
  maid_room: [['bed', 0.9, 1.9, 0.5]],
  driver_room: [['bed', 0.9, 1.9, 0.5]],
  majlis_men: [
    ['sofa', 3.2, 0.8, 0.8],
    ['sofa', 3.2, 0.8, 0.8],
    ['table', 1.2, 0.6, 0.4],
  ],
  majlis_women: [
    ['sofa', 2.8, 0.8, 0.8],
    ['sofa', 2.8, 0.8, 0.8],
    ['table', 1.0, 0.6, 0.4],
  ],
  living: [
    ['sofa', 2.6, 0.9, 0.8],
    ['tv', 1.8, 0.4, 0.6],
    ['table', 1.1, 0.6, 0.4],
  ],
  dining: [['table', 2.0, 1.0, 0.75]],
  kitchen: [['counter', 3.0, 0.6, 0.9]],
  bathroom: [
    ['wc', 0.4, 0.7, 0.4],
    ['basin', 0.6, 0.45, 0.85],
    ['shower', 0.9, 0.9, 0.05],
  ],
  guest_wc: [
    ['wc', 0.4, 0.7, 0.4],
    ['basin', 0.5, 0.4, 0.85],
  ],
};

/** Keeps a clear zone in front of every door (and a walkway strip) free of furniture. */
const CLEAR = 0.9;

function blocked(
  x: number,
  y: number,
  w: number,
  d: number,
  keepOut: Array<[number, number, number, number]>,
) {
  return keepOut.some(([kx, ky, kw, kd]) => x < kx + kw && x + w > kx && y < ky + kd && y + d > ky);
}

function keepOutsFor(r: PlanRoom, ops: Opening[]): Array<[number, number, number, number]> {
  return ops
    .filter((o) => o.roomId === r.id || (o.kind !== 'window' && o.floor === r.floor))
    .map((o) => {
      const minX = Math.min(o.x1, o.x2) - (o.kind === 'window' ? 0 : 0.2);
      const minY = Math.min(o.y1, o.y2) - (o.kind === 'window' ? 0 : 0.2);
      const w = Math.abs(o.x2 - o.x1) || CLEAR;
      const d = Math.abs(o.y2 - o.y1) || CLEAR;
      // a door needs a clear square in front of it; a window only its own sill strip
      const reach = o.kind === 'window' ? 0.35 : CLEAR;
      return [
        minX - (w === CLEAR ? reach / 2 : 0),
        minY - (d === CLEAR ? reach / 2 : 0),
        w + (w === CLEAR ? reach : 0.4),
        d + (d === CLEAR ? reach : 0.4),
      ];
    });
}

/** Places each room's kit along its walls, trying every wall and both orientations, skipping kept-out zones. */
export function furnish(plan: DesignPlan): Piece[] {
  const ops = openingsOf(plan);
  const out: Piece[] = [];
  let n = 0;
  for (const r of plan.rooms) {
    const kit = KIT[r.type];
    if (!kit) continue;
    const keep = keepOutsFor(r, ops);
    const placed: Array<[number, number, number, number]> = [];
    for (const [kind, w0, d0] of kit) {
      const h = kit.find((k) => k[0] === kind)?.[3] ?? 0.5;
      let done = false;
      for (const [w, d] of [
        [w0, d0],
        [d0, w0],
      ] as Array<[number, number]>) {
        if (done || w > r.w - 0.2 || d > r.h - 0.2) continue;
        const candidates: Array<[number, number]> = [
          [r.x + 0.1, r.y + r.h - d - 0.1],
          [r.x + r.w - w - 0.1, r.y + r.h - d - 0.1],
          [r.x + 0.1, r.y + 0.1],
          [r.x + r.w - w - 0.1, r.y + 0.1],
          [r.x + (r.w - w) / 2, r.y + r.h - d - 0.1],
          [r.x + (r.w - w) / 2, r.y + 0.1],
          [r.x + (r.w - w) / 2, r.y + (r.h - d) / 2],
        ];
        for (const [x, y] of candidates) {
          if (blocked(x, y, w, d, keep) || blocked(x, y, w, d, placed)) continue;
          const piece: Piece = {
            id: `p-${n + 1}`,
            roomId: r.id,
            floor: r.floor,
            kind,
            x,
            y,
            w,
            d,
            h,
          };
          if (blocksDoor(piece, plan, ops)) continue;
          n++;
          out.push(piece);
          placed.push([x, y, w, d]);
          done = true;
          break;
        }
      }
    }
  }
  return out;
}

/** True when a piece overlaps a door's clear zone (should never happen; used by tests and the clearance warning). */
export function blocksDoor(p: Piece, plan: DesignPlan, ops: Opening[] = openingsOf(plan)): boolean {
  return ops
    .filter((o) => o.kind !== 'window' && o.floor === p.floor)
    .some((o) => {
      const minX = Math.min(o.x1, o.x2);
      const maxX = Math.max(o.x1, o.x2);
      const minY = Math.min(o.y1, o.y2);
      const maxY = Math.max(o.y1, o.y2);
      const pad = 0.3;
      return (
        p.x < maxX + pad && p.x + p.w > minX - pad && p.y < maxY + pad && p.y + p.d > minY - pad
      );
    });
}
