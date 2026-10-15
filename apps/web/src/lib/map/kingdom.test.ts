import { describe, expect, it } from 'vitest';
import { CITIES, KSA_BOUNDS, approxCoords, cityIdFor, project } from './kingdom';

describe('kingdom map', () => {
  it('covers all 13 regions with a capital each, inside the Kingdom bounds', () => {
    expect(CITIES.filter((c) => c.capital)).toHaveLength(13);
    const [[w, s], [e, n]] = KSA_BOUNDS;
    for (const c of CITIES) {
      expect(c.coords[0]).toBeGreaterThan(w);
      expect(c.coords[0]).toBeLessThan(e);
      expect(c.coords[1]).toBeGreaterThan(s);
      expect(c.coords[1]).toBeLessThan(n);
    }
  });

  it('matches the city names people type', () => {
    expect(cityIdFor('الرياض')).toBe('riyadh');
    expect(cityIdFor('مكة المكرمة')).toBe('makkah');
    expect(cityIdFor('جده')).toBe('jeddah');
    expect(cityIdFor('الاحساء')).toBe('ahsa');
    expect(cityIdFor('Al Khobar')).toBe('khobar');
    expect(cityIdFor('ابها')).toBe('abha');
    expect(cityIdFor('المدينة المنورة')).toBe('madinah');
    expect(cityIdFor('')).toBeUndefined();
    expect(cityIdFor('باريس')).toBeUndefined();
  });

  it('places a property near its city, the same way every time', () => {
    const a = approxCoords('jeddah', 'prop-1');
    expect(approxCoords('jeddah', 'prop-1')).toEqual(a);
    expect(Math.abs(a[0] - 39.1925)).toBeLessThan(0.06);
    expect(Math.abs(a[1] - 21.4858)).toBeLessThan(0.06);
    expect(approxCoords('jeddah', 'prop-2')).not.toEqual(a);
  });

  it('projects into the view box', () => {
    const v = { west: 0, east: 10, south: 0, north: 10 };
    expect(project([5, 5], v)).toEqual([50, 50]);
    expect(project([0, 10], v)).toEqual([0, 0]);
  });
});
