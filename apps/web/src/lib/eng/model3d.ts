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
import { surface, worldUv } from './textures';

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
  tile: 0x6b4a36,
  timber: 0xa87b4f,
  stone: 0xe9dcc3,
  dome: 0xb7c4c7,
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
  /** Textured surfaces, window frames, doors, shutters, trees and boundary walls (textures need a DOM). */
  realistic?: boolean;
}

export function buildModel(plan: DesignPlan, opts: BuildOptions): THREE.Group {
  const g = new THREE.Group();
  g.name = 'rasikh-plan';
  const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const wallMat = mat(COLORS.wall);
  const extMat = mat(COLORS.ext);
  const slabMat = mat(COLORS.slab);
  const style = plan.style ?? 'contemporary';
  const real = opts.realistic === true;
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  const tmat = (
    kind: Parameters<typeof surface>[0],
    color: number,
    tile: number,
    o: Partial<THREE.MeshStandardMaterialParameters> = {},
  ) => {
    const map = real ? surface(kind, hex(color), tile) : undefined;
    return new THREE.MeshStandardMaterial({
      color: map ? 0xffffff : color,
      ...(map ? { map } : {}),
      roughness: 0.92,
      ...o,
    });
  };
  const topFloor = Math.max(1, Math.min(opts.floorsShown, plan.floors)) - 1;
  const stuccoSand = tmat('stucco', 0xd9bf9a, 2);
  const stuccoWhite = tmat('stucco', 0xf1ece2, 2);
  const timber = tmat('timber', 0xb98a58, 2);
  const slat = tmat('slat', 0x555b61, 2);
  const stoneCream = tmat('stone', 0xddcba8, 2);
  const doorMat = tmat('timber', 0x5a3d28, 1.2, { roughness: 0.7 });
  const shutterMat = mat(0x5d7a4a, { roughness: 0.7 });
  const frameMat = mat(
    style === 'contemporary'
      ? 0x23303a
      : style === 'swiss'
        ? 0xf2efe8
        : style === 'palace' || style === 'classic'
          ? 0xf4efe2
          : 0x6b4a36,
    { roughness: 0.6 },
  );
  /** The outside walls of a floor, by style: Najdi render, a modern clad top volume, Swiss timber, palace stone. */
  const extFor = (fl: number) => {
    if (!real) return extMat;
    if (style === 'swiss') return fl === 0 ? stuccoWhite : timber;
    if (style === 'contemporary') return fl === topFloor && topFloor > 0 ? slat : stuccoWhite;
    if (style === 'palace' || style === 'classic') return stoneCream;
    return stuccoSand;
  };
  const glassMat = real
    ? new THREE.MeshStandardMaterial({
        color: 0x9fbfd2,
        transparent: true,
        opacity: 0.62,
        roughness: 0.05,
        metalness: 0.6,
        envMapIntensity: 1.3,
      })
    : mat(COLORS.glass, { transparent: true, opacity: 0.45, roughness: 0.1 });
  const ops = openingsOf(plan);

  // ground (the plot)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(plan.plot.width, plan.plot.depth),
    real ? tmat('paving', 0xd3c6ac, 2.4) : mat(COLORS.ground),
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
    const geo = new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d));
    if ((m as THREE.MeshStandardMaterial).map) worldUv(geo, w, h, d);
    const mesh = new THREE.Mesh(geo, m);
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
      const m = w.ext ? extFor(f) : wallMat;
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
        if (real && w.ext) {
          const len = o.b - o.a;
          const mid = (o.a + o.b) / 2;
          const y0 = base + 0.25 + o.sill;
          const hh = Math.min(h, o.head) - o.sill;
          // along the wall, across it (thickness), height, position along the wall, centre height
          const put = (
            along: number,
            across: number,
            hgt: number,
            at: number,
            y: number,
            m2: THREE.Material,
            name: string,
          ) =>
            w.horiz
              ? box(along, hgt, across, m2, at, y, -w.c, name)
              : box(across, hgt, along, m2, w.c, y, -at, name);
          if (o.kind === 'window') {
            put(len + 0.12, t + 0.06, 0.07, mid, y0 + hh, frameMat, 'frame');
            put(len + 0.24, t + 0.16, 0.08, mid, y0, frameMat, 'sill');
            put(0.07, t + 0.06, hh, o.a, y0 + hh / 2, frameMat, 'frame');
            put(0.07, t + 0.06, hh, o.b, y0 + hh / 2, frameMat, 'frame');
            if (len > 1.3) put(0.05, t + 0.02, hh, mid, y0 + hh / 2, frameMat, 'mullion');
            if (style === 'swiss')
              for (const x of [o.a - 0.22, o.b + 0.22])
                put(0.4, t + 0.1, hh, x, y0 + hh / 2, shutterMat, 'shutter');
          } else if (o.kind === 'entry')
            put(len * 0.96, 0.08, hh, mid, y0 + hh / 2, doorMat, 'door');
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
  /** A pitched roof over a rectangle: the ridge runs along its longer side, wide eaves all round. */
  const gable = (r: PlanRoom, y: number) => {
    const ov = 0.55;
    const alongX = r.w >= r.h;
    const span = (alongX ? r.h : r.w) + 2 * ov;
    const len = (alongX ? r.w : r.h) + 2 * ov;
    const rise = Math.min(2.6, span * 0.3);
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(span / 2, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    if (alongX) geo.rotateY(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, real ? tmat('tile', 0x8a4b32, 1.2) : mat(COLORS.tile));
    mesh.position.set(r.x + r.w / 2, y, -(r.y + r.h / 2));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'gable';
    g.add(mesh);
  };
  // roofs: over every built room with nothing built above it, with a parapet along its outside edges; the top shown
  // floor of a dollhouse cut stays open
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
      if (style === 'swiss') {
        if (Math.min(r.w, r.h) >= 2) gable(r, top + 0.25);
        continue;
      }
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
        } else if (style === 'classic' || style === 'palace')
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
  if (style === 'palace') {
    // a dome on the biggest roof of the top floor
    const topRooms = onFloor(plan, Math.min(shown, plan.floors) - 1).filter((x) => !isOpen(x.type));
    const big = [...topRooms].sort((a, b) => b.w * b.h - a.w * a.h)[0];
    if (big) {
      const top = Math.min(shown, plan.floors) * plan.floorHeight + 0.25;
      const rad = Math.max(0.8, Math.min(2.4, Math.min(big.w, big.h) * 0.35));
      box(
        rad * 2.2,
        0.9,
        rad * 2.2,
        extMat,
        big.x + big.w / 2,
        top + 0.45,
        -(big.y + big.h / 2),
        'drum',
      );
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(rad, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(COLORS.dome, { metalness: 0.3, roughness: 0.4 }),
      );
      dome.position.set(big.x + big.w / 2, top + 0.9, -(big.y + big.h / 2));
      dome.castShadow = true;
      dome.name = 'dome';
      g.add(dome);
    }
    // a portico of four columns before every entrance door
    for (const o of ops.filter((x) => x.kind === 'entry' && x.floor < shown)) {
      const horiz = Math.abs(o.y1 - o.y2) < 0.01;
      const mx = (o.x1 + o.x2) / 2;
      const my = (o.y1 + o.y2) / 2;
      const base = o.floor * plan.floorHeight;
      const col = new THREE.CylinderGeometry(0.16, 0.18, 3.2, 14);
      for (const d of [-1.6, -0.55, 0.55, 1.6]) {
        const m = new THREE.Mesh(col, mat(COLORS.stone));
        m.position.set(horiz ? mx + d : mx - 0.7, base + 1.85, horiz ? -(my - 0.7) : -(my + d));
        m.castShadow = true;
        m.name = 'column';
        g.add(m);
      }
      box(
        horiz ? 4 : 1,
        0.3,
        horiz ? 1 : 4,
        mat(COLORS.stone),
        horiz ? mx : mx - 0.7,
        base + 3.6,
        horiz ? -(my - 0.7) : -my,
        'entablature',
      );
    }
  }
  // a contemporary terrace gets a pergola of timber slats overhead
  if (style === 'contemporary')
    for (const t of plan.rooms.filter((r) => r.type === 'terrace' && r.floor < shown)) {
      const y = t.floor * plan.floorHeight + 2.7;
      for (let u = t.x + 0.3; u < t.x + t.w - 0.2; u += 0.6)
        box(0.08, 0.16, t.h, mat(COLORS.pergola), u, y, -(t.y + t.h / 2), 'pergola');
    }
  if (real) {
    const W = plan.plot.width;
    const D = plan.plot.depth;
    // boundary walls as Saudi plots have them: full on the sides and back, low on the street with a gate
    const wallM = tmat('stucco', style === 'palace' ? 0xe8dcc0 : 0xe4d7c3, 2);
    const wh = 1.8;
    box(0.25, wh, D, wallM, 0.12, wh / 2, -D / 2, 'boundary');
    box(0.25, wh, D, wallM, W - 0.12, wh / 2, -D / 2, 'boundary');
    box(W, wh, 0.25, wallM, W / 2, wh / 2, -(D - 0.12), 'boundary');
    const entry = ops.find((o) => o.kind === 'entry' && o.floor === 0);
    const gx = entry ? (entry.x1 + entry.x2) / 2 : W / 2;
    const gate = 3.6;
    const low = 1.1;
    if (gx - gate / 2 > 0.3)
      box(gx - gate / 2, low, 0.25, wallM, (gx - gate / 2) / 2, low / 2, -0.12, 'boundary');
    if (W - (gx + gate / 2) > 0.3)
      box(
        W - (gx + gate / 2),
        low,
        0.25,
        wallM,
        (gx + gate / 2 + W) / 2,
        low / 2,
        -0.12,
        'boundary',
      );
    // trees in the yards: palms by a Najdi house or a palace, broad trees by the others
    const built0 = onFloor(plan, 0);
    const clear = (x: number, y: number) =>
      x > 1 &&
      x < W - 1 &&
      y > 1 &&
      y < D - 1 &&
      !built0.some(
        (r) => x > r.x - 1.2 && x < r.x + r.w + 1.2 && y > r.y - 1.2 && y < r.y + r.h + 1.2,
      ) &&
      !(plan.site ?? []).some(
        (q) => x > q.x - 1 && x < q.x + q.w + 1 && y > q.y - 1 && y < q.y + q.h + 1,
      );
    const spots: Array<[number, number]> = [
      [1.6, D - 1.6],
      [W - 1.6, D - 1.6],
      [1.6, 1.8],
      [W - 1.6, 1.8],
      [W / 2, D - 1.6],
      [1.6, D / 2],
      [W - 1.6, D / 2],
    ];
    const palm = style === 'modern_najdi' || style === 'salmani' || style === 'palace';
    const trunkM = mat(0x7a5a3c);
    const leafM = mat(palm ? 0x5d7f3e : 0x4f7a3a, { roughness: 0.8 });
    let n = 0;
    for (const [x, y] of spots) {
      if (n >= 5 || !clear(x, y)) continue;
      n++;
      const ht = palm ? 5.5 : 4;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(palm ? 0.14 : 0.16, palm ? 0.2 : 0.22, ht, 8),
        trunkM,
      );
      trunk.position.set(x, ht / 2, -y);
      trunk.castShadow = true;
      trunk.name = 'tree';
      g.add(trunk);
      if (palm)
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.4, 4), leafM);
          frond.position.set(x + Math.cos(a) * 0.9, ht - 0.1, -y + Math.sin(a) * 0.9);
          // tipped outward and down from the crown
          frond.quaternion.setFromAxisAngle(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), -1.2);
          frond.castShadow = true;
          frond.name = 'frond';
          g.add(frond);
        }
      else
        for (const [dy, r] of [
          [0, 1.7],
          [1.1, 1.2],
        ] as const) {
          const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), leafM);
          crown.position.set(x, ht + dy, -y);
          crown.castShadow = true;
          crown.name = 'canopy';
          g.add(crown);
        }
    }
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
