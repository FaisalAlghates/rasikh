import type { Program, RoomType } from './schemas.js';

/**
 * What may be built where. A plot's land use comes from its approved local plan (المخطط المعتمد) and the Amanah's
 * planning report; the default matrix below says which building types each land use takes, and an Amanah's own
 * requirements may narrow it (zoning.allowedTypes). The office confirms the land use from the plot's documents.
 *
 * Each building type maps to one engine family: houses, apartment-type buildings (flats, hotel rooms, studios),
 * unit buildings (shops, offices, clinics), halls (one large space with its support rooms) — or 'specialist' for
 * buildings whose design needs specialist engineering (hospitals, airports, factories ...): Rasikh checks their land
 * use and requirements but does not draw concepts for them.
 */

export const LAND_USES = [
  'residential',
  'commercial',
  'agricultural',
  'industrial',
  'investment',
  'public',
] as const;
export type LandUse = (typeof LAND_USES)[number];
export type Family = 'house' | 'apartments' | 'commercial' | 'hall' | 'specialist';

/** id, family, land uses (r c a i v p), SBC occupancy group. */
const ROWS: Array<[string, Family, string, string]> = [
  // houses
  ['villa', 'house', 'r', 'R3'],
  ['palace', 'house', 'r', 'R3'],
  ['detached_house', 'house', 'r', 'R3'],
  ['attached_house', 'house', 'r', 'R3'],
  ['folk_house', 'house', 'r', 'R3'],
  ['rural_house', 'house', 'ra', 'R3'],
  ['duplex', 'house', 'r', 'R3'],
  ['townhouse', 'house', 'r', 'R3'],
  ['istiraha', 'house', 'rav', 'R3'],
  ['chalet', 'house', 'av', 'R3'],
  ['farm', 'house', 'a', 'R3'],
  // flats, hotel rooms, studios
  ['apartments', 'apartments', 'rc', 'R2'],
  ['residential_building', 'apartments', 'rc', 'R2'],
  ['studios', 'apartments', 'rcv', 'R2'],
  ['penthouse', 'apartments', 'rc', 'R2'],
  ['hotel_apartments', 'apartments', 'cv', 'R1'],
  ['hotel_apartments_rent', 'apartments', 'cv', 'R1'],
  ['hotel', 'apartments', 'cv', 'R1'],
  ['motel', 'apartments', 'cv', 'R1'],
  ['lodge', 'apartments', 'cv', 'R1'],
  // unit buildings
  ['commercial_building', 'commercial', 'c', 'M'],
  ['mixed_use', 'commercial', 'cv', 'M'],
  ['mixed_unit', 'commercial', 'cv', 'M'],
  ['office_building', 'commercial', 'c', 'B'],
  ['admin_offices', 'commercial', 'c', 'B'],
  ['admin_unit', 'commercial', 'c', 'B'],
  ['company_hq', 'commercial', 'cv', 'B'],
  ['shops', 'commercial', 'c', 'M'],
  ['commercial_unit', 'commercial', 'c', 'M'],
  ['commercial_complex', 'commercial', 'cv', 'M'],
  ['clinic', 'commercial', 'c', 'B'],
  ['medical_center', 'commercial', 'cp', 'B'],
  ['lab', 'commercial', 'cp', 'B'],
  ['pharmacy', 'commercial', 'c', 'M'],
  ['education_center', 'commercial', 'cp', 'E'],
  ['training_institute', 'commercial', 'cp', 'E'],
  ['nursery', 'commercial', 'rcp', 'E'],
  // halls
  ['showroom', 'hall', 'c', 'M'],
  ['car_showroom', 'hall', 'ci', 'M'],
  ['folk_market', 'hall', 'c', 'M'],
  ['wedding_hall', 'hall', 'cv', 'A-2'],
  ['event_hall', 'hall', 'cv', 'A-2'],
  ['conference_hall', 'hall', 'cv', 'A-3'],
  ['gym', 'hall', 'c', 'A-3'],
  ['sports_club', 'hall', 'cvp', 'A-3'],
  ['entertainment_center', 'hall', 'cv', 'A-3'],
  ['restaurant', 'hall', 'c', 'A-2'],
  ['cafe', 'hall', 'c', 'A-2'],
  ['central_kitchen', 'hall', 'ic', 'F-1'],
  ['warehouse', 'hall', 'ic', 'S-1'],
  ['storehouse', 'hall', 'ica', 'S-1'],
  ['workshop', 'hall', 'i', 'F-1'],
  ['industrial_unit', 'hall', 'i', 'F-1'],
  ['car_service', 'hall', 'ic', 'S-1'],
  ['mosque', 'hall', 'p', 'A-3'],
  ['religious_center', 'hall', 'p', 'A-3'],
  ['investment_farm', 'hall', 'av', 'U'],
  ['livestock_farm', 'hall', 'a', 'U'],
  ['crop_farm', 'hall', 'a', 'U'],
  // specialist design
  ['mall', 'specialist', 'cv', 'M'],
  ['logistics_center', 'specialist', 'i', 'S-1'],
  ['factory', 'specialist', 'i', 'F-1'],
  ['industrial_complex', 'specialist', 'i', 'F-1'],
  ['fuel_station', 'specialist', 'ci', 'H'],
  ['parking', 'specialist', 'cp', 'S-2'],
  ['parking_structure', 'specialist', 'cp', 'S-2'],
  ['sports_field', 'specialist', 'pv', 'A-5'],
  ['amusement_park', 'specialist', 'v', 'A-5'],
  ['resort', 'specialist', 'v', 'R1'],
  ['camp', 'specialist', 'va', 'R1'],
  ['hospital', 'specialist', 'pc', 'I-2'],
  ['medical_complex', 'specialist', 'cp', 'B'],
  ['school', 'specialist', 'p', 'E'],
  ['university', 'specialist', 'p', 'B'],
  ['government', 'specialist', 'p', 'B'],
  ['institution_hq', 'specialist', 'pc', 'B'],
  ['embassy', 'specialist', 'p', 'B'],
  ['police', 'specialist', 'p', 'B'],
  ['court', 'specialist', 'p', 'B'],
  ['prison', 'specialist', 'p', 'I-3'],
  ['transport_station', 'specialist', 'p', 'A-3'],
  ['bus_station', 'specialist', 'p', 'A-3'],
  ['train_station', 'specialist', 'p', 'A-3'],
  ['airport', 'specialist', 'p', 'A-3'],
  ['port', 'specialist', 'pi', 'S-1'],
  ['data_center', 'specialist', 'ic', 'B'],
  ['telecom_tower', 'specialist', 'pci', 'U'],
];

