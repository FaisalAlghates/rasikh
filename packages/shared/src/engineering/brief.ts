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

/** Arabic-Indic digits to Latin, alef variants unified, diacritics dropped, lower-cased. */
export function normalizeBrief(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[ً-ٰٟـ]/g, '')
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

export function parseBrief(raw: string): Partial<Program> {
  const t = normalizeBrief(raw);
  const out: Partial<Program> = {};
  if (has(t, 'دوبلكس', 'duplex')) out.type = 'duplex';
  else if (has(t, 'تاون', 'townhouse')) out.type = 'townhouse';
  else if (has(t, 'عماره', 'عمارة', 'شقق', 'apartment')) out.type = 'apartments';
  else if (has(t, 'محل', 'تجاري', 'commercial', 'shop')) out.type = 'commercial';
  else if (has(t, 'فيلا', 'فله', 'villa')) out.type = 'villa';

  const floors = count(t, 'ادوار|دور|طوابق|طابق|floors?|storeys?|stories');
  if (floors) out.floors = floors;
  else if (has(t, 'دورين', 'طابقين')) out.floors = 2;
  else if (has(t, 'دور واحد', 'دور ارضي', 'طابق واحد', 'one floor', 'single storey'))
    out.floors = 1;
  const bedrooms = count(t, 'غرف نوم|غرفه نوم|غرفة نوم|غرف|bedrooms?|beds?');
  if (bedrooms !== undefined) out.bedrooms = bedrooms;
  else if (has(t, 'غرفتين نوم', 'غرفتين')) out.bedrooms = 2;
  const parking = count(t, 'مواقف|موقف|سيارات|parking|cars?');
  if (parking !== undefined) out.parking = parking;
  const units = count(t, 'شقق في الدور|شقق بالدور|شقه في الدور|units? per floor');
  if (units) out.unitsPerFloor = units;

  if (has(t, 'مجلس رجال', 'majlis for men', "men's majlis")) out.majlisMen = true;
  if (has(t, 'مجلس نساء', 'مجلس حريم', 'مجلس النساء', "women's majlis")) out.majlisWomen = true;
  if (has(t, 'مطبخ مفتوح', 'open kitchen')) out.kitchen = 'open';
  if (has(t, 'مطبخ مغلق', 'closed kitchen')) out.kitchen = 'closed';
  if (has(t, 'خادمه', 'خادمة', 'عامله', 'عاملة', 'maid')) out.maidRoom = true;
  if (has(t, 'سائق', 'driver')) out.driverRoom = true;
  if (has(t, 'ملحق', 'روف', 'roof annex')) out.roofAnnex = true;
  if (has(t, 'قبو', 'بدروم', 'basement')) out.basement = true;
  if (has(t, 'مسبح', 'pool')) out.pool = true;
  if (has(t, 'مصعد', 'اسانسير', 'elevator', 'lift')) out.elevator = true;
  if (has(t, 'مدخل ضيوف', 'مدخل مستقل', 'separate guest entr')) out.separateGuestEntry = true;
  if (has(t, 'سلماني', 'salmani')) out.style = 'salmani';
  else if (has(t, 'نجدي', 'najdi')) out.style = 'modern_najdi';
  else if (has(t, 'كلاسيك', 'classic')) out.style = 'classic';
  else if (has(t, 'حديث', 'معاصر', 'contemporary', 'modern')) out.style = 'contemporary';
  return out;
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
};

/** The rooms a programme asks for, with zone and floor preference. */
export function programRooms(p: Program): RoomSpec[] {
  const a = (t: RoomType) => TARGET_AREA[t] ?? 10;
  const rooms: RoomSpec[] = [];
  if (p.type === 'apartments' || p.type === 'commercial') {
    for (let f = 0; f < p.floors; f++) {
      for (let u = 0; u < p.unitsPerFloor; u++) {
        rooms.push({
          type: f === 0 && p.type === 'commercial' ? 'shop' : 'apartment',
          area: 120,
          zone: 'private',
          floor: f,
        });
      }
    }
    return rooms;
  }
  rooms.push({ type: 'entrance', area: a('entrance'), zone: 'public', floor: 0 });
  if (p.majlisMen)
    rooms.push({ type: 'majlis_men', area: a('majlis_men'), zone: 'public', floor: 0 });
  if (p.majlisWomen)
    rooms.push({ type: 'majlis_women', area: a('majlis_women'), zone: 'public', floor: 0 });
  rooms.push({ type: 'guest_wc', area: a('guest_wc'), zone: 'public', floor: 0 });
  if (p.dining) rooms.push({ type: 'dining', area: a('dining'), zone: 'service', floor: 0 });
  rooms.push({ type: 'kitchen', area: a('kitchen'), zone: 'service', floor: 0 });
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
  for (let i = 0; i < p.bedrooms; i++) {
    const master = i === 0;
    rooms.push({
      type: master ? 'master_bedroom' : 'bedroom',
      area: a(master ? 'master_bedroom' : 'bedroom'),
      zone: 'private',
      floor: single ? 0 : 'upper',
    });
    // a bathroom for the master and one for every two other bedrooms
    if (master || i % 2 === 0)
      rooms.push({
        type: 'bathroom',
        area: a('bathroom'),
        zone: 'private',
        floor: single ? 0 : 'upper',
      });
  }
  return rooms;
}
