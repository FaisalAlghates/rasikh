# Security and privacy architecture

| Field   | Value                                                                           |
| ------- | ------------------------------------------------------------------------------- |
| Version | 1.0 (2026-10-17)                                                                |
| Method  | STRIDE threat model per trust boundary, controls mapped to tests                |
| Related | [SRS](SRS.md) (NFR-SEC, NFR-PRIV) · [DATA-MODEL](DATA-MODEL.md) · [API](API.md) |

Report a vulnerability privately to the maintainer; do not open a public issue.

## 1. Assets and trust boundaries

| Asset                                  | Sensitivity | Why it matters                                       |
| -------------------------------------- | ----------- | ---------------------------------------------------- |
| Personal data (names, phones, emails)  | High (PDPL) | Legal exposure and user harm.                        |
| Lease, payment and receipt records     | High        | Financial facts; disputes depend on their integrity. |
| Inspection evidence and sealed records | High        | Their value is that nobody can alter them.           |
| Office and engineer verification docs  | High        | Identity and licence evidence; admin-only.           |
| Engineering drafts and approvals       | High        | An approval binds a licensed engineer to a SHA-256.  |
| Secrets (keys, tokens)                 | Critical    | Never in code, chat or prompts.                      |

Trust boundaries: browser or app ↔ Firebase (rules); browser or app ↔ Cloud Functions (callables); Functions ↔ Firestore and Storage (Admin SDK bypasses rules, so Functions re-check authorization); Functions ↔ model provider; browser ↔ third-party map scripts.

## 2. Controls

### 2.1 Identity and access

- **Roles in custom claims**, set only by Functions or the Admin SDK (`createOrganization`, invitations, `set-platform-admin.mjs`). Functions that write claims keep the existing ones. A client cannot add a role or a section.
- **Deny by default** in Firestore and Storage; every rule checks organization membership and role. One account may hold up to five organizations.
- **Fresh re-authentication** for signing an inspection and deleting an account.
- **Least privilege by role**: a tenant reads only their lease, payments and tickets; a vendor only assigned tickets; a building owner only their building; offices cannot see each other; clients never see drafts under internal review.
- **The Rasikh team** is not an organization role: a `platformAdmin` claim opens `/admin`.

### 2.2 Integrity of evidence and ledgers

- Inspection media is hashed at capture (SHA-256 with time and GPS), uploaded create-only, **re-hashed by the server** before sealing; a tampered file refuses the signature; sealed records are immutable.
- Building expenses and contributions, ballots and the broker activity log are create-only or append-only; receipts are write-once.
- Approvals sign the SHA-256 of the exact design version; a set releases only when every required discipline approved the same hash.

### 2.3 Input handling

- Every callable validates input with zod and rejects unknown fields; ids and file names are sanitized; file size is limited to 25 MB in Storage rules.
- Output encoding by React; no raw HTML from user content; map labels are set with `textContent`.
- The custom drawing and 3D code uses only plan data from the user's own organization.

### 2.4 AI safety

- AI runs only server-side, never in clients; no keys in code or prompts.
- A scope classifier and jailbreak filter run **before** any model call; refusals are fixed, polite Arabic text.
- Facts are fetched with the caller's permissions, so the assistant cannot reveal what the user could not read.
- Per-person daily limit and a monthly organization cap, enforced transactionally; counters are unreadable and unwritable by clients; logs hold metadata only.
- Output is marked as AI-made, carries disclaimers, and is never applied without a tap. Compliance and approvals are never delegated to a model.

### 2.5 Application and platform

- **App Check** on web and mobile (enforced in production; needs Blaze).
- **Secrets** only in `.env` (gitignored) or Secret Manager; every public key (Firebase web key, Mapbox token, Google key) restricted by domain or bundle id.
- **Dependencies** pinned by `pnpm-lock.yaml`; CI runs lint, typecheck, tests and build; review dependency updates like code.
- **Headers and cookies**: essential storage only; the cookie notice says so; no analytics without consent.
- **Third-party scripts**: Mapbox and the optional Google Maps script load from their official hosts only; Google imagery is never copied or cached.

### 2.6 Privacy (PDPL)

- Explicit consent at sign-up, stored with a timestamp; purpose-limited data; data in `me-central2`.
- Export and delete my data are self-service (`exportMyData`, `deleteMyAccount`).
- Verification documents are admin-only and purpose-limited.
- The design library holds no personal data and enters only with the client's consent and the office's contribution, credited to the office.
- Legal pages are drafts until a lawyer reviews them.

## 3. Threat model (STRIDE summary)

| Threat                                         | Boundary                    | Mitigation                                                                                  | Test                                   |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------- |
| **S**poofing: acting as another user or office | Client ↔ Firebase           | Auth, claims set server-side, fresh sign-in for signing, office and engineer verification.  | `rules*.test.ts`, `inspections.test`   |
| **T**ampering: editing evidence or a ledger    | Client ↔ Storage, Firestore | Write-once and append-only rules, server re-hash, sealed records, SHA-256 bound approvals.  | `rules-inspections`, `rules-buildings` |
| **R**epudiation: "I never signed or approved"  | Functions, Firestore        | Audit log, signatures bound to a digest and time, approvals with SCE number.                | `inspections.test`, `rules-office`     |
| **I**nformation disclosure across tenants      | Client ↔ Firestore          | Deny by default, membership plus role, per-role emulator tests, offices isolated.           | `rules.test`, `rules-office`           |
| **D**enial of service or cost abuse (AI)       | Client ↔ Functions          | Per-user daily limit, monthly org cap, `maxInstances`, App Check.                           | `ai.test`                              |
| **E**levation of privilege                     | Client ↔ Firebase           | Roles only in claims set by the server; `platformAdmin` only via Admin SDK; rules per role. | `rules.test`, `rules-regulations`      |
| Prompt injection / jailbreak                   | User ↔ Functions            | Scope classifier first, facts-only prompts, fixed refusals, 46-prompt evaluation set.       | `ai-eval.test`                         |
| Unsafe engineering output taken as approved    | Office ↔ client             | Draft watermark until release; stamp area empty; compliance only from the rule engine.      | `engineering.test`, e2e `engineering`  |
| Supply-chain compromise                        | Build                       | Lockfile, CI, minimal dependencies, review on update.                                       | CI                                     |

## 4. Residual risks and open items

1. Production hardening needs Blaze: App Check enforcement, scheduled backups and point-in-time recovery.
2. Phone OTP abuse controls (quotas) are configured at deploy time.
3. Legal review of the privacy policy, terms, disclaimers and the draft-watermark wording is pending.
4. The Google Maps key, once added, must be restricted by HTTP referrer to the domain and capped by a budget alert.
5. A penetration test and a rules review by a second engineer are recommended before the first public launch.

## 5. Incident response (outline)

Detect (audit log, error reports) → contain (disable the affected function or revoke the key; rules can be redeployed in minutes) → assess personal-data impact against PDPL notification duties → fix and add a regression test → record the cause in the changelog. Rotate any key suspected of exposure (rotating the old Mapbox token is on the remaining list).
