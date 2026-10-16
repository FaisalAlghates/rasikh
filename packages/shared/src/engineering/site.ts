import { isOpen, onFloor } from './geometry.js';
import { hasOwnEntry } from './openings.js';
import type { DesignPlan, Program, Rect, SiteItem } from './schemas.js';

/**
 * Site elements in the yards: parking bays by the street and a pool, placed deterministically after the building.
 * A clear walkway is kept from the street to the entrance (and to the guest entrance). Sizes are starting values the
 * office adjusts; whether parking may sit in a setback is the office's call under the city's regulations.
 */

/** A parking bay (m): 2.5 wide, 5.5 long; perpendicular to the street when the yard is deep enough, else parallel. */
export const BAY = { w: 2.5, l: 5.5 };
/** Pool sizes tried, largest first (m), and the clear deck kept around it to walls and boundaries. */
export const POOL_SIZES: Array<[number, number]> = [
  [8, 4],
  [7, 3.5],
  [6, 3],
];
export const POOL_CLEAR = 1.2;
/** Width kept free in front of an entrance door, from the street to the facade (m). */
export const WALKWAY = 1.5;

const round = (n: number) => Math.round(n * 100) / 100;
const overlaps = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.w + gap - 1e-6 &&
  b.x < a.x + a.w + gap - 1e-6 &&
  a.y < b.y + b.h + gap - 1e-6 &&
  b.y < a.y + a.h + gap - 1e-6;

/** The open yards around the footprint: front, back, left and right (zero-size ones dropped). */
export function yards(plan: Pick<DesignPlan, 'plot' | 'footprint'>) {
  const { width: W, depth: D } = plan.plot;
  const fp = plan.footprint;
  return {
    front: { x: 0, y: 0, w: W, h: fp.y },
    back: { x: 0, y: fp.y + fp.h, w: W, h: D - (fp.y + fp.h) },
    left: { x: 0, y: fp.y, w: fp.x, h: fp.h },
    right: { x: fp.x + fp.w, y: fp.y, w: W - (fp.x + fp.w), h: fp.h },
  };
}

/** Walkways from the street to the entrance hall and, when asked for, to the guest entrance of the men's majlis. */
export function walkways(plan: DesignPlan): Rect[] {
  const fp = plan.footprint;
  const ground = onFloor(plan, 0);
  const atFront = (r: Rect) => Math.abs(r.y - fp.y) < 0.05;
  const doors: Rect[] = [];
  for (const r of ground.filter((x) => hasOwnEntry(plan, x))) {
    if (atFront(r)) doors.push(r);
    else {
      // a door behind a front block (the house behind a guest pavilion): the way in crosses the open ground that
      // reaches the street
      const pass = ground.find((o) => isOpen(o.type) && atFront(o));
      if (pass && !doors.includes(pass)) doors.push(pass);
    }
  }
  // an apartment building or shop front without an entrance hall: the walkway leads to the stair core
  const targets = doors.length
    ? doors
    : plan.rooms
        .filter((r) => r.floor === 0 && (r.type === 'stair' || r.type === 'shop'))
        .slice(0, 1);
  return targets.map((r) => {
    const c = r.x + r.w / 2;
    const w = Math.max(WALKWAY, Math.min(r.w, 2.4));
    return { x: round(c - w / 2), y: 0, w: round(w), h: fp.y };
  });
}

/** Bays along a strip, skipping blocked ranges; `along` is the axis cars line up on. */
function bayRow(
  strip: Rect,
  along: 'x' | 'y',
  size: { a: number; b: number },
  blocked: Rect[],
  max: number,
): Rect[] {
  const out: Rect[] = [];
  let t = along === 'x' ? strip.x : strip.y;
  const end = along === 'x' ? strip.x + strip.w : strip.y + strip.h;
  while (out.length < max && t + size.a <= end + 1e-6) {
    const r =
      along === 'x'
        ? { x: round(t), y: round(strip.y), w: size.a, h: size.b }
        : { x: round(strip.x), y: round(t), w: size.b, h: size.a };
    const hit = blocked.find((b) => overlaps(r, b));
    if (hit) {
      t = along === 'x' ? hit.x + hit.w : hit.y + hit.h;
      continue;
    }
    out.push(r);
    t += size.a;
  }
  return out;
}

