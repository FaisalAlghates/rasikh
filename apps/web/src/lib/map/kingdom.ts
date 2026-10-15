/**
 * The whole Kingdom on one map: every region capital plus the main cities, a camera for the overview,
 * and a simplified outline for the flat (no-WebGL) schematic. Coordinates are [lng, lat].
 */
import { normalize } from '../nav';

export interface City {
  id: string;
  coords: [number, number];
  /** Camera zoom when the city is selected. */
  zoom: number;
  /** Region capital (all 13 regions are covered). */
  capital?: boolean;
  /** Names people type for this city (Arabic and English), normalised at lookup. */
  aliases: string[];
}

export const CITIES: City[] = [
  {
    id: 'riyadh',
    coords: [46.6753, 24.7136],
    zoom: 10.6,
    capital: true,
    aliases: ['الرياض', 'riyadh'],
  },
  {
    id: 'makkah',
    coords: [39.8262, 21.4225],
    zoom: 11.6,
    capital: true,
    aliases: ['مكة', 'مكة المكرمة', 'makkah', 'mecca'],
  },
  { id: 'jeddah', coords: [39.1925, 21.4858], zoom: 10.9, aliases: ['جدة', 'jeddah', 'jiddah'] },
  {
    id: 'madinah',
    coords: [39.6142, 24.4686],
    zoom: 11.2,
    capital: true,
    aliases: ['المدينة', 'المدينة المنورة', 'madinah', 'medina'],
  },
  {
    id: 'dammam',
    coords: [50.1033, 26.4207],
    zoom: 11.2,
    capital: true,
    aliases: ['الدمام', 'dammam'],
  },
  {
    id: 'khobar',
    coords: [50.2083, 26.2172],
    zoom: 11.6,
    aliases: ['الخبر', 'khobar', 'al khobar'],
  },
  {
    id: 'ahsa',
    coords: [49.588, 25.383],
    zoom: 11.2,
    aliases: ['الأحساء', 'الهفوف', 'ahsa', 'al ahsa', 'hofuf'],
  },
  { id: 'jubail', coords: [49.6583, 27.0174], zoom: 11.6, aliases: ['الجبيل', 'jubail'] },
  { id: 'taif', coords: [40.4168, 21.2703], zoom: 11.6, aliases: ['الطائف', 'taif'] },
  { id: 'abha', coords: [42.5053, 18.2164], zoom: 11.8, capital: true, aliases: ['أبها', 'abha'] },
  {
    id: 'tabuk',
    coords: [36.5662, 28.3835],
    zoom: 11.6,
    capital: true,
    aliases: ['تبوك', 'tabuk'],
  },
  {
    id: 'buraydah',
    coords: [43.975, 26.326],
    zoom: 11.6,
    capital: true,
    aliases: ['بريدة', 'buraydah', 'buraidah'],
  },
  {
    id: 'hail',
    coords: [41.6907, 27.5114],
    zoom: 11.6,
    capital: true,
    aliases: ['حائل', 'hail', 'haʼil'],
  },
  {
    id: 'jazan',
    coords: [42.5511, 16.8892],
    zoom: 11.8,
    capital: true,
    aliases: ['جازان', 'جيزان', 'jazan', 'jizan'],
  },
  {
    id: 'najran',
    coords: [44.1277, 17.565],
    zoom: 11.6,
    capital: true,
    aliases: ['نجران', 'najran'],
  },
  {
    id: 'albaha',
    coords: [41.4677, 20.0129],
    zoom: 12,
    capital: true,
    aliases: ['الباحة', 'baha', 'al baha'],
  },
  { id: 'arar', coords: [41.0381, 30.9753], zoom: 12, capital: true, aliases: ['عرعر', 'arar'] },
  {
    id: 'sakaka',
    coords: [40.2064, 29.9697],
    zoom: 12,
    capital: true,
    aliases: ['سكاكا', 'sakaka'],
  },
  { id: 'alula', coords: [37.9183, 26.6085], zoom: 11.8, aliases: ['العلا', 'alula', 'al ula'] },
  { id: 'yanbu', coords: [38.0618, 24.0895], zoom: 11.6, aliases: ['ينبع', 'yanbu'] },
];