const USE: Record<string, LandUse> = {
  r: 'residential',
  c: 'commercial',
  a: 'agricultural',
  i: 'industrial',
  v: 'investment',
  p: 'public',
};

export interface CatalogEntry {
  id: string;
  family: Family;
  landUses: LandUse[];
  occupancy: string;
}

export const CATALOG: CatalogEntry[] = ROWS.map(([id, family, uses, occupancy]) => ({
  id,
  family,
  landUses: [...uses].map((c) => USE[c]!),
  occupancy,
}));
export const BUILDING_KINDS = CATALOG.map((c) => c.id);
export const catalogEntry = (id: string | undefined) => CATALOG.find((c) => c.id === id);

/** Market and condition labels a property may carry (they do not change the design, except heritage ones). */
export const PROPERTY_TAGS = [
  'for_sale',
  'for_rent',
  'off_plan',
  'under_construction',
  'ready',
  'investment',
  'luxury',
  'heritage',
  'historic',
  'abandoned',
  'damaged',
  'shared_ownership',
  'furnished',
  'unfurnished',
  'sea_front',
  'river_front',
  'marine',
] as const;
export type PropertyTag = (typeof PROPERTY_TAGS)[number];
/** Tags that make a project a renovation or restoration. */
export const RENOVATION_TAGS: readonly PropertyTag[] = [
  'heritage',
  'historic',
  'abandoned',
  'damaged',
];

