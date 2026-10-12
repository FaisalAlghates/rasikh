import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTicket, ticketAction } from '../src/tickets.js';

let db: ReturnType<typeof getFirestore>;
beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: 'demo-rasikh' });
  db = getFirestore();
});

let n = 0;
async function seed() {
  const org = `tk-${++n}-${Math.random().toString(36).slice(2, 7)}`;
  const owner = `o-${org}`;
  const tenant = `t-${org}`;
  await db.doc(`orgs/${org}/members/${owner}`).set({ roles: ['owner'] });
  await db.doc(`orgs/${org}/members/${tenant}`).set({ roles: ['tenant'] });
  await db.doc(`orgs/${org}/leases/L1`).set({ unitId: 'U1', tenantUid: tenant });
  return { org, owner, tenant, deps: { db, now: () => new Date('2026-10-12T08:00:00.000Z') } };
}
const body = (org: string, extra = {}) => ({
  orgId: org,
  ticketId: 'T1',
  ticket: {
    unitId: 'U1',
    propertyId: 'P1',
    leaseId: 'L1',
    title: 'تسريب مياه',
    category: 'plumbing',
    urgency: 'urgent',
  },
  photos: [`orgs/${org}/tickets/T1/a.jpg`],
  ...extra,
});
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return (e as { message: string }).message;
  }
};

describe('tickets', () => {
  it('a tenant opens a ticket: server stamps SLA and a non-binding suggestion', async () => {
    const s = await seed();
    await createTicket(s.deps, s.tenant, body(s.org));
    const t = (await db.doc(`orgs/${s.org}/tickets/T1`).get()).data()!;
    expect(t).toMatchObject({
      status: 'open',
      suggestedParty: 'owner',
      tenantUid: s.tenant,
      slaDueAt: '2026-10-13T08:00:00.000Z',
    });
    const light = body(s.org, { ticketId: 'T2' });
    light.ticket.category = 'consumables';
    light.photos = [];
    await createTicket(s.deps, s.tenant, light);
    expect((await db.doc(`orgs/${s.org}/tickets/T2`).get()).data()!.suggestedParty).toBe('tenant');
  });

  it('refuses outsiders, another unit, bad photo paths and duplicates', async () => {
    const s = await seed();
    expect(await code(createTicket(s.deps, 'stranger', body(s.org)))).toBe('not_allowed');
    const wrong = body(s.org);
    wrong.ticket.unitId = 'U9';
    expect(await code(createTicket(s.deps, s.tenant, wrong))).toBe('lease_mismatch');
    expect(
      await code(
        createTicket(s.deps, s.tenant, body(s.org, { photos: ['orgs/other/tickets/T1/a.jpg'] })),
      ),
    ).toBe('bad_photo_path');
    await createTicket(s.deps, s.tenant, body(s.org));
    expect(await code(createTicket(s.deps, s.tenant, body(s.org)))).toBe('ticket_exists');
  });

  it('full lifecycle: assign → start → resolve → tenant closes with a rating', async () => {
    const s = await seed();
    await createTicket(s.deps, s.tenant, body(s.org));
    const act = (uid: string, input: object) =>
      ticketAction(s.deps, uid, { orgId: s.org, ticketId: 'T1', input });
    expect(await code(act(s.tenant, { action: 'assign', vendorName: 'مؤسسة السباكة' }))).toBe(
      'transition_not_allowed',
    );
    await act(s.owner, {
      action: 'assign',
      vendorName: 'مؤسسة السباكة',
      vendorPhone: '0500000000',
    });
    await act(s.owner, { action: 'start' });
    await act(s.owner, { action: 'resolve', note: 'تم تبديل الوصلة' });
    const r = (await db.doc(`orgs/${s.org}/tickets/T1`).get()).data()!;
    expect(r).toMatchObject({
      status: 'resolved',
      vendorName: 'مؤسسة السباكة',
      resolvedAtIso: '2026-10-12T08:00:00.000Z',
    });
    expect(await code(act(s.owner, { action: 'close', rating: 5 }))).toBe('only_tenant_rates');
    await act(s.tenant, { action: 'close', rating: 4, ratingNote: 'سريع' });
    expect((await db.doc(`orgs/${s.org}/tickets/T1`).get()).data()).toMatchObject({
      status: 'closed',
      rating: 4,
    });
    expect(await code(act(s.owner, { action: 'cancel' }))).toBe('transition_not_allowed');
  });

  it('only the ticket’s tenant or staff may act', async () => {
    const s = await seed();
    await createTicket(s.deps, s.tenant, body(s.org));
    const other = `x-${s.org}`;
    await db.doc(`orgs/${s.org}/members/${other}`).set({ roles: ['tenant'] });
    expect(
      await code(
        ticketAction(s.deps, other, { orgId: s.org, ticketId: 'T1', input: { action: 'cancel' } }),
      ),
    ).toBe('not_allowed');
    await ticketAction(s.deps, s.tenant, {
      orgId: s.org,
      ticketId: 'T1',
      input: { action: 'cancel' },
    });
    expect((await db.doc(`orgs/${s.org}/tickets/T1`).get()).data()!.status).toBe('cancelled');
  });
});
