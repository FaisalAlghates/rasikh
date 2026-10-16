import * as THREE from 'three';

/**
 * Procedural surface textures for the 3D model (render, timber, slats, stone courses, roof tiles): drawn once on a
 * canvas, no image files. They tile in metres: a box's UVs are scaled to its size (see `worldUv`), and `tile` is how
 * many metres one repeat covers. Without a DOM (tests, the server) there are none and the model uses plain colours.
 */
export type SurfaceKind = 'stucco' | 'timber' | 'slat' | 'stone' | 'tile' | 'paving';

const cache = new Map<string, THREE.CanvasTexture>();

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

export function surface(
  kind: SurfaceKind,
  base: string,
  tile = 2,
): THREE.CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const key = `${kind}:${base}:${tile}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  if (!g) return undefined;
  const r = rng(kind.length * 977 + base.length * 131);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  if (kind === 'stucco') {
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = shade(base, 0.9 + r() * 0.18);
      g.globalAlpha = 0.35;
      g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
    }
  } else if (kind === 'timber') {
    const boards = 8;
    for (let i = 0; i < boards; i++) {
      g.globalAlpha = 1;
      g.fillStyle = shade(base, 0.88 + r() * 0.2);
      g.fillRect((i * S) / boards, 0, S / boards, S);
      g.fillStyle = shade(base, 0.6);
      g.fillRect((i * S) / boards, 0, 2, S);
      g.globalAlpha = 0.18;
      for (let k = 0; k < 14; k++) {
        g.fillStyle = shade(base, 0.7);
        g.fillRect((i * S) / boards + 3 + r() * (S / boards - 6), r() * S, 1, 12 + r() * 40);
      }
    }
  } else if (kind === 'slat') {
    const rows = 12;
    for (let i = 0; i < rows; i++) {
      g.globalAlpha = 1;
      g.fillStyle = shade(base, 0.92 + r() * 0.14);
      g.fillRect(0, (i * S) / rows, S, S / rows);
      g.fillStyle = shade(base, 0.45);
      g.fillRect(0, (i * S) / rows + S / rows - 3, S, 3);
    }
  } else if (kind === 'stone') {
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const cols = 3;
      const off = i % 2 ? S / cols / 2 : 0;
      for (let k = -1; k <= cols; k++) {
        g.globalAlpha = 1;
        g.fillStyle = shade(base, 0.94 + r() * 0.12);
        g.fillRect(k * (S / cols) + off + 2, (i * S) / rows + 2, S / cols - 4, S / rows - 4);
      }
    }
  } else if (kind === 'tile') {
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const cols = 8;
      const off = i % 2 ? S / cols / 2 : 0;
      for (let k = -1; k <= cols; k++) {
        g.globalAlpha = 1;
        g.fillStyle = shade(base, 0.9 + r() * 0.2);
        g.beginPath();
        g.roundRect(k * (S / cols) + off + 1, (i * S) / rows, S / cols - 2, S / rows + 4, 6);
        g.fill();
        g.fillStyle = shade(base, 0.5);
        g.fillRect(k * (S / cols) + off, (i * S) / rows + S / rows - 2, S / cols, 2);
      }
    }
  } else {
    // paving: slabs with joints
    const n = 4;
    for (let i = 0; i < n; i++)
      for (let k = 0; k < n; k++) {
        g.globalAlpha = 1;
        g.fillStyle = shade(base, 0.95 + r() * 0.1);
        g.fillRect((k * S) / n + 1, (i * S) / n + 1, S / n - 2, S / n - 2);
      }
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.repeat.set(1 / tile, 1 / tile);
  cache.set(key, t);
  return t;
}

/** Scales a box's UVs to its size in metres so a texture keeps its real scale on every face. */
export function worldUv(geo: THREE.BoxGeometry, w: number, h: number, d: number) {
  const uv = geo.getAttribute('uv');
  // BoxGeometry order: +x, -x, +y, -y, +z, -z, four vertices each
  const sizes: Array<[number, number]> = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * sizes[f]![0], uv.getY(k) * sizes[f]![1]);
    }
  uv.needsUpdate = true;
}