/** The engine's building type for a catalogue entry (null: specialist design). */
export function engineTypeOf(id: string | undefined): Program['type'] | null {
  const e = catalogEntry(id);
  if (!e) return null;
  if (e.family === 'house')
    return id === 'duplex'
      ? 'duplex'
      : id === 'townhouse' || id === 'attached_house'
        ? 'townhouse'
        : 'villa';
  if (e.family === 'apartments') return 'apartments';
  if (e.family === 'commercial') return 'commercial';
  if (e.family === 'hall') return 'hall';
  return null;
}

/** May this building type stand on this land use (by the Amanah's narrower list when it has one)? */
export function allowedOn(id: string, landUse: LandUse, allowedTypes?: readonly string[]): boolean {
  if (allowedTypes?.length) return allowedTypes.includes(id);
  return !!catalogEntry(id)?.landUses.includes(landUse);
}

/** A sensible starting programme for a building type (the client changes any of it). */
export function familyDefaults(id: string): Partial<Program> {
  const e = catalogEntry(id);
  const base: Partial<Program> = { buildingType: id, type: engineTypeOf(id) ?? 'commercial' };
  switch (id) {
    case 'palace':
      return {
        ...base,
        floors: 2,
        bedrooms: 8,
        majlisWomen: true,
        maidRoom: true,
        driverRoom: true,
        elevator: true,
      };
    case 'istiraha':
      return { ...base, floors: 1, bedrooms: 1, pool: true, familyLiving: false };
    case 'chalet':
      return { ...base, floors: 1, bedrooms: 2, pool: true };
    case 'folk_house':
    case 'rural_house':
    case 'farm':
      return { ...base, floors: 1, bedrooms: 3 };
  }
  switch (e?.family) {
    case 'house':
      return { ...base, floors: 2, bedrooms: 4 };
    case 'apartments':
      return {
        ...base,
        floors: 4,
        bedrooms: 0,
        unitsPerFloor:
          id === 'studios' ? 6 : id.startsWith('hotel') || id === 'motel' || id === 'lodge' ? 8 : 2,
        elevator: true,
      };
    case 'commercial':
      return {
        ...base,
        floors: 3,
        bedrooms: 0,
        unitsPerFloor: 3,
        elevator: true,
        majlisMen: false,
      };
    case 'hall':
      return {
        ...base,
        floors: 1,
        bedrooms: 0,
        majlisMen: false,
        dining: false,
        familyLiving: false,
      };
    default:
      return { ...base, floors: 1, bedrooms: 0, majlisMen: false };
  }
}

/** Units of apartment-type and unit buildings: the ground floor's and the upper floors' unit, and a lobby. */
export const UNIT_PROFILES: Record<
  string,
  { ground: [RoomType, number]; upper: [RoomType, number]; lobby?: number }
> = {
  apartments: { ground: ['apartment', 120], upper: ['apartment', 120] },
  residential_building: { ground: ['apartment', 120], upper: ['apartment', 120] },
  penthouse: { ground: ['apartment', 160], upper: ['apartment', 160] },
  studios: { ground: ['apartment', 45], upper: ['apartment', 45] },
  hotel_apartments: { ground: ['apartment', 70], upper: ['apartment', 70], lobby: 60 },
  hotel_apartments_rent: { ground: ['apartment', 70], upper: ['apartment', 70], lobby: 60 },
  hotel: { ground: ['hotel_room', 32], upper: ['hotel_room', 32], lobby: 80 },
  motel: { ground: ['hotel_room', 28], upper: ['hotel_room', 28], lobby: 30 },
  lodge: { ground: ['hotel_room', 30], upper: ['hotel_room', 30], lobby: 40 },
  commercial_building: { ground: ['shop', 80], upper: ['office', 100] },
  mixed_use: { ground: ['shop', 80], upper: ['apartment', 110] },
  mixed_unit: { ground: ['shop', 80], upper: ['apartment', 110] },
  office_building: { ground: ['office', 100], upper: ['office', 100], lobby: 40 },
  admin_offices: { ground: ['office', 100], upper: ['office', 100], lobby: 40 },
  admin_unit: { ground: ['office', 80], upper: ['office', 80], lobby: 30 },
  company_hq: { ground: ['office', 120], upper: ['office', 120], lobby: 60 },
  shops: { ground: ['shop', 60], upper: ['office', 80] },
  commercial_unit: { ground: ['shop', 60], upper: ['office', 80] },
  commercial_complex: { ground: ['shop', 60], upper: ['office', 80] },
  clinic: { ground: ['office', 60], upper: ['office', 60], lobby: 30 },
  medical_center: { ground: ['office', 60], upper: ['office', 60], lobby: 40 },
  lab: { ground: ['office', 60], upper: ['office', 60], lobby: 30 },
  pharmacy: { ground: ['shop', 80], upper: ['office', 60] },
  education_center: { ground: ['office', 60], upper: ['office', 60], lobby: 30 },
  training_institute: { ground: ['office', 60], upper: ['office', 60], lobby: 30 },
  nursery: { ground: ['office', 50], upper: ['office', 50], lobby: 30 },
};

