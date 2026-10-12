import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { deleteMyAccount, exportMyData } from '../src/account.js';

let db: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: 'demo-rasikh' });
  db = getFirestore();
  auth = getAuth();
});

const NOW = new Date('2026-10-12T08:00:00.000Z');
const authTime = (secondsAgo: number) => NOW.getTime() / 1000 - secondsAgo;
let n = 0;

async function person(orgId: string, roles: string[]) {
  const uid = `acc-${++n}-${Math.random().toString(36).slice(2, 7)}`;
  await auth.createUser({ uid, email: `${uid}@rasikh.test` });
  await auth.setCustomUserClaims(uid, { orgs: { [orgId]: roles } });
  await db.doc(`orgs/${orgId}/members/${uid}`).set({ roles, displayName: 'اسم' });
  await db.doc(`users/${uid}`).set({ displayName: 'اسم' });
  return uid;
}
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return (e as { message: string }).message;
  }
};

describe('export my data', () => {
  it('needs sign-in and returns only what is tied to the person', async () => {
    const org = `ex-${Math.random().toString(36).slice(2, 7)}`;
    const tenant = await person(org, ['tenant']);
    const other = await person(org, ['tenant']);
    await db.doc(`orgs/${org}/leases/L1`).set({ tenantUid: tenant, ejarContractNo: '111' });
    await db.doc(`orgs/${org}/leases/L2`).set({ tenantUid: other, ejarContractNo: '222' });
    await db.doc(`orgs/${org}/notifications/N1`).set({ uid: tenant, kind: 'x' });
    const deps = { db, auth, now: () => NOW };

    expect(await code(exportMyData(deps, undefined))).toBe('auth_required');
    const out = await exportMyData(deps, tenant);
    const o = out.orgs[org] as { leasesAsTenant: Array<{ ejarContractNo: string }>; notifications: unknown[] };
    expect(out.uid).toBe(tenant);
    expect(o.leasesAsTenant.map((l) => l.ejarContractNo)).toEqual(['111']);
    expect(JSON.stringify(out)).not.toContain('222');
    expect(o.notifications).toHaveLength(1);
    const audit = await db.collection(`orgs/${org}/audit`).where('uid', '==', tenant).get();
    expect(audit.docs.map((d) => d.data().action)).toContain('data_exported');
  });
});

describe('delete my account', () => {
  it('needs a recent sign-in', async () => {
    const org = `dl-${Math.random().toString(36).slice(2, 7)}`;
    const uid = await person(org, ['tenant']);
    const deps = { db, auth, now: () => NOW };
    expect(await code(deleteMyAccount(deps, undefined))).toBe('auth_required');
    expect(await code(deleteMyAccount(deps, { uid, authTime: authTime(3600) }))).toBe('recent_login_required');
    expect(await code(deleteMyAccount(deps, { uid }))).toBe('recent_login_required');
    expect((await db.doc(`orgs/${org}/members/${uid}`).get()).exists).toBe(true);
  });

  it('removes the person, their broker CRM data and their sign-in, and leaves organization records', async () => {
    const org = `dl-${Math.random().toString(36).slice(2, 7)}`;
    const broker = await person(org, ['broker']);
    await db.doc(`orgs/${org}/brokers/${broker}`).set({ falNo: '1234567890' });
    await db.doc(`orgs/${org}/leads/l1`).set({ brokerUid: broker, name: 'خالد' });
    await db.doc(`orgs/${org}/brokerActivity/e1`).set({ brokerUid: broker, text: 'x' });
    await db.doc(`orgs/${org}/leads/l2`).set({ brokerUid: 'someone-else', name: 'سعد' });
    await db.doc(`orgs/${org}/leases/L1`).set({ ejarContractNo: '999' }); // an org record: stays
    const deps = { db, auth, now: () => NOW };

    expect(await deleteMyAccount(deps, { uid: broker, authTime: authTime(60) })).toEqual({
      deleted: true,
      organizations: 1,
    });
    expect((await db.doc(`orgs/${org}/members/${broker}`).get()).exists).toBe(false);
    expect((await db.doc(`orgs/${org}/brokers/${broker}`).get()).exists).toBe(false);
    expect((await db.doc(`orgs/${org}/leads/l1`).get()).exists).toBe(false);
    expect((await db.doc(`orgs/${org}/brokerActivity/e1`).get()).exists).toBe(false);
    expect((await db.doc(`users/${broker}`).get()).exists).toBe(false);
    expect((await db.doc(`orgs/${org}/leads/l2`).get()).exists).toBe(true); // someone else's lead
    expect((await db.doc(`orgs/${org}/leases/L1`).get()).exists).toBe(true);
    await expect(auth.getUser(broker)).rejects.toThrow();
    const audit = await db.collection(`orgs/${org}/audit`).where('uid', '==', broker).get();
    expect(audit.docs.map((d) => d.data().action)).toContain('account_deleted');
  });

  it('refuses to orphan an organization: the sole owner must hand it over first', async () => {
    const org = `dl-${Math.random().toString(36).slice(2, 7)}`;
    const owner = await person(org, ['owner']);
    const tenant = await person(org, ['tenant']);
    const deps = { db, auth, now: () => NOW };
    expect(await code(deleteMyAccount(deps, { uid: owner, authTime: authTime(60) }))).toBe(
      'transfer_ownership_first',
    );
    expect((await db.doc(`orgs/${org}/members/${owner}`).get()).exists).toBe(true);
    // a second owner makes it possible
    await db.doc(`orgs/${org}/members/${tenant}`).set({ roles: ['owner'] });
    expect((await deleteMyAccount(deps, { uid: owner, authTime: authTime(60) })).deleted).toBe(true);
  });
});
