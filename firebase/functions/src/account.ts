import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Saudi PDPL rights (CLAUDE.md §5): a person can export everything Rasikh holds about them and delete their account.
 * Export collects the records tied to the person (their profile, memberships, leases and payments as tenant, tickets,
 * inspections, broker CRM, notifications). Deletion removes the person and their personal CRM data and anonymizes
 * nothing silently: organization records other people also rely on (a lease signed by an owner) stay with the
 * organization, as the privacy policy says.
 */
export interface AccountDeps {
  db: Firestore;
  auth: Auth;
  now?: () => Date;
}

const RECENT_SECONDS = 300;

const orgsOf = async (deps: AccountDeps, uid: string): Promise<string[]> => {
  const user = await deps.auth.getUser(uid);
  const orgs = (user.customClaims?.orgs ?? {}) as Record<string, string[]>;
  return Object.keys(orgs);
};

async function byField(deps: AccountDeps, path: string, field: string, uid: string) {
  const snap = await deps.db.collection(path).where(field, '==', uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function exportMyData(deps: AccountDeps, uid: string | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  const now = (deps.now ?? (() => new Date()))();
  const profile = (await deps.db.doc(`users/${uid}`).get()).data() ?? {};
  const memberships = (await deps.db.collection(`users/${uid}/memberships`).get()).docs.map((d) =>
    d.data(),
  );
  const orgs: Record<string, unknown> = {};
  for (const orgId of await orgsOf(deps, uid)) {
    const o = `orgs/${orgId}`;
    orgs[orgId] = {
      member: (await deps.db.doc(`${o}/members/${uid}`).get()).data() ?? null,
      leasesAsTenant: await byField(deps, `${o}/leases`, 'tenantUid', uid),
      paymentsAsTenant: await byField(deps, `${o}/payments`, 'tenantUid', uid),
      inspectionsAsTenant: await byField(deps, `${o}/inspections`, 'tenantUid', uid),
      ticketsAsTenant: await byField(deps, `${o}/tickets`, 'tenantUid', uid),
      ticketsAsVendor: await byField(deps, `${o}/tickets`, 'vendorUid', uid),
      brokerProfile: (await deps.db.doc(`${o}/brokers/${uid}`).get()).data() ?? null,
      leads: await byField(deps, `${o}/leads`, 'brokerUid', uid),
      viewings: await byField(deps, `${o}/viewings`, 'brokerUid', uid),
      brokerContracts: await byField(deps, `${o}/brokerContracts`, 'brokerUid', uid),
      brokerActivity: await byField(deps, `${o}/brokerActivity`, 'brokerUid', uid),
      notifications: await byField(deps, `${o}/notifications`, 'uid', uid),
    };
    await deps.db.collection(`${o}/audit`).add({
      action: 'data_exported',
      uid,
      at: FieldValue.serverTimestamp(),
    });
  }
  return { exportedAt: now.toISOString(), uid, profile, memberships, orgs };
}

async function removeWhere(deps: AccountDeps, path: string, field: string, uid: string) {
  const snap = await deps.db.collection(path).where(field, '==', uid).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = deps.db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

/**
 * Deletes the account. Needs a sign-in from the last five minutes, and refuses to orphan an organization: the sole
 * owner of an organization that still has other members must hand it over first.
 */
export async function deleteMyAccount(
  deps: AccountDeps,
  caller: { uid: string; authTime?: number } | undefined,
) {
  if (!caller) throw new HttpsError('unauthenticated', 'auth_required');
  const { uid } = caller;
  const now = (deps.now ?? (() => new Date()))();
  if (!caller.authTime || now.getTime() / 1000 - caller.authTime > RECENT_SECONDS) {
    throw new HttpsError('failed-precondition', 'recent_login_required');
  }

  const orgIds = await orgsOf(deps, uid);
  for (const orgId of orgIds) {
    const members = await deps.db.collection(`orgs/${orgId}/members`).get();
    const mine = members.docs.find((d) => d.id === uid);
    const owners = members.docs.filter((d) =>
      ((d.data().roles ?? []) as string[]).includes('owner'),
    );
    const iAmOwner = ((mine?.data().roles ?? []) as string[]).includes('owner');
    if (iAmOwner && owners.length === 1 && members.size > 1) {
      throw new HttpsError('failed-precondition', 'transfer_ownership_first');
    }
  }

  for (const orgId of orgIds) {
    const o = `orgs/${orgId}`;
    await deps.db
      .collection(`${o}/audit`)
      .add({ action: 'account_deleted', uid, at: FieldValue.serverTimestamp() });
    for (const [col, field] of [
      ['leads', 'brokerUid'],
      ['viewings', 'brokerUid'],
      ['brokerContracts', 'brokerUid'],
      ['brokerActivity', 'brokerUid'],
      ['notifications', 'uid'],
    ] as const) {
      await removeWhere(deps, `${o}/${col}`, field, uid);
    }
    await deps.db.doc(`${o}/brokers/${uid}`).delete();
    await deps.db.doc(`${o}/members/${uid}`).delete();
  }
  const links = await deps.db.collection(`users/${uid}/memberships`).get();
  await Promise.all(links.docs.map((d) => d.ref.delete()));
  await deps.db.doc(`users/${uid}`).delete();
  await deps.auth.deleteUser(uid);
  return { deleted: true, organizations: orgIds.length };
}
