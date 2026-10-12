# PLAN.md — Rasikh · راسخ

Rules: follow CLAUDE.md. One phase at a time; user tests before the next. Every phase ends with all tests run,
screenshots (web desktop + 390px, app iOS + Android), and a known-gaps list.

## Phase 1 — Foundation

Deliverables

- [x] pnpm + Turborepo monorepo, TS strict configs, ESLint, Prettier
- [x] Firebase config: firebase.json, .firebaserc (dev alias = rasikh-eca19; prod alias pending), Emulator Suite, default region me-central2
- [x] Written list of console steps: docs/FIREBASE-SETUP.md (nothing deployed; waiting for the user)
- [x] Auth: phone OTP (+966) + email on web and app; role onboarding; callable Function creating org + custom claims (verified on emulators)
- [x] Firestore + Storage rules skeleton (deny by default, org + role) with emulator tests (14 tests)
- [x] packages/design-tokens: JSON → CSS vars + Tailwind theme + Flutter ThemeExtension; AA contrast enforced at build; 4 fonts loaded (web: next/font; app: google_fonts runtime fetch, to be bundled)
- [x] App shells: Next.js + next-intl (ar default, RTL); Flutter + ARB (ar default, RTL)
- [~] GitHub Actions CI written (lint, typecheck, build, tests, Playwright e2e, Flutter); not yet run: no GitHub remote
- [~] App Hosting region: recorded as UNVERIFIED in CLAUDE.md; decide at first deploy

Acceptance: emulators start with one command; sign-in works on web + app against emulators; rules tests pass;
Arabic RTL correct on both; CI green.

**Status (2026-10-11): code complete, verified locally.** Known gaps: Android/iOS builds not run (no Android SDK; iOS needs macOS); JSON Schema → Dart model generation not wired (only JSON Schema emitted; Flutter uses a hand-written validator mirror); CI not run on GitHub; nothing deployed.

## Phase 2 — Design system + signature screens

Deliverables

- [x] Web components (React + Radix + tokens) and matching Flutter widgets: Button, IconButton, Input, Select, Sheet, Dialog,
      Tabs, Card, PropertyCard, StatTile, Timeline, EmptyState, Toast, Skeleton, GlassPanel (solid fallback), ArchImage,
      ShurfaDivider, ShurfaLoader
- [x] /design-lab (web) and Gallery (app): dark + light, ar + en
- [x] Landing page: hero w/ static dusk image + one Arabic headline, role fork, 3-step how-it-works, Health Record story,
      insights teaser, trust section, footer CTA (Arabic copy, no fake numbers/testimonials)
- [x] App: 3-screen onboarding + home shell with glass bottom dock
- [x] Self-critique loop: screenshots, 10 biggest gaps, fixes, before/after

Acceptance: Lighthouse mobile ≥ 90 on landing; AA contrast; reduced motion respected.

**Status (2026-10-11): done and verified locally.** See [docs/PHASE2-REPORT.md](docs/PHASE2-REPORT.md). Known gaps: Arabic LCP 3.0 s (target 2.5 s); no iOS/Android screenshots (no Android SDK / no macOS).

## Phase 3 — 3D map experience

Deliverables

- [ ] Web MapView (lightPreset by Riyadh time, POI hidden, middle-slot layers, clustering, lazy bundle, 2D fallback, reduced motion)
- [ ] Landing hero live 3D Riyadh dusk orbit; GSAP ScrollTrigger camera; still frame first (LCP < 2.5 s)
- [ ] Portfolio page: map ↔ list sync, glass search, progressive filters, peek card, flyTo pitch ~60°, clay extrusions
- [ ] Neighborhood indicators layer from labelled SAMPLE dataset
- [ ] Property page: optional Google Map3DElement flyover behind flag, coverage check, Mapbox fallback
- [ ] App: same behaviors with mapbox_maps_flutter, glass dock, peek sheet, smooth camera

Acceptance: 60 fps on mid-range Android, no jank, keys restricted by domain/bundle ID, screenshots + recording description.

**Status (2026-10-12): web slice built, map itself unverified.** Done: lazy Mapbox Standard MapView (Riyadh-clock lightPreset, POI labels hidden, clustering, slot middle indicator layer, clay glow markers, flyTo pitch 60), portfolio page (map↔list sync, one glass search bar, progressive filters, peek card, SAMPLE data labelled), flat no-token/no-WebGL fallback, 3 unit + 5 e2e tests. NOT done: running against a real token (none supplied), Google Photorealistic 3D flyover, Flutter mapbox_maps_flutter map, 60 fps device check.

## Phase 4 — Owner rental operations

