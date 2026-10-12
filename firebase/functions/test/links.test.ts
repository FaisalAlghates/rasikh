import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { inviteBuildingMember } from '../src/links.js';
import { createOrganization } from '../src/organizations.js';
import { createTicket, ticketAction } from '../src/tickets.js';
import { claimInvites } from '../src/tenants.js';

let deps: { db: ReturnType<typeof getFirestore>; auth: ReturnType<typeof getAuth> };
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: 'demo-rasikh' });
  deps = { db: getFirestore(), auth: getAuth() };
});

let n = 0;
async function seed() {
  const owner = await deps.auth.createUser({ email: `lk-owner-${++n}-${Date.now()}@rasikh.test` });
  const { orgId } = await createOrganization(deps, owner.uid, {
    name: 'محفظة',
    roles: ['owner'],
    displayName: 'مالك',
    consentPdpl: true,
  });
  await deps.db.doc(`orgs/${orgId}/buildings/B1`).set({ name: 'عمارة' });
  await deps.db
    .doc(`orgs/${orgId}/buildings/B1/members/M1`)
    .set({ name: 'سالم', unitLabel: '1', shareBp: 6000 });
  return { owner, orgId };
}
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return (e as { message: string }).message;
  }
};

describe('building owners', () => {
  it('an existing account is linked at once: owner index, membership, claim role', async () => {
    const { owner, orgId } = await seed();
    const email = `unit-${n}-${Date.now()}@rasikh.test`;
    const person = await deps.auth.createUser({ email, emailVerified: true });
    const res = await inviteBuildingMember(deps, owner.uid, {
      orgId,
      buildingId: 'B1',
      memberId: 'M1',
      email,
    });
    expect(res.status).toBe('linked');
    expect(
      (await deps.db.doc(`orgs/${orgId}/buildings/B1/owners/${person.uid}`).get()).data(),
    ).toEqual({ memberId: 'M1' });
    expect((await deps.db.doc(`orgs/${orgId}/buildings/B1/members/M1`).get()).data()!.uid).toBe(
      person.uid,
    );
    expect(
      (await deps.db.doc(`users/${person.uid}/memberships/${orgId}_B1`).get()).data(),
    ).toMatchObject({ memberId: 'M1' });
    expect((await deps.auth.getUser(person.uid)).customClaims?.orgs[orgId]).toEqual([
      'building_owner',
    ]);
  });

  it('an unknown email waits and is applied after a verified sign-up', async () => {
    const { owner, orgId } = await seed();
    const email = `later-${n}-${Date.now()}@rasikh.test`;
    expect(
      (
        await inviteBuildingMember(deps, owner.uid, {
          orgId,
          buildingId: 'B1',
          memberId: 'M1',
          email,
        })
      ).status,
    ).toBe('pending');
    const person = await deps.auth.createUser({ email, emailVerified: false });
    expect((await claimInvites(deps, person.uid)).claimed).toBe(0);
    await deps.auth.updateUser(person.uid, { emailVerified: true });
    expect((await claimInvites(deps, person.uid)).claimed).toBe(1);
    expect(
      (await deps.db.doc(`orgs/${orgId}/buildings/B1/owners/${person.uid}`).get()).exists,
    ).toBe(true);
  });

  it('only staff may link, and only existing members', async () => {
    const { owner, orgId } = await seed();
    const stranger = await deps.auth.createUser({ email: `s-${n}-${Date.now()}@rasikh.test` });
    const body = { orgId, buildingId: 'B1', memberId: 'M1', email: 'x@rasikh.test' };
    expect(await code(inviteBuildingMember(deps, stranger.uid, body))).toBe('staff_only');
    expect(await code(inviteBuildingMember(deps, owner.uid, { ...body, memberId: 'nope' }))).toBe(
      'member_not_found',
    );
  });
});

describe('vendors with a login', () => {
  async function ticket(orgId: string, tenantUid: string) {
    await deps.db.doc(`orgs/${orgId}/members/${tenantUid}`).set({ roles: ['tenant'] });
    await deps.db.doc(`orgs/${orgId}/leases/L1`).set({ unitId: 'U1', tenantUid });
    await createTicket({ db: deps.db }, tenantUid, {
      orgId,
      ticketId: 'T1',
      ticket: {
        unitId: 'U1',
        propertyId: 'P1',
        leaseId: 'L1',
        title: 'تسريب مياه',
        category: 'plumbing',
        urgency: 'urgent',
      },
    });
  }

  it('assigning by email gives the vendor access to that ticket only; they can start and resolve, not close', async () => {
    const { owner, orgId } = await seed();
    const tenant = await deps.auth.createUser({ email: `t-${n}-${Date.now()}@rasikh.test` });
    await ticket(orgId, tenant.uid);
    const email = `vendor-${n}-${Date.now()}@rasikh.test`;
    const vendor = await deps.auth.createUser({ email, emailVerified: true });
    const act = (uid: string, input: object) =>
      ticketAction(deps, uid, { orgId, ticketId: 'T1', input });

    await act(owner.uid, { action: 'assign', vendorName: 'مؤسسة السباكة', vendorEmail: email });
    const t = (await deps.db.doc(`orgs/${orgId}/tickets/T1`).get()).data()!;
    expect(t).toMatchObject({ vendorUid: vendor.uid, status: 'assigned' });
    expect((await deps.auth.getUser(vendor.uid)).customClaims?.orgs[orgId]).toEqual(['vendor']);

    expect(await code(act(vendor.uid, { action: 'assign', vendorName: 'آخر' }))).toBe(
      'transition_not_allowed',
    );
    await act(vendor.uid, { action: 'start' });
    await act(vendor.uid, { action: 'resolve', note: 'تم' });
    expect(await code(act(vendor.uid, { action: 'close', ratingNote: '' }))).toBe(
      'transition_not_allowed',
    );

    const other = await deps.auth.createUser({ email: `o-${n}-${Date.now()}@rasikh.test` });
    await deps.db.doc(`orgs/${orgId}/members/${other.uid}`).set({ roles: ['vendor'] });
    expect(await code(act(other.uid, { action: 'start' }))).toBe('not_allowed'); // a vendor of another ticket
  });

  it('an unknown vendor email waits until they sign up verified', async () => {
    const { owner, orgId } = await seed();
    const tenant = await deps.auth.createUser({ email: `t2-${n}-${Date.now()}@rasikh.test` });
    await ticket(orgId, tenant.uid);
    const email = `newvendor-${n}-${Date.now()}@rasikh.test`;
    await ticketAction(deps, owner.uid, {
      orgId,
      ticketId: 'T1',
      input: { action: 'assign', vendorName: 'مؤسسة', vendorEmail: email },
    });
    expect((await deps.db.doc(`orgs/${orgId}/tickets/T1`).get()).data()!.vendorUid).toBeUndefined();
    const v = await deps.auth.createUser({ email, emailVerified: true });
    expect((await claimInvites(deps, v.uid)).claimed).toBe(1);
    expect((await deps.db.doc(`orgs/${orgId}/tickets/T1`).get()).data()!.vendorUid).toBe(v.uid);
  });
});
