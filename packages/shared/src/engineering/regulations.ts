import { z } from 'zod';
import { LAND_USES, type LandUse } from './catalog.js';
import { BUILDING_TYPES, type Plot, type Program, type Zoning } from './schemas.js';

/**
 * Municipal building requirements, each value tied to the document and clause it comes from. Rasikh has no live
 * connection to Balady or the Amanat (no public interface exists): the national requirements below are transcribed
 * from the Ministry's published decision, and the Rasikh team adds each Amanah's own requirements with their source.
 * Values a plot's approved local plan sets (height, and anything an Amanah varies) are confirmed by the office from the
 * plot's documents; nothing is guessed.
 */

export const REGULATIONS_VERSION = 'momah-2024.1';

/** A setback from a street: a fraction of the street's width, never less than `min`; very wide streets take `wide`. */
export const StreetSetbackSchema = z.object({
  fraction: z.number().min(0).max(1),
  min: z.number().min(0).max(30),
  wide: z
    .object({ from: z.number().min(0).max(200), setback: z.number().min(0).max(30) })
    .optional(),
});
export type StreetSetback = z.infer<typeof StreetSetbackSchema>;

export const RegulationSchema = z.object({
  title: z.string().trim().min(3).max(200),
  /** National requirements bind every Amanah; an Amanah's own entry applies to the cities it lists. */
  scope: z.enum(['national', 'amanah']),
  cities: z.array(z.string().trim().min(2).max(40)).max(40).default([]),
  buildingTypes: z.array(z.enum(BUILDING_TYPES)).min(1),
  /** The land uses it covers (absent: any). */
  landUses: z.array(z.enum(LAND_USES)).max(6).optional(),
  /** Building types the Amanah's planning allows here (narrows the land use's default list). */
  allowedTypes: z.array(z.string().max(40)).max(120).optional(),
  source: z.object({
    issuer: z.string().trim().min(2).max(160),
    document: z.string().trim().min(3).max(240),
    reference: z.string().trim().max(120).default(''),
    url: z.string().url().max(600).optional(),
    issued: z.string().trim().max(40).default(''),
  }),
  setbacks: z.object({
    front: StreetSetbackSchema,
    /** A side or back of the plot on a street. */
    streetSide: StreetSetbackSchema,
    /** A side or back on a neighbour. */
    neighbour: z.number().min(0).max(30),
    /** Taller buildings keep more from neighbours. */
    neighbourTall: z
      .object({ aboveFloors: z.number().int().min(1).max(50), setback: z.number().min(0).max(30) })
      .optional(),
  }),
  /** Maximum built share of the plot: the ground floor, and each floor above. */
  coverage: z.object({ ground: z.number().min(0.1).max(1), upper: z.number().min(0.1).max(1) }),
  /** A roof annex: at most this share of the floor below. */
  roofAnnexShare: z.number().min(0).max(1).optional(),
  maxFloors: z.number().int().min(1).max(60).optional(),
  maxHeightM: z.number().min(3).max(300).optional(),
  /** Parking inside the property: per dwelling, or by plot area for a villa. */
  parking: z.object({
    perUnit: z.number().min(0).max(10).optional(),
    byPlotArea: z
      .array(z.object({ upTo: z.number().min(0), spaces: z.number().min(0).max(20) }))
      .max(10)
      .optional(),
  }),
  /** Which clause each value comes from, for the report. */
  clauses: z.record(z.string(), z.string().max(120)).default({}),
  notes: z.string().max(2000).default(''),
});
export type Regulation = z.infer<typeof RegulationSchema>;
export type RegulationEntry = Regulation & { id: string };

const MOMAH = {
  issuer: 'وزارة البلديات والإسكان',
  document: 'اشتراطات إنشاء المباني السكنية',
  reference: 'قرار وزاري رقم 1/4500943139',
  url: 'https://momah.gov.sa/sites/default/files/2024-07/ashtratat%20a%27nsha%20almbany%20alsknyt%20almnshwrt%20%60ly%20mwq%60%20alwzart%20.pdf',
  issued: '1446هـ / 2024م',
};

/**
 * The Ministry's unified requirements for residential buildings (binding on every Amanah), transcribed with their
 * clauses. Heights are not set there: they come from each area's approved local plan, which the office confirms.
 */
