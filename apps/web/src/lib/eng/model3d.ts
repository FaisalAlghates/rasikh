import {
  freeRuns,
  isOpen,
  onFloor,
  openingsOf,
  sunPosition,
  type DesignPlan,
  type Opening,
  type Piece,
  type PlanRoom,
} from '@rasikh/shared';
import * as THREE from 'three';

/**
 * The 3D model of a plan (three.js): walls with door and window openings, slabs under every room, roofs and parapets
 * wherever nothing is built above (the top floor, a terrace, the roof around an annex, a guest pavilion), courtyards
 * open to the sky, parapet details by style (Najdi crenellation, a classic cornice, a contemporary pergola), a
 * dollhouse cut by floor, an optional furniture layer and the real sun for a date and hour at the plot. Same geometry
 * as the drawings.
 * Plot x → three x, plot y (into the depth) → three −z, height → y.
 */

const WALL = 0.2;
const COLORS = {
  wall: 0xe9dcc8,
  ext: 0xc9a27e,
  slab: 0xd8cfc2,
  glass: 0x8fb3cf,
  furniture: 0xb89b7d,
  ground: 0xe2d6c2,
  water: 0x6fa8c2,
  paving: 0xcfc6b8,
  court: 0xb9cfa3,
  terrace: 0xe8dcc4,
  pergola: 0x8c6a4e,
};

type Seg = { a: number; b: number };

/** Splits a wall run [a, b] around openings into solid pieces, plus the openings themselves. */
function cut(
  a: number,
  b: number,
  holes: Array<{ a: number; b: number; sill: number; head: number }>,
) {
  const solid: Seg[] = [];
  let x = a;
  for (const h of [...holes].sort((p, q) => p.a - q.a)) {
    if (h.a > x) solid.push({ a: x, b: h.a });
    x = Math.max(x, h.b);
  }
  if (x < b) solid.push({ a: x, b });
  return solid;
}

/** The walls of one floor: every room edge, de-duplicated, with openings cut out. */
function floorWalls(plan: DesignPlan, floor: number, ops: Opening[]) {
  const edges = new Map<
    string,
    { horiz: boolean; c: number; a: number; b: number; ext: boolean }
  >();
  const same = onFloor(plan, floor);
  const add = (horiz: boolean, c: number, a: number, b: number, ext: boolean) => {
    const k = `${horiz ? 'h' : 'v'}${c.toFixed(2)}:${a.toFixed(2)}:${b.toFixed(2)}`;
    const e = edges.get(k);
    if (!e) edges.set(k, { horiz, c, a, b, ext });
    else if (ext) e.ext = true;
  };
  // an outside wall faces the street, a yard, a courtyard or a terrace (no built room on that side)
  for (const r of same.filter((x) => !isOpen(x.type))) {
    const free = new Set(
      freeRuns(r, same)
        .filter((x) => x.to - x.from > 0.3)
        .map((x) => x.side),
    );
    add(true, r.y, r.x, r.x + r.w, free.has('front'));
    add(true, r.y + r.h, r.x, r.x + r.w, free.has('back'));
    add(false, r.x, r.y, r.y + r.h, free.has('left'));
    add(false, r.x + r.w, r.y, r.y + r.h, free.has('right'));
  }
  return [...edges.values()].map((e) => {
    const holes = ops
      .filter((o) => o.floor === floor)
      .filter((o) =>
        e.horiz
          ? Math.abs(o.y1 - e.c) < 0.05 &&
            Math.abs(o.y2 - e.c) < 0.05 &&
            o.x1 >= e.a - 0.05 &&
            o.x2 <= e.b + 0.05
          : Math.abs(o.x1 - e.c) < 0.05 &&
            Math.abs(o.x2 - e.c) < 0.05 &&
            o.y1 >= e.a - 0.05 &&
            o.y2 <= e.b + 0.05,
      )
      .map((o) => ({
        a: e.horiz ? Math.min(o.x1, o.x2) : Math.min(o.y1, o.y2),
        b: e.horiz ? Math.max(o.x1, o.x2) : Math.max(o.y1, o.y2),
        sill: o.sill,
        head: o.head,
        kind: o.kind,
      }));
    return { ...e, holes };
  });
}

