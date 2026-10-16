import {
  HALL_PROFILES,
  UNIT_PROFILES,
  engineTypeOf,
  kindFromBrief,
  tagsFromBrief,
} from './catalog.js';
import { ProgramSchema, type Program, type RoomType } from './schemas.js';

/**
 * The brief agent's deterministic first pass: turns a free-text brief (Arabic or English) into programme
 * fields, then lists only what is still missing so the client is asked for nothing twice. The client confirms the
 * programme before any concept is generated.
 */

const WORD_NUMBERS: Record<string, number> = {
  واحد: 1,
  واحدة: 1,
  اثنين: 2,
  اثنتين: 2,
  اثنان: 2,
  ثلاث: 3,
  ثلاثة: 3,
  اربع: 4,
  اربعة: 4,
  خمس: 5,
  خمسة: 5,
  ست: 6,
  ستة: 6,
  سبع: 7,
  سبعة: 7,
  ثمان: 8,
  ثمانية: 8,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

/** Arabic-Indic digits to Latin, thousands separators dropped, alef variants unified, diacritics dropped, lower-cased. */
export function normalizeBrief(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/(\d)[,٬](?=\d{3}\b)/g, '$1')
    .replace(/٫/g, '.')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإ]/g, 'ا')
    .toLowerCase();
}

const NUM = String.raw`(\d+|${Object.keys(WORD_NUMBERS).join('|')})`;
const num = (s: string | undefined) =>
  s === undefined ? undefined : /^\d+$/.test(s) ? Number(s) : WORD_NUMBERS[s];

function count(text: string, nouns: string): number | undefined {
  const m = new RegExp(`${NUM}\\s*(?:${nouns})`).exec(text);
  return num(m?.[1]);
}

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));

/** "دور" but not "دورات/دورة مياه". */
const FLOOR_NOUNS = 'ادوار|دور(?![اهةي])|طوابق|طابق|floors?|storeys?|stories';
const BATH_NOUNS =
  'دورات مياه|دورات المياه|دوره مياه|دورة مياه|حمامات|حمام|bathrooms?|baths?|wcs?|toilets?|restrooms?';

