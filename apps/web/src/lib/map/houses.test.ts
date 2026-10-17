import { describe, expect, it } from 'vitest';
import { houseFor } from './houses';
import type { MapProperty } from './sample-data';

const prop = (over: Partial<MapProperty>): MapProperty => ({
  id: 'x',
  name: 'x',
  place: 'الرياض',
  cityId: 'riyadh',
  coords: [46.7, 24.7],
  units: 1,
  rentSar: 1,
  status: 'ok',
  ...over,
});

describe('the building the map stands on a property', () => {
  it('a single unit is a villa, several units an apartment building with floors to match', () => {
    const villa = houseFor(prop({ id: 'a', units: 1 }));
    expect(villa?.real).toBe(false);
    expect(villa?.plan.rooms.length).toBeGreaterThan(8);
    const tower = houseFor(prop({ id: 'b', units: 24, cityId: 'jeddah' }));
    expect(tower?.plan.floors).toBeGreaterThanOrEqual(3);
    expect(tower?.plan.style).toBe('contemporary');
  });
  it('the style follows the city, and a released design is used as it is', () => {
    expect(houseFor(prop({ id: 'c', units: 1, cityId: 'riyadh' }))?.plan.style).toBe(
      'modern_najdi',
    );
    expect(houseFor(prop({ id: 'd', units: 1, cityId: 'abha' }))?.plan.style).toBe('swiss');
    const real = houseFor(prop({ id: 'e', plan: houseFor(prop({ id: 'f', units: 1 }))!.plan }));
    expect(real?.real).toBe(true);
  });
});
