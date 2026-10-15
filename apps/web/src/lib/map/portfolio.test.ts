import { describe, expect, it } from 'vitest';
import { portfolioToMap } from './portfolio';

describe('portfolio on the Kingdom map', () => {
  const today = '2026-10-15';
  const properties = [
    { id: 'a', name: 'برج جدة', city: 'جدة', district: 'الحمراء' },
    { id: 'b', name: 'فيلا', city: 'الرياض' },
    { id: 'c', name: 'بلا مدينة', city: '' },
  ];
  const units = [
    { id: 'u1', propertyId: 'a', label: '1' },
    { id: 'u2', propertyId: 'a', label: '2' },
    { id: 'u3', propertyId: 'b', label: '1' },
  ];
  const leases = [
    {
      id: 'l1',
      unitId: 'u1',
      propertyId: 'a',
      annualRent: 40000,
      status: 'active',
      endDate: '2027-06-01',
    },
    {
      id: 'l2',
      unitId: 'u3',
      propertyId: 'b',
      annualRent: 90000,
      status: 'active',
      endDate: '2027-01-01',
    },
  ];
  const payments = [
    { leaseId: 'l1', dueDate: '2026-10-01', amount: 10000, status: 'due' as const },
    { leaseId: 'l2', dueDate: '2026-12-01', amount: 22500, status: 'due' as const },
  ];

  it('places properties by city and counts the ones without a city', () => {
    const r = portfolioToMap(properties, units, leases, payments, today);
    expect(r.items.map((i) => [i.id, i.cityId])).toEqual([
      ['a', 'jeddah'],
      ['b', 'riyadh'],
    ]);
    expect(r.unplaced).toBe(1);
    expect(r.items[0]?.approximate).toBe(true);
    expect(r.items[0]?.place).toBe('جدة، الحمراء');
  });

  it('sums active rent, counts units and takes the worst payment status', () => {
    const [a, b] = portfolioToMap(properties, units, leases, payments, today).items;
    expect(a).toMatchObject({ units: 2, rentSar: 40000, status: 'late' });
    expect(b).toMatchObject({ units: 1, rentSar: 90000, status: 'ok' });
  });
});
