import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const team = { platformAdmin: true };
const office = { orgs: { oA: ['office_lead'] } };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-regulations',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const entry = (uid: string, over: Record<string, unknown> = {}) => ({
  title: 'اشتراطات المخطط المعتمد',
  scope: 'amanah',
  cities: ['الرياض'],
  buildingTypes: ['villa'],
  source: { issuer: 'أمانة منطقة الرياض', document: 'دليل الاشتراطات', reference: '', issued: '' },
  setbacks: {
    front: { fraction: 0.2, min: 3 },
    streetSide: { fraction: 0.2, min: 2 },
    neighbour: 1.5,
  },
  coverage: { ground: 0.75, upper: 0.75 },
  maxHeightM: 14,
  parking: {},
  clauses: {},
  notes: '',
  status: 'draft',
  updatedBy: uid,
  updatedAt: serverTimestamp(),
  ...over,
});

describe('municipal requirements of the Amanat', () => {
  it('the Rasikh team keeps them, with a source; everyone signed in reads them', async () => {
    const t = env.authenticatedContext('team1', team).firestore();
    await assertSucceeds(setDoc(doc(t, 'regulations/r1'), entry('team1')));
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('o1', office).firestore(), 'regulations/r1')),
    );
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'regulations/r1')));
    await assertSucceeds(setDoc(doc(t, 'regulations/r1'), entry('team1', { status: 'verified' })));
    await assertSucceeds(deleteDoc(doc(t, 'regulations/r1')));
  });

  it('nobody else writes them, and never without cities and a source', async () => {
    const o = env.authenticatedContext('o1', office).firestore();
    await assertFails(setDoc(doc(o, 'regulations/r2'), entry('o1')));
    const t = env.authenticatedContext('team1', team).firestore();
    await assertFails(setDoc(doc(t, 'regulations/r3'), entry('team1', { cities: [] })));
    await assertFails(
      setDoc(doc(t, 'regulations/r4'), entry('team1', { source: { issuer: '', document: '' } })),
    );
    // the national requirements are in the code, not here
    await assertFails(setDoc(doc(t, 'regulations/r5'), entry('team1', { scope: 'national' })));
  });
});