/** A hall building: the hall's area and its support rooms ([type, m², by the entrance or at the back]). */
export const HALL_PROFILES: Record<
  string,
  { hall: number; rooms: Array<[RoomType, number, 'front' | 'back']> }
> = {
  wedding_hall: {
    hall: 500,
    rooms: [
      ['entrance', 20, 'front'],
      ['reception', 40, 'front'],
      ['wc_men', 15, 'front'],
      ['wc_women', 15, 'front'],
      ['office', 12, 'front'],
      ['kitchen', 40, 'back'],
      ['storage', 15, 'back'],
    ],
  },
  event_hall: {
    hall: 400,
    rooms: [
      ['entrance', 20, 'front'],
      ['reception', 35, 'front'],
      ['wc_men', 14, 'front'],
      ['wc_women', 14, 'front'],
      ['office', 12, 'front'],
      ['kitchen', 35, 'back'],
      ['storage', 15, 'back'],
    ],
  },
  conference_hall: {
    hall: 300,
    rooms: [
      ['entrance', 15, 'front'],
      ['reception', 30, 'front'],
      ['wc_men', 12, 'front'],
      ['wc_women', 12, 'front'],
      ['office', 12, 'front'],
      ['storage', 10, 'back'],
    ],
  },
  gym: {
    hall: 400,
    rooms: [
      ['entrance', 12, 'front'],
      ['reception', 20, 'front'],
      ['wc_men', 18, 'front'],
      ['wc_women', 18, 'front'],
      ['office', 12, 'front'],
      ['storage', 12, 'back'],
    ],
  },
  sports_club: {
    hall: 500,
    rooms: [
      ['entrance', 15, 'front'],
      ['reception', 25, 'front'],
      ['wc_men', 20, 'front'],
      ['wc_women', 20, 'front'],
      ['office', 15, 'front'],
      ['storage', 15, 'back'],
    ],
  },
  entertainment_center: {
    hall: 400,
    rooms: [
      ['entrance', 15, 'front'],
      ['reception', 25, 'front'],
      ['wc_men', 12, 'front'],
      ['wc_women', 12, 'front'],
      ['office', 12, 'front'],
      ['storage', 15, 'back'],
    ],
  },
  mosque: {
    hall: 300,
    rooms: [
      ['entrance', 12, 'front'],
      ['ablution', 20, 'front'],
      ['wc_women', 10, 'front'],
      ['office', 12, 'front'],
      ['storage', 8, 'back'],
    ],
  },
  religious_center: {
    hall: 250,
    rooms: [
      ['entrance', 12, 'front'],
      ['ablution', 15, 'front'],
      ['wc_women', 10, 'front'],
      ['office', 15, 'front'],
      ['storage', 10, 'back'],
    ],
  },
  restaurant: {
    hall: 150,
    rooms: [
      ['entrance', 10, 'front'],
      ['wc_men', 6, 'front'],
      ['wc_women', 6, 'front'],
      ['kitchen', 45, 'back'],
      ['storage', 12, 'back'],
    ],
  },
  cafe: {
    hall: 90,
    rooms: [
      ['entrance', 8, 'front'],
      ['wc_men', 4, 'front'],
      ['wc_women', 4, 'front'],
      ['kitchen', 18, 'back'],
      ['storage', 8, 'back'],
    ],
  },
  central_kitchen: {
    hall: 300,
    rooms: [
      ['entrance', 10, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 8, 'front'],
      ['storage', 50, 'back'],
      ['loading', 30, 'back'],
    ],
  },
  warehouse: {
    hall: 600,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 15, 'front'],
      ['wc_men', 8, 'front'],
      ['loading', 40, 'back'],
    ],
  },
  storehouse: {
    hall: 400,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 6, 'front'],
      ['loading', 30, 'back'],
    ],
  },
  workshop: {
    hall: 400,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 15, 'front'],
      ['wc_men', 8, 'front'],
      ['storage', 20, 'back'],
    ],
  },
  industrial_unit: {
    hall: 300,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 6, 'front'],
      ['storage', 20, 'back'],
    ],
  },
  car_service: {
    hall: 400,
    rooms: [
      ['entrance', 10, 'front'],
      ['reception', 15, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 8, 'front'],
      ['storage', 25, 'back'],
    ],
  },
  showroom: {
    hall: 300,
    rooms: [
      ['entrance', 12, 'front'],
      ['reception', 15, 'front'],
      ['office', 15, 'front'],
      ['wc_men', 8, 'front'],
      ['storage', 15, 'back'],
    ],
  },
  car_showroom: {
    hall: 400,
    rooms: [
      ['entrance', 12, 'front'],
      ['reception', 20, 'front'],
      ['office', 15, 'front'],
      ['wc_men', 8, 'front'],
      ['storage', 15, 'back'],
    ],
  },
  folk_market: {
    hall: 400,
    rooms: [
      ['entrance', 15, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 10, 'front'],
      ['wc_women', 10, 'front'],
      ['storage', 20, 'back'],
    ],
  },
  investment_farm: {
    hall: 400,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 6, 'front'],
      ['storage', 40, 'back'],
    ],
  },
  livestock_farm: {
    hall: 500,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 6, 'front'],
      ['storage', 40, 'back'],
    ],
  },
  crop_farm: {
    hall: 300,
    rooms: [
      ['entrance', 8, 'front'],
      ['office', 12, 'front'],
      ['wc_men', 6, 'front'],
      ['storage', 60, 'back'],
    ],
  },
};