export const KSA_CENTER: [number, number] = [45.1, 23.9];
/** [[west, south], [east, north]] */
export const KSA_BOUNDS: [[number, number], [number, number]] = [
  [34.4, 16.2],
  [55.8, 32.3],
];

/**
 * A simplified outline of the Kingdom for the flat schematic only (the 3D map draws real borders).
 * It is labelled "approximate" wherever it is shown.
 */
export const KSA_OUTLINE: Array<[number, number]> = [
  [34.95, 29.36],
  [36.07, 29.19],
  [36.5, 29.5],
  [37.5, 30.0],
  [38.0, 30.5],
  [37.0, 31.5],
  [39.2, 32.15],
  [40.4, 31.9],
  [42.08, 31.1],
  [44.7, 29.2],
  [46.55, 29.1],
  [47.7, 28.53],
  [48.42, 28.55],
  [48.8, 27.7],
  [49.3, 27.1],
  [50.15, 26.7],
  [50.2, 26.2],
  [50.1, 25.9],
  [50.6, 25.0],
  [50.8, 24.75],
  [51.6, 24.25],
  [52.58, 22.94],
  [55.2, 22.7],
  [55.67, 22.0],
  [55.0, 20.0],
  [52.0, 19.0],
  [49.1, 18.6],
  [48.2, 18.17],
  [47.5, 17.1],
  [46.75, 17.28],
  [45.4, 17.33],
  [44.6, 17.43],
  [43.4, 17.53],
  [43.2, 17.3],
  [42.78, 16.35],
  [42.55, 16.89],
  [41.75, 17.9],
  [41.08, 19.13],
  [40.27, 20.15],
  [39.17, 21.54],
  [39.03, 22.8],
  [38.06, 24.09],
  [37.27, 25.05],
  [36.45, 26.23],
  [35.69, 27.35],
  [34.58, 27.95],
  [34.95, 29.36],
];

const byAlias = new Map<string, string>();
for (const c of CITIES) for (const a of c.aliases) byAlias.set(normalize(a), c.id);

/** Which city a free-text city name refers to ("مكة المكرمة", "Jeddah", "الاحساء"...). */
export function cityIdFor(name: string | undefined | null): string | undefined {
  if (!name) return undefined;
  const n = normalize(name).replace(/^(ال|al )/, '');
  for (const [alias, id] of byAlias) {
    const a = alias.replace(/^(ال|al )/, '');
    if (n === a || n.startsWith(`${a} `) || n.includes(a)) return id;
  }
  return undefined;
}

export const cityById = (id: string | undefined) => CITIES.find((c) => c.id === id);

/** A stable spot near the city centre for a property that has no exact location yet. */
export function approxCoords(cityId: string, seed: string): [number, number] {
  const c = cityById(cityId);
  if (!c) return KSA_CENTER;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const angle = ((h >>> 0) % 3600) / 10;
  const r = 0.012 + (((h >>> 12) % 1000) / 1000) * 0.04;
  const rad = (angle * Math.PI) / 180;
  return [c.coords[0] + r * Math.cos(rad), c.coords[1] + r * Math.sin(rad) * 0.9];
}

/** Indicative neighbourhood tiles around every city (sample values; never a valuation). */
export function kingdomIndicators() {
  const d = 0.022;
  const features = CITIES.flatMap((c, ci) =>
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [0, 0],
    ].map(([dx, dy], k) => {
      const cx = c.coords[0] + (dx ?? 0) * d * 2.2;
      const cy = c.coords[1] + (dy ?? 0) * d * 2.2;
      const value = ((ci * 7 + k * 3) % 10) / 10 + 0.05;
      return {
        type: 'Feature' as const,
        properties: { id: `${c.id}-${k}`, value },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [cx - d, cy - d],
              [cx + d, cy - d],
              [cx + d, cy + d],
              [cx - d, cy + d],
              [cx - d, cy - d],
            ],
          ],
        },
      };
    }),
  );
  return { type: 'FeatureCollection' as const, features };
}

/** Linear projection used by the flat schematic: [lng, lat] → percentages inside a view box. */
export function project(
  [lng, lat]: [number, number],
  view: { west: number; east: number; south: number; north: number },
): [number, number] {
  return [
    ((lng - view.west) / (view.east - view.west)) * 100,
    (1 - (lat - view.south) / (view.north - view.south)) * 100,
  ];
}
