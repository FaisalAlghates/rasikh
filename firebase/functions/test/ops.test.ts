import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { createOrganization } from '../src/organizations.js';
import { runReminders } from '../src/reminders.js';
import { claimInvites, inviteTenant } from '../src/tenants.js';

let deps: { db: ReturnType<typeof getFirestore>; auth: ReturnType<typeof getAuth> };
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: 'demo-rasikh' });
  deps = { db: getFirestore(), auth: getAuth() };
});

async function seed(phone: string) {
  const owner = await deps.auth.createUser({ phoneNumber: phone });
  const { orgId } = await createOrganization(deps, owner.uid, {
    name: 'محفظة',
    roles: ['owner'],
    displayName: 'مالك',
    consentPdpl: true,
  });
  await deps.db.doc(`orgs/${orgId}/leases/L1`).set({
    unitLabel: 'شقة 3',
    propertyName: 'النخيل',
    endDate: '2026-11-20',
    status: 'active',
  });
  await deps.db
    .doc(`orgs/${orgId}/payments/P1`)
    .set({ leaseId: 'L1', dueDate: '2026-10-15', amount: 3500, status: 'due' });
  await deps.db
    .doc(`orgs/${orgId}/payments/P2`)
    .set({ leaseId: 'L1', dueDate: '2026-10-01', amount: 3500, status: 'due' });
  return { owner, orgId };
}

describe('inviteTenant / claimInvites', () => {
  it('links an existing user at once: member doc, claims, lease and payments', async () => {
    const { owner, orgId } = await seed('+966544000001');
    const tenant = await deps.auth.createUser({ email: 't1@rasikh.test', emailVerified: true });
    const res = await inviteTenant(deps, owner.uid, {
      orgId,
      leaseId: 'L1',
      email: 't1@rasikh.test',
    });
    expect(res.status).toBe('linked');
    expect((await deps.db.doc(`orgs/${orgId}/leases/L1`).get()).data()?.tenantUid).toBe(tenant.uid);
    expect((await deps.db.doc(`orgs/${orgId}/payments/P1`).get()).data()?.tenantUid).toBe(
      tenant.uid,
    );
    expect((await deps.auth.getUser(tenant.uid)).customClaims?.orgs[orgId]).toEqual(['tenant']);
  });

  it('stores a pending invite for unknown emails and applies it after verified sign-up', async () => {
    const { owner, orgId } = await seed('+966544000002');
    const res = await inviteTenant(deps, owner.uid, {
      orgId,
      leaseId: 'L1',
      email: 'later@rasikh.test',
    });
    expect(res.status).toBe('pending');

    const unverified = await deps.auth.createUser({
      email: 'later@rasikh.test',
      emailVerified: false,
    });
    expect((await claimInvites(deps, unverified.uid)).claimed).toBe(0); // takeover protection
    await deps.auth.updateUser(unverified.uid, { emailVerified: true });
    expect((await claimInvites(deps, unverified.uid)).claimed).toBe(1);
    expect((await deps.db.doc(`orgs/${orgId}/leases/L1`).get()).data()?.tenantUid).toBe(
      unverified.uid,
    );
    expect((await claimInvites(deps, unverified.uid)).claimed).toBe(0); // invite consumed
  });

  it('only staff can invite', async () => {
    const { orgId } = await seed('+966544000003');
    const stranger = await deps.auth.createUser({ phoneNumber: '+966544000004' });
    await expect(
      inviteTenant(deps, stranger.uid, { orgId, leaseId: 'L1', email: 'x@rasikh.test' }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('runReminders', () => {
  it('notifies the owner and the tenant once per reminder', async () => {
    const { owner, orgId } = await seed('+966544000005');
    const tenant = await deps.auth.createUser({ email: 't5@rasikh.test', emailVerified: true });
    await inviteTenant(deps, owner.uid, { orgId, leaseId: 'L1', email: 't5@rasikh.test' });

    const first = await runReminders({ db: deps.db }, '2026-10-12');
    expect(first.created).toBeGreaterThan(0);
    const notes = await deps.db.collection(`orgs/${orgId}/notifications`).get();
    const kinds = new Set(notes.docs.map((d) => d.data().kind));
    expect(kinds).toEqual(new Set(['payment_upcoming', 'payment_late', 'renewal_notice']));
    const uids = new Set(notes.docs.map((d) => d.data().uid));
    expect(uids).toEqual(new Set([owner.uid, tenant.uid]));

    const again = await runReminders({ db: deps.db }, '2026-10-12');
    expect(again.created).toBe(0); // idempotent
  });

  it('skips malformed leases and payments instead of failing for everyone', async () => {
    const { orgId } = await seed('+966544000006');
    await deps.db.doc('orgs/broken/leases/L0').set({ unitId: 'u' }); // no end date
    await deps.db.doc('orgs/broken/payments/P0').set({ leaseId: 'L0', status: 'due' }); // no due date
    const res = await runReminders({ db: deps.db }, '2026-10-12');
    expect(res.created).toBeGreaterThan(0);
    const notes = await deps.db.collection(`orgs/${orgId}/notifications`).get();
    expect(notes.size).toBeGreaterThan(0);
  });
});
