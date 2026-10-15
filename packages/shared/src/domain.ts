import { z } from 'zod';

/** ISO calendar date, `YYYY-MM-DD`. Dates are kept as strings so time zones can never shift a due date. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date');

export const UNIT_TYPES = ['studio', 'apartment', 'villa'] as const;
export const PAYMENT_CYCLES = ['monthly', 'quarterly', 'semiannual', 'annual'] as const;
export const EXPENSE_CATEGORIES = [
  'maintenance',
  'utilities',
  'insurance',
  'fees',
  'other',
] as const;

/** A box around the Kingdom; a property pin outside it is rejected (also enforced in the Firestore rules). */
export const KSA_LAT = [16, 32.5] as const;
export const KSA_LNG = [34, 56] as const;

/** Exact pin of a property: picked on the map or from the owner's phone location while at the property. */
export const PropertyLocationSchema = z.object({
  lat: z.number().min(KSA_LAT[0]).max(KSA_LAT[1]),
  lng: z.number().min(KSA_LNG[0]).max(KSA_LNG[1]),
  source: z.enum(['map', 'gps']),
});
export type PropertyLocation = z.infer<typeof PropertyLocationSchema>;

export const PropertySchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().max(60).default(''),
  address: z.string().trim().max(160).default(''),
  kind: z.enum(['building', 'villa']).default('building'),
  location: PropertyLocationSchema.optional(),
});
export type PropertyInput = z.infer<typeof PropertySchema>;

export const UnitSchema = z.object({
  propertyId: z.string().min(1),
  label: z.string().trim().min(1).max(40),
  type: z.enum(UNIT_TYPES),
  areaM2: z.number().positive().max(100000).optional(),
});
export type UnitInput = z.infer<typeof UnitSchema>;

export const LeaseSchema = z
  .object({
    unitId: z.string().min(1),
    propertyId: z.string().min(1),
    /** Ejar contract number. We reference it; the contract itself lives in Ejar. */
    ejarContractNo: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z-]{6,30}$/, 'invalid_ejar_no'),
    tenantName: z.string().trim().min(2).max(80),
    tenantEmail: z.string().trim().toLowerCase().email().optional(),
    /** Denormalised so a tenant can read their lease without access to the property record. */
    propertyName: z.string().trim().max(80).optional(),
    unitLabel: z.string().trim().max(40).optional(),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    annualRent: z.number().positive().max(100_000_000),
    cycle: z.enum(PAYMENT_CYCLES),
    /** Informational only: the deposit is held through Ejar, never by Rasikh. */
    depositAmount: z.number().min(0).max(100_000_000).default(0),
  })
  .refine((l) => l.endDate > l.startDate, { path: ['endDate'], message: 'end_before_start' });
export type LeaseInput = z.infer<typeof LeaseSchema>;

export const PaymentSchema = z.object({
  leaseId: z.string(),
  unitId: z.string(),
  dueDate: IsoDateSchema,
  amount: z.number().nonnegative(),
  status: z.enum(['due', 'paid']),
  paidAt: IsoDateSchema.optional(),
  receiptPath: z.string().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const ExpenseSchema = z.object({
  propertyId: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive().max(100_000_000),
  date: IsoDateSchema,
  note: z.string().trim().max(200).default(''),
  receiptPath: z.string().optional(),
});
export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const DocumentSchema = z.object({
  propertyId: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(['plan', 'insurance', 'contract', 'other']),
  storagePath: z.string(),
});
export type DocumentInput = z.infer<typeof DocumentSchema>;

// ---------------------------------------------------------------- dates (UTC, date-only)

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * 86_400_000);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}

/** Adds calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(ny, nm, Math.min(d, last)));
}

// ---------------------------------------------------------------- payment schedule

const MONTHS_PER_CYCLE: Record<(typeof PAYMENT_CYCLES)[number], number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export interface Installment {
  dueDate: string;
  amount: number;
}

/**
 * Splits the rent over the lease term. Amounts are computed in halalas (integers) and the last
 * installment absorbs rounding, so the installments always add up exactly to the rent for the term.
 * This is a record-keeping schedule: Rasikh never collects or moves money.
 */
export function buildSchedule(
  l: Pick<LeaseInput, 'startDate' | 'endDate' | 'annualRent' | 'cycle'>,
): Installment[] {
  const step = MONTHS_PER_CYCLE[l.cycle];
  const dates: string[] = [];
  for (let i = 0; ; i++) {
    const d = addMonths(l.startDate, i * step);
    if (d >= l.endDate) break;
    dates.push(d);
  }
  const startMs = toUtc(l.startDate);
  const termMonths = Math.max(
    1,
    Math.round(((toUtc(l.endDate) - startMs) / 86_400_000 / 365.25) * 12),
  );
  const totalHalalas = Math.round((l.annualRent * 100 * termMonths) / 12);
  const each = Math.floor(totalHalalas / dates.length);
  return dates.map((dueDate, i) => {
    const h = i === dates.length - 1 ? totalHalalas - each * (dates.length - 1) : each;
    return { dueDate, amount: h / 100 };
  });
}

