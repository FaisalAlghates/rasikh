import { z } from 'zod';
import { addDays } from './domain.js';

/**
 * Maintenance tickets. The "suggested responsibility" is only a suggestion that follows Ejar's general
 * guidance (consumables and tenant-caused damage on the tenant; basic and structural repairs on the owner).
 * A person always decides; this is not a legal ruling.
 */

export const TICKET_CATEGORIES = [
  'consumables',
  'tenant_damage',
  'plumbing',
  'electrical',
  'ac',
  'appliance',
  'structure',
  'pest',
  'other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const URGENCIES = ['low', 'normal', 'urgent', 'emergency'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const TICKET_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'cancelled',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type Responsibility = 'tenant' | 'owner';

export function suggestResponsibility(c: TicketCategory): Responsibility {
  return c === 'consumables' || c === 'tenant_damage' ? 'tenant' : 'owner';
}

/** Hours allowed before the SLA timer counts the ticket as late. */
export const SLA_HOURS: Record<Urgency, number> = {
  emergency: 4,
  urgent: 24,
  normal: 72,
  low: 168,
};

export const slaDueAt = (createdAt: Date, urgency: Urgency): string =>
  new Date(createdAt.getTime() + SLA_HOURS[urgency] * 3600_000).toISOString();

export type SlaState = 'met' | 'ok' | 'due_soon' | 'breached';

/** `due_soon` = under a quarter of the allowed time left. A resolved ticket is judged by when it was resolved. */
export function slaState(
  urgency: Urgency,
  createdAtIso: string,
  nowIso: string,
  resolvedAtIso?: string,
): SlaState {
  const start = Date.parse(createdAtIso);
  const due = start + SLA_HOURS[urgency] * 3600_000;
  if (resolvedAtIso) return Date.parse(resolvedAtIso) <= due ? 'met' : 'breached';
  const now = Date.parse(nowIso);
  if (now > due) return 'breached';
  return due - now < (due - start) / 4 ? 'due_soon' : 'ok';
}

export const TicketCreateSchema = z.object({
  unitId: z.string().min(1),
  propertyId: z.string().min(1),
  leaseId: z.string().optional(),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).default(''),
  category: z.enum(TICKET_CATEGORIES),
  urgency: z.enum(URGENCIES),
});
export type TicketCreate = z.infer<typeof TicketCreateSchema>;

export const TICKET_ACTIONS = ['assign', 'start', 'resolve', 'close', 'cancel'] as const;
export type TicketAction = (typeof TICKET_ACTIONS)[number];

export type TicketParty = 'staff' | 'tenant' | 'vendor';

/** Which status each action leaves, who may do it, and from which statuses. */
const RULES: Record<TicketAction, { from: TicketStatus[]; to: TicketStatus; by: TicketParty[] }> = {
  assign: { from: ['open', 'assigned'], to: 'assigned', by: ['staff'] },
  start: { from: ['assigned'], to: 'in_progress', by: ['staff', 'vendor'] },
  resolve: { from: ['assigned', 'in_progress'], to: 'resolved', by: ['staff', 'vendor'] },
  close: { from: ['resolved'], to: 'closed', by: ['tenant', 'staff'] },
  cancel: { from: ['open', 'assigned'], to: 'cancelled', by: ['tenant', 'staff'] },
};

/** The next status, or `undefined` when the action is not allowed for this party in this status. */
export function nextStatus(
  from: TicketStatus,
  action: TicketAction,
  party: TicketParty,
): TicketStatus | undefined {
  const r = RULES[action];
  return r.from.includes(from) && r.by.includes(party) ? r.to : undefined;
}

export const TicketActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('assign'),
    vendorName: z.string().trim().min(2).max(80),
    vendorPhone: z.string().trim().max(20).default(''),
    /** When given, the vendor gets their own login: they see and move only the tickets assigned to them. */
    vendorEmail: z.string().trim().toLowerCase().email().optional(),
  }),
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('resolve'), note: z.string().trim().max(500).default('') }),
  z.object({
    action: z.literal('close'),
    /** Only the tenant rates; a staff member closing on their behalf leaves it empty. */
    rating: z.number().int().min(1).max(5).optional(),
    ratingNote: z.string().trim().max(300).default(''),
  }),
  z.object({ action: z.literal('cancel') }),
]);
export type TicketActionInput = z.infer<typeof TicketActionSchema>;

/** Used only so a due date can be shown as a calendar day. */
export const slaDay = (iso: string) => addDays(iso.slice(0, 10), 0);