export function parseBrief(raw: string): Partial<Program> {
  const t = normalizeBrief(raw);
  const out: Partial<Program> = {};
  // the building type the brief names (palace, hotel, mosque, warehouse ...) sets the engine family
  const kind = kindFromBrief(t);
  const tags = tagsFromBrief(t);
  if (tags.length) out.tags = tags;
  if (kind) {
    out.buildingType = kind;
    out.type = engineTypeOf(kind) ?? 'commercial';
  } else if (has(t, 'دوبلكس', 'duplex')) out.type = 'duplex';
  else if (has(t, 'تاون', 'townhouse')) out.type = 'townhouse';
  else if (has(t, 'عماره', 'عمارة', 'شقق', 'apartment')) out.type = 'apartments';
  else if (has(t, 'محل', 'تجاري', 'commercial', 'shop')) out.type = 'commercial';
  else if (has(t, 'فيلا', 'فله', 'villa')) out.type = 'villa';

  if (!out.buildingType && out.type)
    out.buildingType = (
      {
        villa: 'villa',
        duplex: 'duplex',
        townhouse: 'townhouse',
        apartments: 'residential_building',
        commercial: 'commercial_building',
        hall: 'event_hall',
      } as const
    )[out.type];
  const floors = count(t, FLOOR_NOUNS);
  if (floors) out.floors = floors;
  else if (has(t, 'دورين', 'طابقين')) out.floors = 2;
  else if (has(t, 'دور واحد', 'دور ارضي', 'طابق واحد', 'one floor', 'single storey'))
    out.floors = 1;
  // "غرف نوم" first, so "2 غرف خدمة" never reads as bedrooms when bedrooms are stated
  const bedrooms = count(t, 'غرف نوم|غرفه نوم|غرفة نوم|bedrooms?') ?? count(t, 'غرف(?! خدم)|beds?');
  if (bedrooms !== undefined) out.bedrooms = bedrooms;
  else if (has(t, 'غرفتين نوم', 'غرفتين')) out.bedrooms = 2;
  const baths = count(t, BATH_NOUNS);
  if (baths) out.bathrooms = baths;
  else if (has(t, 'دورتين مياه', 'دورتين', 'حمامين')) out.bathrooms = 2;
  const parking = count(t, 'مواقف|موقف|سيارات|parking|cars?');
  if (parking !== undefined) out.parking = parking;
  const units = count(t, 'شقق في الدور|شقق بالدور|شقه في الدور|units? per floor');
  if (units) out.unitsPerFloor = units;

  if (has(t, 'مجلس رجال', 'majlis for men', "men's majlis")) out.majlisMen = true;
  if (has(t, 'مجلس نساء', 'مجلس حريم', 'مجلس النساء', "women's majlis")) out.majlisWomen = true;
  if (has(t, 'مطبخ مفتوح', 'open kitchen')) out.kitchen = 'open';
  if (has(t, 'مطبخ مغلق', 'closed kitchen')) out.kitchen = 'closed';
  if (has(t, 'مطبخ تحضيري', 'مطبخ تحضير', 'مطبخ خارجي', 'prep kitchen', 'outdoor kitchen'))
    out.prepKitchen = true;
  if (has(t, 'خادمه', 'خادمة', 'عامله', 'عاملة', 'maid')) out.maidRoom = true;
  if (has(t, 'سائق', 'driver')) out.driverRoom = true;
  if (has(t, 'غرفه ضيوف', 'غرفة ضيوف', 'غرفه للضيوف', 'غرفة للضيوف', 'guest room', 'guest bed'))
    out.guestRoom = true;
  if (
    has(
      t,
      'غرفه مكتب',
      'غرفة مكتب',
      'مكتب خاص',
      'مكتب منزلي',
      'غرفه دراسه',
      'غرفة دراسة',
      'غرفه مذاكره',
      'غرفة مذاكرة',
      'home office',
      'study room',
      'a study',
    )
  )
    out.office = true;
  if (has(t, 'مصلى', 'مصلي', 'غرفه صلاه', 'غرفة صلاة', 'prayer room')) out.prayerRoom = true;
  if (has(t, 'نادي رياضي', 'صاله رياضه', 'صالة رياضة', 'جيم', 'gym', 'fitness')) out.gym = true;
  if (has(t, 'مستودع', 'مخزن', 'غرفه تخزين', 'غرفة تخزين', 'storage', 'store room', 'storeroom'))
    out.storage = true;
  if (has(t, 'ملحق', 'روف', 'roof annex')) out.roofAnnex = true;
  if (has(t, 'قبو', 'بدروم', 'basement')) out.basement = true;
  if (has(t, 'مسبح', 'pool')) out.pool = true;
  if (has(t, 'مصعد', 'اسانسير', 'elevator', 'lift')) out.elevator = true;
  if (has(t, 'مدخل ضيوف', 'مدخل مستقل', 'separate guest entr')) out.separateGuestEntry = true;
  if (has(t, 'سلماني', 'salmani')) out.style = 'salmani';
  else if (has(t, 'نجدي', 'najdi')) out.style = 'modern_najdi';
  else if (has(t, 'كلاسيك', 'classic')) out.style = 'classic';
  else if (has(t, 'حديث', 'معاصر', 'contemporary', 'modern')) out.style = 'contemporary';

  const area =
    /(?:مسطح(?:ات)?(?: البناء)?|مساحه البناء|مساحة البناء|built[- ]?up(?: area)?)\D{0,12}(\d{2,5})/.exec(
      t,
    )?.[1] ?? /(\d{2,5})\s*(?:م2|م²|متر مربع|m2|m²|sqm)\s*(?:مسطح|مسطحات|بناء|built)/.exec(t)?.[1];
  if (area && Number(area) >= 40) out.targetAreaM2 = Number(area);

  const budget =
    /(?:ميزانيه|ميزانية|budget)\D{0,15}(\d+(?:\.\d+)?)(?:\s*(?:-|الى|to|و)\s*(\d+(?:\.\d+)?))?\s*(الف|k|مليون|million|m)?(?![a-z])/.exec(
      t,
    );
  if (budget) {
    const mult =
      budget[3] === 'الف' || budget[3] === 'k'
        ? 1000
        : budget[3] === 'مليون' || budget[3] === 'million' || budget[3] === 'm'
          ? 1_000_000
          : 1;
    const a = Number(budget[1]) * mult;
    const b = budget[2] ? Number(budget[2]) * mult : undefined;
    if (a >= 10_000)
      out.budgetSar = b && b >= a ? { min: a, max: b } : { min: Math.round(a * 0.85), max: a };
  }
  return out;
}

