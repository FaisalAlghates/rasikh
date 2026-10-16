import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const lead = { orgs: { oA: ['office_lead'] } };
const otherLead = { orgs: { oB: ['office_lead'] } };
const client = { orgs: {} };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-library',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    const project = (status: string, consent?: boolean) => ({
      officeId: 'oA',
      clientUid: 'c1',
      title: 'فيلا',
      kind: 'new',
      status,
      ...(consent === undefined ? {} : { libraryConsent: consent }),
    });
    await setDoc(doc(d, 'designProjects/p1'), project('released', true));
    await setDoc(doc(d, 'designProjects/p2'), project('released'));
    await setDoc(doc(d, 'designProjects/p3'), project('review', true));
  });
});

const entry = (uid: string, over: Record<string, unknown> = {}) => ({
  officeId: 'oA',
  officeName: 'مكتب أ',
  title: 'فيلا دورين',
  city: 'الرياض',
  type: 'villa',
  style: 'modern_najdi',
  floors: 2,
  bedrooms: 4,
  plot: { width: 20, depth: 30 },
  builtUpM2: 400,
  pattern: { typology: 'court' },
  share: 'pattern',
  contributedBy: uid,
  createdAt: serverTimestamp(),
  ...over,
});

describe('design library', () => {
  it('the client agrees after the release; the office lead then adds the design, credited', async () => {
    const c = env.authenticatedContext('c1', client).firestore();
    await assertSucceeds(
      updateDoc(doc(c, 'designProjects/p2'), {
        libraryConsent: true,
        libraryConsentAt: serverTimestamp(),
      }),
    );
    const l = env.authenticatedContext('l1', lead).firestore();
    await assertSucceeds(setDoc(doc(l, 'designLibrary/p1'), entry('l1')));
    // anyone signed in reads it; nobody edits it
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('x', otherLead).firestore(), 'designLibrary/p1')),
    );
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'designLibrary/p1')));
    await assertFails(updateDoc(doc(l, 'designLibrary/p1'), { title: 'x' }));
  });

  it('never without the client’s consent, before the release, by another office, or with the plan when only the pattern is shared', async () => {
    const l = env.authenticatedContext('l1', lead).firestore();
    await assertFails(setDoc(doc(l, 'designLibrary/p2'), entry('l1')));
    await assertFails(setDoc(doc(l, 'designLibrary/p3'), entry('l1')));
    const o = env.authenticatedContext('l2', otherLead).firestore();
    await assertFails(setDoc(doc(o, 'designLibrary/p1'), entry('l2', { officeId: 'oB' })));
    await assertFails(setDoc(doc(l, 'designLibrary/p1'), entry('l1', { plan: { rooms: [] } })));
    await assertSucceeds(
      setDoc(doc(l, 'designLibrary/p1'), entry('l1', { share: 'plan', plan: { rooms: [] } })),
    );
    // a client changes nothing else on a released project
    const c = env.authenticatedContext('c1', client).firestore();
    await assertFails(updateDoc(doc(c, 'designProjects/p1'), { title: 'x' }));
  });

  it('the client withdraws it at any time', async () => {
    const l = env.authenticatedContext('l1', lead).firestore();
    await assertSucceeds(setDoc(doc(l, 'designLibrary/p1'), entry('l1')));
    const c = env.authenticatedContext('c1', client).firestore();
    await assertSucceeds(updateDoc(doc(c, 'designProjects/p1'), { libraryConsent: false }));
    await assertSucceeds(deleteDoc(doc(c, 'designLibrary/p1')));
    await assertFails(
      deleteDoc(doc(env.authenticatedContext('x', otherLead).firestore(), 'designLibrary/p2')),
    );
  });
});
