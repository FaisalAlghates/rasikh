import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export interface AiLimits {
  /** Requests one person may make per Riyadh day. */
  perUserPerDay: number;
  /** Estimated model units (about one per four characters, in plus out) one organization may use per month. */
  monthlyOrgUnits: number;
}

export const DEFAULT_LIMITS: AiLimits = { perUserPerDay: 30, monthlyOrgUnits: 200_000 };

export type Reservation = { ok: true } | { ok: false; reason: 'daily_limit' | 'monthly_cap' };

/** Rough cost unit: the real provider reports tokens; until then characters / 4 keeps the cap honest. */
export const unitsFor = (chars: number) => Math.ceil(chars / 4);

const riyadhDay = (now: Date) => new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);

/**
 * Counts one request against the person's daily limit and the organization's monthly cost cap, atomically.
 * Nothing is counted when a limit is already reached. Counters live where clients cannot read or write
 * (the rules deny everything under `aiUsage`).
 */
export async function reserve(
  db: Firestore,
  args: { orgId: string; uid: string; now: Date; estimatedUnits: number; limits?: AiLimits },
): Promise<Reservation> {
  const limits = args.limits ?? DEFAULT_LIMITS;
  const day = riyadhDay(args.now);
  const dayRef = db.doc(`orgs/${args.orgId}/aiUsage/day_${args.uid}_${day}`);
  const monthRef = db.doc(`orgs/${args.orgId}/aiUsage/month_${day.slice(0, 7)}`);

  return db.runTransaction(async (tx) => {
    const [d, m] = await Promise.all([tx.get(dayRef), tx.get(monthRef)]);
    const count = (d.data()?.count as number | undefined) ?? 0;
    const units = (m.data()?.units as number | undefined) ?? 0;
    if (count >= limits.perUserPerDay) return { ok: false, reason: 'daily_limit' } as const;
    if (units + args.estimatedUnits > limits.monthlyOrgUnits) {
      return { ok: false, reason: 'monthly_cap' } as const;
    }
    tx.set(dayRef, { count: count + 1, uid: args.uid, day }, { merge: true });
    tx.set(
      monthRef,
      { units: units + args.estimatedUnits, month: day.slice(0, 7) },
      { merge: true },
    );
    return { ok: true } as const;
  });
}

export interface AiLogEntry {
  uid: string;
  feature: string;
  outcome:
    | 'answered'
    | 'refused_off_topic'
    | 'refused_jailbreak'
    | 'refused_input'
    | 'limited'
    | 'denied'
    | 'failed';
  provider: string;
  inChars: number;
  outChars: number;
}

/** Metadata only: never the message, the answer or any personal data (CLAUDE.md §7). */
export async function logMetadata(db: Firestore, orgId: string, entry: AiLogEntry) {
  await db.collection(`orgs/${orgId}/aiLogs`).add({ ...entry, at: FieldValue.serverTimestamp() });
}
