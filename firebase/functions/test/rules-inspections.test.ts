import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const owner = { orgs: { org1: ['owner'] } };
const manager = { orgs: { org1: ['manager'] } };
const tenantA = { orgs: { org1: ['tenant'] } };
const tenantB = { orgs: { org1: ['tenant'] } };
const outsider = { orgs: { org2: ['owner'] } };

const HASH = 'a'.repeat(64);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    // Cross-service rules (Storage reading Firestore) only see the project the emulators were started with.
    projectId: 'demo-rasikh',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
  });
});
afterAll(async () => env.cleanup());

const inspection = (extra: Record<string, unknown> = {}) => ({
  unitId: 'u1',
  propertyId: 'p1',
  leaseId: 'lA',
  tenantUid: 'tA',
  kind: 'move_in',
  rooms: ['entrance', 'kitchen'],
  status: 'draft',
  ...extra,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'orgs/org1/leases/lA'), { unitId: 'u1', tenantUid: 'tA' });
    await setDoc(doc(db, 'orgs/org1/inspections/iDraft'), inspection());
    await setDoc(doc(db, 'orgs/org1/inspections/iOut'), inspection({ kind: 'move_out' }));
    await setDoc(
      doc(db, 'orgs/org1/inspections/iPending'),
      inspection({ status: 'pending_signatures' }),
    );
    await setDoc(doc(db, 'orgs/org1/inspections/iSealed'), inspection({ status: 'sealed' }));
    await setDoc(doc(db, 'orgs/org1/inspections/iDraft/items/kitchen__sink'), {
      room: 'kitchen',
      item: 'sink',
      condition: 'good',
      note: '',
    });
  });
});

const fs = (uid: string, claims: Parameters<RulesTestEnvironment['authenticatedContext']>[1]) =>
  env.authenticatedContext(uid, claims).firestore();
const st = (uid: string, claims: Parameters<RulesTestEnvironment['authenticatedContext']>[1]) =>
  env.authenticatedContext(uid, claims).storage();

const newInspection = (uid: string, extra: Record<string, unknown> = {}) => {
  const { status, ...rest } = inspection();
  return { ...rest, status, createdBy: uid, createdAt: serverTimestamp(), ...extra };
};

describe('inspections', () => {
  it('staff create a draft linked to the lease; nobody else does', async () => {
    await assertSucceeds(
      setDoc(doc(fs('o', owner), 'orgs/org1/inspections/n1'), newInspection('o')),
    );
    await assertSucceeds(
      setDoc(doc(fs('m', manager), 'orgs/org1/inspections/n2'), newInspection('m')),
    );
    await assertFails(
      setDoc(doc(fs('tA', tenantA), 'orgs/org1/inspections/n3'), newInspection('tA')),
    );
    await assertFails(
      setDoc(doc(fs('x', outsider), 'orgs/org1/inspections/n4'), newInspection('x')),
    );
  });

  it('rejects forged shapes: a pre-sealed inspection, signatures, a foreign tenant or unit', async () => {
    const db = fs('o', owner);
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f1'), newInspection('o', { status: 'sealed' })),
    );
    await assertFails(
      setDoc(
        doc(db, 'orgs/org1/inspections/f2'),
        newInspection('o', { signatures: { owner: { uid: 'o' } } }),
      ),
    );
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f3'), newInspection('o', { tenantUid: 'tB' })),
    );
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f4'), newInspection('o', { unitId: 'other' })),
    );
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f5'), newInspection('o', { leaseId: 'ghost' })),
    );
    await assertFails(
      setDoc(
        doc(db, 'orgs/org1/inspections/f6'),
        newInspection('o', { createdBy: 'someone-else' }),
      ),
    );
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f7'), newInspection('o', { createdAt: new Date() })),
    );
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f8'), newInspection('o', { rooms: [] })),
    );
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/f9'), newInspection('o', { kind: 'other' })),
    );
  });

  it('only that lease’s tenant reads it (and the staff)', async () => {
    await assertSucceeds(getDoc(doc(fs('o', owner), 'orgs/org1/inspections/iDraft')));
    await assertSucceeds(getDoc(doc(fs('tA', tenantA), 'orgs/org1/inspections/iDraft')));
    await assertFails(getDoc(doc(fs('tB', tenantB), 'orgs/org1/inspections/iDraft')));
    await assertFails(getDoc(doc(fs('x', outsider), 'orgs/org1/inspections/iDraft')));
  });

  it('the tenant may comment until sealed, and change nothing else; the owner cannot edit the doc', async () => {
    const t = fs('tA', tenantA);
    await assertSucceeds(
      updateDoc(doc(t, 'orgs/org1/inspections/iDraft'), { tenantComment: 'الصنبور يقطر' }),
    );
    await assertSucceeds(
      updateDoc(doc(t, 'orgs/org1/inspections/iPending'), { tenantComment: 'موافق مع ملاحظة' }),
    );
    await assertFails(
      updateDoc(doc(t, 'orgs/org1/inspections/iSealed'), { tenantComment: 'متأخر' }),
    );
    await assertFails(updateDoc(doc(t, 'orgs/org1/inspections/iDraft'), { status: 'sealed' }));
    await assertFails(
      updateDoc(doc(t, 'orgs/org1/inspections/iDraft'), { tenantComment: 'x'.repeat(501) }),
    );
    await assertFails(
      updateDoc(doc(fs('tB', tenantB), 'orgs/org1/inspections/iDraft'), { tenantComment: 'x' }),
    );
    await assertFails(
      updateDoc(doc(fs('o', owner), 'orgs/org1/inspections/iDraft'), { status: 'sealed' }),
    );
    await assertFails(
      updateDoc(doc(fs('o', owner), 'orgs/org1/inspections/iDraft'), { signatures: {} }),
    );
  });

  it('only drafts can be deleted', async () => {
    await assertSucceeds(deleteDoc(doc(fs('o', owner), 'orgs/org1/inspections/iDraft')));
    await assertFails(deleteDoc(doc(fs('o', owner), 'orgs/org1/inspections/iPending')));
    await assertFails(deleteDoc(doc(fs('o', owner), 'orgs/org1/inspections/iSealed')));
    await assertFails(deleteDoc(doc(fs('tA', tenantA), 'orgs/org1/inspections/iDraft')));
  });
});

