# Operations guide

| Field   | Value                                                                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version | 1.0 (2026-10-17)                                                                                                                                         |
| Related | [ARCHITECTURE](ARCHITECTURE.md) §7 · [FIREBASE-SETUP](FIREBASE-SETUP.md) (Arabic, step by step) · [SECURITY](SECURITY.md) · [REMAINING](../REMAINING.md) |

**Rule of this project:** nothing is deployed and no paid service is turned on without the owner's explicit confirmation. Claude and CI never deploy on their own.

## 1. Environments

| Environment | Backend                                                     | Purpose                                     | Cost                     |
| ----------- | ----------------------------------------------------------- | ------------------------------------------- | ------------------------ |
| Local       | Emulator Suite on the demo project `demo-rasikh`            | Development and every automated test        | Free                     |
| Dev (cloud) | Firebase project `rasikh-eca19`, Firestore in `me-central2` | Rules and indexes deployed; Auth with email | Spark (free) until Blaze |
| Production  | A separate Firebase project (to be created at launch)       | Real users                                  | Blaze, pay as you use    |

State of the dev project (2026-10-12): Firestore database in me-central2 (Standard, production mode); Authentication with Email/Password enabled; web app "Rasikh Web" registered with its public config in the gitignored `apps/web/.env.production.local`; Firestore rules and indexes deployed and refreshed for the engineering collections. **Not deployed (need Blaze):** Functions, Storage, phone OTP, App Hosting.

## 2. Running locally

```bash
pnpm install
pnpm --filter @rasikh/shared build
pnpm --filter @rasikh/functions build
pnpm emulators            # FUNCTIONS_DISCOVERY_TIMEOUT=90 on Windows; use an ASCII path (junction C:\dev\rasikh)
pnpm --filter @rasikh/web dev
```

Windows specifics: the Java emulators need an ASCII project path; `@swc/core` needs `SWC_NATIVE_BINDING_CACHE` pointing to a user-only directory; run the Firebase CLI from the junction, not through `pnpm` in PowerShell, when the real path has Arabic characters. After changing `packages/shared` rebuild it (`pnpm --filter @rasikh/shared build`) and restart the Next dev server, which caches the built package.

## 3. Configuration

| Item                          | Where                                               | Notes                                                                  |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Firebase web config           | `apps/web/.env.production.local` (gitignored)       | Public config, not a secret, but kept out of git.                      |
| `NEXT_PUBLIC_MAPBOX_TOKEN`    | `apps/web/.env.local`                               | Public token; restrict by URL; rotate the old one before launch.       |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `apps/web/.env.local` (optional)                    | Billed by Google; restrict by referrer; budget alert.                  |
| `NEXT_PUBLIC_SITE_URL`        | `.env.local` or hosting config                      | Canonical links, sitemap, social cards.                                |
| `AI_PROVIDER`                 | Functions environment                               | `fake` by default; a real provider reads its key from Secret Manager.  |
| Platform admin                | `firebase/functions/scripts/set-platform-admin.mjs` | Run with an Admin SDK service-account key, never committed.            |
| Feature flags                 | `packages/shared/src/enums.ts`                      | Out-of-scope features stay off; `LAUNCH_FREE` governs section billing. |

Never put keys in code, prompts, chat or commits. Secrets go in `.env` (gitignored) or Secret Manager.

## 4. Deploying (only after the owner says yes)

```bash
# rules and indexes (free on Spark): run from the junction path
firebase deploy --only firestore:rules,firestore:indexes --project rasikh-eca19
# after Blaze: Functions and Storage rules
pnpm --filter @rasikh/functions build
firebase deploy --only functions,storage --project rasikh-eca19
```

Order for the first real deployment: (1) enable Blaze and set a **budget alert**; (2) create the production project and region choices; (3) deploy rules and indexes; (4) deploy Functions and Storage; (5) host the web app (record the App Hosting region in `CLAUDE.md`); (6) enable App Check enforcement; (7) give the Rasikh team `platformAdmin`; (8) smoke-test the journeys in the table below; (9) switch on scheduled backups.