/** Plot size from the brief ("أرض 20 × 30", "عرض 20 وعمق 30", "20x30 plot"), width (street side) first. */
export function parsePlotSize(raw: string): { width: number; depth: number } | undefined {
  const t = normalizeBrief(raw);
  const ok = (n: number) => n >= 6 && n <= 200;
  const pair = /(\d{1,3}(?:\.\d+)?)\s*(?:[x×*]|في)\s*(\d{1,3}(?:\.\d+)?)(?!\s*(?:م2|م²|m2))/.exec(
    t,
  );
  if (pair) {
    const width = Number(pair[1]);
    const depth = Number(pair[2]);
    if (ok(width) && ok(depth)) return { width, depth };
  }
  const w = /(?:عرض|واجهه|واجهة|width|frontage)\D{0,12}(\d{1,3}(?:\.\d+)?)/.exec(t)?.[1];
  const d = /(?:عمق|طول|depth)\D{0,12}(\d{1,3}(?:\.\d+)?)/.exec(t)?.[1];
  if (w && d && ok(Number(w)) && ok(Number(d))) return { width: Number(w), depth: Number(d) };
  return undefined;
}

/** The programme fields the brief must state; everything else has a sensible default the client can change. */
export const REQUIRED_PROGRAM = ['type', 'floors', 'bedrooms'] as const;

export function missingItems(p: Partial<Program>): Array<(typeof REQUIRED_PROGRAM)[number]> {
  return REQUIRED_PROGRAM.filter((k) => p[k] === undefined);
}

/** Validates a complete programme (defaults filled). */
export function confirmProgram(p: Partial<Program>) {
  return ProgramSchema.safeParse(p);
}

export type Zone = 'public' | 'service' | 'private' | 'core';

export interface RoomSpec {
  type: RoomType;
  /** Target area in m² (the layout engine scales rooms to fit the band they sit in). */
  area: number;
  zone: Zone;
  /** -1 basement, 0 ground, 1 first, ... ; 'upper' = any floor above ground. */
  floor: number | 'upper';
}

/** Target areas (m²) used by the layout engine; the office can edit any room afterwards. */
export const TARGET_AREA: Partial<Record<RoomType, number>> = {
  majlis_men: 30,
  majlis_women: 25,
  living: 28,
  dining: 18,
  kitchen: 16,
  bedroom: 16,
  master_bedroom: 24,
  bathroom: 6,
  guest_wc: 3.5,
  maid_room: 9,
  driver_room: 9,
  laundry: 5,
  storage: 4,
  entrance: 8,
  guest_room: 16,
  office: 12,
  prayer_room: 10,
  gym: 18,
  prep_kitchen: 9,
  annex_room: 24,
};

/** Private bathrooms when the brief gives no count: one for the master and one for every two other bedrooms. */
export const autoBathrooms = (bedrooms: number) =>
  bedrooms === 0 ? 0 : 1 + Math.floor((bedrooms - 1) / 2);

