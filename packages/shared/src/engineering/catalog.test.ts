import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  allowedOn,
  checkOption,
  confirmProgram,
  engineTypeOf,
  familyDefaults,
  normalizeBrief,
  parseBrief,
  programRooms,
  searchOptions,
  type LandUse,
  type Plot,
  type Program,
  type Zoning,
} from '../index.js';

const zoning: Zoning = {
  use: 'residential',
  setbacks: { front: 3, back: 2, left: 2, right: 2 },
  coverageMax: 0.7,
  farMax: 2.5,
  maxFloors: 4,
  maxHeightM: 18,
  parkingPerUnit: 1,
};
const plot = (landUse: LandUse, w = 30, d = 40): Plot => ({
  width: w,
  depth: d,
  streets: { front: 20, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
  landUse,
});
const program = (kind: string, over: Partial<Program> = {}) =>
  confirmProgram({ ...familyDefaults(kind), parking: 6, ...over }).data!;

describe('what may be built where', () => {
  it('maps every kind of property the platform names to a family and its land uses', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(85);
    for (const c of CATALOG) expect(c.landUses.length).toBeGreaterThan(0);
    expect(engineTypeOf('palace')).toBe('villa');
    expect(engineTypeOf('hotel')).toBe('apartments');
    expect(engineTypeOf('wedding_hall')).toBe('hall');
    expect(engineTypeOf('hospital')).toBeNull();
  });

  it('follows the land use, or the Amanah’s narrower list', () => {
    expect(allowedOn('villa', 'residential')).toBe(true);
    expect(allowedOn('factory', 'residential')).toBe(false);
    expect(allowedOn('factory', 'industrial')).toBe(true);
    expect(allowedOn('livestock_farm', 'agricultural')).toBe(true);
    expect(allowedOn('wedding_hall', 'commercial', ['restaurant'])).toBe(false);
  });

  it('reads the building type, the land and the labels from the brief', () => {
    expect(parseBrief('أبغى قصر دورين ٨ غرف نوم').buildingType).toBe('palace');
    expect(parseBrief('قاعة أفراح على أرض تجارية').buildingType).toBe('wedding_hall');
    expect(parseBrief('شقق فندقية للإيجار').buildingType).toBe('hotel_apartments_rent');
    expect(parseBrief('منزل مستقل دور واحد').buildingType).toBe('detached_house');
    expect(parseBrief('فيلا دورين مع مستودع ونادي رياضي').buildingType).toBe('villa');
    expect(parseBrief('مستودع على أرض صناعية').buildingType).toBe('warehouse');
    expect(parseBrief('عمارة تجارية للبيع على الخارطة').tags).toEqual(['for_sale', 'off_plan']);
    expect(normalizeBrief('أرض تجارية')).toBe('ارض تجارية');
  });
});

describe('designs that the land use allows', () => {
  const cases: Array<[string, LandUse]> = [
    ['wedding_hall', 'commercial'],
    ['mosque', 'public'],
    ['warehouse', 'industrial'],
    ['restaurant', 'commercial'],
    ['livestock_farm', 'agricultural'],
  ];
  for (const [kind, use] of cases)
    it(`${kind} on ${use} land: options with the hall and its rooms, every check passed`, () => {
      const pr = program(kind);
      const pl = plot(use);
      const r = searchOptions(pl, zoning, pr, { count: 6 });
      expect(r.options.length).toBeGreaterThanOrEqual(3);
      for (const o of r.options) {
        expect(o.rooms.some((x) => x.type === 'hall')).toBe(true);
        expect(checkOption(o, { plot: pl, zoning, program: pr }).failing).toEqual([]);
      }
    });

  it('a hotel: rooms on every floor around a lobby', () => {
    const pr = program('hotel', { floors: 4, unitsPerFloor: 6 });
    const rooms = programRooms(pr);
    expect(rooms.filter((r) => r.type === 'hotel_room')).toHaveLength(24);
    expect(rooms.some((r) => r.type === 'reception')).toBe(true);
    expect(
      searchOptions(plot('commercial'), zoning, { ...pr, parking: 30 }).options.length,
    ).toBeGreaterThan(0);
  });

  it('refuses a building the land use does not allow', () => {
    const r = searchOptions(plot('residential'), zoning, program('warehouse'));
    expect(r.options).toEqual([]);
    expect(r.blocking[0]!.id).toBe('Z-USE');
  });
});
