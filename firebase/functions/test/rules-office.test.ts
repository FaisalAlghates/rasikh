import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const SHA = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const lead = { orgs: { oA: ['office_lead'] } };
const arch = { orgs: { oA: ['engineer'] } };
const str = { orgs: { oA: ['engineer'] } };
const leadB = { orgs: { oB: ['office_lead'] } };
const team = { platformAdmin: true };
const future = Timestamp.fromDate(new Date('2030-01-01'));
const past = Timestamp.fromDate(new Date('2020-01-01'));

const db = (uid: string, claims: Record<string, unknown>) =>
  env.authenticatedContext(uid, claims).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-office',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    const office = {
      name: 'مكتب أ',
      crNo: '1010101010',
      sceClass: 'A',
      baladyActive: true,
      disciplines: ['architectural', 'structural'],
      cities: ['الرياض'],
      accepting: true,
      verified: true,
    };
    await setDoc(doc(d, 'offices/oA'), office);
    await setDoc(doc(d, 'offices/oB'), { ...office, name: 'مكتب ب', verified: false });
    const eng = (discipline: string, extra = {}) => ({
      name: 'م',
      sceNo: '123456',
      grade: 'professional',
      discipline,
      expiresAt: future,
      verified: true,
      active: true,
      ...extra,
    });
    await setDoc(doc(d, 'offices/oA/engineers/arch'), eng('architectural'));
    await setDoc(doc(d, 'offices/oA/engineers/str'), eng('structural'));
    await setDoc(doc(d, 'offices/oA/engineers/expired'), eng('structural', { expiresAt: past }));
    await setDoc(doc(d, 'offices/oA/engineers/unverified'), eng('structural', { verified: false }));
    await setDoc(doc(d, 'designProjects/p1'), {
      officeId: 'oA',
      clientUid: 'c1',
      title: 'فيلا',
      kind: 'new',
      status: 'review',
    });
    await setDoc(doc(d, 'designProjects/p2'), {
      officeId: 'oB',
      clientUid: 'c2',
      title: 'دوبلكس',
      kind: 'new',
      status: 'brief',
    });
    const v = (status: string) => ({
      status,
      sha256: SHA,
      required: ['architectural', 'structural'],
      plan: {},
    });
    await setDoc(doc(d, 'designProjects/p1/versions/draft'), v('draft'));
    await setDoc(doc(d, 'designProjects/p1/versions/shared'), v('shared'));
    await setDoc(doc(d, 'designProjects/p1/versions/review'), v('review'));
  });
});

const approval = (uid: string, discipline: string, sha = SHA) => ({
  uid,
  name: 'م',
  sceNo: '123456',
  discipline,
  sha256: sha,
  at: serverTimestamp(),
});