/** The rooms a programme asks for, with zone and floor preference. */
export function programRooms(p: Program): RoomSpec[] {
  const a = (t: RoomType) => TARGET_AREA[t] ?? 10;
  const rooms: RoomSpec[] = [];
  if (p.type === 'hall') {
    // one large hall at the back, its support rooms by the entrance; offices on any upper floor
    const prof = HALL_PROFILES[p.buildingType ?? ''] ?? HALL_PROFILES.event_hall!;
    const support = prof.rooms.reduce((t, [, m2]) => t + m2, 0);
    const hall = p.targetAreaM2
      ? Math.max(prof.hall / 2, p.targetAreaM2 / p.floors - support)
      : prof.hall;
    rooms.push({ type: 'hall', area: hall, zone: 'service', floor: 0 });
    for (const [type, m2, at] of prof.rooms)
      rooms.push({ type, area: m2, zone: at === 'front' ? 'public' : 'service', floor: 0 });
    for (let f = 1; f < p.floors; f++)
      rooms.push(
        { type: 'office', area: 40, zone: 'private', floor: f },
        { type: 'office', area: 40, zone: 'private', floor: f },
        { type: 'wc_men', area: 8, zone: 'private', floor: f },
      );
    return rooms;
  }
  if (p.type === 'apartments' || p.type === 'commercial') {
    const prof = UNIT_PROFILES[p.buildingType ?? ''] ?? {
      ground: [p.type === 'commercial' ? 'shop' : 'apartment', 120] as [RoomType, number],
      upper: ['apartment', 120] as [RoomType, number],
    };
    if (prof.lobby) rooms.push({ type: 'reception', area: prof.lobby, zone: 'public', floor: 0 });
    for (let f = 0; f < p.floors; f++) {
      const [type, m2] = f === 0 ? prof.ground : prof.upper;
      for (let u = 0; u < p.unitsPerFloor; u++)
        rooms.push({ type, area: m2, zone: 'private', floor: f });
    }
    return rooms;
  }
  rooms.push({ type: 'entrance', area: a('entrance'), zone: 'public', floor: 0 });
  if (p.majlisMen)
    rooms.push({ type: 'majlis_men', area: a('majlis_men'), zone: 'public', floor: 0 });
  if (p.majlisWomen)
    rooms.push({ type: 'majlis_women', area: a('majlis_women'), zone: 'public', floor: 0 });
  rooms.push({ type: 'guest_wc', area: a('guest_wc'), zone: 'public', floor: 0 });
  if (p.guestRoom)
    rooms.push({ type: 'guest_room', area: a('guest_room'), zone: 'public', floor: 0 });
  if (p.prayerRoom)
    rooms.push({ type: 'prayer_room', area: a('prayer_room'), zone: 'public', floor: 0 });
  if (p.dining) rooms.push({ type: 'dining', area: a('dining'), zone: 'service', floor: 0 });
  rooms.push({ type: 'kitchen', area: a('kitchen'), zone: 'service', floor: 0 });
  if (p.prepKitchen)
    rooms.push({ type: 'prep_kitchen', area: a('prep_kitchen'), zone: 'service', floor: 0 });
  if (p.storage) rooms.push({ type: 'storage', area: a('storage'), zone: 'service', floor: 0 });
  if (p.maidRoom) {
    rooms.push({ type: 'maid_room', area: a('maid_room'), zone: 'service', floor: 0 });
    rooms.push({ type: 'bathroom', area: 4, zone: 'service', floor: 0 });
  }
  if (p.driverRoom)
    rooms.push({ type: 'driver_room', area: a('driver_room'), zone: 'service', floor: 0 });
  rooms.push({ type: 'laundry', area: a('laundry'), zone: 'service', floor: 0 });
  const single = p.floors === 1;
  if (p.familyLiving)
    rooms.push({ type: 'living', area: a('living'), zone: 'private', floor: single ? 0 : 'upper' });
  const where = single ? 0 : ('upper' as const);
  if (p.office) rooms.push({ type: 'office', area: a('office'), zone: 'private', floor: where });
  if (p.gym) rooms.push({ type: 'gym', area: a('gym'), zone: 'private', floor: where });
  // the client's count includes the guest WC; without a count: the master's and one per two other bedrooms
  const baths =
    p.bathrooms !== undefined
      ? Math.max(p.bedrooms > 0 ? 1 : 0, p.bathrooms - 1)
      : autoBathrooms(p.bedrooms);
  const bathAfter = (i: number) => (p.bathrooms !== undefined ? i < baths : i === 0 || i % 2 === 0);
  for (let i = 0; i < p.bedrooms; i++) {
    const master = i === 0;
    rooms.push({
      type: master ? 'master_bedroom' : 'bedroom',
      area: a(master ? 'master_bedroom' : 'bedroom'),
      zone: 'private',
      floor: where,
    });
    if (bathAfter(i))
      rooms.push({ type: 'bathroom', area: a('bathroom'), zone: 'private', floor: where });
  }
  // more bathrooms than bedrooms: the rest serve the family hall
  for (let i = p.bedrooms; i < baths; i++)
    rooms.push({ type: 'bathroom', area: 4.5, zone: 'private', floor: where });
  return rooms;
}
