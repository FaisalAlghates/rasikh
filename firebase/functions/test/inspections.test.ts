import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { itemId, sha256Hex, templateFor } from '@rasikh/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { signInspection, type InspectionDeps } from '../src/inspections.js';

let db: ReturnType<typeof getFirestore>;
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: 'demo-rasikh' });
  db = getFirestore();
});

const NOW = 1_800_000_000;
const fresh = (uid: string) => ({ uid, authTime: NOW - 30 });
const rooms = templateFor('studio').map((r) => r.key);

let seq = 0;
/** One org with an owner, a tenant on a lease, and a draft studio inspection with a complete checklist. */
async function seed(
  opts: { defect?: boolean; kind?: 'move_in' | 'move_out'; moveInId?: string } = {},
) {
  const org = `org-${++seq}-${Math.random().toString(36).slice(2, 7)}`;
  const owner = `owner-${org}`;
  const tenant = `tenant-${org}`;
  await db.doc(`orgs/${org}/members/${owner}`).set({ roles: ['owner'] });
  await db.doc(`orgs/${org}/members/${tenant}`).set({ roles: ['tenant'] });
  await db.doc(`orgs/${org}/leases/L1`).set({ unitId: 'U1', tenantUid: tenant });
  const iid = 'I1';
  await db.doc(`orgs/${org}/inspections/${iid}`).set({
    unitId: 'U1',
    propertyId: 'P1',
    leaseId: 'L1',
    tenantUid: tenant,
    kind: opts.kind ?? 'move_in',
    rooms,
    status: 'draft',
    ...(opts.moveInId ? { moveInId: opts.moveInId } : {}),
  });

  const files = new Map<string, Uint8Array>();
  for (const r of templateFor('studio')) {
    for (const it of r.items) {
      await db.doc(`orgs/${org}/inspections/${iid}/items/${itemId(r.key, it)}`).set({
        room: r.key,
        item: it,
        condition: 'good',
        note: '',
      });
    }
  }
  const photo = new Uint8Array(2048).map((_, i) => (i * 7) % 256);
  const path = `orgs/${org}/inspections/${iid}/m1.jpg`;
  files.set(path, photo);
  const mediaItem = { room: 'kitchen', item: 'sink' };
  if (opts.defect) {
    await db.doc(`orgs/${org}/inspections/${iid}/items/kitchen__sink`).set({
      ...mediaItem,
      condition: 'damaged',
      note: 'تسريب',
    });
  }
  await db.doc(`orgs/${org}/inspections/${iid}/media/m1`).set({
    ...mediaItem,
    path,
    sha256: await sha256Hex(photo),
    size: photo.length,
    contentType: 'image/jpeg',
    capturedAt: '2026-10-12T08:00:00.000Z',
    device: 'test',
    source: 'in_app_camera',
  });

  const deps: InspectionDeps = {
    db,
    readFile: async (p) => {
      const f = files.get(p);
      if (!f) throw new Error('missing');
      return f;
    },
    nowSeconds: () => NOW,
  };
  return { org, owner, tenant, iid, deps, files, path, photo };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return (e as { message: string }).message;
  }
};

