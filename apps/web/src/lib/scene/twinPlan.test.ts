import { describe, expect, it } from 'vitest';
import { buildTwinPlan, layout, unitStatus } from './twinPlan';

const TODAY = '2026-10-15';
const leases = [
  { id: 'L1', unitId: 'U1', tenantName: 'سالم', endDate: '2027-01-01' },
  { id: 'L2', unitId: 'U2', endDate: '2027-01-01' },
  { id: 'L3', unitId: 'U3', endDate: '2027-01-01' },
  { id: 'L4', unitId: 'U4', status: 'ended', endDate: '2026-01-01' },
];
const payments = [
  { leaseId: 'L1', dueDate: '2026-10-01', amount: 3500, status: 'due' as const }, // late
  { leaseId: 'L2', dueDate: '2026-10-20', amount: 3500, status: 'due' as const }, // soon (5 days)
  { leaseId: 'L3', dueDate: '2026-11-30', amount: 3500, status: 'due' as const }, // ok
  { leaseId: 'L3', dueDate: '2026-09-01', amount: 3500, status: 'paid' as const },
];

describe('unit status', () => {
  it('late, soon, ok and vacant from the lease and its payments', () => {
    expect(unitStatus('U1', leases, payments, TODAY)).toMatchObject({
      status: 'late',
      tenantName: 'سالم',
      nextDue: { date: '2026-10-01', amount: 3500 },
    });
    expect(unitStatus('U2', leases, payments, TODAY).status).toBe('soon');
    expect(unitStatus('U3', leases, payments, TODAY)).toMatchObject({
      status: 'ok',
      nextDue: { date: '2026-11-30' },
    });
    expect(unitStatus('U4', leases, payments, TODAY).status).toBe('vacant'); // ended lease
    expect(unitStatus('U9', leases, payments, TODAY).status).toBe('vacant'); // no lease
  });

  it('a lease past its end date counts as vacant', () => {
    expect(
      unitStatus('U1', [{ id: 'X', unitId: 'U1', endDate: '2026-10-14' }], [], TODAY).status,
    ).toBe('vacant');
  });
});

describe('twin plan', () => {
  const properties = [
    { id: 'P1', name: 'برج النخيل', kind: 'building' },
    { id: 'P2', name: 'فيلا الربيع', kind: 'villa' },
  ];
  const units = [
    { id: 'U1', propertyId: 'P1', label: 'شقة 1' },
    { id: 'U2', propertyId: 'P1', label: 'شقة 2' },
    { id: 'U3', propertyId: 'P1', label: 'شقة 10' },
    { id: 'U4', propertyId: 'P2', label: 'الفيلا' },
  ];

  it('one building per property, one cell per unit, numeric label order, counted by status', () => {
    const plan = buildTwinPlan(properties, units, leases, payments, TODAY);
    expect(plan.buildings.map((b) => b.name)).toEqual(['برج النخيل', 'فيلا الربيع']);
    expect(plan.buildings[0]!.cells.map((c) => c.label)).toEqual(['شقة 1', 'شقة 2', 'شقة 10']);
    expect(plan.buildings[0]!.floors).toBe(3);
    expect(plan.counts).toEqual({ ok: 1, soon: 1, late: 1, vacant: 1 });
  });

  it('wide buildings when a property has many units (at most 10 floors)', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `M${i}`,
      propertyId: 'P1',
      label: `${i + 1}`,
    }));
    const b = buildTwinPlan([properties[0]!], many, [], [], TODAY).buildings[0]!;
    expect(b.cols).toBe(3);
    expect(b.floors).toBe(9);
    expect(Math.max(...b.cells.map((c) => c.floor))).toBe(8);
  });

  it('a property without units still stands as a one-floor building', () => {
    const b = buildTwinPlan([properties[1]!], [], [], [], TODAY).buildings[0]!;
    expect(b.cells).toEqual([]);
    expect(b.floors).toBe(1);
  });

  it('spreads buildings apart so none overlap', () => {
    const pts = layout(12);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.z - pts[j]!.z)).toBeGreaterThan(4.5);
  });
});