describe('offices and engineers', () => {
  it('only the Rasikh team verifies an office; its identity locks once verified', async () => {
    await assertFails(updateDoc(doc(db('leadB', leadB), 'offices/oB'), { verified: true }));
    await assertFails(updateDoc(doc(db('leadA', lead), 'offices/oA'), { crNo: '2020202020' }));
    await assertSucceeds(updateDoc(doc(db('leadA', lead), 'offices/oA'), { accepting: false }));
    await assertSucceeds(
      updateDoc(doc(db('t', team), 'offices/oB'), {
        verified: true,
        verifiedAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(doc(db('t', team), 'offices/oB'), { name: 'تغيير' }));
  });

  it('an engineer creates their own unverified profile; only the team verifies it', async () => {
    const me = { orgs: { oA: ['engineer'] } };
    const profile = {
      name: 'سارة',
      sceNo: '998877',
      grade: 'engineer',
      discipline: 'electrical',
      expiresAt: future,
      verified: false,
      active: true,
    };
    await assertSucceeds(setDoc(doc(db('newEng', me), 'offices/oA/engineers/newEng'), profile));
    await assertFails(
      setDoc(doc(db('newEng2', me), 'offices/oA/engineers/newEng2'), {
        ...profile,
        verified: true,
      }),
    );
    await assertFails(
      updateDoc(doc(db('newEng', me), 'offices/oA/engineers/newEng'), { verified: true }),
    );
    await assertSucceeds(
      updateDoc(doc(db('t', team), 'offices/oA/engineers/newEng'), {
        verified: true,
        verifiedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(db('arch', arch), 'offices/oA/engineers/arch'), { sceNo: '000000' }),
    );
  });

  it('offices never see each other’s projects or engineers', async () => {
    await assertSucceeds(getDoc(doc(db('leadA', lead), 'designProjects/p1')));
    await assertFails(getDoc(doc(db('leadB', leadB), 'designProjects/p1')));
    await assertFails(getDoc(doc(db('leadA', lead), 'designProjects/p2')));
    await assertFails(getDoc(doc(db('leadB', leadB), 'offices/oA/engineers/arch')));
  });
});

describe('clients', () => {
  const client = () => db('c1', {});
  it('sends a brief only to an office that accepts briefs', async () => {
    const brief = (officeId: string) => ({
      officeId,
      clientUid: 'c9',
      clientName: 'نورة',
      title: 'فيلا',
      kind: 'new',
      status: 'brief',
      brief: 'فيلا دورين',
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(setDoc(doc(db('c9', {}), 'designProjects/n1'), brief('oA')));
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), 'offices/oB'), { accepting: false }),
    );
    await assertFails(setDoc(doc(db('c9', {}), 'designProjects/n2'), brief('oB')));
    await assertFails(
      setDoc(doc(db('c9', {}), 'designProjects/n3'), { ...brief('oA'), status: 'released' }),
    );
  });

  it('sees shared concepts and released sets, never drafts under review', async () => {
    await assertSucceeds(getDoc(doc(client(), 'designProjects/p1/versions/shared')));
    await assertFails(getDoc(doc(client(), 'designProjects/p1/versions/draft')));
    await assertFails(getDoc(doc(client(), 'designProjects/p1/versions/review')));
    await assertFails(getDoc(doc(db('stranger', {}), 'designProjects/p1')));
  });
});

describe('approval and release', () => {
  const v = 'designProjects/p1/versions/review/approvals';
  it('only a verified, current engineer of that discipline approves, signing the exact version', async () => {
    await assertSucceeds(
      setDoc(doc(db('arch', arch), `${v}/architectural`), approval('arch', 'architectural')),
    );
    await assertFails(
      setDoc(doc(db('arch', arch), `${v}/structural`), approval('arch', 'structural')),
    );
    await assertFails(
      setDoc(doc(db('expired', str), `${v}/structural`), approval('expired', 'structural')),
    );
    await assertFails(
      setDoc(doc(db('unverified', str), `${v}/structural`), approval('unverified', 'structural')),
    );
    await assertFails(
      setDoc(doc(db('str', str), `${v}/structural`), approval('str', 'structural', OTHER)),
    );
    await assertFails(
      setDoc(doc(db('leadA', lead), `${v}/structural`), approval('leadA', 'structural')),
    );
  });

  it('nobody approves in an unverified office, or a draft', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), 'offices/oA'), { verified: false }),
    );
    await assertFails(
      setDoc(doc(db('arch', arch), `${v}/architectural`), approval('arch', 'architectural')),
    );
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), 'offices/oA'), { verified: true }),
    );
    await assertFails(
      setDoc(
        doc(db('arch', arch), 'designProjects/p1/versions/draft/approvals/architectural'),
        approval('arch', 'architectural'),
      ),
    );
  });

  it('the lead releases only once every required discipline approved this fingerprint', async () => {
    const release = () =>
      updateDoc(doc(db('leadA', lead), 'designProjects/p1/versions/review'), {
        status: 'released',
        releasedAt: serverTimestamp(),
        releasedBy: 'leadA',
      });
    await assertSucceeds(
      setDoc(doc(db('arch', arch), `${v}/architectural`), approval('arch', 'architectural')),
    );
    await assertFails(release());
    await assertFails(
      updateDoc(doc(db('arch', arch), 'designProjects/p1/versions/review'), {
        status: 'released',
        releasedAt: serverTimestamp(),
        releasedBy: 'arch',
      }),
    );
    await assertSucceeds(
      setDoc(doc(db('str', str), `${v}/structural`), approval('str', 'structural')),
    );
    await assertSucceeds(release());
    // released sets are immutable, and the client now sees them
    await assertFails(
      updateDoc(doc(db('leadA', lead), 'designProjects/p1/versions/review'), { status: 'draft' }),
    );
    await assertSucceeds(getDoc(doc(db('c1', {}), 'designProjects/p1/versions/review')));
  });

  it('a changed plan must carry its new fingerprint', async () => {
    const ref = doc(db('arch', arch), 'designProjects/p1/versions/draft');
    await assertFails(updateDoc(ref, { plan: { rooms: [] } }));
    await assertSucceeds(updateDoc(ref, { plan: { rooms: [] }, sha256: OTHER }));
  });
});