describe('inspection items', () => {
  const item = (extra: Record<string, unknown> = {}) => ({
    room: 'kitchen',
    item: 'faucet',
    condition: 'fair',
    note: 'قديم',
    ...extra,
  });

  it('staff write checklist answers while it is a draft', async () => {
    const db = fs('o', owner);
    await assertSucceeds(
      setDoc(doc(db, 'orgs/org1/inspections/iDraft/items/kitchen__faucet'), item()),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'orgs/org1/inspections/iDraft/items/kitchen__sink'), { condition: 'poor' }),
    );
  });

  it('freezes once the first signature is in', async () => {
    const db = fs('o', owner);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'orgs/org1/inspections/iPending/items/kitchen__sink'),
        item({ item: 'sink' }),
      );
    });
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/iPending/items/kitchen__faucet'), item()),
    );
    await assertFails(
      updateDoc(doc(db, 'orgs/org1/inspections/iPending/items/kitchen__sink'), {
        condition: 'good',
      }),
    );
    await assertFails(deleteDoc(doc(db, 'orgs/org1/inspections/iPending/items/kitchen__sink')));
    await assertFails(
      setDoc(doc(db, 'orgs/org1/inspections/iSealed/items/kitchen__faucet'), item()),
    );
  });

  it('validates shape, id and room', async () => {
    const db = fs('o', owner);
    const base = 'orgs/org1/inspections/iDraft/items';
    await assertFails(setDoc(doc(db, `${base}/kitchen__faucet`), item({ condition: 'ruined' })));
    await assertFails(setDoc(doc(db, `${base}/wrong-id`), item()));
    await assertFails(
      setDoc(doc(db, `${base}/bedroom_1__walls`), item({ room: 'bedroom_1', item: 'walls' })),
    ); // not in this inspection
    await assertFails(setDoc(doc(db, `${base}/kitchen__faucet`), item({ note: 'x'.repeat(301) })));
    await assertFails(setDoc(doc(db, `${base}/kitchen__faucet`), item({ extra: 1 })));
    await assertFails(
      setDoc(doc(db, `${base}/kitchen__faucet`), item({ assessment: 'damage', costSar: 100 })),
    ); // move-in
  });

  it('wear/damage and a cost exist only on a move-out', async () => {
    const db = fs('o', owner);
    const p = 'orgs/org1/inspections/iOut/items/kitchen__faucet';
    await assertSucceeds(
      setDoc(doc(db, p), item({ condition: 'damaged', assessment: 'damage', costSar: 120.5 })),
    );
    await assertFails(setDoc(doc(db, p), item({ assessment: 'broken' })));
    await assertFails(setDoc(doc(db, p), item({ costSar: -5 })));
  });

  it('only the lease’s tenant and staff read them', async () => {
    const p = 'orgs/org1/inspections/iDraft/items';
    await assertSucceeds(getDocs(collection(fs('tA', tenantA), p)));
    await assertSucceeds(getDocs(collection(fs('o', owner), p)));
    await assertFails(getDocs(collection(fs('tB', tenantB), p)));
    await assertFails(setDoc(doc(fs('tA', tenantA), `${p}/kitchen__faucet`), item()));
  });
});

