import { describe, expect, it } from 'vitest';
import { CreateOrganizationInputSchema, SaudiPhoneSchema } from './schemas.js';

describe('SaudiPhoneSchema', () => {
  it('accepts +966 mobile numbers', () => {
    expect(SaudiPhoneSchema.safeParse('+966512345678').success).toBe(true);
  });
  it('rejects other formats', () => {
    expect(SaudiPhoneSchema.safeParse('0512345678').success).toBe(false);
    expect(SaudiPhoneSchema.safeParse('+971512345678').success).toBe(false);
  });
});

describe('CreateOrganizationInputSchema', () => {
  const valid = { name: 'محفظة فيصل', roles: ['owner'], displayName: 'فيصل', consentPdpl: true };
  it('accepts valid input and defaults locale to ar', () => {
    const r = CreateOrganizationInputSchema.parse(valid);
    expect(r.locale).toBe('ar');
  });
  it('rejects self-assigned admin', () => {
    expect(CreateOrganizationInputSchema.safeParse({ ...valid, roles: ['admin'] }).success).toBe(
      false,
    );
  });
  it('requires PDPL consent', () => {
    expect(CreateOrganizationInputSchema.safeParse({ ...valid, consentPdpl: false }).success).toBe(
      false,
    );
  });
});