Smoke test after any deployment: sign up by email; create a workspace in each section; add a property, unit and lease; record a payment; capture and sign an inspection; open a ticket; ask the assistant one allowed and one refused question; open the map and a section video; as the team verify an office.

## 5. Monitoring and alerts

- **Budget**: a Google Cloud budget with email alerts (suggested first ceiling: USD 10) before enabling anything paid; the AI monthly cap limits model spend.
- **Errors**: Crashlytics for the app; Functions logs (no personal data) for the server; review weekly in the first month.
- **AI**: the metadata log shows outcomes (`answered`, `refused_*`, `limited`, `failed`); a rising `failed` share means the provider is down.
- **Reminders**: confirm `dailyReminders` ran each day (07:00 Riyadh).

## 6. Backup and recovery

Enable Firestore point-in-time recovery and a daily scheduled backup with a retention window in production (needs Blaze). Storage evidence is write-once; keep object versioning on for the evidence bucket. Test a restore into a scratch project once before launch. Recovery objectives to confirm with the owner: RPO 24 hours, RTO 4 hours.

## 7. Cost model

| Component       | Driver                     | Free-tier posture                                         |
| --------------- | -------------------------- | --------------------------------------------------------- |
| Firestore       | Reads, writes, storage     | Small teams stay within the free quota                    |
| Cloud Functions | Invocations and compute    | Free quota covers early use; `maxInstances: 10` bounds it |
| Storage         | GB stored and egress       | Evidence photos dominate; 25 MB per file limit            |
| Hosting         | Instances and egress       | Stateless web tier                                        |
| Phone OTP       | SMS per verification       | Needs Blaze; budget per country                           |
| Mapbox          | Map loads                  | Free monthly map loads, then metered                      |
| Google 3D view  | Photorealistic tile events | Optional; small free usage then metered; check pricing    |
| AI model        | Tokens                     | Off today (local engine); capped when enabled             |

Check each vendor's current pricing before the decision; figures change.

## 8. Maintenance

- **Dependencies**: update on a schedule; run the full suite; read changelogs for Next, Firebase and Mapbox.
- **Regulations**: when the Ministry or an Amanah changes a requirement, the Rasikh team updates `regulations/{id}` with the source; an engineer verifies transcribed values against the official PDF.
- **Code rule packs**: an office engineer verifies parameters from the licensed SBC text per rule and version; unverified rules stay "not checked".
- **Videos**: re-record with `pnpm --filter @rasikh/web videos` after a UI change.
- **Security rules**: any change needs the emulator tests updated first.

## 9. Runbook: common problems

| Symptom                                               | Likely cause and fix                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Emulator functions never respond                      | Cold load exceeded the discovery timeout: start with `FUNCTIONS_DISCOVERY_TIMEOUT=90`.                  |
| Emulator crashes on a path with Arabic characters     | Use the ASCII junction `C:\dev\rasikh` and run the CLI from there.                                      |
| New shared code not visible in the dev server         | Rebuild `packages/shared` and restart the Next dev server.                                              |
| Assistant ignores new knowledge                       | The emulator runs an older Functions bundle: rebuild `firebase/functions` and let it reload.            |
| Map shows a flat schematic                            | No token, no WebGL, or an automated browser; set `window.__RK_FORCE_MAP` for tests.                     |
| Printed drawings blank or with empty pages            | A print stylesheet rule hides the sheets or leaves chrome in the layout; see `globals.css` print block. |
| A user cannot approve a design                        | Office or engineer not verified, wrong discipline, or SCE membership expired (`approvalBlocks`).        |
| Signing an inspection fails with a changed-file error | A stored file no longer matches its digest: the evidence was altered; re-capture the item.              |
