import { coolingLoads, electricalLoad } from './disciplines.js';
import { area, isOpen, outsideSides } from './geometry.js';
import { openingsOf } from './openings.js';
import { WET, type DesignPlan, type PlanRoom } from './schemas.js';

/**
 * Where the symbols of the electrical, mechanical and fire-safety sheets go. Deterministic starting points from the
 * rooms ("preliminary: the discipline engineer places and sizes the real devices"); every symbol sits inside its room.
 */
export type MepKind =
  | 'light'
  | 'socket'
  | 'db'
  | 'ac'
  | 'riser'
  | 'wc'
  | 'basin'
  | 'shower'
  | 'sink'
  | 'tap'
  | 'smoke'
  | 'callpoint'
  | 'extinguisher'
  | 'exitsign';

export interface MepSymbol {
  id: string;
  kind: MepKind;
  floor: number;
  roomId: string;
  x: number;
  y: number;
  /** AC capacity (TR), a stack or panel mark. */
  label?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const built = (plan: DesignPlan, f: number) =>
  plan.rooms.filter((r) => r.floor === f && !isOpen(r.type));

/** `n` points spread evenly over a room (cell centres of a grid that follows its proportions). */
function spread(r: PlanRoom, n: number): Array<[number, number]> {
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * r.w) / r.h))));
  const rows = Math.ceil(n / cols);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const row = Math.floor(i / cols);
    out.push([r2(r.x + ((c + 0.5) * r.w) / cols), r2(r.y + ((row + 0.5) * r.h) / rows)]);
  }
  return out;
}

/** `n` points along the walls, inset by `inset`, evenly along the perimeter. */
function alongWalls(r: PlanRoom, n: number, inset = 0.3): Array<[number, number]> {
  const w = r.w - 2 * inset;
  const h = r.h - 2 * inset;
  const per = 2 * (w + h);
  return Array.from({ length: n }, (_, i) => {
    let d = ((i + 0.5) / n) * per;
    if (d < w) return [r2(r.x + inset + d), r2(r.y + inset)] as [number, number];
    d -= w;
    if (d < h) return [r2(r.x + inset + w), r2(r.y + inset + d)] as [number, number];
    d -= h;
    if (d < w) return [r2(r.x + inset + w - d), r2(r.y + inset + h)] as [number, number];
    d -= w;
    return [r2(r.x + inset), r2(r.y + inset + h - d)] as [number, number];
  });
}

/** Lighting points, sockets and one distribution board per floor. */
export function electricalSymbols(plan: DesignPlan): MepSymbol[] {
  const out: MepSymbol[] = [];
  const points = new Map(electricalLoad(plan).points.map((p) => [p.roomId, p]));
  for (const r of plan.rooms) {
    if (isOpen(r.type)) continue;
    const p = points.get(r.id);
    if (!p) continue;
    spread(r, p.lights).forEach(([x, y], i) =>
      out.push({ id: `${r.id}-l${i}`, kind: 'light', floor: r.floor, roomId: r.id, x, y }),
    );
    alongWalls(r, p.sockets).forEach(([x, y], i) =>
      out.push({ id: `${r.id}-s${i}`, kind: 'socket', floor: r.floor, roomId: r.id, x, y }),
    );
  }
  for (let f = 0; f < plan.floors; f++) {
    const rooms = built(plan, f);
    const home =
      rooms.find((r) => r.type === 'storage') ??
      rooms.find((r) => r.type === 'corridor') ??
      rooms.find((r) => r.type === 'stair') ??
      rooms[0];
    if (home)
      out.push({
        id: `db-${f}`,
        kind: 'db',
        floor: f,
        roomId: home.id,
        x: r2(home.x + 0.4),
        y: r2(home.y + 0.4),
        label: f === 0 ? 'MDB' : `DB-${f}`,
      });
  }
  return out;
}