describe('inspection media metadata', () => {
  const media = (uid: string, extra: Record<string, unknown> = {}) => ({
    room: 'kitchen',
    item: 'sink',
    path: 'orgs/org1/inspections/iDraft/m1.jpg',
    sha256: HASH,
    size: 1234,
    contentType: 'image/jpeg',
    capturedAt: '2026-10-12T08:00:00.000Z',
    device: 'Pixel 7',
    source: 'in_app_camera',
    uploadedBy: uid,
    createdAt: serverTimestamp(),
    ...extra,
  });
  const path = 'orgs/org1/inspections/iDraft/media/m1';

  it('is create-only: it can be added to a draft but never edited', async () => {
    const db = fs('o', owner);
    await assertSucceeds(setDoc(doc(db, path), media('o')));
    await assertFails(updateDoc(doc(db, path), { sha256: 'b'.repeat(64) }));
    await assertFails(fs('tA', tenantA) && setDoc(doc(fs('tA', tenantA), `${path}x`), media('tA')));
  });

  it('rejects gallery imports, bad hashes, forged authors and other inspections’ paths', async () => {
    const db = fs('o', owner);
    const p = (n: string) => `orgs/org1/inspections/iDraft/media/${n}`;
    await assertFails(setDoc(doc(db, p('a')), media('o', { source: 'gallery' })));
    await assertFails(setDoc(doc(db, p('b')), media('o', { sha256: 'xyz' })));
    await assertFails(setDoc(doc(db, p('c')), media('o', { sha256: 'A'.repeat(64) })));
    await assertFails(setDoc(doc(db, p('d')), media('o', { uploadedBy: 'someone-else' })));
    await assertFails(setDoc(doc(db, p('e')), media('o', { createdAt: new Date() })));
    await assertFails(
      setDoc(doc(db, p('f')), media('o', { path: 'orgs/org1/inspections/iOut/m1.jpg' })),
    );
    await assertFails(setDoc(doc(db, p('g')), media('o', { path: 'orgs/org1/receipts/m1.jpg' })));
    await assertFails(setDoc(doc(db, p('h')), media('o', { room: 'bedroom_1' })));
    await assertFails(setDoc(doc(db, p('i')), media('o', { size: 0 })));
    await assertFails(setDoc(doc(db, p('j')), media('o', { extra: true })));
  });

  it('no new evidence after the first signature', async () => {
    const db = fs('o', owner);
    await assertFails(
      setDoc(
        doc(db, 'orgs/org1/inspections/iPending/media/m1'),
        media('o', { path: 'orgs/org1/inspections/iPending/m1.jpg' }),
      ),
    );
    await assertFails(
      setDoc(
        doc(db, 'orgs/org1/inspections/iSealed/media/m1'),
        media('o', { path: 'orgs/org1/inspections/iSealed/m1.jpg' }),
      ),
    );
  });

  it('readable by the lease’s tenant, not by a different tenant', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), path), { ...media('o'), createdAt: new Date() });
    });
    await assertSucceeds(getDoc(doc(fs('tA', tenantA), path)));
    await assertFails(getDoc(doc(fs('tB', tenantB), path)));
  });
});

describe('inspection files in Storage', () => {
  const jpg = new Uint8Array([255, 216, 255, 224]);

  it('staff upload to a draft once; no overwrite, no delete', async () => {
    const r = ref(st('o', owner), 'orgs/org1/inspections/iDraft/m1.jpg');
    await assertSucceeds(uploadBytes(r, jpg, { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(r, jpg, { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(r));
  });

  it('nobody uploads once the inspection has a signature', async () => {
    await assertFails(
      uploadBytes(ref(st('o', owner), 'orgs/org1/inspections/iPending/m1.jpg'), jpg, {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(
      uploadBytes(ref(st('o', owner), 'orgs/org1/inspections/iSealed/m1.jpg'), jpg, {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('tenants and outsiders cannot upload; PDFs are not evidence', async () => {
    await assertFails(
      uploadBytes(ref(st('tA', tenantA), 'orgs/org1/inspections/iDraft/t.jpg'), jpg, {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(
      uploadBytes(ref(st('x', outsider), 'orgs/org1/inspections/iDraft/x.jpg'), jpg, {
        contentType: 'image/jpeg',
      }),
    );
    await assertFails(
      uploadBytes(ref(st('o', owner), 'orgs/org1/inspections/iDraft/d.pdf'), jpg, {
        contentType: 'application/pdf',
      }),
    );
  });

  it('only staff and that lease’s tenant read the files', async () => {
    await uploadBytes(ref(st('o', owner), 'orgs/org1/inspections/iDraft/m2.jpg'), jpg, {
      contentType: 'image/jpeg',
    });
    const at = 'orgs/org1/inspections/iDraft/m2.jpg';
    await assertSucceeds(getBytes(ref(st('o', owner), at)));
    await assertSucceeds(getBytes(ref(st('tA', tenantA), at)));
    await assertFails(getBytes(ref(st('tB', tenantB), at)));
    await assertFails(getBytes(ref(st('x', outsider), at)));
  });

  it('unknown storage areas stay closed', async () => {
    await assertFails(
      uploadBytes(ref(st('o', owner), 'orgs/org1/misc/a.jpg'), jpg, { contentType: 'image/jpeg' }),
    );
  });
});