// ---------------------------------------------------------------- Riyadh rent freeze + renewal notice

/** Riyadh contracts may not raise the annual rent for 5 years from this date (per the brief's research). */
export const RIYADH_FREEZE_FROM = '2025-09-25';
export const RIYADH_FREEZE_UNTIL = '2030-09-25';
export const RENEWAL_NOTICE_DAYS = 60;

const isRiyadh = (city: string) => /(^|\s)(riyadh|الرياض)(\s|$)/i.test(city.trim());

export interface RentFreezeResult {
  warn: boolean;
  /** The reference amount: renewal must not exceed it while the freeze applies. */
  maxAnnualRent?: number;
}

/**
 * Warns when a renewal inside Riyadh raises the rent during the freeze window.
 * Informational only: not a legal ruling; the user should check with Ejar or a licensed professional.
 */
export function rentFreezeCheck(args: {
  city: string;
  previousAnnualRent: number;
  newAnnualRent: number;
  newStartDate: string;
}): RentFreezeResult {
  const inWindow =
    args.newStartDate >= RIYADH_FREEZE_FROM && args.newStartDate < RIYADH_FREEZE_UNTIL;
  if (!isRiyadh(args.city) || !inWindow) return { warn: false };
  return {
    warn: args.newAnnualRent > args.previousAnnualRent,
    maxAnnualRent: args.previousAnnualRent,
  };
}

export const renewalNoticeDate = (endDate: string) => addDays(endDate, -RENEWAL_NOTICE_DAYS);

// ---------------------------------------------------------------- reminders

export type ReminderKind =
  'payment_upcoming' | 'payment_late' | 'lease_expiring' | 'renewal_notice';
export interface Reminder {
  /** Stable id so each reminder is sent once. */
  key: string;
  kind: ReminderKind;
  leaseId: string;
  paymentId?: string;
  /** Days until (positive) or since (negative) the relevant date. */
  days: number;
}

export function computeReminders(
  today: string,
  leases: Array<{ id: string; endDate: string; status?: string }>,
  payments: Array<{ id: string; leaseId: string; dueDate: string; status: 'due' | 'paid' }>,
  opts: { upcomingDays?: number; expiringDays?: number } = {},
): Reminder[] {
  const upcoming = opts.upcomingDays ?? 7;
  const expiring = opts.expiringDays ?? 30;
  const out: Reminder[] = [];
  for (const p of payments) {
    if (p.status !== 'due') continue;
    const days = daysBetween(today, p.dueDate);
    if (days < 0)
      out.push({
        key: `late:${p.id}:${today}`,
        kind: 'payment_late',
        leaseId: p.leaseId,
        paymentId: p.id,
        days,
      });
    else if (days <= upcoming)
      out.push({
        key: `upcoming:${p.id}`,
        kind: 'payment_upcoming',
        leaseId: p.leaseId,
        paymentId: p.id,
        days,
      });
  }
  for (const l of leases) {
    if (l.status === 'ended') continue;
    const left = daysBetween(today, l.endDate);
    if (left < 0) continue;
    if (left <= RENEWAL_NOTICE_DAYS && left > expiring) {
      out.push({ key: `renewal:${l.id}`, kind: 'renewal_notice', leaseId: l.id, days: left });
    }
    if (left <= expiring)
      out.push({ key: `expiring:${l.id}`, kind: 'lease_expiring', leaseId: l.id, days: left });
  }
  return out;
}

// ---------------------------------------------------------------- reports

export interface YearTotals {
  expected: number;
  collected: number;
  outstanding: number;
  expenses: number;
  net: number;
}

export function yearTotals(
  year: number,
  payments: Array<{ dueDate: string; amount: number; status: 'due' | 'paid' }>,
  expenses: Array<{ date: string; amount: number }>,
): YearTotals {
  const inYear = (d: string) => d.startsWith(`${year}-`);
  const round = (n: number) => Math.round(n * 100) / 100;
  const ps = payments.filter((p) => inYear(p.dueDate));
  const expected = ps.reduce((s, p) => s + p.amount, 0);
  const collected = ps.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const spent = expenses.filter((e) => inYear(e.date)).reduce((s, e) => s + e.amount, 0);
  return {
    expected: round(expected),
    collected: round(collected),
    outstanding: round(expected - collected),
    expenses: round(spent),
    net: round(collected - spent),
  };
}
