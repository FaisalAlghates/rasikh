import type { Role } from '@rasikh/shared';
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

export interface LinkDeps {
  db: Firestore;
  auth: Auth;
}

export const inviteKey = (email: string) => Buffer.from(email.toLowerCase()).toString('base64url');

/** Adds a role to the person's organization membership and to their custom claims (set only here, on the server). */
export async function grantRole(deps: LinkDeps, orgId: string, uid: string, role: Role) {
  await deps.db
    .doc(`orgs/${orgId}/members/${uid}`)
    .set(
      { uid, roles: FieldValue.arrayUnion(role), joinedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  const user = await deps.auth.getUser(uid);
  const orgs = (user.customClaims?.orgs ?? {}) as Record<string, Role[]>;
  const roles = Array.from(new Set([...(orgs[orgId] ?? []), role])) as Role[];
  await deps.auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    orgs: { ...orgs, [orgId]: roles },
  });
}

/** A unit owner of a building: sees that building's ledger, balances and votes, and casts their own ballot. */
export async function attachBuildingOwner(
  deps: LinkDeps,
  orgId: string,
  buildingId: string,
  memberId: string,
  uid: string,
) {
  const member = deps.db.doc(`orgs/${orgId}/buildings/${buildingId}/members/${memberId}`);
  if (!(await member.get()).exists) throw new HttpsError('not-found', 'member_not_found');
  const building = await deps.db.doc(`orgs/${orgId}/buildings/${buildingId}`).get();
  const batch = deps.db.batch();
  batch.update(member, { uid });
  batch.set(deps.db.doc(`orgs/${orgId}/buildings/${buildingId}/owners/${uid}`), { memberId });
  batch.set(deps.db.doc(`users/${uid}/memberships/${orgId}_${buildingId}`), {
    orgId,
    buildingId,
    memberId,
    name: (building.data()?.name as string | undefined) ?? '',
  });
  batch.set(deps.db.collection(`orgs/${orgId}/audit`).doc(), {
    action: 'building.owner_linked',
    actor: 'system',
    at: FieldValue.serverTimestamp(),
    meta: { buildingId, memberId, uid },
  });
  await batch.commit();
  await grantRole(deps, orgId, uid, 'building_owner');
}

/** A vendor with their own login: sees and moves only the tickets assigned to them. */
export async function attachVendor(deps: LinkDeps, orgId: string, ticketId: string, uid: string) {
  const ref = deps.db.doc(`orgs/${orgId}/tickets/${ticketId}`);
  if (!(await ref.get()).exists) throw new HttpsError('not-found', 'ticket_not_found');
  await ref.update({ vendorUid: uid });
  await grantRole(deps, orgId, uid, 'vendor');
}

export type InviteItem =
  | { kind?: 'lease'; orgId: string; leaseId: string }
  | { kind: 'building'; orgId: string; buildingId: string; memberId: string }
  | { kind: 'vendor'; orgId: string; ticketId: string };

export async function addInvite(deps: LinkDeps, email: string, item: InviteItem) {
  await deps.db
    .doc(`invites/${inviteKey(email)}`)
    .set(
      { email, items: FieldValue.arrayUnion(item), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}

/** Links an existing user at once; returns false when the person has no account yet (the invite waits for them). */
export async function linkByEmail(
  deps: LinkDeps,
  email: string,
  apply: (uid: string) => Promise<void>,
) {
  try {
    const user = await deps.auth.getUserByEmail(email);
    // An unverified address could belong to someone else: wait for the real owner to verify it.
    if (!user.emailVerified) return false;
    await apply(user.uid);
    return true;
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
    return false;
  }
}

async function assertStaff(deps: LinkDeps, orgId: string, uid: string) {
  const m = await deps.db.doc(`orgs/${orgId}/members/${uid}`).get();
  const roles = (m.data()?.roles ?? []) as string[];
  if (!roles.some((r) => r === 'owner' || r === 'manager' || r === 'admin')) {
    throw new HttpsError('permission-denied', 'staff_only');
  }
}

const BuildingInvite = z.object({
  orgId: z.string().min(1),
  buildingId: z.string().min(1),
  memberId: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
});

/** Staff link a building owner (a member of the association) to an account by email. */
export async function inviteBuildingMember(
  deps: LinkDeps,
  callerUid: string | undefined,
  raw: unknown,
) {
  if (!callerUid) throw new HttpsError('unauthenticated', 'auth_required');
  const parsed = BuildingInvite.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { orgId, buildingId, memberId, email } = parsed.data;
  await assertStaff(deps, orgId, callerUid);
  const member = await deps.db
    .doc(`orgs/${orgId}/buildings/${buildingId}/members/${memberId}`)
    .get();
  if (!member.exists) throw new HttpsError('not-found', 'member_not_found');

  const linked = await linkByEmail(deps, email, (uid) =>
    attachBuildingOwner(deps, orgId, buildingId, memberId, uid),
  );
  if (linked) return { status: 'linked' as const };
  await addInvite(deps, email, { kind: 'building', orgId, buildingId, memberId });
  return { status: 'pending' as const };
}

/** Applies one waiting invite after a verified sign-in. */
export async function applyInvite(deps: LinkDeps, item: InviteItem, uid: string) {
  if (item.kind === 'building')
    return attachBuildingOwner(deps, item.orgId, item.buildingId, item.memberId, uid);
  if (item.kind === 'vendor') return attachVendor(deps, item.orgId, item.ticketId, uid);
  return undefined;
}
