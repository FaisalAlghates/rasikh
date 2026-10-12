import { z } from 'zod';
import { daysBetween, IsoDateSchema } from './domain.js';
import { FalLicenseSchema, SaudiPhoneSchema } from './schemas.js';

/**
 * Broker CRM and the ad compliance checker.
 * The checker only REPORTS what is missing from an ad draft against the mandatory ad data as we understand it
 * (REGA's published requirements can change): it never publishes, never approves an ad and is not a legal ruling.
 */

// ---- Broker profile ---------------------------------------------------------------------------

export const BrokerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  falNo: FalLicenseSchema,
  falExpiry: IsoDateSchema,
});
export type BrokerProfile = z.infer<typeof BrokerProfileSchema>;

export type FalState = 'valid' | 'expiring' | 'expired';

/** Days before expiry at which a reminder is shown. */
export const FAL_REMINDER_DAYS = [60, 30, 7] as const;

export function falState(expiry: string, today: string): FalState {
  const left = daysBetween(today, expiry);
  if (left < 0) return 'expired';
  return left <= FAL_REMINDER_DAYS[1] ? 'expiring' : 'valid';
}

/** The tightest reminder window the license has entered (60, 30 or 7 days), or null. */
export function falReminder(expiry: string, today: string): 60 | 30 | 7 | null {
  const left = daysBetween(today, expiry);
  if (left < 0) return null;
  for (const d of [7, 30, 60] as const) if (left <= d) return d;
  return null;
}

// ---- Leads, viewings, contracts ---------------------------------------------------------------

export const LEAD_STATUSES = ['new', 'contacted', 'viewing', 'negotiating', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_INTERESTS = ['rent', 'buy', 'let_my_property', 'sell_my_property'] as const;
export const LEAD_SOURCES = ['referral', 'walk_in', 'call', 'social', 'other'] as const;

export const LeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: SaudiPhoneSchema,
  interest: z.enum(LEAD_INTERESTS),
  source: z.enum(LEAD_SOURCES),
  budgetSar: z.number().nonnegative().max(1_000_000_000).optional(),
  notes: z.string().max(500).optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

/** Funnel order; a lead may skip forward or be marked lost at any point, but never moves out of won/lost. */
export function canMoveLead(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  if (from === 'won' || from === 'lost') return false;
  if (to === 'lost') return true;
  return LEAD_STATUSES.indexOf(to) > LEAD_STATUSES.indexOf(from);
}

export const ViewingSchema = z.object({
  leadId: z.string().min(1),
  placeLabel: z.string().trim().min(2).max(120),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(300).optional(),
});
export type Viewing = z.infer<typeof ViewingSchema>;

export const BROKERAGE_TYPES = ['rent', 'sale', 'management'] as const;
export const BrokerageContractSchema = z
  .object({
    leadId: z.string().min(1),
    type: z.enum(BROKERAGE_TYPES),
    contractNo: z.string().trim().min(3).max(40),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    commissionPct: z.number().min(0).max(100).optional(),
  })
  .refine((c) => c.endDate > c.startDate, { message: 'end_before_start', path: ['endDate'] });
export type BrokerageContract = z.infer<typeof BrokerageContractSchema>;

// ---- Immutable activity log -------------------------------------------------------------------

export const ACTIVITY_TYPES = [
  'lead_created',
  'status_changed',
  'viewing_scheduled',
  'viewing_done',
  'contract_added',
  'note',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** The log is create-only; the server stamps the time. Text is bounded so a proof file stays readable. */
export const ActivitySchema = z.object({
  leadId: z.string().min(1),
  type: z.enum(ACTIVITY_TYPES),
  text: z.string().trim().min(1).max(300),
});
export type Activity = z.infer<typeof ActivitySchema>;

// ---- Ad compliance checker --------------------------------------------------------------------

export const AD_PURPOSES = ['sale', 'rent'] as const;
export const AD_CAPACITIES = ['owner', 'broker', 'agent', 'developer'] as const;

export interface AdDraft {
  purpose?: (typeof AD_PURPOSES)[number];
  advertiserName?: string;
  capacity?: (typeof AD_CAPACITIES)[number];
  adLicenseNo?: string;
  adLicenseExpiry?: string; // yyyy-mm-dd
  city?: string;
  district?: string;
  propertyType?: string;
  areaSqm?: number;
  priceSar?: number;
  phone?: string; // +9665XXXXXXXX
  description?: string;
  /** The advertiser states whether the property has a mortgage, lien or dispute. `undefined` = not stated. */
  disclosesEncumbrances?: boolean;
}

export type AdIssueCode =
  | 'purpose_missing'
  | 'advertiser_missing'
  | 'capacity_missing'
  | 'license_missing'
  | 'license_invalid'
  | 'license_expired'
  | 'license_expiring'
  | 'location_missing'
  | 'property_type_missing'
  | 'area_missing'
  | 'price_missing'
  | 'contact_missing'
  | 'contact_invalid'
  | 'description_short'
  | 'encumbrances_not_stated';

export interface AdIssue {
  code: AdIssueCode;
  severity: 'error' | 'warning';
}

export const MIN_AD_DESCRIPTION = 30;

/** Days before the ad license expires at which the checker starts to warn. */
export const AD_LICENSE_WARN_DAYS = 30;

const blank = (s?: string) => !s || s.trim() === '';

export function checkAd(ad: AdDraft, today: string): AdIssue[] {
  const out: AdIssue[] = [];
  const err = (code: AdIssueCode) => out.push({ code, severity: 'error' });
  const warn = (code: AdIssueCode) => out.push({ code, severity: 'warning' });

  if (!ad.purpose) err('purpose_missing');
  if (blank(ad.advertiserName)) err('advertiser_missing');
  if (!ad.capacity) err('capacity_missing');

  if (blank(ad.adLicenseNo)) err('license_missing');
  else if (!FalLicenseSchema.safeParse(ad.adLicenseNo).success) err('license_invalid');
  if (!blank(ad.adLicenseNo) && !blank(ad.adLicenseExpiry)) {
    const left = daysBetween(today, ad.adLicenseExpiry as string);
    if (left < 0) err('license_expired');
    else if (left <= AD_LICENSE_WARN_DAYS) warn('license_expiring');
  }

  if (blank(ad.city) || blank(ad.district)) err('location_missing');
  if (blank(ad.propertyType)) err('property_type_missing');
  if (!ad.areaSqm || ad.areaSqm <= 0) err('area_missing');
  if (!ad.priceSar || ad.priceSar <= 0) err('price_missing');

  if (blank(ad.phone)) err('contact_missing');
  else if (!SaudiPhoneSchema.safeParse(ad.phone).success) err('contact_invalid');

  if (blank(ad.description) || (ad.description as string).trim().length < MIN_AD_DESCRIPTION) {
    err('description_short');
  }
  if (ad.disclosesEncumbrances === undefined) warn('encumbrances_not_stated');

  return out;
}

/** An ad is "ready" only when nothing is an error; warnings stay visible. */
export const adIsReady = (issues: AdIssue[]) => !issues.some((i) => i.severity === 'error');
