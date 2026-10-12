import { describe, expect, it } from 'vitest';
import {
  TicketActionSchema,
  TicketCreateSchema,
  nextStatus,
  slaDueAt,
  slaState,
  suggestResponsibility,
} from './maintenance.js';

describe('suggested responsibility', () => {
  it('puts consumables and tenant damage on the tenant, repairs on the owner', () => {
    expect(suggestResponsibility('consumables')).toBe('tenant');
    expect(suggestResponsibility('tenant_damage')).toBe('tenant');
    for (const c of [
      'plumbing',
      'electrical',
      'ac',
      'appliance',
      'structure',
      'pest',
      'other',
    ] as const) {
      expect(suggestResponsibility(c)).toBe('owner');
    }
  });
});

describe('SLA timer', () => {
  const created = '2026-10-12T08:00:00.000Z';
  it('computes the due time from urgency', () => {
    expect(slaDueAt(new Date(created), 'emergency')).toBe('2026-10-12T12:00:00.000Z');
    expect(slaDueAt(new Date(created), 'normal')).toBe('2026-10-15T08:00:00.000Z');
  });
  it('is ok, due soon, then breached', () => {
    expect(slaState('urgent', created, '2026-10-12T10:00:00.000Z')).toBe('ok');
    expect(slaState('urgent', created, '2026-10-13T03:00:00.000Z')).toBe('due_soon'); // 5h of 24h left
    expect(slaState('urgent', created, '2026-10-13T09:00:00.000Z')).toBe('breached');
  });
  it('judges a resolved ticket by when it was resolved', () => {
    expect(
      slaState('urgent', created, '2027-01-01T00:00:00.000Z', '2026-10-13T07:00:00.000Z'),
    ).toBe('met');
    expect(
      slaState('urgent', created, '2027-01-01T00:00:00.000Z', '2026-10-13T09:00:00.000Z'),
    ).toBe('breached');
  });
});

describe('status machine', () => {
  it('walks the happy path', () => {
    expect(nextStatus('open', 'assign', 'staff')).toBe('assigned');
    expect(nextStatus('assigned', 'start', 'staff')).toBe('in_progress');
    expect(nextStatus('in_progress', 'resolve', 'staff')).toBe('resolved');
    expect(nextStatus('resolved', 'close', 'tenant')).toBe('closed');
  });
  it('refuses wrong parties and wrong states', () => {
    expect(nextStatus('open', 'assign', 'tenant')).toBeUndefined();
    expect(nextStatus('open', 'resolve', 'staff')).toBeUndefined();
    expect(nextStatus('closed', 'cancel', 'staff')).toBeUndefined();
    expect(nextStatus('in_progress', 'cancel', 'tenant')).toBeUndefined();
    expect(nextStatus('resolved', 'close', 'tenant')).toBe('closed');
  });
  it('a vendor can start and resolve, nothing else', () => {
    expect(nextStatus('assigned', 'start', 'vendor')).toBe('in_progress');
    expect(nextStatus('in_progress', 'resolve', 'vendor')).toBe('resolved');
    expect(nextStatus('open', 'assign', 'vendor')).toBeUndefined();
    expect(nextStatus('resolved', 'close', 'vendor')).toBeUndefined();
    expect(nextStatus('assigned', 'cancel', 'vendor')).toBeUndefined();
  });
  it('can reassign before work starts', () => {
    expect(nextStatus('assigned', 'assign', 'staff')).toBe('assigned');
  });
});

describe('schemas', () => {
  it('validates tickets and actions', () => {
    expect(
      TicketCreateSchema.safeParse({
        unitId: 'u',
        propertyId: 'p',
        title: 'تسريب',
        category: 'plumbing',
        urgency: 'urgent',
      }).success,
    ).toBe(true);
    expect(
      TicketCreateSchema.safeParse({
        unitId: 'u',
        propertyId: 'p',
        title: 'x',
        category: 'plumbing',
        urgency: 'urgent',
      }).success,
    ).toBe(false);
    expect(TicketActionSchema.safeParse({ action: 'close', rating: 6 }).success).toBe(false);
    expect(TicketActionSchema.safeParse({ action: 'assign', vendorName: 'م' }).success).toBe(false);
    expect(TicketActionSchema.safeParse({ action: 'close', rating: 5 }).success).toBe(true);
  });
});
