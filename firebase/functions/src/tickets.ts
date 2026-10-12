import {
  TicketActionSchema,
  TicketCreateSchema,
  nextStatus,
  slaDueAt,
  suggestResponsibility,
  type TicketParty,
} from '@rasikh/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Auth } from 'firebase-admin/auth';
import { z } from 'zod';
import { addInvite, attachVendor, linkByEmail } from './links.js';

export interface TicketDeps {
  db: Firestore;
  /** Needed only to give a vendor their own login. */
  auth?: Auth;
  now?: () => Date;
}

const STAFF = new Set(['owner', 'manager', 'admin']);

const CreateInput = z.object({
  orgId: z.string().min(1),
  ticketId: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9]+$/),
  ticket: TicketCreateSchema,
  photos: z.array(z.string()).max(5).default([]),
});

async function rolesOf(deps: TicketDeps, orgId: string, uid: string) {
  const m = await deps.db.doc(`orgs/${orgId}/members/${uid}`).get();
  return (m.data()?.roles ?? []) as string[];
}

/**
 * Creates a ticket. Staff may open one for any unit; a tenant only for the unit of their own lease.
 * The server stamps the time, the SLA deadline and the (non-binding) suggested responsibility.
 */
export async function createTicket(deps: TicketDeps, uid: string | undefined, raw: unknown) {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  const parsed = CreateInput.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { orgId, ticketId, ticket, photos } = parsed.data;

  const roles = await rolesOf(deps, orgId, uid);
  const staff = roles.some((r) => STAFF.has(r));
  let tenantUid: string | undefined;
  if (ticket.leaseId) {
    const lease = await deps.db.doc(`orgs/${orgId}/leases/${ticket.leaseId}`).get();
    if (!lease.exists || lease.data()?.unitId !== ticket.unitId) {
      throw new HttpsError('invalid-argument', 'lease_mismatch');
    }
    tenantUid = lease.data()?.tenantUid as string | undefined;
  }
  if (!staff && (!tenantUid || tenantUid !== uid)) {
    throw new HttpsError('permission-denied', 'not_allowed');
  }
  const prefix = `orgs/${orgId}/tickets/${ticketId}/`;
  if (photos.some((p) => !p.startsWith(prefix) || p.slice(prefix.length).includes('/'))) {
    throw new HttpsError('invalid-argument', 'bad_photo_path');
  }

  const ref = deps.db.doc(`orgs/${orgId}/tickets/${ticketId}`);
  if ((await ref.get()).exists) throw new HttpsError('already-exists', 'ticket_exists');
  const now = (deps.now ?? (() => new Date()))();
  await ref.set({
    ...ticket,
    ...(tenantUid ? { tenantUid } : {}),
    photos,
    status: 'open',
    suggestedParty: suggestResponsibility(ticket.category),
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: now.toISOString(),
    slaDueAt: slaDueAt(now, ticket.urgency),
  });
  return { ticketId };
}

const ActionInput = z.object({
  orgId: z.string().min(1),
  ticketId: z.string().min(1),
  input: TicketActionSchema,
});

/** Moves a ticket along its lifecycle; the status machine and who may act live in the shared package. */
export async function ticketAction(deps: TicketDeps, uid: string | undefined, raw: unknown) {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  const parsed = ActionInput.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { orgId, ticketId, input } = parsed.data;

  const ref = deps.db.doc(`orgs/${orgId}/tickets/${ticketId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'ticket_not_found');
  const t = snap.data() as {
    status: Parameters<typeof nextStatus>[0];
    tenantUid?: string;
    vendorUid?: string;
  };

  const staff = (await rolesOf(deps, orgId, uid)).some((r) => STAFF.has(r));
  const party: TicketParty | undefined = staff
    ? 'staff'
    : t.tenantUid === uid
      ? 'tenant'
      : t.vendorUid === uid
        ? 'vendor'
        : undefined;
  if (!party) throw new HttpsError('permission-denied', 'not_allowed');

  const to = nextStatus(t.status, input.action, party);
  if (!to) throw new HttpsError('failed-precondition', 'transition_not_allowed');

  const now = (deps.now ?? (() => new Date()))();
  const patch: Record<string, unknown> = { status: to, updatedAt: FieldValue.serverTimestamp() };
  if (input.action === 'assign') {
    patch.vendorName = input.vendorName;
    patch.vendorPhone = input.vendorPhone;
    if (input.vendorEmail) {
      if (!deps.auth) throw new HttpsError('failed-precondition', 'auth_unavailable');
      const link = { db: deps.db, auth: deps.auth };
      const linked = await linkByEmail(link, input.vendorEmail, (vuid) =>
        attachVendor(link, orgId, ticketId, vuid),
      );
      if (!linked) await addInvite(link, input.vendorEmail, { kind: 'vendor', orgId, ticketId });
      patch.vendorEmail = input.vendorEmail;
    }
  }
  if (input.action === 'resolve') {
    patch.resolvedAtIso = now.toISOString();
    patch.resolution = input.note;
  }
  if (input.action === 'close' && input.rating !== undefined) {
    if (party !== 'tenant') throw new HttpsError('permission-denied', 'only_tenant_rates');
    patch.rating = input.rating;
    patch.ratingNote = input.ratingNote;
  }
  await ref.update(patch);
  await deps.db.collection(`orgs/${orgId}/audit`).add({
    action: `ticket.${input.action}`,
    actor: uid,
    at: FieldValue.serverTimestamp(),
    meta: { ticketId, to },
  });
  return { status: to };
}