export interface BuildOptions {
  floorsShown: number;
  furniture?: Piece[];
  /** Highlight (clay) for one room. */
  selectedId?: string;
}

export function buildModel(plan: DesignPlan, opts: BuildOptions): THREE.Group {
  const g = new THREE.Group();
  g.name = 'rasikh-plan';
  const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const wallMat = mat(COLORS.wall);
  const extMat = mat(COLORS.ext);
  const slabMat = mat(COLORS.slab);
  const glassMat = mat(COLORS.glass, { transparent: true, opacity: 0.45, roughness: 0.1 });
  const ops = openingsOf(plan);

  // ground (the plot)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(plan.plot.width, plan.plot.depth),
    mat(COLORS.ground),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(plan.plot.width / 2, -0.01, -plan.plot.depth / 2);
  ground.receiveShadow = true;
  ground.name = 'plot';
  g.add(ground);

  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    name = '',
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d)),
      m,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    g.add(mesh);
    return mesh;
  };

  // the site: water in the pool with its coping, and paved parking bays
  for (const s of plan.site ?? []) {
    const cx = s.x + s.w / 2;
    const cz = -(s.y + s.h / 2);
    if (s.type === 'pool') {
      box(s.w + 0.6, 0.06, s.h + 0.6, mat(0xe9e1d3), cx, 0.03, cz, 'pool-coping');
      box(
        s.w,
        0.07,
        s.h,
        mat(COLORS.water, { roughness: 0.1, metalness: 0.1 }),
        cx,
        0.04,
        cz,
        'pool',
      );
    } else box(s.w - 0.1, 0.03, s.h - 0.1, mat(COLORS.paving), cx, 0.015, cz, 'parking');
  }

  const shown = Math.max(1, Math.min(plan.floors, opts.floorsShown));
  for (let f = 0; f < shown; f++) {
    const base = f * plan.floorHeight;
    const h = plan.floorHeight - 0.25;
    // a slab under every built room; a courtyard is planted ground, a terrace a paved roof
    for (const r of onFloor(plan, f)) {
      const cx = r.x + r.w / 2;
      const cz = -(r.y + r.h / 2);
      if (r.type === 'courtyard') {
        if (f === 0) box(r.w, 0.04, r.h, mat(COLORS.court), cx, 0.02, cz, 'courtyard');
      } else if (r.type === 'terrace')
        box(r.w, 0.03, r.h, mat(COLORS.terrace), cx, base + 0.015, cz, 'terrace');
      else box(r.w, 0.25, r.h, slabMat, cx, base + 0.125, cz, `slab-${f}`);
    }
    for (const w of floorWalls(plan, f, ops)) {
      const m = w.ext ? extMat : wallMat;
      const t = w.ext ? WALL * 1.4 : WALL;
      const along = (a: number, b: number, y0: number, y1: number) => {
        const len = b - a;
        const mid = (a + b) / 2;
        const hh = y1 - y0;
        if (len <= 0.01 || hh <= 0.01) return;
        if (w.horiz) box(len, hh, t, m, mid, base + 0.25 + y0 + hh / 2, -w.c);
        else box(t, hh, len, m, w.c, base + 0.25 + y0 + hh / 2, -mid);
      };
      for (const s of cut(w.a, w.b, w.holes)) along(s.a, s.b, 0, h);
      // above and below openings, and glass in windows
      for (const o of w.holes) {
        along(o.a, o.b, Math.min(h, o.head), h);
        if (o.sill > 0) along(o.a, o.b, 0, o.sill);
        if (o.kind === 'window') {
          const len = o.b - o.a;
          const mid = (o.a + o.b) / 2;
          const hh = o.head - o.sill;
          if (w.horiz) box(len, hh, 0.04, glassMat, mid, base + 0.25 + o.sill + hh / 2, -w.c);
          else box(0.04, hh, len, glassMat, w.c, base + 0.25 + o.sill + hh / 2, -mid);
        }
      }
    }
    // selected room: a clay floor patch
    const sel = plan.rooms.find((r) => r.id === opts.selectedId && r.floor === f);
    if (sel)
      box(
        sel.w - 0.1,
        0.03,
        sel.h - 0.1,
        mat(0xb5532c),
        sel.x + sel.w / 2,
        base + 0.27,
        -(sel.y + sel.h / 2),
        'selected',
      );
    // furniture layer
    for (const p of opts.furniture?.filter((x) => x.floor === f) ?? [])
      box(
        p.w,
        p.h,
        p.d,
        mat(COLORS.furniture),
        p.x + p.w / 2,
        base + 0.25 + p.h / 2,
        -(p.y + p.d / 2),
        `furniture-${p.kind}`,
      );
  }
  // roofs: over every built room with nothing built above it, with a parapet along its outside edges; the top shown
  // floor of a dollhouse cut stays open
  const style = plan.style ?? 'contemporary';
  const shurfa = new THREE.ConeGeometry(0.24, 0.38, 4);
  const shurfaMat = mat(COLORS.ext);
  for (let f = 0; f < shown; f++) {
    if (shown < plan.floors && f === shown - 1) continue;
    const top = (f + 1) * plan.floorHeight;
    const same = onFloor(plan, f);
    const above = onFloor(plan, f + 1).filter((o) => !isOpen(o.type));
    for (const r of same.filter((x) => !isOpen(x.type))) {
      const covered = above.reduce((t, o) => {
        const w = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
        const d = Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y);
        return t + (w > 0 && d > 0 ? w * d : 0);
      }, 0);
      if (covered > 0.5 * r.w * r.h) continue;
      box(r.w, 0.25, r.h, slabMat, r.x + r.w / 2, top + 0.125, -(r.y + r.h / 2), 'roof');
      for (const run of freeRuns(r, same)) {
        const len = run.to - run.from;
        if (len < 0.2) continue;
        const horiz = run.side === 'front' || run.side === 'back';
        const c =
          run.side === 'front'
            ? r.y
            : run.side === 'back'
              ? r.y + r.h
              : run.side === 'left'
                ? r.x
                : r.x + r.w;
        const mid = (run.from + run.to) / 2;
        const at = (u: number) => (horiz ? [u, -c] : [c, -u]) as [number, number];
        const [px, pz] = at(mid);
        box(horiz ? len : 0.22, 1, horiz ? 0.22 : len, extMat, px, top + 0.75, pz, 'parapet');
        if (style === 'modern_najdi' || style === 'salmani') {
          // the Najdi crenellation: small stepped triangles (shurfa) along the parapet
          for (let u = run.from + 0.4; u <= run.to - 0.3; u += 0.8) {
            const [sx, sz] = at(u);
            const m = new THREE.Mesh(shurfa, shurfaMat);
            m.position.set(sx, top + 1.25 + 0.19, sz);
            m.rotation.y = Math.PI / 4;
            m.castShadow = true;
            m.name = 'shurfa';
            g.add(m);
          }
        } else if (style === 'classic')
          // a cornice capping the parapet
          box(
            horiz ? len + 0.2 : 0.42,
            0.14,
            horiz ? 0.42 : len + 0.2,
            extMat,
            px,
            top + 1.3,
            pz,
            'cornice',
          );
      }
    }
  }
  // a contemporary terrace gets a pergola of timber slats overhead
  if (style === 'contemporary')
    for (const t of plan.rooms.filter((r) => r.type === 'terrace' && r.floor < shown)) {
      const y = t.floor * plan.floorHeight + 2.7;
      for (let u = t.x + 0.3; u < t.x + t.w - 0.2; u += 0.6)
        box(0.08, 0.16, t.h, mat(COLORS.pergola), u, y, -(t.y + t.h / 2), 'pergola');
    }
  return g;
}

/** Sun direction (unit vector, three.js axes) for a date/hour at a location; north is rotated by the plot's angle. */
export function sunVector(date: Date, lat: number, lng: number, northDeg = 0): THREE.Vector3 {
  const s = sunPosition(date, lat, lng);
  const alt = (Math.max(2, s.altitude) * Math.PI) / 180;
  // azimuth from north, clockwise; plot "up" (−z) is rotated northDeg from true north
  const az = ((s.azimuth - northDeg) * Math.PI) / 180;
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(alt),
    Math.sin(alt),
    -Math.cos(az) * Math.cos(alt),
  ).normalize();
}

export const roomCount = (plan: DesignPlan, f: number) =>
  plan.rooms.filter((r: PlanRoom) => r.floor === f).length;