describe('hand-off to the property health record', () => {
  const owner = { orgs: { org1: ['owner'] } };
  const tenant = { orgs: { org1: ['tenant'] } };
  const link = (over: Record<string, unknown> = {}) => ({
    projectId: 'p3',
    versionId: 'rel',
    propertyId: 'prop1',
    title: 'فيلا',
    officeName: 'مكتب أ',
    versionLabel: 'مخطط 1',
    sha256: SHA,
    releasedOn: '2026-10-16',
    linkedBy: 'c1',
    linkedAt: serverTimestamp(),
    ...over,
  });
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const d = ctx.firestore();
      await setDoc(doc(d, 'designProjects/p3'), {
        officeId: 'oA',
        clientUid: 'c1',
        title: 'فيلا',
        kind: 'new',
        status: 'released',
      });
      await setDoc(doc(d, 'designProjects/p3/versions/rel'), {
        status: 'released',
        sha256: SHA,
        required: ['architectural'],
        plan: {},
      });
      await setDoc(doc(d, 'orgs/org1'), { name: 'عقاراتي' });
      await setDoc(doc(d, 'orgs/org1/properties/prop1'), { name: 'بيت الملقا' });
    });
  });

  it('the client links a released set to a property of their organization', async () => {
    await assertSucceeds(setDoc(doc(db('c1', owner), 'orgs/org1/designs/p3'), link()));
    // staff read it (it shows in the record); a tenant does not; nobody edits it; staff may unlink it
    await assertSucceeds(getDoc(doc(db('c1', owner), 'orgs/org1/designs/p3')));
    await assertFails(getDoc(doc(db('t1', tenant), 'orgs/org1/designs/p3')));
    await assertFails(updateDoc(doc(db('c1', owner), 'orgs/org1/designs/p3'), { title: 'x' }));
    await assertSucceeds(deleteDoc(doc(db('c1', owner), 'orgs/org1/designs/p3')));
  });

  it('only for a released set the person commissioned, with its exact fingerprint, on an existing property', async () => {
    // someone else who owns the organization did not commission it
    await assertFails(
      setDoc(doc(db('x1', owner), 'orgs/org1/designs/p3'), link({ linkedBy: 'x1' })),
    );
    // a project still under review
    await assertFails(
      setDoc(
        doc(db('c1', owner), 'orgs/org1/designs/p1'),
        link({ projectId: 'p1', versionId: 'review' }),
      ),
    );
    await assertFails(
      setDoc(doc(db('c1', owner), 'orgs/org1/designs/p3'), link({ sha256: OTHER })),
    );
    await assertFails(
      setDoc(doc(db('c1', owner), 'orgs/org1/designs/p3'), link({ propertyId: 'nope' })),
    );
    await assertFails(setDoc(doc(db('c1', tenant), 'orgs/org1/designs/p3'), link()));
    await assertFails(setDoc(doc(db('c1', owner), 'orgs/org1/designs/p3'), link({ extra: 1 })));
  });
});
