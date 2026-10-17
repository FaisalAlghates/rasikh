import {
  VARIANTS,
  confirmProgram,
  generatePlan,
  type DesignPlan,
  type Plot,
  type Zoning,
} from '@rasikh/shared';
import type { MapProperty } from './sample-data';

/**
 * The building the map stands on a property's pin. A property with a released design shows exactly that design;
 * the others get a plausible building from what the records say (a villa for one unit, an apartment building with
 * the right number of floors for several), in a style that follows the city. Marked as approximate on the card.
 */
const ZONING: Zoning = {
  use: 'residential',
  setbacks: { front: 3, back: 2, left: 1.5, right: 1.5 },
  coverageMax: 0.75,
  farMax: 4,
  maxFloors: 8,
  maxHeightM: 30,
  parkingPerUnit: 1,
};

const STYLE_BY_CITY: Record<string, 'modern_najdi' | 'contemporary' | 'palace' | 'swiss'> = {
  riyadh: 'modern_najdi',
  buraydah: 'modern_najdi',
  hail: 'modern_najdi',
  jeddah: 'contemporary',
  khobar: 'contemporary',
  dammam: 'contemporary',
  makkah: 'contemporary',
  madinah: 'contemporary',
  abha: 'swiss',
  taif: 'swiss',
};

const cache = new Map<string, DesignPlan | null>();

/** The plan to draw for a property: its real design, else an approximation from its unit count. */
export function houseFor(p: MapProperty): { plan: DesignPlan; real: boolean } | null {
  if (p.plan) return { plan: p.plan, real: true };
  const key = `${p.id}:${p.units}:${p.cityId}`;
  if (cache.has(key)) {
    const hit = cache.get(key);
    return hit ? { plan: hit, real: false } : null;
  }
  let plan: DesignPlan | null = null;
  try {
    const style = STYLE_BY_CITY[p.cityId] ?? 'contemporary';
    const villa = p.units <= 2;
    const floors = villa ? 2 : Math.max(2, Math.min(6, Math.ceil(p.units / 2)));
    const program = confirmProgram(
      villa
        ? { type: 'villa', floors, bedrooms: 4, style }
        : {
            type: 'apartments',
            floors,
            bedrooms: 0,
            unitsPerFloor: Math.max(1, Math.min(4, Math.ceil(p.units / floors))),
            style,
          },
    ).data;
    const plot: Plot = {
      width: villa ? 22 : 30,
      depth: villa ? 32 : 36,
      streets: { front: 15, back: 0, left: 0, right: 0 },
      northDeg: 0,
      city: p.place,
      district: '',
      landUse: 'residential',
    };
    if (program) plan = generatePlan(plot, ZONING, program, VARIANTS[0]!);
  } catch {
    plan = null;
  }
  cache.set(key, plan);
  return plan ? { plan, real: false } : null;
}
