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

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const FEATURE_FLAGS = {
  publicListings: false,
  publicBooking: false,
  rentFinancing: false,
  google3dFlyover: false,
} as const;