- [ ] Data model + zod + Dart: buildings, properties, units, leases (ejarContractNo…), schedule, payment records, expenses, documents
- [ ] Owner screens: overview, unit, lease, schedule, expenses, annual income/expense PDF (Arabic, branded)
- [ ] Reminders: scheduled Functions → FCM + email
- [ ] Riyadh rent-freeze helper + 60-day renewal-notice reminders
- [ ] Tenant screens: lease, schedule, receipts, raise ticket

Acceptance: rules tests for every new collection; e2e owner adds unit → lease → schedule → marks payment; tenant sees it.

**Status (2026-10-12): web, backend and Flutter screens done; verified on emulators (web) and with widget tests (app).** Done: shared domain (schemas, payment schedule, Riyadh freeze helper, 60-day renewal notice, reminders, yearly totals, .ics builder; 21 tests) with a Dart port that uses the same fixtures (domain + ics tests), rules for units/leases/payments/expenses/documents/notifications with tenant isolation (9 tests), callables inviteTenant / claimInvites (verified-email only), owner dashboard and tenant view on the web, and the same on the app (overview with stats and reminders, properties/units, lease form with freeze warning, lease detail with schedule and record-payment, expenses, yearly report, tenant lease view; 47 Flutter tests). **Reminders cost nothing:** they are computed on the device from the user's own records (live list on the overview), plus browser notifications on the web and a free .ics calendar export on web and app (the phone's calendar app raises the alerts). The scheduled `dailyReminders` function is optional and would need the Blaze plan; no email/SMS/push provider is used. Gaps: Flutter has not run against the Firebase emulators or on a device (no Android SDK; the repository is covered by a fake in tests), receipt upload is web-only, no on-device scheduled notifications, report is browser print-to-PDF on the web and on-screen only in the app (server-side Arabic PDF later), storage rules are org-wide (receipts are not yet per-lease scoped), documents collection has rules but no UI.

## Phase 5 — Guided inspections + Property Health Record

- [x] Templates per unit type (studio, apartment, villa)
- [~] App capture: in-app camera only; time, GPS, device, SHA-256; offline-first queue with retry (queue, hashing and flows tested with fakes; the real camera and GPS code has not run on a device)
- [~] Two-party sign-off; write-once afterwards (done with a fresh re-authentication instead of a dedicated OTP: SMS code for phone accounts, password for email accounts, and the server requires a sign-in no older than 5 minutes)
- [~] Move-out comparison; human marks wear vs damage + cost; Arabic PDF for Ejar (web: print or save as PDF from the browser; the app shows the comparison on screen only)
- [~] Health Record timeline fed by all modules; ownership transfer with consent (timeline done for leases, inspections and expenses; transfer to a new owner not built)
- [x] Web: view inspections, timeline, PDFs

Acceptance: tampered-file hash test; offline capture test; Arabic PDF renders correctly (RTL, shaping, fonts).

**Status (2026-10-12): web, backend and Flutter screens built; verified on emulators (web) and with widget tests (app).** Done: shared model (3 unit-type templates, schemas, SHA-256, canonical digest, comparison, health-record timeline; 36 tests) with a Dart port that reproduces the TypeScript digest byte for byte (golden test); rules for inspections, items and evidence metadata (create-only, frozen after the first signature) and Storage rules that read Firestore to refuse uploads once an inspection is no longer a draft (19 tests); `signInspection` function: fresh-login check, owner first, complete checklist, a photo for every poor or damaged item, every stored file re-hashed against its capture hash, one shared digest, second signature seals (10 tests, including the tampered-file case). Web: inspections tab (start, room-by-room checklist, in-app camera with time/GPS/hash, integrity check, sign dialog, tenant comment), move-out comparison report, Property Health Record; one end-to-end test covers capture, a tampered file blocking the signature, two-party sealing, move-out comparison and the record, plus axe and phone-width overflow checks. App: inspections list/editor, offline-first evidence queue (kept on the phone, retried with backoff, order preserved, survives restarts), sign sheet, comparison, record tab (13 flow tests, 7 queue tests). Found and fixed on the way: a Phase 4 receipt input that widened the tenant page on phones. Gaps: the camera and GPS screens and the file-based queue have not run on a device or emulator (no Android SDK); the app's inspection screens were not run against the Firebase emulators; no server-side Arabic PDF; no ownership transfer; the SMS re-authentication path is covered by fakes only (the emulator e2e uses the password path); Storage receipts are still org-wide.

## Phase 6 — Maintenance + buildings/associations