/** Places the programme's parking bays and pool. Bays or a pool that do not fit are simply missing (see siteShortfall). */
export function placeSite(plan: DesignPlan, program: Program): SiteItem[] {
  const y = yards(plan);
  const walks = walkways(plan);
  const front = (blocked: Rect[]) =>
    y.front.h >= BAY.l - 1e-6
      ? bayRow({ ...y.front, h: BAY.l }, 'x', { a: BAY.w, b: BAY.l }, blocked, program.parking)
      : y.front.h >= BAY.w - 1e-6
        ? bayRow({ ...y.front, h: BAY.w }, 'x', { a: BAY.l, b: BAY.w }, blocked, program.parking)
        : [];
  // 1) the front yard, by the street: perpendicular bays when deep enough, else parallel ones
  let parking = program.parking > 0 ? front(walks) : [];
  const taken: Rect[] = [...walks];
  // 2) not enough: tandem bays down each side passage wide enough for a car, with its driveway through the front
  //    yard kept clear of front bays
  if (parking.length < program.parking) {
    const sides = [y.left, y.right].filter((sd) => sd.w >= BAY.w + 0.2);
    const lanes = sides.map((sd) => ({
      x: round(sd.x + (sd.w - BAY.w) / 2),
      y: 0,
      w: BAY.w,
      h: y.front.h,
    }));
    if (lanes.length) {
      taken.push(...lanes);
      parking = front(taken);
      sides.forEach((sd, i) => {
        const strip = { x: lanes[i]!.x, y: sd.y, w: BAY.w, h: sd.h };
        parking.push(
          ...bayRow(
            strip,
            'y',
            { a: BAY.l, b: BAY.w },
            [...taken, ...parking],
            program.parking - parking.length,
          ),
        );
      });
    }
  }
  taken.push(...parking);

  const items: SiteItem[] = parking.map((r, i) => ({
    ...r,
    id: `parking-${i + 1}`,
    type: 'parking',
  }));

  // 3) the pool: the back yard first (privacy), then the front yard, then a side passage
  if (program.pool) {
    const pool = placePool([y.back, y.front, y.left, y.right], taken);
    if (pool) items.push({ ...pool, id: 'pool-1', type: 'pool' });
  }
  return items;
}

function placePool(candidates: Rect[], taken: Rect[]): Rect | null {
  for (const yard of candidates) {
    const area = {
      x: yard.x + POOL_CLEAR,
      y: yard.y + POOL_CLEAR,
      w: yard.w - 2 * POOL_CLEAR,
      h: yard.h - 2 * POOL_CLEAR,
    };
    if (area.w <= 0 || area.h <= 0) continue;
    for (const [l, s] of POOL_SIZES)
      for (const [w, h] of [
        [l, s],
        [s, l],
      ] as const) {
        if (w > area.w + 1e-6 || h > area.h + 1e-6) continue;
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;
        const free = (r: Rect) => !taken.some((t) => overlaps(r, t, POOL_CLEAR));
        // the middle of the yard is usually free; otherwise a free spot starts against a yard edge or against an
        // obstacle (its edge plus the clearance), so only those positions are tried, nearest the middle first
        const middle = { x: round(cx - w / 2), y: round(cy - h / 2), w, h };
        if (free(middle)) return middle;
        const inX = (x: number) => x >= area.x - 1e-6 && x + w <= area.x + area.w + 1e-6;
        const inY = (y: number) => y >= area.y - 1e-6 && y + h <= area.y + area.h + 1e-6;
        const xs = [area.x, area.x + area.w - w, cx - w / 2]
          .concat(taken.flatMap((t) => [t.x + t.w + POOL_CLEAR, t.x - POOL_CLEAR - w]))
          .filter(inX);
        const ys = [area.y, area.y + area.h - h, cy - h / 2]
          .concat(taken.flatMap((t) => [t.y + t.h + POOL_CLEAR, t.y - POOL_CLEAR - h]))
          .filter(inY);
        const spots = xs
          .flatMap((x) => ys.map((y) => ({ x: round(x), y: round(y), w, h })))
          .sort(
            (p, q) =>
              Math.hypot(p.x + w / 2 - cx, p.y + h / 2 - cy) -
              Math.hypot(q.x + w / 2 - cx, q.y + h / 2 - cy),
          );
        const ok = spots.find(free);
        if (ok) return ok;
      }
  }
  return null;
}

/** What the brief asks for on the site that the plan does not have. */
export function siteShortfall(plan: DesignPlan, program: Program) {
  const site = plan.site ?? [];
  const parking = site.filter((s) => s.type === 'parking').length;
  const fp = plan.footprint;
  return {
    parking: Math.max(0, program.parking - parking),
    pool: program.pool && !site.some((s) => s.type === 'pool'),
    guestEntry:
      program.separateGuestEntry &&
      !(
        plan.guestEntry &&
        plan.rooms.some(
          (r) => r.floor === 0 && r.type === 'majlis_men' && Math.abs(r.y - fp.y) < 0.05,
        )
      ),
  };
}
