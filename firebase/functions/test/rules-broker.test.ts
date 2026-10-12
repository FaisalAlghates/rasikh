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
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const O = 'orgs/org1';
const broker = { orgs: { org1: ['broker'] } };
const otherBroker = { orgs: { org1: ['broker'] } };
const owner = { orgs: { org1: ['owner'] } };
const tenant = { orgs: { org1: ['tenant'] } };
const outsider = { orgs: { org2: ['broker'] } };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-broker',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `${O}/leads/l1`), {
      name: 'خالد',
      phone: '+966512345678',
      interest: 'rent',
      source: 'call',
      status: 'new',
      brokerUid: 'b1',
    });
    await setDoc(doc(db, `${O}/leads/won1`), {
      name: 'منى',
      phone: '+966512345679',
      interest: 'buy',
      source: 'referral',
      status: 'won',
      brokerUid: 'b1',
    });
    await setDoc(doc(db, `${O}/brokerActivity/e1`), {
      leadId: 'l1',
      type: 'note',
      text: 'اتصال',
      brokerUid: 'b1',
    });
  });
});
const as = (uid: string, c: Parameters<RulesTestEnvironment['authenticatedContext']>[1]) =>
  env.authenticatedContext(uid, c).firestore();

const lead = (over: Record<string, unknown> = {}) => ({
  name: 'سعد',
  phone: '+966511111111',
  interest: 'rent',
  source: 'walk_in',
  status: 'new',
  brokerUid: 'b1',
  createdAt: serverTimestamp(),
  ...over,
});

describe('broker profile', () => {
  const profile = { displayName: 'سلمان', falNo: '1234567890', falExpiry: '2027-01-01' };
  it('a broker writes only their own profile, with a valid license number', async () => {
    await assertSucceeds(setDoc(doc(as('b1', broker), `${O}/brokers/b1`), profile));
    await assertFails(setDoc(doc(as('b1', broker), `${O}/brokers/b2`), profile));
    await assertFails(setDoc(doc(as('b1', broker), `${O}/brokers/b1`), { ...profile, falNo: '12' }));
    await assertFails(
      setDoc(doc(as('b1', broker), `${O}/brokers/b1`), { ...profile, verified: true }),
    );
  });
  it('a tenant or an outsider cannot write or read it', async () => {
    await assertFails(setDoc(doc(as('t1', tenant), `${O}/brokers/t1`), profile));
    await assertFails(getDoc(doc(as('x', outsider), `${O}/brokers/b1`)));
  });
});

describe('leads', () => {
  it('a broker creates their own new lead', async () => {
    await assertSucceeds(setDoc(doc(as('b1', broker), `${O}/leads/n1`), lead()));
  });
  it('rejects a lead for someone else, a bad phone, a non-new status or a stray field', async () => {
    const db = as('b1', broker);
    await assertFails(setDoc(doc(db, `${O}/leads/n1`), lead({ brokerUid: 'b2' })));
    await assertFails(setDoc(doc(db, `${O}/leads/n1`), lead({ phone: '0511111111' })));
    await assertFails(setDoc(doc(db, `${O}/leads/n1`), lead({ status: 'won' })));
    await assertFails(setDoc(doc(db, `${O}/leads/n1`), lead({ commission: 5 })));
  });
  it('owners and admins read, but cannot create; tenants see nothing', async () => {
    await assertSucceeds(getDoc(doc(as('o1', owner), `${O}/leads/l1`)));
    await assertFails(setDoc(doc(as('o1', owner), `${O}/leads/n1`), lead({ brokerUid: 'o1' })));
    await assertFails(getDoc(doc(as('t1', tenant), `${O}/leads/l1`)));
  });
  it("one broker cannot read or touch another broker's lead", async () => {
    const db = as('b2', otherBroker);
    await assertFails(getDoc(doc(db, `${O}/leads/l1`)));
    await assertFails(updateDoc(doc(db, `${O}/leads/l1`), { status: 'contacted' }));
    await assertFails(
      getDocs(query(collection(db, `${O}/leads`), where('brokerUid', '==', 'b1'))),
    );
    await assertSucceeds(
      getDocs(query(collection(db, `${O}/leads`), where('brokerUid', '==', 'b2'))),
    );
  });
  it('another organization sees nothing', async () => {
    await assertFails(getDoc(doc(as('x', outsider), `${O}/leads/l1`)));
  });
  it('moves forward or to lost, never backward, never out of won/lost', async () => {
    const db = as('b1', broker);
    await assertSucceeds(updateDoc(doc(db, `${O}/leads/l1`), { status: 'negotiating' }));
    await assertFails(updateDoc(doc(db, `${O}/leads/l1`), { status: 'contacted' }));
    await assertSucceeds(updateDoc(doc(db, `${O}/leads/l1`), { status: 'lost' }));
    await assertFails(updateDoc(doc(db, `${O}/leads/l1`), { status: 'contacted' }));
    await assertFails(updateDoc(doc(db, `${O}/leads/won1`), { status: 'lost' }));
  });
  it('only status and notes can change, and a lead is never deleted', async () => {
    const db = as('b1', broker);
    await assertSucceeds(updateDoc(doc(db, `${O}/leads/l1`), { notes: 'يفضّل المساء' }));
    await assertFails(updateDoc(doc(db, `${O}/leads/l1`), { phone: '+966500000000' }));
    await assertFails(updateDoc(doc(db, `${O}/leads/l1`), { brokerUid: 'b2' }));
    await assertFails(deleteDoc(doc(db, `${O}/leads/l1`)));
  });
});

