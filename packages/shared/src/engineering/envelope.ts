/**
 * Thermal build-ups of the building envelope, the way a permit set shows them: each layer's thickness t (m) and
 * conductivity k (W/m·K), R = t / k, U = 1 / ΣR (surface films left out, as on the reference sheets). The layers are
 * typical build-ups the office edits; the limit each U-value is checked against comes from the Saudi energy
 * conservation code and is verified by the office, never decided here.
 */
export interface Layer {
  id: string;
  ar: string;
  en: string;
  /** Thickness (m). */
  t: number;
  /** Thermal conductivity (W/m·K). */
  k: number;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export const layerR = (l: Layer) => round(l.t / l.k, 3);

export function uValue(layers: readonly Layer[]) {
  const r = layers.reduce((s, l) => s + l.t / l.k, 0);
  return {
    thickness: round(
      layers.reduce((s, l) => s + l.t, 0),
      3,
    ),
    r: round(r, 3),
    u: round(1 / r, 3),
  };
}

const PLASTER = {
  id: 'plaster',
  ar: 'لياسة إسمنتية جيرية',
  en: 'Limestone cement plaster',
  k: 0.75,
};
const BLOCK = { id: 'block', ar: 'بلوك خرساني مفرغ', en: 'Hollow concrete block', k: 0.96 };
const PU = { id: 'pu', ar: 'ألواح بولي يوريثان', en: 'Polyurethane foam board', k: 0.021 };

/** External wall, 35 cm: plaster, block 15, insulation 5, block 10, plaster. */
export const WALL_STANDARD: readonly Layer[] = [
  { ...PLASTER, t: 0.025 },
  { ...BLOCK, t: 0.15 },
  { ...PU, t: 0.05 },
  { ...BLOCK, t: 0.1 },
  { ...PLASTER, t: 0.025 },
];

/** External wall in wet areas, 40 cm: a thicker inner block. */
export const WALL_WET: readonly Layer[] = [
  { ...PLASTER, t: 0.025 },
  { ...BLOCK, t: 0.15 },
  { ...PU, t: 0.05 },
  { ...BLOCK, t: 0.15 },
  { ...PLASTER, t: 0.025 },
];

/** Roof, from the ceiling up: plaster, slab, screed for falls, waterproofing, insulation, sand, mortar, tile. */
export const ROOF_STANDARD: readonly Layer[] = [
  { ...PLASTER, t: 0.025 },
  { id: 'slab', ar: 'خرسانة مسلحة', en: 'Reinforced concrete', t: 0.3, k: 2.1 },
  {
    id: 'lwc',
    ar: 'خرسانة خفيفة لميول التصريف',
    en: 'Lightweight concrete (falls)',
    t: 0.07,
    k: 0.38,
  },
  { id: 'bitumen', ar: 'رولات عزل مائي', en: 'Bitumen waterproofing roll', t: 0.008, k: 0.17 },
  { ...PU, t: 0.08 },
  { id: 'sand', ar: 'رمل', en: 'Sand', t: 0.03, k: 0.3 },
  { id: 'cement', ar: 'مونة إسمنتية', en: 'Cement mortar', t: 0.01, k: 0.75 },
  { id: 'tile', ar: 'بلاط موزاييك', en: 'Mosaic tile', t: 0.04, k: 1.2 },
];

export const BUILDUPS = {
  wall: { ar: 'جدار خارجي ٣٥ سم', en: 'External wall 35 cm', layers: WALL_STANDARD },
  wallWet: {
    ar: 'جدار خارجي ٤٠ سم (المناطق المبللة)',
    en: 'External wall 40 cm (wet areas)',
    layers: WALL_WET,
  },
  roof: { ar: 'طبقات السطح', en: 'Roof layers', layers: ROOF_STANDARD },
} as const;
