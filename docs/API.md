# Backend API (Cloud Functions callables)

All privileged operations go through Firebase **callable** functions in `me-central2` (`firebase/functions/src`). Clients call them with the Firebase SDK (`httpsCallable`); there is no public REST surface. App Check is enforced in production (skipped under the emulator).

## Conventions

- **Authentication**: callables read `request.auth`; without it they throw `unauthenticated` (`auth_required`).
- **Validation**: every input is parsed with a zod schema from `packages/shared` and rejected with `invalid-argument` (`invalid_input`) on any unknown or malformed field.
- **Authorization**: membership and role are checked server-side, because the Admin SDK bypasses rules.
- **Errors** are `HttpsError` with stable machine codes:

| Code                                                | Meaning                                                 |
| --------------------------------------------------- | ------------------------------------------------------- |
| `auth_required`                                     | Not signed in.                                          |
| `invalid_input`                                     | The payload failed validation.                          |
| `not_allowed`                                       | Signed in but not permitted (role or membership).       |
| `too_many_organizations` (`resource-exhausted`)     | The account already has five organizations.             |
| `role_not_in_section`                               | A role is not available in the organization's section.  |
| `daily_limit`, `monthly_cap` (`resource-exhausted`) | AI limits reached.                                      |
| `ai_unavailable`                                    | The model call failed (nothing is counted as answered). |

## Callables

### `createOrganization`

Creates an organization for the caller, adds them as a member and writes the role claims.

```ts
input  { name: string(2..80), roles: SelfServiceRole[1..5], displayName: string(2..80),
         consentPdpl: true, locale: 'ar'|'en', section?: 'property'|'office'|'broker' }
output { orgId: string, roles: Role[] }
```

Rules: at most five organizations per account; roles must belong to `section` when given (`SECTION_ROLES`); the organization stores `section` and `plan` (`free` while `LAUNCH_FREE`); an `office_lead` also gets an unverified `offices/{id}` profile; an audit entry `org.created` is written.

### `inviteTenant` · `claimInvites`

`inviteTenant` (staff) records an invitation by email for a lease; `claimInvites` (the invited person, after a verified sign-in) binds pending invitations to their account and grants the tenant role in the organization.

### `inviteBuildingMember`

Staff add a building owner by email to a building; they gain a limited `building_owner` view.

### `inviteEngineer`

An office lead adds an engineer by email; the engineer gains `engineer` in the office organization and completes their SCE profile; the Rasikh team verifies it.

### `signInspection`

```ts
input  { orgId, inspectionId, side: 'owner'|'tenant' }
output { sealed: boolean }
```

Requires a **fresh sign-in** (`auth_time` recent). Downloads every evidence file, recomputes SHA-256 and compares with Firestore; a mismatch refuses the signature. The second signature seals the record with a content digest.

### `createTicket` · `ticketAction`

`createTicket` stores a maintenance ticket with up to five photos and computes the suggested responsibility and SLA. `ticketAction` moves a ticket through its lifecycle (assign, start, resolve, close and rate) according to the status machine in `packages/shared`, checking who may act.

### `aiAssist`

```ts
input  { orgId, feature: 'explainLease'|'compareInspections'|'triageTicket'|'adHelper'|'buildingSummary'|'assistant',
         input: object }
output ok    { ok: true, ai: true, label, text, citations[], suggestion?, disclaimers[] }
       refused { ok: false, refused: 'off_topic'|'jailbreak'|'empty'|'too_long', message }
```

Order of work: sign-in and membership, input validation, scope classifier, facts gathered with the caller's permissions (plus matching knowledge entries for the assistant), transactional budget reservation (30 requests per person per Riyadh day, a monthly organization cap), then the Genkit flow behind `ModelProvider`. Metadata only is logged. A suggestion is never applied by the server.

### `exportMyData` · `deleteMyAccount`

PDPL rights. Export returns the caller's data; delete removes the account after re-authentication and handles organizations the person owns according to the account rules.

### `importIndicativePrices`

Admin only. Imports rows taken from official open data (`city`, `district`, `kind` rent or sale, `medianSarPerSqm`) into `insights/*`, each marked indicative with `source` and `asOf`. Rasikh never invents a price.

## Scheduled

### `dailyReminders`

Runs at 07:00 `Asia/Riyadh`. Computes late and upcoming payments, expiring leases and renewal notices (60 days) and sends push notifications; idempotent per day.

## Provider interface (internal)

```ts
interface ModelProvider {
  readonly name: string;
  generate(req: { system: string; prompt: string }): Promise<{ text: string }>;
}
```

`providerFromEnv()` returns the deterministic local engine (`AI_PROVIDER=fake`, the default). A real provider (Gemini through Vertex AI, or Claude) is added as one class here with its key in Secret Manager; no flow changes.

## Client SDK usage (web)

```ts
import { httpsCallable } from 'firebase/functions';
const res = await httpsCallable<Input, Output>(firebaseFunctions(), 'createOrganization')(payload);
```

Pages never call the Admin SDK; they read Firestore directly under the rules and call the functions above only for privileged writes.
