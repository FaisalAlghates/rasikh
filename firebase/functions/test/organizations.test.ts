import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { createOrganization } from '../src/organizations.js';

let deps: { db: ReturnType<typeof getFirestore>; auth: ReturnType<typeof getAuth> };

beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: 'demo-rasikh' });
  deps = { db: getFirestore(), auth: getAuth() };
});

const valid = {
  name: 'محفظة فيصل',
  roles: ['owner', 'broker'],
  displayName: 'فيصل',
  consentPdpl: true,
};

describe('createOrganization', () => {
  it('creates org, member, audit entry and sets custom claims', async () => {
    const u = await deps.auth.createUser({ phoneNumber: '+966511111111' });
    const res = await createOrganization(deps, u.uid, valid);

    const org = await deps.db.doc(`orgs/${res.orgId}`).get();
    expect(org.exists).toBe(true);
    const member = await deps.db.doc(`orgs/${res.orgId}/members/${u.uid}`).get();
    expect(member.data()?.roles).toEqual(['owner', 'broker']);
    expect((await deps.db.collection(`orgs/${res.orgId}/audit`).get()).size).toBe(1);

    const claims = (await deps.auth.getUser(u.uid)).customClaims;
    expect(claims?.orgs[res.orgId]).toEqual(['owner', 'broker']);
  });

  it('rejects unauthenticated callers', async () => {
    await expect(createOrganization(deps, undefined, valid)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rejects self-assigned admin and missing consent', async () => {
    const u = await deps.auth.createUser({ phoneNumber: '+966522222222' });
    await expect(
      createOrganization(deps, u.uid, { ...valid, roles: ['admin'] }),
    ).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    await expect(
      createOrganization(deps, u.uid, { ...valid, consentPdpl: false }),
    ).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('caps organizations per user', async () => {
    const u = await deps.auth.createUser({ phoneNumber: '+966533333333' });
    for (let i = 0; i < 5; i++) await createOrganization(deps, u.uid, valid);
    await expect(createOrganization(deps, u.uid, valid)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });
});