- [x] Tickets: photos, category, urgency, suggested responsibility (suggestion only), vendor flow, SLA timer, rating (done; the vendor is a name and phone typed by staff, not a vendor account with its own login)
- [~] Buildings: members/units, expense ledger (receipt required), balances, quote comparison, votes (majority/75%), monthly statement PDF (done on the web; reminders to owners and owner-facing balances not built; statement is browser print-to-PDF)
- [x] Copy: complements Mullak; no official-registration claims

Acceptance: e2e ticket lifecycle and expense → statement; rules tests.

**Status (2026-10-12): done on web, backend and Flutter; verified on emulators (web) and with widget tests (app).** Done: shared logic (status machine, SLA, suggested responsibility; halala-exact expense split, balances, quote ranking, vote thresholds, monthly statement) with Dart ports using the same fixtures; ticket functions; rules (tickets written only by functions; building ledger append-only with a receipt on every expense; one create-only ballot per unit); web tabs and Flutter screens for tickets (with photos) and buildings. **Accounts for the other parties:** staff link a unit owner to an account by email (invite function; applied at once for a verified account, otherwise after verified sign-up). A linked owner sees their building's ledger, balances and votes, gets a free in-app notice of what they still owe, and casts their own ballot (one per unit); on web and in the app. A vendor can be assigned by email and then signs in, sees only the tickets assigned to them, starts the work and records the repair (cannot open, cancel, assign or close tickets). Ticket photos are readable only by staff, that ticket's tenant and its vendor. Linking now requires a verified email (an unverified account waits), for tenants too. Gaps: the notice of an outstanding balance is shown in the app and on the web, not sent by email, SMS or push (those need a paid provider); the monthly statement is browser print-to-PDF on the web and on-screen totals in the app (a server-side Arabic PDF is a separate piece of work); Flutter on the Android emulator (2026-10-12): sign-up, onboarding (workspace creation) and the properties screen run against the Firebase emulators; fixes found there: cleartext HTTP allowed in debug builds, and a fake API key in the Android SDK's accepted format (39 characters starting with "A"). Still unchecked on a device: leases, inspections (camera, GPS, upload queue), tickets, buildings, and anything on iOS.

## Phase 7 — Broker CRM + ad compliance checker

- [x] Broker profile: FAL no. + expiry reminders (60/30/7 days, in-app, free)
- [x] Leads, brokerage contracts, viewings, immutable server-timestamped log; proof file = browser print-to-PDF of one lead's log on the web (the app shows the log on screen)
- [x] Ad compliance checker (no publishing): purpose, advertiser + capacity, ad license no./expiry, location, property type, area, price, contact, description, encumbrance statement; near-expiry warning

Acceptance: checker unit tests (valid + invalid ads); rules tests.

**Status (2026-10-12): done on web, backend and Flutter.** Shared logic (`broker.ts`, Dart port with the same fixtures), rules (a broker's leads, viewings, contracts and log are private to that broker; owners and admins of the organization can read them; the log is create-only with the server's time and can never be edited or deleted; lead status only moves forward or to lost), web workspace (a broker-only account lands on it; an owner who is also a broker gets a tab) with Playwright e2e, Flutter screens with widget tests. Gaps: the proof file is not a server-generated PDF; the ad checker follows the mandatory ad data as we understand it and must be re-checked against REGA's current published requirements before launch; leads and viewings cannot be edited (only status/notes on a lead); no import of contacts; Flutter broker screens have not run on a device yet.

## Phase 8 — Real-estate AI

- [x] Genkit in Functions (me-central2), provider interface, Arabic prompts, scope classifier first, rate limits, monthly cost cap, metadata logging
- [x] Features: (a) explain lease (b) compare inspections (c) ticket triage (d) ad helper (e) building summary (f) in-app assistant w/ citations (g) indicative prices import pipeline
- [x] AI output visually marked; no record change without human tap
- [x] Eval suite ≥ 30 Arabic prompts (off-topic, jailbreaks refused; legal/valuation get disclaimer)

Acceptance: eval suite passes; no model key reachable from clients.

**Status (2026-10-12): built with a cost-free FAKE model; no real model is connected.** Genkit 1.42 flows (one per feature) sit behind one provider interface; `AI_PROVIDER` defaults to `fake`, which only passes the computed facts through, so the whole product works end to end and tests are stable. Order of checks on every request: sign-in and org membership, input shape, scope classifier (jailbreaks refused first, then off-topic), the data the person may see (checked in the function, since the Admin SDK bypasses rules), the daily limit (30 per person) and the monthly organization cap, then the model; metadata only is logged (never the message or the answer). Legal, valuation and financial questions carry a disclaimer. Suggestions (ticket category, ad description) change a form only when the person taps. Web: assistant tab (staff and tenants), triage and ad-description suggestions; Flutter: assistant screen. Tests: 46 eval prompts, 17 integration tests, rules for usage/log/insights. Gaps: connecting a real provider needs your decision and a key in Secret Manager (one new class in `provider.ts`, no flow changes); "compare photos" compares the recorded conditions of two inspections, not the images (that needs a vision model); the indicative-prices import has a callable but no admin screen and no automatic feed; scope classifier is keyword-based and must be re-evaluated with a real model; monthly cost is estimated from characters until the provider reports tokens; Flutter assistant has not run on a device.

