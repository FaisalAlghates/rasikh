import type { ExpenseInput, LeaseInput, Payment, PropertyInput, UnitInput } from '@rasikh/shared';

export type PropertyDoc = PropertyInput;
export type UnitDoc = UnitInput;
export type LeaseDoc = LeaseInput & { tenantUid?: string; status?: string };
export type PaymentDoc = Payment & { tenantUid?: string };
export type ExpenseDoc = ExpenseInput;
export interface NotificationDoc {
  uid: string;
  kind: 'payment_upcoming' | 'payment_late' | 'lease_expiring' | 'renewal_notice';
  days: number;
  unitLabel?: string;
  propertyName?: string;
  readAt: unknown;
}

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
