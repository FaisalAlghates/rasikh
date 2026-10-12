import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rulesDir = resolve(__dirname, '../../');
let env: RulesTestEnvironment;

const owner = { orgs: { org1: ['owner'] } };
const tenant = { orgs: { org1: ['tenant'] } };
const outsider = { orgs: { org2: ['owner'] } };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh',
    firestore: { rules: readFileSync(resolve(rulesDir, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(rulesDir, 'storage.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'orgs/org1'), { name: 'Org 1' });
    await setDoc(doc(db, 'orgs/org1/properties/p1'), { name: 'Villa' });
    await setDoc(doc(db, 'orgs/org1/audit/a1'), { action: 'x' });
  });
});

describe('firestore rules', () => {
  it('denies unauthenticated reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'orgs/org1')));
  });
  it('lets members read their org but not others', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('u1', owner).firestore(), 'orgs/org1')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('u2', outsider).firestore(), 'orgs/org1')),
    );
  });
  it('never lets clients write orgs or members', async () => {
    const db = env.authenticatedContext('u1', owner).firestore();
    await assertFails(setDoc(doc(db, 'orgs/org1'), { name: 'hack' }));
    await assertFails(setDoc(doc(db, 'orgs/org1/members/u1'), { roles: ['admin'] }));
  });
  it('enforces role checks on properties', async () => {
    const ownerDb = env.authenticatedContext('u1', owner).firestore();
    const tenantDb = env.authenticatedContext('u3', tenant).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'orgs/org1/properties/p1')));
    await assertSucceeds(setDoc(doc(ownerDb, 'orgs/org1/properties/p2'), { name: 'Flat' }));
    await assertFails(getDoc(doc(tenantDb, 'orgs/org1/properties/p1')));
    await assertFails(setDoc(doc(tenantDb, 'orgs/org1/properties/p3'), { name: 'x' }));
    await assertFails(deleteDoc(doc(tenantDb, 'orgs/org1/properties/p1')));
  });
  it('restricts the audit log to owners/admins and denies writes', async () => {
    const ownerDb = env.authenticatedContext('u1', owner).firestore();
    const tenantDb = env.authenticatedContext('u3', tenant).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'orgs/org1/audit/a1')));
    await assertFails(getDoc(doc(tenantDb, 'orgs/org1/audit/a1')));
    await assertFails(setDoc(doc(ownerDb, 'orgs/org1/audit/a2'), { action: 'forged' }));
  });
  it('allows a user to edit only whitelisted profile fields', async () => {
    const db = env.authenticatedContext('u1').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/u1'), { displayName: 'فيصل', locale: 'ar' }));
    await assertFails(setDoc(doc(db, 'users/u1'), { displayName: 'x', roles: ['admin'] }));
    await assertFails(setDoc(doc(db, 'users/u2'), { displayName: 'x' }));
    await assertFails(getDoc(doc(env.authenticatedContext('u9').firestore(), 'users/u1')));
  });
  it('denies unknown collections by default', async () => {
    const db = env.authenticatedContext('u1', owner).firestore();
    await assertFails(setDoc(doc(db, 'secrets/s1'), { a: 1 }));
    await assertFails(getDoc(doc(db, 'secrets/s1')));
  });
});

describe('storage rules', () => {
  const png = new Uint8Array([137, 80, 78, 71]);
  it('lets members upload images, once', async () => {
    const st = env.authenticatedContext('u1', owner).storage();
    const r = ref(st, 'orgs/org1/receipts/a.png');
    await assertSucceeds(uploadBytes(r, png, { contentType: 'image/png' }));
    await assertFails(uploadBytes(r, png, { contentType: 'image/png' })); // overwrite
    await assertFails(deleteObject(r));
  });
  it('denies outsiders and anonymous users', async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext('u2', outsider).storage(), 'orgs/org1/receipts/a.png'),
        png,
        {
          contentType: 'image/png',
        },
      ),
    );
    await assertFails(
      uploadBytes(ref(env.unauthenticatedContext().storage(), 'orgs/org1/receipts/a.png'), png, {
        contentType: 'image/png',
      }),
    );
  });
  it('rejects disallowed content types', async () => {
    const st = env.authenticatedContext('u1', owner).storage();
    await assertFails(
      uploadBytes(ref(st, 'orgs/org1/receipts/run.exe'), png, {
        contentType: 'application/x-msdownload',
      }),
    );
  });
});
