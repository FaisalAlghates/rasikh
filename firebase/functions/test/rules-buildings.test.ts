import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const owner = { orgs: { org1: ['owner'] } };
const tenant = { orgs: { org1: ['tenant'] } };
const outsider = { orgs: { org2: ['owner'] } };
const B = 'orgs/org1/buildings/b1';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-bldg',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), B), { name: 'برج' });
    await setDoc(doc(ctx.firestore(), `${B}/votes/open`), {
      title: 'x',
      rule: 'majority',
      closed: false,
    });
    await setDoc(doc(ctx.firestore(), `${B}/votes/shut`), {
      title: 'y',
      rule: 'majority',
      closed: true,
    });
  });
});
const as = (uid: string, c: Parameters<RulesTestEnvironment['authenticatedContext']>[1]) =>
  env.authenticatedContext(uid, c).firestore();

describe('unit owners linked to a building', () => {
  const unitOwner = { orgs: { org1: ['building_owner'] } };
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${B}/owners/u1`), { memberId: 'm1' });
      await setDoc(doc(ctx.firestore(), `${B}/members/m1`), {
        name: 'سالم',
        unitLabel: '1',
        shareBp: 5000,
      });
      await setDoc(doc(ctx.firestore(), 'users/u1/memberships/org1_b1'), {
        orgId: 'org1',
        buildingId: 'b1',
        memberId: 'm1',
      });
    });
  });
  it('read the ledger of their building but cannot write it', async () => {
    const db = as('u1', unitOwner);
    await assertSucceeds(getDoc(doc(db, B)));
    for (const c of ['members', 'expenses', 'contributions', 'quotes', 'votes']) {
      await assertSucceeds(getDocs(collection(db, `${B}/${c}`)));
    }
    await assertFails(
      setDoc(doc(db, `${B}/members/m9`), { name: 'x', unitLabel: '9', shareBp: 100 }),
    );
    await assertFails(
      setDoc(doc(db, `${B}/contributions/c9`), {
        memberId: 'm1',
        amount: 1,
        date: '2026-10-01',
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(setDoc(doc(db, `${B}/owners/u1`), { memberId: 'm2' }));
  });
  it('a stranger, even a member of the org, sees nothing', async () => {
    await assertFails(getDoc(doc(as('u2', unitOwner), B)));
    await assertFails(getDocs(collection(as('t', tenant), `${B}/members`)));
  });
  it('cast only their own ballot, once, while the vote is open', async () => {
    const db = as('u1', unitOwner);
    await assertSucceeds(setDoc(doc(db, `${B}/votes/open/ballots/m1`), { choice: 'yes' }));
    await assertFails(setDoc(doc(db, `${B}/votes/open/ballots/m1`), { choice: 'no' }));
    await assertFails(setDoc(doc(db, `${B}/votes/open/ballots/m2`), { choice: 'yes' })); // someone else's unit
    await assertFails(setDoc(doc(db, `${B}/votes/shut/ballots/m1`), { choice: 'yes' }));
  });
  it('the membership list is private', async () => {
    await assertSucceeds(getDoc(doc(as('u1', unitOwner), 'users/u1/memberships/org1_b1')));
    await assertFails(getDoc(doc(as('u2', unitOwner), 'users/u1/memberships/org1_b1')));
    await assertFails(setDoc(doc(as('u1', unitOwner), 'users/u1/memberships/x'), { a: 1 }));
  });
});

describe('buildings', () => {
  it('staff only', async () => {
    await assertSucceeds(setDoc(doc(as('o', owner), 'orgs/org1/buildings/b2'), { name: 'عمارة' }));
    await assertFails(setDoc(doc(as('t', tenant), 'orgs/org1/buildings/b3'), { name: 'x' }));
    await assertFails(setDoc(doc(as('x', outsider), 'orgs/org1/buildings/b3'), { name: 'x' }));
    await assertFails(deleteDoc(doc(as('o', owner), B)));
  });
  it('members need a sane share', async () => {
    const db = as('o', owner);
    await assertSucceeds(
      setDoc(doc(db, `${B}/members/m1`), { name: 'سالم', unitLabel: '1', shareBp: 5000 }),
    );
    await assertFails(
      setDoc(doc(db, `${B}/members/m2`), { name: 'x', unitLabel: '2', shareBp: 0 }),
    );
    await assertFails(
      setDoc(doc(db, `${B}/members/m3`), { name: 'x', unitLabel: '2', shareBp: 20000 }),
    );
    await assertFails(
      setDoc(doc(db, `${B}/members/m4`), { name: 'x', unitLabel: '2', shareBp: 100, extra: 1 }),
    );
  });
  it('staff can list every collection; others cannot', async () => {
    for (const c of ['members', 'expenses', 'contributions', 'quotes', 'votes']) {
      await assertSucceeds(getDocs(collection(as('o', owner), `orgs/org1/buildings/b1/${c}`)));
      await assertFails(getDocs(collection(as('t', tenant), `orgs/org1/buildings/b1/${c}`)));
    }
  });
  it('the ledger needs a receipt and can never be edited', async () => {
    const db = as('o', owner);
    const e = (extra = {}) => ({
      title: 'مصعد',
      amount: 500,
      date: '2026-10-01',
      receiptPath: 'orgs/org1/receipts/r.pdf',
      createdAt: serverTimestamp(),
      ...extra,
    });
    await assertSucceeds(setDoc(doc(db, `${B}/expenses/e1`), e()));
    await assertFails(setDoc(doc(db, `${B}/expenses/e2`), e({ receiptPath: '' })));
    await assertFails(setDoc(doc(db, `${B}/expenses/e3`), e({ amount: -5 })));
    await assertFails(updateDoc(doc(db, `${B}/expenses/e1`), { amount: 1 }));
    await assertFails(deleteDoc(doc(db, `${B}/expenses/e1`)));
    await assertSucceeds(
      setDoc(doc(db, `${B}/contributions/c1`), {
        memberId: 'm1',
        amount: 100,
        date: '2026-10-02',
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(doc(db, `${B}/contributions/c1`), { amount: 1 }));
  });
  it('ballots: one per unit, create-only, and only while the vote is open', async () => {
    const db = as('o', owner);
    await assertSucceeds(setDoc(doc(db, `${B}/votes/open/ballots/m1`), { choice: 'yes' }));
    await assertFails(setDoc(doc(db, `${B}/votes/open/ballots/m1`), { choice: 'no' }));
    await assertFails(setDoc(doc(db, `${B}/votes/open/ballots/m2`), { choice: 'maybe' }));
    await assertFails(setDoc(doc(db, `${B}/votes/shut/ballots/m1`), { choice: 'yes' }));
    await assertSucceeds(updateDoc(doc(db, `${B}/votes/open`), { closed: true }));
    await assertFails(updateDoc(doc(db, `${B}/votes/shut`), { rule: 'three_quarters' }));
  });
});
