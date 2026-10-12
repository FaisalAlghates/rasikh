import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const owner = { orgs: { org1: ['owner', 'admin'] } };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-ai',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'orgs/org1/aiUsage/month_2026-10'), { units: 5 });
    await setDoc(doc(ctx.firestore(), 'orgs/org1/aiLogs/l1'), { feature: 'assistant' });
    await setDoc(doc(ctx.firestore(), 'insights/riyadh__narjis__rent'), { indicative: true });
  });
});
afterAll(async () => env.cleanup());

describe('AI bookkeeping and indicative prices', () => {
  const db = () => env.authenticatedContext('o1', owner).firestore();

  it('usage counters and metadata logs are never readable or writable from a client, even by an admin', async () => {
    await assertFails(getDoc(doc(db(), 'orgs/org1/aiUsage/month_2026-10')));
    await assertFails(setDoc(doc(db(), 'orgs/org1/aiUsage/month_2026-10'), { units: 0 }));
    await assertFails(getDoc(doc(db(), 'orgs/org1/aiLogs/l1')));
    await assertFails(setDoc(doc(db(), 'orgs/org1/aiLogs/l2'), { feature: 'x' }));
  });

  it('indicative prices are readable by a signed-in user and writable only by Functions', async () => {
    await assertSucceeds(getDoc(doc(db(), 'insights/riyadh__narjis__rent')));
    await assertFails(setDoc(doc(db(), 'insights/riyadh__narjis__rent'), { medianSarPerSqm: 1 }));
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), 'insights/riyadh__narjis__rent')),
    );
  });
});
