import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rasikh-site',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'siteFeedback/f1'), { page: '/help', helpful: true });
    await setDoc(doc(ctx.firestore(), 'siteMessages/m1'), { name: 'x', email: 'x@y.sa' });
  });
});
afterAll(async () => env.cleanup());

const anon = () => env.unauthenticatedContext().firestore();
const admin = () =>
  env.authenticatedContext('a1', { orgs: { org1: ['owner', 'admin'] } }).firestore();

const feedback = (over: Record<string, unknown> = {}) => ({
  page: '/help',
  helpful: false,
  reasons: ['missing'],
  comment: '',
  locale: 'ar',
  createdAt: serverTimestamp(),
  ...over,
});
const message = (over: Record<string, unknown> = {}) => ({
  name: 'سارة',
  email: 'sara@example.com',
  topic: 'question',
  message: 'كيف أضيف عقاراً ثانياً؟',
  consent: true,
  locale: 'ar',
  createdAt: serverTimestamp(),
  ...over,
});

describe('public site feedback (DGA rating section)', () => {
  it('anyone can leave a well-formed answer', async () => {
    await assertSucceeds(addDoc(collection(anon(), 'siteFeedback'), feedback()));
    await assertSucceeds(
      addDoc(collection(anon(), 'siteFeedback'), feedback({ helpful: true, reasons: [] })),
    );
  });

  it('rejects extra fields, unknown reasons, long notes and client timestamps', async () => {
    const c = collection(anon(), 'siteFeedback');
    await assertFails(addDoc(c, feedback({ email: 'a@b.sa' })));
    await assertFails(addDoc(c, feedback({ reasons: ['spam'] })));
    await assertFails(addDoc(c, feedback({ comment: 'x'.repeat(501) })));
    await assertFails(addDoc(c, feedback({ createdAt: new Date() })));
    await assertFails(addDoc(c, feedback({ helpful: 'yes' })));
  });

  it('nobody reads or changes answers from a client, not even an admin', async () => {
    await assertFails(getDoc(doc(anon(), 'siteFeedback/f1')));
    await assertFails(getDoc(doc(admin(), 'siteFeedback/f1')));
    await assertFails(setDoc(doc(admin(), 'siteFeedback/f1'), feedback()));
  });
});

describe('public contact messages', () => {
  it('a message with consent is accepted', async () => {
    await assertSucceeds(addDoc(collection(anon(), 'siteMessages'), message()));
  });

  it('needs consent, a valid email, a known topic and a real message', async () => {
    const c = collection(anon(), 'siteMessages');
    await assertFails(addDoc(c, message({ consent: false })));
    await assertFails(addDoc(c, message({ email: 'not-an-email' })));
    await assertFails(addDoc(c, message({ topic: 'sales' })));
    await assertFails(addDoc(c, message({ message: 'قصير' })));
    await assertFails(addDoc(c, message({ message: 'x'.repeat(2001) })));
    await assertFails(addDoc(c, message({ phone: '0500000000' })));
  });

  it('messages are never readable from a client', async () => {
    await assertFails(getDoc(doc(anon(), 'siteMessages/m1')));
    await assertFails(getDoc(doc(admin(), 'siteMessages/m1')));
  });
});
