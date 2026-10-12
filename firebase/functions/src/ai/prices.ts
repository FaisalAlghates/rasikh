import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

/**
 * Indicative-prices import pipeline (Module 8). An admin imports rows taken from official open data (for example
 * the Ministry of Justice or REGA real-estate indicators); Rasikh never invents a price. Every stored row is marked
 * "indicative" and carries its source and date, and nothing here is a valuation.
 */
const Row = z.object({
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  kind: z.enum(['rent', 'sale']),
  /** SAR per square meter per year for rent, per square meter for sale. */
  medianSarPerSqm: z.number().positive().max(1_000_000),
  sampleSize: z.number().int().positive().optional(),
});
const ImportInput = z.object({
  source: z.string().trim().min(3).max(160),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(Row).min(1).max(2000),
});

export const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');

/** Admin only. Writes `insights/{city}__{district}__{kind}` in batches; later imports replace older figures. */
export async function importIndicativePrices(
  deps: { db: Firestore },
  uid: string | undefined,
  orgId: unknown,
  raw: unknown,
) {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  if (typeof orgId !== 'string' || !orgId) throw new HttpsError('invalid-argument', 'invalid_input');
  const m = await deps.db.doc(`orgs/${orgId}/members/${uid}`).get();
  if (!((m.data()?.roles ?? []) as string[]).includes('admin')) {
    throw new HttpsError('permission-denied', 'not_allowed');
  }
  const parsed = ImportInput.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { source, asOf, rows } = parsed.data;

  for (let i = 0; i < rows.length; i += 400) {
    const batch = deps.db.batch();
    for (const r of rows.slice(i, i + 400)) {
      batch.set(deps.db.doc(`insights/${slug(r.city)}__${slug(r.district)}__${r.kind}`), {
        ...r,
        indicative: true,
        source,
        asOf,
        importedBy: uid,
        importedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return { imported: rows.length };
}
