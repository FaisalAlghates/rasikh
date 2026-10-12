import { z } from 'zod';
import type { UNIT_TYPES } from './domain.js';

/**
 * Guided inspections (move-in / move-out). The inspection is evidence: photos carry a capture time,
 * GPS and a SHA-256, and once both parties sign it can never change. Rasikh complements Ejar's official
 * handover form; it does not replace it.
 */

export const INSPECTION_KINDS = ['move_in', 'move_out'] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];

export const INSPECTION_STATUSES = ['draft', 'pending_signatures', 'sealed'] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

/** Ordered from best to worst, so a higher rank means a worse condition. */
export const CONDITIONS = ['good', 'fair', 'poor', 'damaged'] as const;
export type Condition = (typeof CONDITIONS)[number];
export const conditionRank = (c: Condition) => CONDITIONS.indexOf(c);

/** At move-out a person decides whether a change is normal wear or damage the tenant answers for. */
export const ASSESSMENTS = ['wear', 'damage'] as const;
export type Assessment = (typeof ASSESSMENTS)[number];

export const SIGN_PARTIES = ['owner', 'tenant'] as const;
export type SignParty = (typeof SIGN_PARTIES)[number];

/** A signature is only accepted if the caller authenticated this recently (the sign-off OTP/password step). */
export const SIGN_MAX_AUTH_AGE_SECONDS = 300;

// ---------------------------------------------------------------- templates

export interface TemplateRoom {
  /** `entrance`, `living`, `bedroom_2`, `bathroom_1` … numbered rooms end in `_<n>`. */
  key: string;
  items: readonly string[];
}

const ITEMS = {
  entrance: ['door', 'lock', 'intercom', 'floor', 'lighting'],
  living: ['walls', 'floor', 'ceiling', 'windows', 'lighting', 'outlets', 'ac'],
  majlis: ['walls', 'floor', 'ceiling', 'windows', 'lighting', 'outlets', 'ac'],
  bedroom: [
    'walls',
    'floor',
    'ceiling',
    'doors',
    'windows',
    'lighting',
    'outlets',
    'ac',
    'wardrobe',
  ],
  kitchen: [
    'walls',
    'floor',
    'ceiling',
    'cabinets',
    'countertop',
    'sink',
    'faucet',
    'hookup',
    'exhaust',
    'lighting',
    'outlets',
  ],
  bathroom: [
    'walls',
    'floor',
    'ceiling',
    'toilet',
    'basin',
    'faucet',
    'shower',
    'heater',
    'exhaust',
    'door',
  ],
  balcony: ['floor', 'railing', 'door'],
  yard: ['fence', 'gate', 'ground'],
  parking: ['ground', 'gate'],
  roof: ['waterproofing', 'access', 'tank'],
  meters: ['electricity', 'water', 'gas'],
} as const satisfies Record<string, readonly string[]>;

export type RoomBase = keyof typeof ITEMS;
export const ROOM_BASES = Object.keys(ITEMS) as RoomBase[];
/** Every distinct item key, for translation completeness checks. */
export const ALL_ITEM_KEYS = Array.from(new Set(Object.values(ITEMS).flat())).sort();

/** `bedroom_2` → `{ base: 'bedroom', index: 2 }`; `kitchen` → `{ base: 'kitchen' }`. */
export function splitRoomKey(key: string): { base: RoomBase; index?: number } {
  const m = /^([a-z]+)(?:_(\d+))?$/.exec(key);
  const base = m?.[1] as RoomBase | undefined;
  if (!base || !(base in ITEMS)) throw new Error(`unknown room: ${key}`);
  return m![2] ? { base, index: Number(m![2]) } : { base };
}

export const itemsOfRoom = (key: string): readonly string[] => ITEMS[splitRoomKey(key).base];

export interface TemplateOptions {
  bedrooms?: number;
  bathrooms?: number;
}

const numbered = (base: RoomBase, n: number): TemplateRoom[] =>
  Array.from({ length: n }, (_, i) => ({ key: `${base}_${i + 1}`, items: ITEMS[base] }));
const room = (base: RoomBase): TemplateRoom => ({ key: base, items: ITEMS[base] });

