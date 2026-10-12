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
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const owner = { orgs: { org1: ['owner'] } };
const manager = { orgs: { org1: ['manager'] } };
const broker = { orgs: { org1: ['broker'] } };
const tenantA = { orgs: { org1: ['tenant'] } };
const outsider = { orgs: { org2: ['owner'] } };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-ops',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'orgs/org1/units/u1'), { label: '3' });
    await setDoc(doc(db, 'orgs/org1/leases/lA'), { tenantUid: 'tA', annualRent: 42000 });
    await setDoc(doc(db, 'orgs/org1/leases/lB'), { tenantUid: 'tB', annualRent: 36000 });
    await setDoc(doc(db, 'orgs/org1/payments/pA'), {
      leaseId: 'lA',
      tenantUid: 'tA',
      status: 'due',
      amount: 3500,
    });
    await setDoc(doc(db, 'orgs/org1/payments/pB'), {
      leaseId: 'lB',
      tenantUid: 'tB',
      status: 'due',
      amount: 3000,
    });
    await setDoc(doc(db, 'orgs/org1/expenses/e1'), { amount: 100 });
    await setDoc(doc(db, 'orgs/org1/notifications/n1'), { uid: 'tA', readAt: null });
    await setDoc(doc(db, 'orgs/org1/notifications/n2'), { uid: 'owner1', readAt: null });
  });
});

const as = (uid: string, claims: Parameters<RulesTestEnvironment['authenticatedContext']>[1]) =>
  env.authenticatedContext(uid, claims).firestore();

describe('units, leases, expenses: staff only; brokers read units', () => {
  it('owner and manager write; broker and outsiders do not', async () => {
    await assertSucceeds(setDoc(doc(as('o', owner), 'orgs/org1/units/u2'), { label: '4' }));
    await assertSucceeds(setDoc(doc(as('m', manager), 'orgs/org1/leases/lN'), { annualRent: 1 }));
    await assertFails(setDoc(doc(as('b', broker), 'orgs/org1/units/u3'), { label: '5' }));
    await assertFails(setDoc(doc(as('x', outsider), 'orgs/org1/units/u3'), { label: '5' }));
    await assertSucceeds(getDoc(doc(as('b', broker), 'orgs/org1/units/u1')));
  });
  it('expenses are staff-only, including reads', async () => {
    await assertSucceeds(getDoc(doc(as('o', owner), 'orgs/org1/expenses/e1')));
    await assertFails(getDoc(doc(as('b', broker), 'orgs/org1/expenses/e1')));
    await assertFails(getDoc(doc(as('tA', tenantA), 'orgs/org1/expenses/e1')));
  });
});

describe('tenant isolation', () => {
  it('a tenant reads only their own lease and payments', async () => {
    const db = as('tA', tenantA);
    await assertSucceeds(getDoc(doc(db, 'orgs/org1/leases/lA')));
    await assertFails(getDoc(doc(db, 'orgs/org1/leases/lB')));
    await assertSucceeds(getDoc(doc(db, 'orgs/org1/payments/pA')));
    await assertFails(getDoc(doc(db, 'orgs/org1/payments/pB')));
  });
  it('queries must be scoped to the tenant (unscoped list is denied)', async () => {
    const db = as('tA', tenantA);
    await assertSucceeds(
      getDocs(query(collection(db, 'orgs/org1/payments'), where('tenantUid', '==', 'tA'))),
    );
    await assertFails(getDocs(collection(db, 'orgs/org1/payments')));
  });
  it('a tenant cannot mark paid, change amounts, or write leases', async () => {
    const db = as('tA', tenantA);
    await assertFails(updateDoc(doc(db, 'orgs/org1/payments/pA'), { status: 'paid' }));
    await assertFails(updateDoc(doc(db, 'orgs/org1/payments/pA'), { amount: 1 }));
    await assertFails(updateDoc(doc(db, 'orgs/org1/leases/lA'), { annualRent: 1 }));
  });
  it('a tenant may attach a receipt to their own payment only', async () => {
    await assertSucceeds(
      updateDoc(doc(as('tA', tenantA), 'orgs/org1/payments/pA'), {
        receiptPath: 'orgs/org1/receipts/a.pdf',
      }),
    );
    await assertFails(
      updateDoc(doc(as('tA', tenantA), 'orgs/org1/payments/pB'), { receiptPath: 'x' }),
    );
  });
});

describe('payments: staff record payments', () => {
  it('owner marks a payment paid', async () => {
    await assertSucceeds(
      updateDoc(doc(as('o', owner), 'orgs/org1/payments/pA'), {
        status: 'paid',
        paidAt: '2026-10-12',
      }),
    );
  });
});

describe('notifications', () => {
  it('a user reads only their own and can only set readAt; nobody creates from the client', async () => {
    const db = as('tA', tenantA);
    await assertSucceeds(getDoc(doc(db, 'orgs/org1/notifications/n1')));
    await assertFails(getDoc(doc(db, 'orgs/org1/notifications/n2')));
    await assertSucceeds(updateDoc(doc(db, 'orgs/org1/notifications/n1'), { readAt: 'now' }));
    await assertFails(updateDoc(doc(db, 'orgs/org1/notifications/n1'), { uid: 'someone-else' }));
    await assertFails(setDoc(doc(as('o', owner), 'orgs/org1/notifications/n9'), { uid: 'o' }));
  });
});

describe('invites are server-only', () => {
  it('no client can read or write /invites', async () => {
    await assertFails(getDoc(doc(as('o', owner), 'invites/abc')));
    await assertFails(setDoc(doc(as('o', owner), 'invites/abc'), { x: 1 }));
  });
});