const KEYWORDS: Array<[string[], string]> = [
  [['قصر'], 'palace'],
  [['استراحه', 'استراحة'], 'istiraha'],
  [['شاليه', 'شاليهات'], 'chalet'],
  [['بيت شعبي', 'بيوت شعبيه', 'بيوت شعبية'], 'folk_house'],
  [['بيت ريفي', 'بيوت ريفيه', 'بيوت ريفية'], 'rural_house'],
  [['منزل مستقل', 'منازل مستقله', 'منازل مستقلة'], 'detached_house'],
  [['منزل متلاصق', 'منازل متلاصقه', 'منازل متلاصقة'], 'attached_house'],
  [['بنتهاوس'], 'penthouse'],
  [['استوديو', 'استديو'], 'studios'],
  [['شقق فندقيه للايجار', 'شقق فندقية للايجار'], 'hotel_apartments_rent'],
  [['شقق فندقيه', 'شقق فندقية'], 'hotel_apartments'],
  [['موتيل'], 'motel'],
  [['نزل سياحي', 'نزل سياحيه', 'نزل سياحية'], 'lodge'],
  [['فندق'], 'hotel'],
  [['عماره تجاريه', 'عمارة تجارية', 'عمائر تجاريه', 'عمائر تجارية'], 'commercial_building'],
  [['متعدد الاستخدام', 'متعددة الاستخدام', 'متعدده الاستخدام'], 'mixed_use'],
  [['مقر شركه', 'مقر شركة', 'مقرات شركات'], 'company_hq'],
  [
    ['مكاتب اداريه', 'مكاتب ادارية', 'مبنى مكتبي', 'مباني مكتبيه', 'مباني مكتبية'],
    'office_building',
  ],
  [['معرض سيارات', 'معارض سيارات'], 'car_showroom'],
  [['مركز صيانه', 'مركز صيانة', 'صيانة سيارات'], 'car_service'],
  [['محطه وقود', 'محطة وقود', 'محطات وقود'], 'fuel_station'],
  [['مواقف متعدده', 'مواقف متعددة'], 'parking_structure'],
  [['مركز تسوق', 'مراكز تسوق', ' مول'], 'mall'],
  [['مجمع تجاري', 'مجمعات تجاريه', 'مجمعات تجارية'], 'commercial_complex'],
  [['سوق شعبي', 'اسواق شعبيه', 'اسواق شعبية'], 'folk_market'],
  [['معرض تجاري', 'معارض تجاريه', 'معارض تجارية'], 'showroom'],
  [['مطبخ مركزي', 'مطابخ مركزيه', 'مطابخ مركزية'], 'central_kitchen'],
  [['قاعه افراح', 'قاعة افراح', 'قاعات افراح'], 'wedding_hall'],
  [['صاله مناسبات', 'صالة مناسبات', 'قاعة مناسبات', 'صالات مناسبات'], 'event_hall'],
  [['قاعه مؤتمرات', 'قاعة مؤتمرات', 'قاعات مؤتمرات'], 'conference_hall'],
  [['مدينه العاب', 'مدينة العاب', 'مدن العاب'], 'amusement_park'],
  [['مركز ترفيه', 'مراكز ترفيهيه', 'مراكز ترفيهية'], 'entertainment_center'],
  [['ملعب', 'ملاعب'], 'sports_field'],
  [['مجمع طبي', 'مجمعات طبيه', 'مجمعات طبية'], 'medical_complex'],
  [['مركز طبي', 'مراكز طبيه', 'مراكز طبية'], 'medical_center'],
  [['مستشفى', 'مستشفيات'], 'hospital'],
  [['عياده', 'عيادة', 'عيادات'], 'clinic'],
  [['صيدليه', 'صيدلية', 'صيدليات'], 'pharmacy'],
  [['مختبر', 'مختبرات'], 'lab'],
  [['مدرسه', 'مدرسة', 'مدارس'], 'school'],
  [['جامعه', 'جامعة', 'جامعات'], 'university'],
  [['معهد', 'معاهد'], 'training_institute'],
  [['حضانه', 'حضانة', 'حضانات'], 'nursery'],
  [['مركز تعليمي', 'مراكز تعليميه', 'مراكز تعليمية'], 'education_center'],
  [['مسجد', 'جامع', 'مساجد'], 'mosque'],
  [['مركز ديني', 'مراكز دينيه', 'مراكز دينية'], 'religious_center'],
  [['سفاره', 'سفارة', 'سفارات'], 'embassy'],
  [['مركز شرطه', 'مركز شرطة', 'مراكز شرطة'], 'police'],
  [['محكمه', 'محكمة', 'محاكم'], 'court'],
  [['سجن', 'سجون'], 'prison'],
  [['محطة حافلات', 'محطه حافلات', 'محطات حافلات'], 'bus_station'],
  [['محطة قطار', 'محطه قطار', 'محطات قطارات'], 'train_station'],
  [['محطة نقل', 'محطات نقل'], 'transport_station'],
  [['مطار', 'مطارات'], 'airport'],
  [['ميناء', 'موانئ'], 'port'],
  [['مركز بيانات', 'مراكز بيانات'], 'data_center'],
  [['برج اتصالات', 'ابراج اتصالات'], 'telecom_tower'],
  [['مبنى حكومي', 'مباني حكوميه', 'مباني حكومية'], 'government'],
  [['منتجع', 'منتجعات'], 'resort'],
  [['مخيم', 'مخيمات'], 'camp'],
  [['مزرعه حيوانيه', 'مزرعة حيوانية', 'مزارع حيوانية'], 'livestock_farm'],
  [['مزرعه استثماريه', 'مزرعة استثمارية', 'مزارع استثمارية'], 'investment_farm'],
  [['مزرعه زراعيه', 'مزرعة زراعية', 'مزارع زراعية'], 'crop_farm'],
  [['مزرعه', 'مزرعة', 'مزارع'], 'farm'],
  [['مصنع', 'مصانع'], 'factory'],
  [['مجمع صناعي', 'مجمعات صناعيه', 'مجمعات صناعية'], 'industrial_complex'],
  [['ورشه', 'ورشة', 'ورش'], 'workshop'],
  [['مركز لوجستي', 'مراكز لوجستيه', 'مراكز لوجستية'], 'logistics_center'],
  [['مستودعات'], 'warehouse'],
  [['مخازن'], 'storehouse'],
  [['مطعم', 'مطاعم'], 'restaurant'],
  [['مقهى', 'كافيه', 'مقاهي'], 'cafe'],
  [['محلات تجاريه', 'محلات تجارية'], 'shops'],
];
/** Words that are a room in a house brief (a gym, a store) but the building itself otherwise. */
const HOUSE_WORDS = ['فيلا', 'فله', 'بيت', 'منزل', 'دوبلكس', 'قصر', 'استراحه', 'استراحة', 'شاليه'];
const IN_HOUSE: Array<[string[], string]> = [
  [['نادي رياضي', 'صاله رياضيه', 'صالة رياضية'], 'gym'],
  [['مستودع'], 'warehouse'],
];