describe('signInspection', () => {
  it('owner signs first, tenant second; the second signature seals it with one shared digest', async () => {
    const s = await seed({ defect: true });
    const a = await signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid });
    expect(a).toMatchObject({ status: 'pending_signatures', party: 'owner' });

    const mid = (await db.doc(`orgs/${s.org}/inspections/${s.iid}`).get()).data()!;
    expect(mid.status).toBe('pending_signatures');
    expect(mid.signatures.owner.uid).toBe(s.owner);

    const b = await signInspection(s.deps, fresh(s.tenant), { orgId: s.org, inspectionId: s.iid });
    expect(b).toMatchObject({ status: 'sealed', party: 'tenant', digest: a.digest });

    const done = (await db.doc(`orgs/${s.org}/inspections/${s.iid}`).get()).data()!;
    expect(done.status).toBe('sealed');
    expect(done.sealedAt).toBeTruthy();
    expect(done.signatures.tenant.digest).toBe(done.signatures.owner.digest);

    const audit = await db.collection(`orgs/${s.org}/audit`).get();
    expect(audit.docs.map((d) => d.data().action).sort()).toEqual([
      'inspection.sealed',
      'inspection.signed',
    ]);

    expect(
      await code(signInspection(s.deps, fresh(s.tenant), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('already_sealed');
  });

  it('needs a recent login (the OTP / password step)', async () => {
    const s = await seed();
    expect(
      await code(
        signInspection(
          s.deps,
          { uid: s.owner, authTime: NOW - 3600 },
          { orgId: s.org, inspectionId: s.iid },
        ),
      ),
    ).toBe('recent_login_required');
    expect(
      await code(signInspection(s.deps, { uid: s.owner }, { orgId: s.org, inspectionId: s.iid })),
    ).toBe('recent_login_required');
    expect(
      await code(signInspection(s.deps, undefined, { orgId: s.org, inspectionId: s.iid })),
    ).toBe('auth_required');
  });

  it('only the owner side and the lease tenant may sign, and the owner goes first', async () => {
    const s = await seed();
    const stranger = `stranger-${s.org}`;
    await db.doc(`orgs/${s.org}/members/${stranger}`).set({ roles: ['tenant'] });
    expect(
      await code(signInspection(s.deps, fresh(stranger), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('not_a_party');
    expect(
      await code(signInspection(s.deps, fresh(s.tenant), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('owner_must_sign_first');
    await signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid });
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('already_signed');
  });

  it('one person cannot be both parties', async () => {
    const s = await seed();
    // the owner is also recorded as the lease tenant
    await db.doc(`orgs/${s.org}/leases/L1`).update({ tenantUid: s.owner });
    await signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid });
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('already_signed');
  });

  it('refuses an incomplete checklist', async () => {
    const s = await seed();
    await db.doc(`orgs/${s.org}/inspections/${s.iid}/items/kitchen__sink`).delete();
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('checklist_incomplete');
  });

  it('requires a photo for every poor or damaged item', async () => {
    const s = await seed();
    await db
      .doc(`orgs/${s.org}/inspections/${s.iid}/items/living__walls`)
      .update({ condition: 'poor' });
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('evidence_missing');
    // a photo on that item fixes it
    await db.doc(`orgs/${s.org}/inspections/${s.iid}/media/m2`).set({
      room: 'living',
      item: 'walls',
      path: s.path,
      sha256: await sha256Hex(s.photo),
      size: s.photo.length,
      contentType: 'image/jpeg',
      capturedAt: '2026-10-12T08:01:00.000Z',
      device: 'test',
      source: 'in_app_camera',
    });
    expect(
      (await signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })).status,
    ).toBe('pending_signatures');
  });

  it('catches a tampered file: one flipped byte blocks the signature', async () => {
    const s = await seed({ defect: true });
    const bad = s.photo.slice();
    bad[1000] = (bad[1000] ?? 0) ^ 0x01;
    s.files.set(s.path, bad);
    const err = signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid });
    expect(await code(err)).toBe('media_hash_mismatch');
    expect((await db.doc(`orgs/${s.org}/inspections/${s.iid}`).get()).data()!.status).toBe('draft');
  });

  it('catches a missing file and a path outside the inspection', async () => {
    const s = await seed({ defect: true });
    s.files.delete(s.path);
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('media_hash_mismatch');

    const t = await seed({ defect: true });
    await db
      .doc(`orgs/${t.org}/inspections/${t.iid}/media/m1`)
      .update({ path: `orgs/${t.org}/receipts/x.jpg` });
    expect(
      await code(signInspection(t.deps, fresh(t.owner), { orgId: t.org, inspectionId: t.iid })),
    ).toBe('media_hash_mismatch');
  });

  it('a move-out can only be signed against a sealed move-in of the same lease', async () => {
    const mi = await seed();
    const s = await seed({ kind: 'move_out', moveInId: 'MI' });
    await db
      .doc(`orgs/${s.org}/inspections/MI`)
      .set({ leaseId: 'L1', status: 'pending_signatures' });
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })),
    ).toBe('move_in_not_sealed');
    await db.doc(`orgs/${s.org}/inspections/MI`).update({ status: 'sealed' });
    expect(
      (await signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: s.iid })).status,
    ).toBe('pending_signatures');
    expect(mi.org).not.toBe(s.org);
  });

  it('rejects malformed input and unknown inspections', async () => {
    const s = await seed();
    expect(await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org }))).toBe(
      'invalid_input',
    );
    expect(
      await code(signInspection(s.deps, fresh(s.owner), { orgId: s.org, inspectionId: 'nope' })),
    ).toBe('inspection_not_found');
  });
});
