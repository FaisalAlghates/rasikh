import { describe, expect, it } from 'vitest';
import {
  NATIONAL_REGULATIONS,
  RegulationSchema,
  ZoningSchema,
  applicableRegulations,
  streetSetback,
  zoningFromRegulation,
  type Plot,
} from '../index.js';

const villa = NATIONAL_REGULATIONS.find((r) => r.id === 'momah-2024-villa')!;
const flats = NATIONAL_REGULATIONS.find((r) => r.id === 'momah-2024-apartments')!;
const plot = (w: number, d: number, streets: Partial<Plot['streets']> = {}) => ({
  width: w,
  depth: d,
  streets: { front: 15, back: 0, left: 0, right: 0, ...streets },
});

describe('municipal requirements (Ministry of Municipalities and Housing, 2024)', () => {
  it('every built-in entry is valid and cites its document and clauses', () => {
    for (const r of NATIONAL_REGULATIONS) {
      expect(RegulationSchema.safeParse(r).success).toBe(true);
      expect(r.source.url).toMatch(/^https:\/\/momah\.gov\.sa\//);
      expect(r.source.reference).toContain('4500943139');
      expect(Object.keys(r.clauses).length).toBeGreaterThan(4);
    }
  });

  it('front setback: a fifth of the street width, at least 3 m; 6 m on streets of 30 m or more', () => {
    expect(streetSetback(villa.setbacks.front, 10)).toBe(3);
    expect(streetSetback(villa.setbacks.front, 20)).toBe(4);
    expect(streetSetback(villa.setbacks.front, 36)).toBe(6);
    expect(streetSetback(villa.setbacks.streetSide, 8)).toBe(2);
    expect(streetSetback(villa.setbacks.streetSide, 15)).toBe(3);
  });

  it('a villa plot: 1.5 m to neighbours, 75 % per floor and a 70 % annex, two floors, parking by plot area; height from the local plan', () => {
    const { zoning, fromLocalPlan } = zoningFromRegulation(
      villa,
      plot(20, 30),
      { floors: 2 },
      {
        maxHeightM: 12,
      },
    );
    expect(ZoningSchema.safeParse(zoning).success).toBe(true);
    expect(zoning.setbacks).toEqual({ front: 3, back: 1.5, left: 1.5, right: 1.5 });
    expect(zoning.coverageMax).toBe(0.75);
    // two floors at 75 % and the 70 % roof annex over the first
    expect(zoning.farMax).toBe(2.03);
    expect(zoning.roofAnnexShare).toBe(0.7);
    expect(zoning.maxFloors).toBe(2);
    expect(zoning.parkingPerUnit).toBe(2); // 600 m² > 400 m²
    expect(fromLocalPlan).toEqual(['maxHeightM']);
    expect(zoning.maxHeightM).toBe(12); // kept from what the office entered
    // a corner plot on a 20 m side street, a small plot with one space
    expect(
      zoningFromRegulation(villa, plot(20, 30, { left: 20 }), { floors: 2 }).zoning.setbacks.left,
    ).toBe(4);
    expect(zoningFromRegulation(villa, plot(15, 25), { floors: 2 }).zoning.parkingPerUnit).toBe(1);
  });

  it('an apartment building: 65 % ground, 75 % above (and the annex), 3 m to neighbours above five floors, 23 m, 1.5 spaces a flat', () => {
    const { zoning, fromLocalPlan } = zoningFromRegulation(
      flats,
      plot(25, 30),
      { floors: 6 },
      {
        maxFloors: 6,
      },
    );
    expect(zoning.coverageMax).toBe(0.65);
    expect(zoning.farMax).toBe(4.93);
    expect(zoning.setbacks.back).toBe(3);
    expect(zoning.maxHeightM).toBe(23);
    expect(zoning.parkingPerUnit).toBe(1.5);
    expect(fromLocalPlan).toEqual(['maxFloors']);
    expect(
      zoningFromRegulation(flats, plot(25, 30), { floors: 4 }, { maxFloors: 4 }).zoning.setbacks
        .back,
    ).toBe(2);
  });

  it('applies the national requirements everywhere and an Amanah’s own only in its cities', () => {
    const riyadh = { ...villa, id: 'riyadh-x', scope: 'amanah' as const, cities: ['الرياض'] };
    const all = [...NATIONAL_REGULATIONS, riyadh];
    expect(applicableRegulations(all, 'villa', 'الرياض').map((r) => r.id)).toEqual([
      'momah-2024-villa',
      'riyadh-x',
    ]);
    expect(applicableRegulations(all, 'villa', 'جدة').map((r) => r.id)).toEqual([
      'momah-2024-villa',
    ]);
    expect(applicableRegulations(all, 'apartments', 'جدة').map((r) => r.id)).toEqual([
      'momah-2024-apartments',
    ]);
  });
});
