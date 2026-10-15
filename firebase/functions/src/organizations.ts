import { CreateOrganizationInputSchema, type Role } from '@rasikh/shared';
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const MAX_ORGS_PER_USER = 5;

export interface Deps {
  db: Firestore;
  auth: Auth;
}

/**
 * Creates an organization for the caller, adds them as a member and writes the role claims.
 * Roles are decided here, on the server, from the whitelisted self-service list only.
 */
export async function createOrganization(deps: Deps, uid: string | undefined, raw: unknown) {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');

  const parsed = CreateOrganizationInputSchema.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const input = parsed.data;

  const user = await deps.auth.getUser(uid);
  const existing = (user.customClaims?.orgs ?? {}) as Record<string, Role[]>;
  if (Object.keys(existing).length >= MAX_ORGS_PER_USER) {
    throw new HttpsError('resource-exhausted', 'too_many_organizations');
  }

  const orgRef = deps.db.collection('orgs').doc();
  const roles = Array.from(new Set(input.roles)) as Role[];

  const batch = deps.db.batch();
  batch.set(orgRef, { name: input.name, createdBy: uid, createdAt: FieldValue.serverTimestamp() });
  if (roles.includes('office_lead')) {
    // public profile of an engineering office; only the Rasikh team can mark it verified
    batch.set(deps.db.doc(`offices/${orgRef.id}`), {
      name: input.name,
      crNo: '',
      sceClass: '',
      baladyActive: false,
      disciplines: [],
      cities: [],
      accepting: false,
      verified: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  batch.set(orgRef.collection('members').doc(uid), {
    uid,
    roles,
    displayName: input.displayName,
    joinedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    deps.db.collection('users').doc(uid),
    {
      displayName: input.displayName,
      locale: input.locale,
      consent: { pdpl: true, at: FieldValue.serverTimestamp() },
    },
    { merge: true },
  );
  batch.set(orgRef.collection('audit').doc(), {
    action: 'org.created',
    actor: uid,
    at: FieldValue.serverTimestamp(),
    meta: { roles },
  });
  await batch.commit();

  await deps.auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    orgs: { ...existing, [orgRef.id]: roles },
  });

  return { orgId: orgRef.id, roles };
}
