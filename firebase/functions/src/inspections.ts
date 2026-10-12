import {
  SIGN_MAX_AUTH_AGE_SECONDS,
  conditionRank,
  inspectionDigest,
  itemId,
  itemsOfRoom,
  sha256Hex,
  type Condition,
  type SignParty,
} from '@rasikh/shared';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

export interface InspectionDeps {
  db: Firestore;
  /** Reads a stored file so its hash can be re-checked at signing time. */
  readFile: (path: string) => Promise<Uint8Array>;
  /** Seconds since epoch; injectable for tests. */
  nowSeconds?: () => number;
}

export interface SignCaller {
  uid: string;
  /** `auth_time` claim: when the caller last authenticated (seconds since epoch). */
  authTime?: number;
}

const SignInput = z.object({ orgId: z.string().min(1), inspectionId: z.string().min(1) });

const STAFF = new Set(['owner', 'manager', 'admin']);

/**
 * One party signs an inspection. The rules of the sign-off:
 *  - the caller must have authenticated within the last 5 minutes (the OTP / password step);
 *  - the owner side signs first, which freezes the checklist and the evidence;
 *  - the checklist must be complete, and every poor/damaged item needs a photo;
 *  - every stored file is re-hashed and must still match the SHA-256 recorded at capture;
 *  - both parties sign the same digest, and the second signature seals the inspection for good.
 */
export async function signInspection(
  deps: InspectionDeps,
  caller: SignCaller | undefined,
  raw: unknown,
) {
  if (!caller) throw new HttpsError('unauthenticated', 'auth_required');
  const parsed = SignInput.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { orgId, inspectionId } = parsed.data;

  const now = (deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
  if (!caller.authTime || now - caller.authTime > SIGN_MAX_AUTH_AGE_SECONDS) {
    throw new HttpsError('failed-precondition', 'recent_login_required');
  }

  const ref = deps.db.doc(`orgs/${orgId}/inspections/${inspectionId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'inspection_not_found');
  const insp = snap.data() as {
    kind: 'move_in' | 'move_out';
    unitId: string;
    leaseId: string;
    rooms: string[];
    status: 'draft' | 'pending_signatures' | 'sealed';
    signatures?: Partial<Record<SignParty, { uid: string; digest: string }>>;
    moveInId?: string;
  };
  if (insp.status === 'sealed') throw new HttpsError('failed-precondition', 'already_sealed');

  // Who is signing, decided here from server records and never from the client.
  const member = await deps.db.doc(`orgs/${orgId}/members/${caller.uid}`).get();
  const roles = (member.data()?.roles ?? []) as string[];
  const lease = await deps.db.doc(`orgs/${orgId}/leases/${insp.leaseId}`).get();
  const tenantUid = lease.data()?.tenantUid as string | undefined;
  const party: SignParty | undefined = roles.some((r) => STAFF.has(r))
    ? 'owner'
    : tenantUid && tenantUid === caller.uid
      ? 'tenant'
      : undefined;
  if (!party) throw new HttpsError('permission-denied', 'not_a_party');

  const sigs = insp.signatures ?? {};
  if (sigs[party]) throw new HttpsError('failed-precondition', 'already_signed');
  if (party === 'tenant' && !sigs.owner)
    throw new HttpsError('failed-precondition', 'owner_must_sign_first');
  const other = party === 'owner' ? sigs.tenant : sigs.owner;
  if (other && other.uid === caller.uid) throw new HttpsError('failed-precondition', 'same_person');

  if (insp.kind === 'move_out' && insp.moveInId) {
    const mi = await deps.db.doc(`orgs/${orgId}/inspections/${insp.moveInId}`).get();
    if (!mi.exists || mi.data()?.status !== 'sealed' || mi.data()?.leaseId !== insp.leaseId) {
      throw new HttpsError('failed-precondition', 'move_in_not_sealed');
    }
  }

  const [itemsSnap, mediaSnap] = await Promise.all([
    ref.collection('items').get(),
    ref.collection('media').get(),
  ]);
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as ItemData) }));
  const media = mediaSnap.docs.map((d) => ({ id: d.id, ...(d.data() as MediaData) }));

  // 1. complete checklist
  const answered = new Set(items.map((i) => i.id));
  const expected = insp.rooms.flatMap((room) => itemsOfRoom(room).map((it) => itemId(room, it)));
  const missing = expected.filter((id) => !answered.has(id));
  if (missing.length > 0) {
    throw new HttpsError('failed-precondition', 'checklist_incomplete', {
      missing: missing.length,
    });
  }

  // 2. evidence for every defect
  const withPhoto = new Set(media.map((m) => itemId(m.room, m.item ?? '')));
  const bare = items.filter(
    (i) => conditionRank(i.condition) >= conditionRank('poor') && !withPhoto.has(i.id),
  );
  if (bare.length > 0) {
    throw new HttpsError('failed-precondition', 'evidence_missing', {
      items: bare.map((i) => i.id),
    });
  }

  // 3. nothing was tampered with since capture: re-hash every stored file
  const prefix = `orgs/${orgId}/inspections/${inspectionId}/`;
  const tampered: string[] = [];
  for (const m of media) {
    if (!m.path.startsWith(prefix)) {
      tampered.push(m.id);
      continue;
    }
    try {
      if ((await sha256Hex(await deps.readFile(m.path))) !== m.sha256) tampered.push(m.id);
    } catch {
      tampered.push(m.id);
    }
  }
  if (tampered.length > 0) {
    throw new HttpsError('failed-precondition', 'media_hash_mismatch', { media: tampered });
  }

  const digest = await inspectionDigest({
    inspectionId,
    kind: insp.kind,
    unitId: insp.unitId,
    leaseId: insp.leaseId,
    items: items.map((i) => ({
      id: i.id,
      condition: i.condition,
      note: i.note ?? '',
      assessment: i.assessment,
      costSar: i.costSar,
    })),
    media: media.map((m) => ({
      id: m.id,
      room: m.room,
      item: m.item,
      sha256: m.sha256,
      capturedAt: m.capturedAt,
    })),
  });
  if (other && other.digest !== digest) throw new HttpsError('aborted', 'content_changed');

  const sealed = !!other;
  await deps.db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    const f = fresh.data() as { status: string; signatures?: Partial<Record<SignParty, unknown>> };
    if (f.status === 'sealed' || f.signatures?.[party])
      throw new HttpsError('aborted', 'concurrent_sign');
    tx.update(ref, {
      [`signatures.${party}`]: { uid: caller.uid, at: FieldValue.serverTimestamp(), digest },
      status: sealed ? 'sealed' : 'pending_signatures',
      digest,
      ...(sealed ? { sealedAt: FieldValue.serverTimestamp() } : {}),
    });
    tx.set(deps.db.collection(`orgs/${orgId}/audit`).doc(), {
      action: sealed ? 'inspection.sealed' : 'inspection.signed',
      actor: caller.uid,
      at: FieldValue.serverTimestamp(),
      meta: { inspectionId, party, digest },
    });
  });

  return { status: sealed ? ('sealed' as const) : ('pending_signatures' as const), party, digest };
}

interface ItemData {
  room: string;
  item: string;
  condition: Condition;
  note?: string;
  assessment?: 'wear' | 'damage';
  costSar?: number;
}
interface MediaData {
  room: string;
  item?: string;
  path: string;
  sha256: string;
  capturedAt: string;
}