/** Air-conditioning units (by the cooling load), stacks for the wet rooms and their fixtures. */
export function mechanicalSymbols(plan: DesignPlan): MepSymbol[] {
  const out: MepSymbol[] = [];
  const byId = new Map(plan.rooms.map((r) => [r.id, r]));
  for (const row of coolingLoads(plan).rows) {
    const r = byId.get(row.roomId);
    if (!r) continue;
    const same = plan.rooms.filter((x) => x.floor === r.floor);
    const side = outsideSides(r, same, 0.9)[0] ?? 'back';
    const x = side === 'left' ? r.x + 0.3 : side === 'right' ? r.x + r.w - 0.3 : r.x + r.w / 2;
    const y = side === 'front' ? r.y + 0.3 : side === 'back' ? r.y + r.h - 0.3 : r.y + r.h / 2;
    out.push({
      id: `ac-${r.id}`,
      kind: 'ac',
      floor: r.floor,
      roomId: r.id,
      x: r2(x),
      y: r2(y),
      label: `${row.tr} TR`,
    });
  }
  // a stack where wet rooms stand above each other gets one mark on every floor it passes
  const stacks = new Map<string, string>();
  for (const r of plan.rooms.filter((x) => WET.includes(x.type) && !isOpen(x.type))) {
    const key = `${Math.round(r.x)}:${Math.round(r.y)}`;
    if (!stacks.has(key)) stacks.set(key, `S${stacks.size + 1}`);
    out.push({
      id: `riser-${r.id}`,
      kind: 'riser',
      floor: r.floor,
      roomId: r.id,
      x: r2(r.x + 0.35),
      y: r2(r.y + 0.35),
      label: stacks.get(key),
    });
    const fixtures: Record<string, string[]> = {
      bathroom: ['wc', 'basin', 'shower'],
      guest_wc: ['wc', 'basin'],
      kitchen: ['sink'],
      prep_kitchen: ['sink'],
      wc_men: ['wc', 'wc', 'basin'],
      wc_women: ['wc', 'wc', 'basin'],
      ablution: ['tap', 'tap', 'tap'],
      laundry: ['sink'],
    };
    const list = fixtures[r.type] ?? [];
    alongWalls(r, Math.max(list.length, 1), 0.45)
      .slice(0, list.length)
      .forEach(([x, y], i) =>
        out.push({
          id: `fx-${r.id}-${i}`,
          kind: list[i] as MepKind,
          floor: r.floor,
          roomId: r.id,
          x,
          y,
        }),
      );
  }
  return out;
}

/** Smoke detectors, manual call points, extinguishers and exit signs. */
export function safetySymbols(plan: DesignPlan): MepSymbol[] {
  const out: MepSymbol[] = [];
  const noDetector = new Set<string>([
    'bathroom',
    'guest_wc',
    'wc_men',
    'wc_women',
    'ablution',
    'closet',
  ]);
  for (const r of plan.rooms) {
    if (isOpen(r.type) || noDetector.has(r.type)) continue;
    // a corridor gets a detector every 8 m, a room one for each 40 m² (at least one)
    const n =
      r.type === 'corridor'
        ? Math.max(1, Math.ceil(Math.max(r.w, r.h) / 8))
        : Math.max(1, Math.ceil(area(r) / 40));
    const pts =
      r.type === 'corridor'
        ? Array.from({ length: n }, (_, i): [number, number] =>
            r.w >= r.h
              ? [r2(r.x + ((i + 0.5) * r.w) / n), r2(r.y + r.h / 2)]
              : [r2(r.x + r.w / 2), r2(r.y + ((i + 0.5) * r.h) / n)],
          )
        : spread(r, n);
    pts.forEach(([x, y], i) =>
      out.push({ id: `sd-${r.id}-${i}`, kind: 'smoke', floor: r.floor, roomId: r.id, x, y }),
    );
  }
  for (let f = 0; f < plan.floors; f++) {
    const exits: Array<{ x: number; y: number; roomId: string }> = built(plan, f)
      .filter((r) => r.type === 'stair')
      .map((r) => ({ x: r2(r.x + r.w / 2), y: r2(r.y + 0.35), roomId: r.id }));
    if (f === 0)
      for (const o of openingsOf(plan).filter((x) => x.floor === 0 && x.kind === 'entry'))
        exits.push({ x: r2((o.x1 + o.x2) / 2), y: r2((o.y1 + o.y2) / 2), roomId: o.roomId });
    exits.forEach((e, i) => {
      out.push({ id: `exit-${f}-${i}`, kind: 'exitsign', floor: f, ...e });
      out.push({ id: `call-${f}-${i}`, kind: 'callpoint', floor: f, ...e, x: r2(e.x + 0.5) });
      out.push({ id: `ext-${f}-${i}`, kind: 'extinguisher', floor: f, ...e, x: r2(e.x - 0.5) });
    });
    for (const k of built(plan, f).filter((r) => r.type === 'kitchen' || r.type === 'prep_kitchen'))
      out.push({
        id: `ext-k-${k.id}`,
        kind: 'extinguisher',
        floor: f,
        roomId: k.id,
        x: r2(k.x + 0.4),
        y: r2(k.y + k.h - 0.4),
      });
  }
  return out;
}

/** Counts of each symbol on one floor, for the legend. */
export function countSymbols(symbols: readonly MepSymbol[], floor: number) {
  const out: Partial<Record<MepKind, number>> = {};
  for (const s of symbols) if (s.floor === floor) out[s.kind] = (out[s.kind] ?? 0) + 1;
  return out;
}
