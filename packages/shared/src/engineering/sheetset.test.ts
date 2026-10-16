import { describe, expect, it } from 'vitest';
import { BUILDUPS, ROOF_STANDARD, WALL_STANDARD, WALL_WET, layerR, uValue } from './envelope.js';
import { generatePlan, VARIANTS } from './layout.js';
import {
  countSymbols,
  electricalSymbols,
  mechanicalSymbols,
  safetySymbols,
  type MepSymbol,
} from './mep.js';
import { floorName, sheetSet } from './sheetset.js';
import { confirmProgram } from './brief.js';
import type { Plot, Zoning } from './schemas.js';

describe('thermal build-ups', () => {
  it('computes R = t/k and U = 1/ΣR the way a permit set shows them', () => {
    // the 35 cm wall of the reference sheet: total R 2.708, U 0.369
    expect(uValue(WALL_STANDARD)).toEqual({ thickness: 0.35, r: 2.708, u: 0.369 });
    // the 40 cm wet-area wall: R 2.76, U 0.362
    expect(uValue(WALL_WET)).toMatchObject({ thickness: 0.4, r: 2.76, u: 0.362 });
    // the roof: R 4.364, U 0.229
    expect(uValue(ROOF_STANDARD)).toMatchObject({ r: 4.364, u: 0.229 });
    expect(layerR(WALL_STANDARD[2]!)).toBe(2.381);
    expect(Object.keys(BUILDUPS)).toEqual(['wall', 'wallWet', 'roof']);
  });
});

describe('the sheet set', () => {
  it('numbers sheets per discipline and follows the required disciplines', () => {
    const arch = sheetSet({ floors: 2 }, ['architectural']);
    expect(arch.map((s) => s.code)).toEqual([
      'AR-01',
      'AR-02',
      'AR-03',
      'AR-04',
      'AR-05',
      'AR-06',
      'AR-07',
      'AR-08',
    ]);
    expect(arch.map((s) => s.id)).toEqual([
      'site',
      'plan-0',
      'plan-1',
      'elevations',
      'sections',
      'thermal',
      'schedules',
      'areas',
    ]);
    const all = sheetSet({ floors: 2 }, [
      'architectural',
      'structural',
      'electrical',
      'mechanical',
    ]);
    expect(all.filter((s) => s.group === 'structural')).toHaveLength(5);
    expect(all.find((s) => s.id === 'el-1')?.code).toBe('EL-02');
    expect(all.find((s) => s.id === 'me-0')?.code).toBe('ME-01');
    expect(all.find((s) => s.id === 'fs-1')?.code).toBe('FS-02');
    // no structural sheets unless the project needs them
    expect(
      sheetSet({ floors: 1 }, ['architectural', 'electrical']).some(
        (s) => s.group === 'structural',
      ),
    ).toBe(false);
    expect(new Set(all.map((s) => s.code)).size).toBe(all.length);
    expect(floorName(1)).toEqual({ ar: 'الدور الأول', en: 'FIRST FLOOR' });
  });
});

describe('symbols on the plan', () => {
  const program = confirmProgram({
    type: 'villa',
    floors: 2,
    bedrooms: 4,
    bathrooms: 4,
    targetAreaM2: 420,
    style: 'contemporary',
  }).data!;
  const plot: Plot = {
    width: 22,
    depth: 32,
    streets: { front: 15, back: 0, left: 0, right: 0 },
    northDeg: 0,
    city: 'الرياض',
    district: '',
    landUse: 'residential',
  };
  const zoning: Zoning = {
    use: 'residential',
    setbacks: { front: 4, back: 2, left: 2, right: 2 },
    coverageMax: 0.6,
    farMax: 1.8,
    maxFloors: 3,
    maxHeightM: 12,
    parkingPerUnit: 1,
  };
  const plan = generatePlan(plot, zoning, program, VARIANTS[0]!);

  const inside = (s: MepSymbol) => {
    const r = plan.rooms.find((x) => x.id === s.roomId)!;
    return s.x >= r.x - 1.2 && s.x <= r.x + r.w + 1.2 && s.y >= r.y - 1.2 && s.y <= r.y + r.h + 1.2;
  };

  it('places electrical, mechanical and safety symbols with their rooms', () => {
    const el = electricalSymbols(plan);
    expect(el.filter((s) => s.kind === 'db')).toHaveLength(plan.floors);
    expect(el.filter((s) => s.kind === 'light').length).toBeGreaterThan(10);
    const me = mechanicalSymbols(plan);
    expect(me.filter((s) => s.kind === 'ac').length).toBeGreaterThan(3);
    expect(me.filter((s) => s.kind === 'ac').every((s) => /TR$/.test(s.label ?? ''))).toBe(true);
    expect(me.some((s) => s.kind === 'riser')).toBe(true);
    const fs = safetySymbols(plan);
    expect(fs.some((s) => s.kind === 'smoke')).toBe(true);
    expect(fs.some((s) => s.kind === 'exitsign')).toBe(true);
    for (const s of [...el, ...me, ...fs]) expect(inside(s), `${s.kind} ${s.id}`).toBe(true);
    expect(new Set(el.map((s) => s.id)).size).toBe(el.length);
    expect(countSymbols(fs, 0).smoke).toBeGreaterThan(0);
  });
});

describe('preliminary structural calculation', () => {
  it('turns the scheme into unit loads, a column load and a footing area', async () => {
    const { structuralCalc } = await import('./structcalc.js');
    const calc = structuralCalc(
      { floors: 3 },
      {
        gridX: [0, 5, 10],
        gridY: [0, 5],
        columns: [],
        spanX: 5,
        spanY: 5,
        slab: 'solid',
        slabThickness: 0.2,
        columnSize: '30×60',
        foundation: 'x',
        beamDepth: 0.6,
      },
    );
    // 0.2 m × 25 = 5 kN/m² self-weight; floor service 5 + 2 + 0.5 + 2 = 9.5; roof 5 + 3.5 + 0.5 + 1 = 10
    expect(calc.selfWeight).toBe(5);
    expect(calc.serviceFloor).toBe(9.5);
    expect(calc.serviceRoof).toBe(10);
    // 25 m² × (2 × 9.5 + 10) = 725 kN, over 150 kPa ≈ 4.8 m²
    expect(calc.axial).toBe(725);
    expect(calc.footingArea).toBe(4.8);
  });
});