/** Room-by-room checklist for a unit type. Studio: one main room; apartment: bedrooms + bathrooms; villa: the full house. */
export function templateFor(
  type: (typeof UNIT_TYPES)[number],
  opts: TemplateOptions = {},
): TemplateRoom[] {
  const clamp = (n: number | undefined, d: number, max: number) =>
    Math.min(max, Math.max(1, Math.round(n ?? d)));
  switch (type) {
    case 'studio':
      return [
        room('entrance'),
        room('living'),
        room('kitchen'),
        ...numbered('bathroom', 1),
        room('meters'),
      ];
    case 'apartment':
      return [
        room('entrance'),
        room('living'),
        ...numbered('bedroom', clamp(opts.bedrooms, 2, 8)),
        room('kitchen'),
        ...numbered('bathroom', clamp(opts.bathrooms, 1, 6)),
        room('balcony'),
        room('meters'),
      ];
    case 'villa':
      return [
        room('entrance'),
        room('majlis'),
        room('living'),
        ...numbered('bedroom', clamp(opts.bedrooms, 4, 12)),
        room('kitchen'),
        ...numbered('bathroom', clamp(opts.bathrooms, 3, 10)),
        room('yard'),
        room('parking'),
        room('roof'),
        room('meters'),
      ];
  }
}

/** Firestore document id of an item. Room and item keys never contain a double underscore. */
export const itemId = (roomKey: string, item: string) => `${roomKey}__${item}`;

// ---------------------------------------------------------------- schemas

const RoomKeySchema = z.string().regex(/^[a-z]+(_\d+)?$/);

export const InspectionSchema = z.object({
  unitId: z.string().min(1),
  propertyId: z.string().min(1),
  leaseId: z.string().min(1),
  kind: z.enum(INSPECTION_KINDS),
  /** Rooms frozen at creation (a snapshot of the template), so later template changes never alter old records. */
  rooms: z.array(RoomKeySchema).min(1).max(60),
  /** Move-out only: the sealed move-in this one is compared against. */
  moveInId: z.string().optional(),
});
export type InspectionInput = z.infer<typeof InspectionSchema>;

export const InspectionItemSchema = z.object({
  room: RoomKeySchema,
  item: z.string().regex(/^[a-z]+$/),
  condition: z.enum(CONDITIONS),
  note: z.string().trim().max(300).default(''),
  /** Move-out only. */
  assessment: z.enum(ASSESSMENTS).optional(),
  costSar: z.number().min(0).max(10_000_000).optional(),
});
export type InspectionItem = z.infer<typeof InspectionItemSchema>;

export const MediaSchema = z.object({
  room: RoomKeySchema,
  item: z
    .string()
    .regex(/^[a-z]+$/)
    .optional(),
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  contentType: z.string().regex(/^(image|video)\//),
  /** Device clock at capture, ISO 8601 with milliseconds. The server also stamps the upload time. */
  capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  gps: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().nonnegative().optional(),
    })
    .optional(),
  device: z.string().max(200),
  /** Only the in-app camera is accepted: no gallery imports, so a photo cannot predate the visit. */
  source: z.literal('in_app_camera'),
});
export type InspectionMedia = z.infer<typeof MediaSchema>;

// ---------------------------------------------------------------- hashing and digest

// Available in every runtime we target (Node 22, browsers); declared because this package has no DOM/Node lib.
declare const crypto: {
  subtle: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> };
};
declare const TextEncoder: new () => { encode(s: string): Uint8Array };

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** True when `data` still hashes to `expected`. A single flipped byte makes this false. */
export async function matchesHash(data: Uint8Array, expected: string): Promise<boolean> {
  return (await sha256Hex(data)) === expected.toLowerCase();
}

/** JSON with sorted keys and no whitespace, so the same content always produces the same bytes. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}

export interface DigestItem {
  id: string;
  condition: Condition;
  note: string;
  assessment?: Assessment;
  costSar?: number;
}
export interface DigestMedia {
  id: string;
  room: string;
  item?: string;
  sha256: string;
  capturedAt: string;
}
export interface DigestInput {
  inspectionId: string;
  kind: InspectionKind;
  unitId: string;
  leaseId: string;
  items: DigestItem[];
  media: DigestMedia[];
}

/**
 * Fingerprint of everything a signature covers: every checklist answer and every photo hash.
 * Both parties sign the same digest, so neither can later claim the content was different.
 */
export async function inspectionDigest(input: DigestInput): Promise<string> {
  const items = [...input.items].sort((a, b) => a.id.localeCompare(b.id));
  const media = [...input.media].sort((a, b) => a.id.localeCompare(b.id));
  const bytes = new TextEncoder().encode(canonicalJson({ ...input, items, media }));
  return sha256Hex(bytes);
}