export const NATIONAL_REGULATIONS: RegulationEntry[] = [
  {
    id: 'momah-2024-villa',
    title: 'الفلل السكنية المنفصلة',
    scope: 'national',
    cities: [],
    buildingTypes: ['villa', 'duplex', 'townhouse'],
    landUses: ['residential'],
    source: MOMAH,
    setbacks: {
      front: { fraction: 0.2, min: 3, wide: { from: 30, setback: 6 } },
      streetSide: { fraction: 0.2, min: 2 },
      neighbour: 1.5,
    },
    coverage: { ground: 0.75, upper: 0.75 },
    roofAnnexShare: 0.7,
    maxFloors: 2,
    parking: {
      byPlotArea: [
        { upTo: 400, spaces: 1 },
        { upTo: 1e9, spaces: 2 },
      ],
    },
    clauses: {
      maxFloors: '3-1',
      coverageGround: '4-1 (1)',
      coverageUpper: '4-1 (2)',
      roofAnnex: '4-1 (3)',
      front: '4-1 (4)، (5)',
      streetSide: '4-1 (4)',
      neighbour: '4-1 (4)',
      parking: '4-1 (14)',
      height: '4 (1): المخطط المعتمد',
    },
    notes:
      'الفيلا: دوران كحد أقصى مع ملحق علوي وقبو (3-1). ارتداد الملحق العلوي عن الشوارع 1.5م على الأقل (4-1 (6)). يُسمح بالبناء في الارتدادات بالدور الأرضي حتى 70% من محيط الأرض بشروط (4-1 (8)). الارتفاع وعدد الأدوار في المخطط المعتمد للمنطقة (4 (1)).',
  },
  {
    id: 'momah-2024-apartments',
    title: 'العمائر السكنية والسكنية التجارية',
    scope: 'national',
    cities: [],
    buildingTypes: ['apartments', 'commercial'],
    landUses: ['residential', 'commercial', 'investment'],
    source: MOMAH,
    setbacks: {
      front: { fraction: 0.2, min: 3 },
      streetSide: { fraction: 0.2, min: 2 },
      neighbour: 2,
      neighbourTall: { aboveFloors: 5, setback: 3 },
    },
    coverage: { ground: 0.65, upper: 0.75 },
    roofAnnexShare: 0.7,
    maxHeightM: 23,
    parking: { perUnit: 1.5 },
    clauses: {
      coverageGround: '4-2 (1)',
      coverageUpper: '4-2 (2)',
      roofAnnex: '4-2 (3)',
      front: '4-2 (4)',
      streetSide: '4-2 (4)',
      neighbour: '4-2 (4)',
      parking: '4-2 (6)',
      height: '3-2: 23م من سطح الأرض',
    },
    notes:
      'العمارة السكنية: أكثر من دورين وارتفاع كلي لا يزيد عن 23م (3-2). موقف لكل 45م² من المحلات التجارية ولا يقل عن موقف لكل محل (4-2 (5)).',
  },
];

/** A street setback for a street of this width. */
export function streetSetback(rule: StreetSetback, streetWidth: number): number {
  if (rule.wide && streetWidth >= rule.wide.from) return rule.wide.setback;
  return Math.round(Math.max(rule.min, rule.fraction * streetWidth) * 100) / 100;
}

/** The requirements that apply to a building type in a city: the national ones, then the city's Amanah's. */
export function applicableRegulations(
  entries: readonly RegulationEntry[],
  type: Program['type'],
  city: string,
  landUse?: LandUse,
): RegulationEntry[] {
  return entries.filter(
    (r) =>
      r.buildingTypes.includes(type) &&
      (r.scope === 'national' || r.cities.includes(city)) &&
      (!landUse || !r.landUses || r.landUses.includes(landUse)),
  );
}

export interface ZoningFromRegulation {
  zoning: Zoning;
  /** Values the regulation does not set: the office confirms them from the plot's approved local plan. */
  fromLocalPlan: Array<'maxFloors' | 'maxHeightM'>;
}

/**
 * The zoning of one plot from a regulation and its street widths: setbacks per side (a street or a neighbour), the
 * ground coverage, the floor area allowed (ground + upper floors), the floors and height when the regulation sets
 * them (else kept from `current` and flagged for the office), and the parking the plot needs.
 */
export function zoningFromRegulation(
  reg: Regulation,
  plot: Pick<Plot, 'width' | 'depth' | 'streets'>,
  program: Pick<Program, 'floors'>,
  current?: Partial<Zoning>,
): ZoningFromRegulation {
  const floors = reg.maxFloors ?? current?.maxFloors ?? program.floors;
  const neighbour =
    reg.setbacks.neighbourTall && floors > reg.setbacks.neighbourTall.aboveFloors
      ? reg.setbacks.neighbourTall.setback
      : reg.setbacks.neighbour;
  const side = (street: number) =>
    street > 0 ? streetSetback(reg.setbacks.streetSide, street) : neighbour;
  const area = plot.width * plot.depth;
  const byArea = reg.parking.byPlotArea?.find((b) => area <= b.upTo)?.spaces;
  const fromLocalPlan: ZoningFromRegulation['fromLocalPlan'] = [];
  if (reg.maxFloors === undefined) fromLocalPlan.push('maxFloors');
  if (reg.maxHeightM === undefined) fromLocalPlan.push('maxHeightM');
  return {
    zoning: {
      use: 'residential',
      setbacks: {
        front: streetSetback(reg.setbacks.front, plot.streets.front),
        back: side(plot.streets.back ?? 0),
        left: side(plot.streets.left ?? 0),
        right: side(plot.streets.right ?? 0),
      },
      coverageMax: reg.coverage.ground,
      // the floors' areas, plus the roof annex the requirements allow on top
      farMax:
        Math.round(
          (reg.coverage.ground +
            reg.coverage.upper * (floors - 1) +
            reg.coverage.upper * (reg.roofAnnexShare ?? 0)) *
            100,
        ) / 100,
      ...(reg.roofAnnexShare !== undefined ? { roofAnnexShare: reg.roofAnnexShare } : {}),
      ...(reg.allowedTypes?.length ? { allowedTypes: reg.allowedTypes } : {}),
      maxFloors: floors,
      maxHeightM: reg.maxHeightM ?? current?.maxHeightM ?? 12,
      parkingPerUnit: byArea ?? reg.parking.perUnit ?? current?.parkingPerUnit ?? 1,
    },
    fromLocalPlan,
  };
}
