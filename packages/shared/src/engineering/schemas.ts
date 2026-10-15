import { z } from 'zod';

/**
 * AI engineering office (docs/ENGINEERING_OFFICE.md). Everything here is a DRAFT aid for a licensed
 * engineering office: it never stamps, approves or submits anything, and compliance is decided only by the
 * versioned rule engine (rules.ts) with parameters a licensed engineer of the office has verified.
 */

export const DISCIPLINES = [
  'architectural',
  'structural',
  'mechanical',
  'electrical',
  'industrial',
] as const;
export type Discipline = (typeof DISCIPLINES)[number];
export const DisciplineSchema = z.enum(DISCIPLINES);

/** Saudi Council of Engineers grades (as entered by the engineer; verified by the Rasikh team). */
export const SCE_GRADES = ['associate', 'engineer', 'professional', 'consultant'] as const;

/** An engineering office's public profile (offices/{officeId}). `verified` is set only by the Rasikh team. */
export const OfficeProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  crNo: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'invalid_cr'),
  sceClass: z.string().trim().min(1).max(40),
  baladyActive: z.boolean(),
  disciplines: z.array(DisciplineSchema).min(1).max(5),
  cities: z.array(z.string().trim().min(2).max(40)).min(1).max(20),
  accepting: z.boolean(),
});
export type OfficeProfile = z.infer<typeof OfficeProfileSchema>;

/** An engineer of an office (offices/{officeId}/engineers/{uid}). Approval rights only in their own discipline. */
export const EngineerProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sceNo: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'invalid_sce_no'),
  grade: z.enum(SCE_GRADES),
  discipline: DisciplineSchema,
  /** Membership expiry, YYYY-MM-DD. Approval pauses automatically after it. */
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type EngineerProfile = z.infer<typeof EngineerProfileSchema>;

/** The four sides of a plot, seen from the main street. */
export const SIDES = ['front', 'back', 'left', 'right'] as const;
export type Side = (typeof SIDES)[number];

/** A rectangular plot in metres: x runs along the front (street) side, y into the plot's depth. */
export const PlotSchema = z.object({
  width: z.number().min(6).max(200),
  depth: z.number().min(6).max(200),
  /** Streets on each side, with their width in metres (0 = no street on that side; a corner plot has two). */
  streets: z.object({
    front: z.number().min(0).max(80),
    back: z.number().min(0).max(80).default(0),
    left: z.number().min(0).max(80).default(0),
    right: z.number().min(0).max(80).default(0),
  }),
  /** Degrees clockwise from the plot's "up" (its depth axis) to true north. */
  northDeg: z.number().min(0).max(360).default(0),
  city: z.string().trim().min(2).max(40),
  district: z.string().trim().max(60).default(''),
  /** Optional real location for the sun study and the massing on the Rasikh map. */
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});
export type Plot = z.infer<typeof PlotSchema>;

/**
 * Municipal zoning for one plot. Entered by the office from that municipality's building regulations; never guessed.
 */
export const ZoningSchema = z.object({
  use: z.enum(['residential', 'commercial', 'mixed']).default('residential'),
  setbacks: z.object({
    front: z.number().min(0).max(30),
    back: z.number().min(0).max(30),
    left: z.number().min(0).max(30),
    right: z.number().min(0).max(30),
  }),
  /** Maximum ground coverage as a ratio of the plot area (0.6 = 60 %). */
  coverageMax: z.number().min(0.1).max(1),
  /** Floor area ratio (built-up area / plot area). */
  farMax: z.number().min(0.1).max(10),
  maxFloors: z.number().int().min(1).max(30),
  maxHeightM: z.number().min(3).max(120),
  /** Parking spaces required per dwelling. */
  parkingPerUnit: z.number().min(0).max(5),
});
export type Zoning = z.infer<typeof ZoningSchema>;

export const BUILDING_TYPES = ['villa', 'duplex', 'townhouse', 'apartments', 'commercial'] as const;
export const STYLES = ['modern_najdi', 'salmani', 'contemporary', 'classic'] as const;

/** The client's programme, validated before any concept is generated. */
export const ProgramSchema = z.object({
  type: z.enum(BUILDING_TYPES),
  floors: z.number().int().min(1).max(10),
  bedrooms: z.number().int().min(0).max(20),
  /** For apartment buildings: dwellings per typical floor. */
  unitsPerFloor: z.number().int().min(1).max(8).default(1),
  majlisMen: z.boolean().default(true),
  majlisWomen: z.boolean().default(false),
  dining: z.boolean().default(true),
  kitchen: z.enum(['open', 'closed']).default('closed'),
  maidRoom: z.boolean().default(false),
  driverRoom: z.boolean().default(false),
  familyLiving: z.boolean().default(true),
  roofAnnex: z.boolean().default(false),
  basement: z.boolean().default(false),
  pool: z.boolean().default(false),
  elevator: z.boolean().default(false),
  parking: z.number().int().min(0).max(20).default(2),
  separateGuestEntry: z.boolean().default(false),
  style: z.enum(STYLES).default('modern_najdi'),
  budgetSar: z
    .object({ min: z.number().min(0), max: z.number().min(0) })
    .refine((b) => b.max >= b.min, 'budget_range')
    .optional(),
});
export type Program = z.infer<typeof ProgramSchema>;

export const ROOM_TYPES = [
  'majlis_men',
  'majlis_women',
  'living',
  'dining',
  'kitchen',
  'bedroom',
  'master_bedroom',
  'bathroom',
  'guest_wc',
  'maid_room',
  'driver_room',
  'laundry',
  'storage',
  'stair',
  'elevator',
  'corridor',
  'entrance',
  'shop',
  'apartment',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

/** Rooms people live in: they need daylight and minimum sizes. */
export const HABITABLE: readonly RoomType[] = [
  'majlis_men',
  'majlis_women',
  'living',
  'dining',
  'bedroom',
  'master_bedroom',
  'maid_room',
  'driver_room',
];
export const WET: readonly RoomType[] = ['bathroom', 'guest_wc', 'kitchen', 'laundry'];

/** A rectangle in plot coordinates (metres). */
export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
});
export type Rect = z.infer<typeof RectSchema>;

export const PlanRoomSchema = RectSchema.extend({
  id: z.string().min(1).max(40),
  type: z.enum(ROOM_TYPES),
  floor: z.number().int().min(-1).max(30),
  /** Renovation: what happens to this room. */
  state: z.enum(['existing', 'demolish', 'new']).optional(),
});
export type PlanRoom = z.infer<typeof PlanRoomSchema>;

/** One design option: rectangular rooms tiling a rectangular footprint on each floor. Same geometry for 2D and 3D. */
export const DesignPlanSchema = z.object({
  plot: z.object({ width: z.number(), depth: z.number() }),
  envelope: RectSchema,
  footprint: RectSchema,
  floors: z.number().int().min(1).max(30),
  floorHeight: z.number().min(2.4).max(6),
  /** Clear height under the false ceiling. */
  clearHeight: z.number().min(2.2).max(5.5),
  rooms: z.array(PlanRoomSchema).max(400),
  /** The variant knobs that produced this option (for explanation and regeneration). */
  variant: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
});
export type DesignPlan = z.infer<typeof DesignPlanSchema>;

export const PROJECT_STATUSES = [
  'brief',
  'accepted',
  'concepts',
  'picked',
  'development',
  'review',
  'released',
  'declined',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
