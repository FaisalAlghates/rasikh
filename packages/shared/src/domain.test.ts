import { describe, expect, it } from 'vitest';
import {
  LeaseSchema,
  addDays,
  addMonths,
  buildSchedule,
  computeReminders,
  daysBetween,
  renewalNoticeDate,
  rentFreezeCheck,
  yearTotals,
} from './domain.js';

describe('dates', () => {
  it('adds months with end-of-month clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
  it('adds and measures days', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-01-01', '2026-03-01')).toBe(59);
  });
});

describe('buildSchedule', () => {
  const base = { startDate: '2026-01-01', endDate: '2027-01-01', annualRent: 42000 };
  it('monthly: 12 installments of 3,500', () => {
    const s = buildSchedule({ ...base, cycle: 'monthly' });
    expect(s).toHaveLength(12);
    expect(s[0]).toEqual({ dueDate: '2026-01-01', amount: 3500 });
    expect(s[11]!.dueDate).toBe('2026-12-01');
  });
  it('quarterly / semiannual / annual counts', () => {
    expect(buildSchedule({ ...base, cycle: 'quarterly' })).toHaveLength(4);
    expect(buildSchedule({ ...base, cycle: 'semiannual' })).toHaveLength(2);
    expect(buildSchedule({ ...base, cycle: 'annual' })).toEqual([
      { dueDate: '2026-01-01', amount: 42000 },
    ]);
  });
  it('always adds up exactly (last installment absorbs rounding)', () => {
    const s = buildSchedule({ ...base, annualRent: 10000, cycle: 'monthly' });
    const sum = Math.round(s.reduce((a, i) => a + i.amount, 0) * 100) / 100;
    expect(sum).toBe(10000);
  });
  it('handles multi-year terms', () => {
    const s = buildSchedule({
      startDate: '2026-01-01',
      endDate: '2028-01-01',
      annualRent: 24000,
      cycle: 'quarterly',
    });
    expect(s).toHaveLength(8);
    expect(Math.round(s.reduce((a, i) => a + i.amount, 0))).toBe(48000);
  });
});

describe('Riyadh rent freeze', () => {
  const r = (over: Partial<Parameters<typeof rentFreezeCheck>[0]>) =>
    rentFreezeCheck({
      city: 'الرياض',
      previousAnnualRent: 40000,
      newAnnualRent: 44000,
      newStartDate: '2026-06-01',
      ...over,
    });
  it('warns on an increase inside Riyadh during the freeze', () => {
    expect(r({})).toEqual({ warn: true, maxAnnualRent: 40000 });
    expect(r({ city: 'Riyadh' }).warn).toBe(true);
  });
  it('does not warn for equal or lower rent, other cities, or outside the window', () => {
    expect(r({ newAnnualRent: 40000 }).warn).toBe(false);
    expect(r({ city: 'جدة' }).warn).toBe(false);
    expect(r({ newStartDate: '2025-09-01' }).warn).toBe(false);
    expect(r({ newStartDate: '2030-09-25' }).warn).toBe(false);
  });
});

describe('renewal notice + reminders', () => {
  it('renewal notice is 60 days before the end date', () => {
    expect(renewalNoticeDate('2026-12-31')).toBe('2026-11-01');
  });
  it('computes upcoming, late, expiring and renewal reminders', () => {
    const today = '2026-10-12';
    const leases = [
      { id: 'a', endDate: '2026-11-20' }, // 39 days: renewal notice window
      { id: 'b', endDate: '2026-10-30' }, // 18 days: expiring
      { id: 'c', endDate: '2027-06-01' }, // far
    ];
    const payments = [
      { id: 'p1', leaseId: 'a', dueDate: '2026-10-15', status: 'due' as const },
      { id: 'p2', leaseId: 'a', dueDate: '2026-10-01', status: 'due' as const },
      { id: 'p3', leaseId: 'a', dueDate: '2026-10-14', status: 'paid' as const },
      { id: 'p4', leaseId: 'c', dueDate: '2026-12-01', status: 'due' as const },
    ];
    const kinds = computeReminders(today, leases, payments).map(
      (x) => `${x.kind}:${x.paymentId ?? x.leaseId}`,
    );
    expect(kinds).toContain('payment_upcoming:p1');
    expect(kinds).toContain('payment_late:p2');
    expect(kinds).toContain('renewal_notice:a');
    expect(kinds).toContain('lease_expiring:b');
    expect(kinds.some((k) => k.endsWith(':p3') || k.endsWith(':p4') || k.endsWith(':c'))).toBe(
      false,
    );
  });
});

describe('LeaseSchema + yearTotals', () => {
  const ok = {
    unitId: 'u',
    propertyId: 'p',
    ejarContractNo: '10203040',
    tenantName: 'سالم',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    annualRent: 42000,
    cycle: 'monthly',
  };
  it('requires an Ejar number and a sane term', () => {
    expect(LeaseSchema.safeParse(ok).success).toBe(true);
    expect(LeaseSchema.safeParse({ ...ok, ejarContractNo: '12' }).success).toBe(false);
    expect(LeaseSchema.safeParse({ ...ok, endDate: '2025-01-01' }).success).toBe(false);
  });
  it('sums collected, outstanding, expenses and net per year', () => {
    const t = yearTotals(
      2026,
      [
        { dueDate: '2026-01-01', amount: 3500, status: 'paid' },
        { dueDate: '2026-02-01', amount: 3500, status: 'due' },
        { dueDate: '2027-01-01', amount: 3500, status: 'due' },
      ],
      [
        { date: '2026-03-03', amount: 500 },
        { date: '2025-03-03', amount: 900 },
      ],
    );
    expect(t).toEqual({
      expected: 7000,
      collected: 3500,
      outstanding: 3500,
      expenses: 500,
      net: 3000,
    });
  });
});
