export const ROLES = [
  'owner',
  'tenant',
  'manager',
  'broker',
  'vendor',
  'admin',
  'building_owner',
  // engineering office: the office's lead (releases sets, manages the team) and its engineers
  'office_lead',
  'engineer',
] as const;
export type Role = (typeof ROLES)[number];

/** Roles a user may pick for themselves at onboarding. `admin` is never self-assigned. */
export const SELF_SERVICE_ROLES = [
  'owner',
  'tenant',
  'manager',
  'broker',
  'vendor',
  'office_lead',
] as const;
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

/** The three products an account subscribes to, one workspace each. */
export const PRODUCT_SECTIONS = ['property', 'office', 'broker'] as const;
export type ProductSection = (typeof PRODUCT_SECTIONS)[number];

/** The roles a person can take in each product section. */
export const SECTION_ROLES: Record<ProductSection, readonly SelfServiceRole[]> = {
  property: ['owner', 'tenant', 'manager', 'vendor'],
  office: ['office_lead'],
  broker: ['broker'],
};

/**
 * Every section is a subscription; at launch they are all free. Set a price (SAR per month) and flip
 * LAUNCH_FREE here when billing starts; nothing else needs to change.
 */
export const LAUNCH_FREE = true;
export const SECTION_PRICE_SAR: Record<ProductSection, number | null> = {
  property: null,
  office: null,
  broker: null,
};

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const FEATURE_FLAGS = {
  publicListings: false,
  publicBooking: false,
  rentFinancing: false,
  google3dFlyover: false,
} as const;