describe('viewings and brokerage contracts', () => {
  const viewing = (over: Record<string, unknown> = {}) => ({
    leadId: 'l1',
    placeLabel: 'فيلا النرجس',
    scheduledAt: '2026-10-20T15:00:00.000Z',
    done: false,
    brokerUid: 'b1',
    createdAt: serverTimestamp(),
    ...over,
  });
  const contract = (over: Record<string, unknown> = {}) => ({
    leadId: 'l1',
    type: 'rent',
    contractNo: 'BR-1',
    startDate: '2026-10-12',
    endDate: '2027-10-11',
    brokerUid: 'b1',
    createdAt: serverTimestamp(),
    ...over,
  });

  it('a broker schedules a viewing for their own lead and marks it done once', async () => {
    const db = as('b1', broker);
    await assertSucceeds(setDoc(doc(db, `${O}/viewings/v1`), viewing()));
    await assertSucceeds(updateDoc(doc(db, `${O}/viewings/v1`), { done: true }));
    await assertFails(updateDoc(doc(db, `${O}/viewings/v1`), { placeLabel: 'غيره' }));
  });
  it("rejects a viewing for another broker's lead", async () => {
    await assertFails(
      setDoc(doc(as('b2', otherBroker), `${O}/viewings/v1`), viewing({ brokerUid: 'b2' })),
    );
  });
  it('a brokerage contract is create-only, with end after start', async () => {
    const db = as('b1', broker);
    await assertSucceeds(setDoc(doc(db, `${O}/brokerContracts/c1`), contract()));
    await assertFails(updateDoc(doc(db, `${O}/brokerContracts/c1`), { contractNo: 'X' }));
    await assertFails(deleteDoc(doc(db, `${O}/brokerContracts/c1`)));
    await assertFails(
      setDoc(doc(db, `${O}/brokerContracts/c2`), contract({ endDate: '2026-01-01' })),
    );
    await assertFails(setDoc(doc(db, `${O}/brokerContracts/c3`), contract({ type: 'loan' })));
  });
});

describe('immutable activity log', () => {
  const entry = (over: Record<string, unknown> = {}) => ({
    leadId: 'l1',
    type: 'note',
    text: 'اتفقنا على معاينة',
    brokerUid: 'b1',
    createdAt: serverTimestamp(),
    ...over,
  });

  it('a broker appends entries to their own lead with the server time', async () => {
    await assertSucceeds(setDoc(doc(as('b1', broker), `${O}/brokerActivity/n1`), entry()));
  });
  it('rejects a client-chosen time, someone else\'s lead, a bad type or an empty text', async () => {
    const db = as('b1', broker);
    await assertFails(
      setDoc(doc(db, `${O}/brokerActivity/n1`), entry({ createdAt: new Date('2020-01-01') })),
    );
    await assertFails(
      setDoc(doc(as('b2', otherBroker), `${O}/brokerActivity/n2`), entry({ brokerUid: 'b2' })),
    );
    await assertFails(setDoc(doc(db, `${O}/brokerActivity/n3`), entry({ type: 'edit' })));
    await assertFails(setDoc(doc(db, `${O}/brokerActivity/n4`), entry({ text: '' })));
  });
  it('can never be edited or deleted, even by its author', async () => {
    const db = as('b1', broker);
    await assertFails(updateDoc(doc(db, `${O}/brokerActivity/e1`), { text: 'عدّلت' }));
    await assertFails(deleteDoc(doc(db, `${O}/brokerActivity/e1`)));
    await assertFails(deleteDoc(doc(as('o1', owner), `${O}/brokerActivity/e1`)));
  });
  it('is readable by its broker and the owner, not by others', async () => {
    await assertSucceeds(getDoc(doc(as('b1', broker), `${O}/brokerActivity/e1`)));
    await assertSucceeds(getDoc(doc(as('o1', owner), `${O}/brokerActivity/e1`)));
    await assertFails(getDoc(doc(as('b2', otherBroker), `${O}/brokerActivity/e1`)));
    await assertFails(getDoc(doc(as('t1', tenant), `${O}/brokerActivity/e1`)));
  });
});
