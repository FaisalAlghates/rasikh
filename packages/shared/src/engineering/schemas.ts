import { z } from 'zod';
import { LAND_USES } from './catalog.js';

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
  /** The land use in the plot's approved local plan (residential, commercial, agricultural ...). */
  landUse: z.enum(LAND_USES).default('residential'),
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
  /** A roof annex: at most this share of the floor below (absent: the plot's requirements were not entered). */
  roofAnnexShare: z.number().min(0).max(1).optional(),
  /** The building types the plot's planning allows, when the Amanah narrows the land use's default list. */
  allowedTypes: z.array(z.string().max(40)).max(120).optional(),
  /** The municipal requirements the values were taken from (regulations.ts), when one was applied. */
  source: z
    .object({
      id: z.string().max(80),
      title: z.string().max(200),
      document: z.string().max(240),
      reference: z.string().max(120),
    })
    .optional(),
});
export type Zoning = z.infer<typeof ZoningSchema>;

export const BUILDING_TYPES = [
  'villa',
  'duplex',
  'townhouse',
  'apartments',
  'commercial',
  'hall',
] as const;
export const STYLES = [
  'modern_najdi',
  'salmani',
  'contemporary',
  'classic',
  'swiss',
  'palace',
] as const;

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
  parking: z.number().int().min(0).max(2000).default(2),
  separateGuestEntry: z.boolean().default(false),
  /** Extra rooms a Saudi family brief often asks for. */
  guestRoom: z.boolean().default(false),
  office: z.boolean().default(false),
  prayerRoom: z.boolean().default(false),
  gym: z.boolean().default(false),
  storage: z.boolean().default(false),
  prepKitchen: z.boolean().default(false),
  /** Bathrooms and WCs in the house, the guest WC included (the maid's bathroom not). Absent: the engine decides. */
  bathrooms: z.number().int().min(1).max(20).optional(),
  /** Built-up area the client has in mind (m², all floors). */
  targetAreaM2: z.number().min(40).max(20000).optional(),
  style: z.enum(STYLES).default('contemporary'),
  /** The building type from the catalogue (palace, hotel, mosque, warehouse ...); the engine family follows it. */
  buildingType: z.string().max(40).optional(),
  /** Market and condition labels (for sale, off plan, heritage, furnished ...). */
  tags: z.array(z.string().max(30)).max(20).default([]),
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
  'guest_room',
  'office',
  'prayer_room',
  'gym',
  'prep_kitchen',
  'closet',
  'annex_room',
  'hall',
  'reception',
  'wc_men',
  'wc_women',
  'ablution',
  'loading',
  'hotel_room',
  'courtyard',
  'terrace',
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
  'guest_room',
  'office',
  'prayer_room',
  'gym',
  'annex_room',
  'hotel_room',
];
export const WET: readonly RoomType[] = [
  'bathroom',
  'guest_wc',
  'kitchen',
  'laundry',
  'prep_kitchen',
  'wc_men',
  'wc_women',
  'ablution',
];

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

/** Site elements in the yards, never roofed: parking bays and a pool. */
export const SITE_TYPES = ['parking', 'pool'] as const;
export type SiteType = (typeof SITE_TYPES)[number];
export const SiteItemSchema = RectSchema.extend({
  id: z.string().min(1).max(40),
  type: z.enum(SITE_TYPES),
});
export type SiteItem = z.infer<typeof SiteItemSchema>;

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
  /** Parking bays and pool in the yards (absent on plans made before site elements existed). */
  site: z.array(SiteItemSchema).max(60).optional(),
  /** A separate guest entrance from outside straight into the men's majlis. */
  guestEntry: z.boolean().optional(),
  /** The top level is a roof annex (a partial floor over the roof), not a full floor. */
  annex: z.boolean().optional(),
  /** The client's style: window proportions and façade details follow it. */
  style: z.enum(STYLES).optional(),
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