// ---------------------------------------------------------------- move-out comparison

export interface ConditionRow {
  room: string;
  item: string;
  condition: Condition;
  note?: string;
  assessment?: Assessment;
  costSar?: number;
}

export type ChangeKind = 'same' | 'worse' | 'better' | 'added' | 'missing';

export interface CompareRow {
  id: string;
  room: string;
  item: string;
  before?: ConditionRow;
  after?: ConditionRow;
  change: ChangeKind;
}

/** Row-by-row comparison of a move-in and a move-out. Only the move-out carries the human assessment. */
export function compareInspections(moveIn: ConditionRow[], moveOut: ConditionRow[]): CompareRow[] {
  const before = new Map(moveIn.map((r) => [itemId(r.room, r.item), r]));
  const after = new Map(moveOut.map((r) => [itemId(r.room, r.item), r]));
  const ids = Array.from(new Set([...before.keys(), ...after.keys()])).sort();
  return ids.map((id) => {
    const b = before.get(id);
    const a = after.get(id);
    const any = (a ?? b)!;
    let change: ChangeKind;
    if (b && a) {
      const d = conditionRank(a.condition) - conditionRank(b.condition);
      change = d > 0 ? 'worse' : d < 0 ? 'better' : 'same';
    } else {
      change = a ? 'added' : 'missing';
    }
    return { id, room: any.room, item: any.item, before: b, after: a, change };
  });
}

/** Items a person should look at: they got worse since move-in. */
export const needsAssessment = (rows: CompareRow[]) => rows.filter((r) => r.change === 'worse');

/** Sum of costs the owner marked as tenant damage. Wear and unmarked items count for nothing. */
export function damageTotal(rows: CompareRow[]): number {
  const cents = rows.reduce(
    (s, r) => (r.after?.assessment === 'damage' ? s + Math.round((r.after.costSar ?? 0) * 100) : s),
    0,
  );
  return cents / 100;
}

// ---------------------------------------------------------------- property health record

export type TimelineKind = 'lease_started' | 'lease_ended' | 'inspection_sealed' | 'expense';

export interface TimelineEvent {
  key: string;
  date: string;
  kind: TimelineKind;
  refId: string;
  unitLabel?: string;
  /** Expense category, inspection kind, or other short machine value; the UI translates it. */
  detail?: string;
  amount?: number;
}

export interface TimelineSources {
  today: string;
  leases: Array<{
    id: string;
    propertyId: string;
    startDate: string;
    endDate: string;
    unitLabel?: string;
    status?: string;
  }>;
  inspections: Array<{
    id: string;
    propertyId: string;
    kind: InspectionKind;
    status: InspectionStatus;
    /** Day it was sealed, `YYYY-MM-DD`. */
    sealedOn?: string;
    unitLabel?: string;
  }>;
  expenses: Array<{
    id: string;
    propertyId: string;
    date: string;
    category: string;
    amount: number;
  }>;
}

/**
 * The Property Health Record: one chronological story of a property, computed from the records
 * each module already keeps, so it can never drift from them. Newest first.
 */
export function buildTimeline(propertyId: string, src: TimelineSources): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const l of src.leases.filter((x) => x.propertyId === propertyId)) {
    if (l.startDate <= src.today) {
      out.push({
        key: `lease-start-${l.id}`,
        date: l.startDate,
        kind: 'lease_started',
        refId: l.id,
        unitLabel: l.unitLabel,
      });
    }
    if (l.endDate <= src.today || l.status === 'ended') {
      out.push({
        key: `lease-end-${l.id}`,
        date: l.endDate,
        kind: 'lease_ended',
        refId: l.id,
        unitLabel: l.unitLabel,
      });
    }
  }
  for (const i of src.inspections.filter(
    (x) => x.propertyId === propertyId && x.status === 'sealed' && x.sealedOn,
  )) {
    out.push({
      key: `inspection-${i.id}`,
      date: i.sealedOn!,
      kind: 'inspection_sealed',
      refId: i.id,
      detail: i.kind,
      unitLabel: i.unitLabel,
    });
  }
  for (const e of src.expenses.filter((x) => x.propertyId === propertyId)) {
    out.push({
      key: `expense-${e.id}`,
      date: e.date,
      kind: 'expense',
      refId: e.id,
      detail: e.category,
      amount: e.amount,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}