## Phase 9 — AI engineering office (المكتب الهندسي الذكي)

Full spec: `docs/ENGINEERING_OFFICE.md` (CLAUDE.md Module 14, §5b, §7). Not started. Needs your decisions first: Cloud Run/Tasks +
Python services (stack change), SBC text licence, licensed furniture library, image-generation model for renders. Build in
slices, each with its own tests and a user check:

- [ ] 9a Offices, engineers, roles: office/engineer profiles, admin verification, discipline-scoped approval, SCE expiry pause; rules tests per role
- [ ] 9b Brief intake: plot/zoning/program zod schemas, brief agent (asks only for missing items), human confirmation
- [ ] 9c SBC rule engine: versioned rule packs, checked/passed/failed/NOT CHECKED report, ≥ 1 pass + 1 fail fixture per rule; zoning reported separately
- [ ] 9d Layout engine (Cloud Run) + 3–6 options + golden tests (5 briefs) + web plan editor with live checks
- [ ] 9e 3D model (glTF/IFC) per plan, empty/furnished and model/AI-render toggles, sun study, massing on the Rasikh map; web + Flutter viewer
- [ ] 9f Drawing set and exports (PDF, DXF, IFC4, glTF), draft watermark, title block, Balady permit checklist
- [ ] 9g Discipline agents (structural, mechanical, electrical, industrial), shared model, clash detection, BOQ and schedule
- [ ] 9h Workflow: queued jobs, versions/redlines, approval with SHA-256, release to Property Health Record, quotes/invoices (no payments)
- [ ] 9i Precedent library + RAG with citations, office private library, opt-in only
- [ ] 9j Renovation/restoration: existing-building intake, condition assessment, existing-structure rule pack, existing/demolish/new set, heritage flag

Acceptance: see "Acceptance" in `docs/ENGINEERING_OFFICE.md` (rules isolation, draft watermark, clash, renovation case, 3D updates within seconds).

## Phase 10 — Polish, security, launch

- [ ] Design QA vs Najd Dusk; empty/error/loading states; Arabic errors; web/app consistency
- [ ] Security: rules review, App Check enforcement, ~~dependency audit~~, ~~secret scan~~, rate limits, scheduled Firestore backup. Done 2026-10-12: dependency audit (grpc-js and uuid pinned to patched versions through `pnpm-workspace.yaml` overrides; 11 advisories remain, all OpenTelemetry packages inside Genkit on the server, unused because telemetry is off; re-check when Genkit updates; forcing newer OpenTelemetry versions broke Genkit's tracing at load time, so it was reverted) and secret scan (no keys in tracked files; the only match is the fake emulator-only API key in `apps/mobile/lib/main.dart`). Still to do: rules review pass, App Check enforcement (needs your Firebase console step), scheduled backup (needs Blaze), AI rate limits already exist.
- [ ] Performance: Lighthouse, bundle analysis, Flutter profiling
- [x] Arabic legal pages: privacy (PDPL), terms, disclaimers (web, ar + en, linked from the landing footer; each says it is a DRAFT awaiting lawyer review; contact address `privacy@rasikh.sa` is a placeholder). PDPL rights: `exportMyData` and `deleteMyAccount` functions (recent sign-in required; the sole owner of an organization with members must hand it over first) with a "My privacy" panel on web (email accounts re-enter the password; phone accounts are told to contact us). Not yet in the Flutter app.
- [ ] Crashlytics + privacy-respecting analytics
- [ ] Store readiness + web SEO
- [ ] Staging then production deploy (with confirmation); final report: shipped, gaps, monthly cost drivers

## Pre-launch checklist (user-owned)

- [ ] SAIP trademark search · [ ] rasikh.sa / .com / .app · [ ] App Store / Play name · [ ] X / Instagram / TikTok / Snapchat handles
- [ ] Two Firebase projects on Blaze, me-central2 · [ ] Mapbox restricted token · [ ] (opt) Google Maps key
- [ ] Vertex AI enabled (or Claude key) · [ ] Apple + Google Play accounts · [ ] Domain + GitHub
- [ ] Budget alerts (Google Cloud, Mapbox) · [ ] Lawyer review of privacy policy + terms
