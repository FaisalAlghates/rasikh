import {
  NATIONAL_REGULATIONS,
  candidateVariants,
  confirmProgram,
  generatePlan,
  zoningFromRegulation,
  type DesignPlan,
  type Plot,
  type Program,
} from '@rasikh/shared';
import { describe, expect, it } from 'vitest';
import { buildModel } from './model3d';

const plot: Plot = {
  width: 22,
  depth: 32,
  streets: { front: 20, back: 0, left: 0, right: 0 },
  northDeg: 0,
  city: 'الرياض',
  district: '',
  landUse: 'residential',
};
const plan = (typology: string, over: Partial<Program> = {}): DesignPlan => {
  const program = confirmProgram({
    type: 'villa',
    floors: 2,
    bedrooms: 4,
    roofAnnex: true,
    ...over,
  }).data!;
  const zoning = zoningFromRegulation(NATIONAL_REGULATIONS[0]!, plot, program, {
    maxHeightM: 14,
  }).zoning;
  const v = candidateVariants(program).find((x) => (x.typology ?? 'bands') === typology)!;
  return generatePlan(plot, zoning, program, v);
};
const named = (p: DesignPlan, name: string, floorsShown = p.floors) => {
  let n = 0;
  buildModel(p, { floorsShown }).traverse((o) => {
    if (o.name === name) n++;
  });
  return n;
};

describe('3D model follows the real building', () => {
  it('a courtyard house: planted court, roofs only where nothing is built above', () => {
    const p = plan('court');
    expect(named(p, 'courtyard')).toBe(1);
    // the court has no slab or roof of its own: slabs and roofs cover built rooms only
    const built = p.rooms.filter((r) => r.type !== 'courtyard' && r.type !== 'terrace').length;
    expect(named(p, 'roof')).toBeLessThan(built);
    expect(named(p, 'roof')).toBeGreaterThan(0);
  });

  it('a roof annex: the floor below gets a roof and parapet around the annex', () => {
    const p = plan('bands');
    expect(p.annex).toBe(true);
    expect(named(p, 'parapet')).toBeGreaterThan(4);
    expect(named(p, 'terrace')).toBe(1);
  });

  it('the façade details follow the style: Najdi crenellation, a classic cornice, a contemporary pergola', () => {
    expect(named(plan('bands', { style: 'modern_najdi' }), 'shurfa')).toBeGreaterThan(20);
    expect(named(plan('bands', { style: 'classic' }), 'cornice')).toBeGreaterThan(4);
    expect(named(plan('bands', { style: 'classic' }), 'shurfa')).toBe(0);
    expect(named(plan('terrace', { style: 'contemporary' }), 'pergola')).toBeGreaterThan(5);
  });

  it('a dollhouse cut leaves the top shown floor open', () => {
    const p = plan('bands', { roofAnnex: false });
    expect(named(p, 'roof', 1)).toBe(0);
  });
});

describe('the four design languages in 3D', () => {
  it('Swiss: pitched roofs; palace: a dome and a portico; modern and Najdi: neither', () => {
    const swiss = plan('bands', { style: 'swiss' });
    expect(named(swiss, 'gable')).toBeGreaterThan(0);
    expect(named(swiss, 'dome')).toBe(0);
    const palace = plan('bands', { style: 'palace' });
    expect(named(palace, 'dome')).toBe(1);
    expect(named(palace, 'column')).toBeGreaterThanOrEqual(4);
    expect(named(palace, 'gable')).toBe(0);
    for (const style of ['contemporary', 'modern_najdi'] as const) {
      const p = plan('bands', { style });
      expect(named(p, 'gable')).toBe(0);
      expect(named(p, 'dome')).toBe(0);
    }
    // the Najdi house keeps its crenellation
    expect(named(plan('bands', { style: 'modern_najdi' }), 'shurfa')).toBeGreaterThan(0);
  });
});

describe('the realistic model', () => {
  it('adds window frames, the front door, shutters for Swiss, boundary walls and trees', () => {
    const count = (p: DesignPlan, name: string) => {
      let n = 0;
      buildModel(p, { floorsShown: p.floors, realistic: true }).traverse((o) => {
        if (o.name === name) n++;
      });
      return n;
    };
    const swiss = plan('bands', { style: 'swiss' });
    expect(count(swiss, 'frame')).toBeGreaterThan(8);
    expect(count(swiss, 'shutter')).toBeGreaterThan(2);
    expect(count(swiss, 'door')).toBeGreaterThanOrEqual(1);
    expect(count(swiss, 'boundary')).toBeGreaterThanOrEqual(4);
    const najdi = plan('bands', { style: 'modern_najdi' });
    expect(count(najdi, 'shutter')).toBe(0);
    expect(count(najdi, 'tree') + count(swiss, 'tree')).toBeGreaterThan(0);
    // the plain model (drawings, exports) stays without them
    expect(named(swiss, 'frame')).toBe(0);
  });
});
