import { computeReminders, type Reminder } from '@rasikh/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';

export interface ReminderDeps {
  db: Firestore;
  messaging?: Messaging;
}

const orgOf = (path: string) => path.split('/')[1]!;
const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Daily job: finds upcoming/late payments, expiring leases and renewal-notice windows, writes one
 * in-app notification per recipient (idempotent via the reminder key) and pushes FCM when a token exists.
 * Email delivery needs a provider decision (paid service) and is not wired yet.
 */
export async function runReminders(deps: ReminderDeps, today: string) {
  const [leaseSnap, paymentSnap] = await Promise.all([
    deps.db.collectionGroup('leases').get(),
    deps.db.collectionGroup('payments').where('status', '==', 'due').get(),
  ]);

  const byOrg = new Map<
    string,
    {
      leases: Array<Record<string, unknown> & { id: string }>;
      payments: Array<Record<string, unknown> & { id: string }>;
    }
  >();
  const bucket = (o: string) => byOrg.get(o) ?? byOrg.set(o, { leases: [], payments: [] }).get(o)!;
  // A malformed document must never stop everyone else's reminders: skip it.
  leaseSnap.forEach((d) => {
    if (isIsoDate(d.data().endDate))
      bucket(orgOf(d.ref.path)).leases.push({ id: d.id, ...d.data() });
  });
  paymentSnap.forEach((d) => {
    if (isIsoDate(d.data().dueDate)) {
      bucket(orgOf(d.ref.path)).payments.push({ id: d.id, ...d.data() });
    }
  });

  let created = 0;
  for (const [orgId, { leases, payments }] of byOrg) {
    const reminders = computeReminders(
      today,
      leases as Array<{ id: string; endDate: string }>,
      payments as Array<{ id: string; leaseId: string; dueDate: string; status: 'due' | 'paid' }>,
    );
    if (reminders.length === 0) continue;

    const members = await deps.db.collection(`orgs/${orgId}/members`).get();
    const staff = members.docs
      .filter((m) =>
        ((m.data().roles ?? []) as string[]).some((r) => r === 'owner' || r === 'manager'),
      )
      .map((m) => m.id);

    for (const r of reminders) {
      const lease = leases.find((l) => l.id === r.leaseId);
      const recipients = new Set<string>(staff);
      if (lease?.tenantUid) recipients.add(lease.tenantUid as string);
      for (const uid of recipients) {
        if (await writeNotification(deps, orgId, uid, r, lease)) created++;
      }
    }
  }
  return { created };
}

async function writeNotification(
  deps: ReminderDeps,
  orgId: string,
  uid: string,
  r: Reminder,
  lease?: Record<string, unknown>,
) {
  const ref = deps.db.doc(`orgs/${orgId}/notifications/${r.key.replace(/[/]/g, '_')}_${uid}`);
  try {
    await ref.create({
      uid,
      kind: r.kind,
      leaseId: r.leaseId,
      paymentId: r.paymentId ?? null,
      days: r.days,
      unitLabel: (lease?.unitLabel as string | undefined) ?? '',
      propertyName: (lease?.propertyName as string | undefined) ?? '',
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    });
  } catch (e) {
    if ((e as { code?: number }).code === 6) return false; // ALREADY_EXISTS: sent on an earlier run
    throw e;
  }
  if (deps.messaging) {
    const tokens = ((await deps.db.doc(`users/${uid}`).get()).data()?.fcmTokens ?? []) as string[];
    if (tokens.length) {
      await deps.messaging
        .sendEachForMulticast({ tokens, data: { kind: r.kind, orgId, leaseId: r.leaseId } })
        .catch(() => undefined);
    }
  }
  return true;
}
