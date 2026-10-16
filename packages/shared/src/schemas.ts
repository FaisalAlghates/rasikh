import { z } from 'zod';
import { LOCALES, PRODUCT_SECTIONS, ROLES, SELF_SERVICE_ROLES } from './enums.js';

export const RoleSchema = z.enum(ROLES);
export const SelfServiceRoleSchema = z.enum(SELF_SERVICE_ROLES);
export const LocaleSchema = z.enum(LOCALES);

/** Saudi mobile number in E.164: +9665XXXXXXXX */
export const SaudiPhoneSchema = z.string().regex(/^\+9665\d{8}$/, 'invalid_saudi_phone');

/** REGA FAL license number: digits only (format is validated loosely until REGA publishes a spec). */
export const FalLicenseSchema = z.string().regex(/^\d{8,12}$/, 'invalid_fal_license');

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(80),
  createdBy: z.string(),
  createdAt: z.number().int(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const MemberSchema = z.object({
  uid: z.string(),
  roles: z.array(RoleSchema).min(1),
  displayName: z.string().max(80).optional(),
  joinedAt: z.number().int(),
});
export type Member = z.infer<typeof MemberSchema>;

/** Input of the `createOrganization` callable. */
export const CreateOrganizationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  roles: z.array(SelfServiceRoleSchema).min(1).max(5),
  /** The product section this workspace subscribes to; absent for older clients. */
  section: z.enum(PRODUCT_SECTIONS).optional(),
  displayName: z.string().trim().min(2).max(80),
  consentPdpl: z.literal(true),
  locale: LocaleSchema.default('ar'),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;

/** Custom claims set only by Cloud Functions. */
export const ClaimsSchema = z.object({
  orgs: z.record(z.string(), z.array(RoleSchema)),
});
export type Claims = z.infer<typeof ClaimsSchema>;
