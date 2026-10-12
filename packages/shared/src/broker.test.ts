import { describe, expect, it } from 'vitest';
import {
  ActivitySchema,
  adIsReady,
  BrokerageContractSchema,
  BrokerProfileSchema,
  canMoveLead,
  checkAd,
  falReminder,
  falState,
  LeadSchema,
  ViewingSchema,
  type AdDraft,
} from './broker.js';

const TODAY = '2026-10-12';

const goodAd: AdDraft = {
  purpose: 'rent',
  advertiserName: 'مكتب الأفق العقاري',
  capacity: 'broker',
  adLicenseNo: '1234567890',
  adLicenseExpiry: '2027-10-12',
  city: 'الرياض',
  district: 'حي النرجس',
  propertyType: 'شقة',
  areaSqm: 140,
  priceSar: 48000,
  phone: '+966512345678',
  description: 'شقة من ثلاث غرف في الدور الثاني، قريبة من الخدمات والمدارس.',
  disclosesEncumbrances: false,
};

const codes = (ad: AdDraft) => checkAd(ad, TODAY).map((i) => i.code);

describe('FAL license state', () => {
  it('is valid far from expiry, expiring inside 30 days, expired after', () => {
    expect(falState('2027-01-01', TODAY)).toBe('valid');
    expect(falState('2026-11-11', TODAY)).toBe('expiring'); // 30 days left
    expect(falState('2026-10-12', TODAY)).toBe('expiring'); // last day still counts
    expect(falState('2026-10-11', TODAY)).toBe('expired');
  });

  it('reports the tightest reminder window', () => {
    expect(falReminder('2026-12-11', TODAY)).toBe(60);
    expect(falReminder('2026-11-11', TODAY)).toBe(30);
    expect(falReminder('2026-10-19', TODAY)).toBe(7);
    expect(falReminder('2027-06-01', TODAY)).toBeNull();
    expect(falReminder('2026-10-01', TODAY)).toBeNull();
  });

  it('validates the profile', () => {
    const ok = { displayName: 'سلمان', falNo: '1234567890', falExpiry: '2027-01-01' };
    expect(BrokerProfileSchema.safeParse(ok).success).toBe(true);
    expect(BrokerProfileSchema.safeParse({ ...ok, falNo: '12' }).success).toBe(false);
    expect(BrokerProfileSchema.safeParse({ ...ok, falExpiry: '01/01/2027' }).success).toBe(false);
  });
});

describe('lead funnel', () => {
  it('only moves forward, or to lost', () => {
    expect(canMoveLead('new', 'contacted')).toBe(true);
    expect(canMoveLead('new', 'negotiating')).toBe(true);
    expect(canMoveLead('viewing', 'new')).toBe(false);
    expect(canMoveLead('viewing', 'lost')).toBe(true);
    expect(canMoveLead('new', 'new')).toBe(false);
  });

  it('never leaves won or lost', () => {
    expect(canMoveLead('won', 'lost')).toBe(false);
    expect(canMoveLead('lost', 'contacted')).toBe(false);
  });
});

describe('broker records', () => {
  it('validates a lead', () => {
    const ok = { name: 'خالد', phone: '+966512345678', interest: 'rent', source: 'call' };
    expect(LeadSchema.safeParse(ok).success).toBe(true);
    expect(LeadSchema.safeParse({ ...ok, phone: '0512345678' }).success).toBe(false);
    expect(LeadSchema.safeParse({ ...ok, interest: 'lend' }).success).toBe(false);
    expect(LeadSchema.safeParse({ ...ok, budgetSar: -1 }).success).toBe(false);
  });

  it('validates a viewing and a brokerage contract', () => {
    expect(
      ViewingSchema.safeParse({
        leadId: 'l1',
        placeLabel: 'فيلا النرجس',
        scheduledAt: '2026-10-20T15:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      ViewingSchema.safeParse({ leadId: 'l1', placeLabel: 'فيلا', scheduledAt: 'غداً' }).success,
    ).toBe(false);

    const c = {
      leadId: 'l1',
      type: 'rent',
      contractNo: 'BR-2026-001',
      startDate: '2026-10-12',
      endDate: '2027-10-11',
    };
    expect(BrokerageContractSchema.safeParse(c).success).toBe(true);
    expect(BrokerageContractSchema.safeParse({ ...c, endDate: '2026-10-01' }).success).toBe(false);
    expect(BrokerageContractSchema.safeParse({ ...c, commissionPct: 120 }).success).toBe(false);
  });

  it('bounds a log entry', () => {
    expect(ActivitySchema.safeParse({ leadId: 'l1', type: 'note', text: 'اتصلت به' }).success).toBe(
      true,
    );
    expect(ActivitySchema.safeParse({ leadId: 'l1', type: 'note', text: ' ' }).success).toBe(false);
    expect(ActivitySchema.safeParse({ leadId: 'l1', type: 'edit', text: 'x' }).success).toBe(false);
    expect(
      ActivitySchema.safeParse({ leadId: 'l1', type: 'note', text: 'ا'.repeat(301) }).success,
    ).toBe(false);
  });
});

describe('ad compliance checker', () => {
  it('passes a complete ad with no issues', () => {
    expect(checkAd(goodAd, TODAY)).toEqual([]);
    expect(adIsReady(checkAd(goodAd, TODAY))).toBe(true);
  });

  it('lists every missing mandatory field on an empty draft', () => {
    expect(codes({})).toEqual([
      'purpose_missing',
      'advertiser_missing',
      'capacity_missing',
      'license_missing',
      'location_missing',
      'property_type_missing',
      'area_missing',
      'price_missing',
      'contact_missing',
      'description_short',
      'encumbrances_not_stated',
    ]);
    expect(adIsReady(checkAd({}, TODAY))).toBe(false);
  });

  it('rejects a malformed license and an invalid phone', () => {
    expect(codes({ ...goodAd, adLicenseNo: 'AB12' })).toContain('license_invalid');
    expect(codes({ ...goodAd, phone: '0512345678' })).toContain('contact_invalid');
  });

  it('flags an expired license as an error and a near expiry as a warning', () => {
    const expired = checkAd({ ...goodAd, adLicenseExpiry: '2026-10-11' }, TODAY);
    expect(expired).toContainEqual({ code: 'license_expired', severity: 'error' });
    expect(adIsReady(expired)).toBe(false);

    const near = checkAd({ ...goodAd, adLicenseExpiry: '2026-11-01' }, TODAY);
    expect(near).toEqual([{ code: 'license_expiring', severity: 'warning' }]);
    expect(adIsReady(near)).toBe(true); // a warning does not block
  });

  it('needs both city and district, a real area and price', () => {
    expect(codes({ ...goodAd, district: ' ' })).toContain('location_missing');
    expect(codes({ ...goodAd, areaSqm: 0 })).toContain('area_missing');
    expect(codes({ ...goodAd, priceSar: -5 })).toContain('price_missing');
  });

  it('wants a description of real length and a statement about encumbrances', () => {
    expect(codes({ ...goodAd, description: 'شقة جميلة' })).toContain('description_short');
    const unsaid = checkAd({ ...goodAd, disclosesEncumbrances: undefined }, TODAY);
    expect(unsaid).toEqual([{ code: 'encumbrances_not_stated', severity: 'warning' }]);
    expect(codes({ ...goodAd, disclosesEncumbrances: true })).toEqual([]);
  });
});
