import type { Role } from '@rasikh/shared';
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { applyInvite, type InviteItem } from './links.js';
import { z } from 'zod';

export interface Deps {
  db: Firestore;
  auth: Auth;
}

const InviteInput = z.object({
  orgId: z.string().min(1),
  leaseId: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
});

const inviteDocId = (email: string) => Buffer.from(email.toLowerCase()).toString('base64url');

async function assertStaff(deps: Deps, orgId: string, uid: string) {
  const m = await deps.db.doc(`orgs/${orgId}/members/${uid}`).get();
  const roles = (m.data()?.roles ?? []) as Role[];
  if (!roles.some((r) => r === 'owner' || r === 'manager' || r === 'admin')) {
    throw new HttpsError('permission-denied', 'staff_only');
  }
}

/** Links a user to a lease as its tenant: member doc, custom claims, lease + payments. */
export async function attachTenant(deps: Deps, orgId: string, leaseId: string, uid: string) {
  const leaseRef = deps.db.doc(`orgs/${orgId}/leases/${leaseId}`);
  const lease = await leaseRef.get();
  if (!lease.exists) throw new HttpsError('not-found', 'lease_not_found');

  const payments = await deps.db
    .collection(`orgs/${orgId}/payments`)
    .where('leaseId', '==', leaseId)
    .get();
  // Inspections carry the tenant's uid too, so the tenant can read them under the security rules.
  const inspections = await deps.db
    .collection(`orgs/${orgId}/inspections`)
    .where('leaseId', '==', leaseId)
    .get();
  const batch = deps.db.batch();
  batch.update(leaseRef, { tenantUid: uid });
  inspections.forEach((i) => batch.update(i.ref, { tenantUid: uid }));
  payments.forEach((p) => batch.update(p.ref, { tenantUid: uid }));
  batch.set(
    deps.db.doc(`orgs/${orgId}/members/${uid}`),
    { uid, roles: FieldValue.arrayUnion('tenant'), joinedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  batch.set(deps.db.collection(`orgs/${orgId}/audit`).doc(), {
    action: 'tenant.attached',
    actor: 'system',
    at: FieldValue.serverTimestamp(),
    meta: { leaseId, uid },
  });
  await batch.commit();

  const user = await deps.auth.getUser(uid);
  const orgs = (user.customClaims?.orgs ?? {}) as Record<string, Role[]>;
  const roles = Array.from(new Set([...(orgs[orgId] ?? []), 'tenant'])) as Role[];
  await deps.auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    orgs: { ...orgs, [orgId]: roles },
  });
}

/** Owner/manager invites a tenant by email. Existing users are linked at once; others on first sign-in. */
export async function inviteTenant(deps: Deps, callerUid: string | undefined, raw: unknown) {
  if (!callerUid) throw new HttpsError('unauthenticated', 'auth_required');
  const parsed = InviteInput.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { orgId, leaseId, email } = parsed.data;
  await assertStaff(deps, orgId, callerUid);

  const lease = await deps.db.doc(`orgs/${orgId}/leases/${leaseId}`).get();
  if (!lease.exists) throw new HttpsError('not-found', 'lease_not_found');

  try {
    const user = await deps.auth.getUserByEmail(email);
    await attachTenant(deps, orgId, leaseId, user.uid);
    return { status: 'linked' as const };
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
  }
  await deps.db.doc(`invites/${inviteDocId(email)}`).set(
    {
      email,
      items: FieldValue.arrayUnion({ orgId, leaseId }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await deps.db.doc(`orgs/${orgId}/leases/${leaseId}`).update({ tenantEmail: email });
  return { status: 'pending' as const };
}

/** Called after sign-in: applies any invites that were waiting for this user's email. */
export async function claimInvites(deps: Deps, uid: string | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  const user = await deps.auth.getUser(uid);
  // Only a verified address may claim an invite, otherwise anyone could sign up with a landlord's tenant email.
  if (!user.email || !user.emailVerified) return { claimed: 0 };
  const ref = deps.db.doc(`invites/${inviteDocId(user.email)}`);
  const snap = await ref.get();
  if (!snap.exists) return { claimed: 0 };
  const items = (snap.data()?.items ?? []) as InviteItem[];
  for (const it of items) {
    if (it.kind === undefined || it.kind === 'lease')
      await attachTenant(deps, it.orgId, it.leaseId, uid);
    else await applyInvite(deps, it, uid);
  }
  await ref.delete();
  return { claimed: items.length };
}
