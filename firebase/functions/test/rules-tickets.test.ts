import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const owner = { orgs: { org1: ['owner'] } };
const tenant = { orgs: { org1: ['tenant'] } };
const jpg = new Uint8Array([255, 216, 255, 224]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'orgs/org1/tickets/tk1'), {
      tenantUid: 'tA',
      vendorUid: 'vV',
      status: 'assigned',
    });
  });
});

describe('tickets', () => {
  it('are only written by functions; read by staff and their tenant', async () => {
    await assertFails(
      setDoc(doc(env.authenticatedContext('o', owner).firestore(), 'orgs/org1/tickets/x'), {
        a: 1,
      }),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('o', owner).firestore(), 'orgs/org1/tickets/tk1')),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('tA', tenant).firestore(), 'orgs/org1/tickets/tk1')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('tB', tenant).firestore(), 'orgs/org1/tickets/tk1')),
    );
  });
  it('photos: write-once images, read only by staff and that ticket tenant', async () => {
    const path = 'orgs/org1/tickets/tk1/a.jpg';
    await assertSucceeds(
      uploadBytes(ref(env.authenticatedContext('tA', tenant).storage(), path), jpg, {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(
      uploadBytes(ref(env.authenticatedContext('tA', tenant).storage(), path), jpg, {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext('tA', tenant).storage(), 'orgs/org1/tickets/tk1/b.pdf'),
        jpg,
        { contentType: 'application/pdf' },
      ),
    );
    await assertSucceeds(getBytes(ref(env.authenticatedContext('o', owner).storage(), path)));
    await assertSucceeds(getBytes(ref(env.authenticatedContext('tA', tenant).storage(), path)));
    await assertSucceeds(
      getBytes(ref(env.authenticatedContext('vV', { orgs: { org1: ['vendor'] } }).storage(), path)),
    );
    await assertFails(getBytes(ref(env.authenticatedContext('tB', tenant).storage(), path)));
  });
});