/** The building type a (normalized) brief names, if any. */
export function kindFromBrief(t: string): string | undefined {
  for (const [words, id] of KEYWORDS) if (words.some((w) => t.includes(w))) return id;
  if (!HOUSE_WORDS.some((w) => t.includes(w)))
    for (const [words, id] of IN_HOUSE) if (words.some((w) => t.includes(w))) return id;
  return undefined;
}

const LAND_WORDS: Array<[string[], LandUse]> = [
  [['ارض تجاريه', 'ارض تجارية', 'اراضي تجارية'], 'commercial'],
  [['ارض زراعيه', 'ارض زراعية', 'اراضي زراعية'], 'agricultural'],
  [['ارض صناعيه', 'ارض صناعية', 'اراضي صناعية'], 'industrial'],
  [['ارض استثماريه', 'ارض استثمارية', 'اراضي استثمارية'], 'investment'],
  [['ارض سكنيه', 'ارض سكنية', 'اراضي سكنية'], 'residential'],
];
export const landUseFromBrief = (t: string): LandUse | undefined =>
  LAND_WORDS.find(([w]) => w.some((x) => t.includes(x)))?.[1];

const TAG_WORDS: Array<[string[], PropertyTag]> = [
  [['للبيع'], 'for_sale'],
  [['للايجار'], 'for_rent'],
  [['على الخارطه', 'على الخارطة'], 'off_plan'],
  [['تحت الانشاء'], 'under_construction'],
  [['جاهز للسكن', 'جاهزه للسكن', 'جاهزة للسكن'], 'ready'],
  [['فاخر', 'فاخره', 'فاخرة'], 'luxury'],
  [['تراثي', 'تراثيه', 'تراثية'], 'heritage'],
  [['تاريخي', 'تاريخيه', 'تاريخية'], 'historic'],
  [['مهجور', 'مهجوره', 'مهجورة'], 'abandoned'],
  [['متضرر', 'متضرره', 'متضررة'], 'damaged'],
  [['ملكيه مشتركه', 'ملكية مشتركة'], 'shared_ownership'],
  [['غير مفروش', 'غير مفروشه', 'غير مفروشة'], 'unfurnished'],
  [['واجهه بحريه', 'واجهة بحرية'], 'sea_front'],
  [['واجهه نهريه', 'واجهة نهرية'], 'river_front'],
];
export function tagsFromBrief(t: string): PropertyTag[] {
  const out = TAG_WORDS.filter(([w]) => w.some((x) => t.includes(x))).map(([, tag]) => tag);
  if (!out.includes('unfurnished') && /مفروش/.test(t)) out.push('furnished');
  if (/استثمار/.test(t)) out.push('investment');
  if (/بحري/.test(t) && !out.includes('sea_front')) out.push('marine');
  return [...new Set(out)];
}
