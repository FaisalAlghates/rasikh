import type { DesignPlan } from '@rasikh/shared';

/** SAMPLE DATA ONLY — shown in the UI with a "sample" label. Signed-in owners see their own portfolio instead. */
export type MapStatus = 'ok' | 'warn' | 'late';

export interface MapProperty {
  id: string;
  /** Display name and place (translated for samples; from Firestore for real properties). */
  name: string;
  place: string;
  cityId: string;
  coords: [number, number];
  units: number;
  rentSar: number;
  status: MapStatus;
  /** Real properties are placed near their city centre until an exact pin is set. */
  approximate?: boolean;
  /** The released design of this property (the map stands exactly this house on the pin). */
  plan?: DesignPlan;
}

export interface SampleProperty {
  id: string;
  cityId: string;
  coords: [number, number];
  units: number;
  rentSar: number;
  status: MapStatus;
}

export const SAMPLE_PROPERTIES: SampleProperty[] = [
  {
    id: 'p1',
    cityId: 'riyadh',
    coords: [46.6446, 24.8076],
    units: 12,
    rentSar: 612000,
    status: 'ok',
  },
  {
    id: 'p2',
    cityId: 'riyadh',
    coords: [46.7219, 24.7743],
    units: 6,
    rentSar: 288000,
    status: 'warn',
  },
  {
    id: 'p3',
    cityId: 'riyadh',
    coords: [46.6851, 24.6877],
    units: 24,
    rentSar: 1104000,
    status: 'ok',
  },
  {
    id: 'p4',
    cityId: 'riyadh',
    coords: [46.7712, 24.7101],
    units: 3,
    rentSar: 126000,
    status: 'late',
  },
  { id: 'p5', cityId: 'jeddah', coords: [39.17, 21.515], units: 8, rentSar: 352000, status: 'ok' },
  {
    id: 'p6',
    cityId: 'khobar',
    coords: [50.217, 26.295],
    units: 16,
    rentSar: 768000,
    status: 'warn',
  },
  {
    id: 'p7',
    cityId: 'makkah',
    coords: [39.865, 21.405],
    units: 10,
    rentSar: 420000,
    status: 'ok',
  },
  {
    id: 'p8',
    cityId: 'madinah',
    coords: [39.618, 24.443],
    units: 9,
    rentSar: 378000,
    status: 'ok',
  },
  { id: 'p9', cityId: 'abha', coords: [42.51, 18.228], units: 1, rentSar: 96000, status: 'ok' },
  {
    id: 'p10',
    cityId: 'tabuk',
    coords: [36.56, 28.405],
    units: 6,
    rentSar: 210000,
    status: 'warn',
  },
  {
    id: 'p11',
    cityId: 'buraydah',
    coords: [43.98, 26.355],
    units: 7,
    rentSar: 224000,
    status: 'ok',
  },
  { id: 'p12', cityId: 'dammam', coords: [50.08, 26.425], units: 5, rentSar: 230000, status: 'ok' },
];
