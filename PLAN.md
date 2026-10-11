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

## Phase 4 — Owner rental operations

- [ ] Data model + zod + Dart: buildings, properties, units, leases (ejarContractNo…), schedule, payment records, expenses, documents
- [ ] Owner screens: overview, unit, lease, schedule, expenses, annual income/expense PDF (Arabic, branded)
- [ ] Reminders: scheduled Functions → FCM + email
- [ ] Riyadh rent-freeze helper + 60-day renewal-notice reminders
- [ ] Tenant screens: lease, schedule, receipts, raise ticket

Acceptance: rules tests for every new collection; e2e owner adds unit → lease → schedule → marks payment; tenant sees it.

## Phase 5 — Guided inspections + Property Health Record

- [ ] Templates per unit type (studio, apartment, villa)
- [ ] App capture: in-app camera only; time, GPS, device, SHA-256; offline-first queue with retry
- [ ] Two-party OTP sign-off; write-once afterwards
- [ ] Move-out comparison; human marks wear vs damage + cost; Arabic PDF for Ejar
- [ ] Health Record timeline fed by all modules; ownership transfer with consent
- [ ] Web: view inspections, timeline, PDFs

Acceptance: tampered-file hash test; offline capture test; Arabic PDF renders correctly (RTL, shaping, fonts).

## Phase 6 — Maintenance + buildings/associations

- [ ] Tickets: photos, category, urgency, suggested responsibility (suggestion only), vendor flow, SLA timer, rating
- [ ] Buildings: members/units, expense ledger (receipt required), balances, reminders, quote comparison, votes (majority/75%), monthly statement PDF
- [ ] Copy: complements Mullak; no official-registration claims

Acceptance: e2e ticket lifecycle and expense → statement; rules tests.

## Phase 7 — Broker CRM + ad compliance checker

- [ ] Broker profile: FAL no. + expiry reminders
- [ ] Leads, contacts, brokerage contracts, viewings, immutable server-timestamped log, proof-file PDF
- [ ] Ad compliance checker (no publishing): purpose, advertiser + capacity, ad license no./expiry, location, contact, description, price, disclosures; near-expiry warning

Acceptance: checker unit tests (valid + invalid ads); rules tests.

## Phase 8 — Real-estate AI

- [ ] Genkit in Functions (me-central2), provider interface, Arabic prompts, scope classifier first, rate limits, monthly cost cap, metadata logging
- [ ] Features: (a) explain lease (b) compare photos (c) ticket triage (d) ad helper (e) building summary (f) in-app assistant w/ citations (g) indicative prices import pipeline
- [ ] AI output visually marked; no record change without human tap
- [ ] Eval suite ≥ 30 Arabic prompts (off-topic, jailbreaks refused; legal/valuation get disclaimer)

Acceptance: eval suite passes; no model key reachable from clients.

## Phase 9 — Polish, security, launch

- [ ] Design QA vs Najd Dusk; empty/error/loading states; Arabic errors; web/app consistency
- [ ] Security: rules review, App Check enforcement, dependency audit, secret scan, rate limits, scheduled Firestore backup
- [ ] Performance: Lighthouse, bundle analysis, Flutter profiling
- [ ] Arabic legal pages: privacy (PDPL), terms, disclaimers
- [ ] Crashlytics + privacy-respecting analytics
- [ ] Store readiness + web SEO
- [ ] Staging then production deploy (with confirmation); final report: shipped, gaps, monthly cost drivers

## Pre-launch checklist (user-owned)

- [ ] SAIP trademark search · [ ] rasikh.sa / .com / .app · [ ] App Store / Play name · [ ] X / Instagram / TikTok / Snapchat handles
- [ ] Two Firebase projects on Blaze, me-central2 · [ ] Mapbox restricted token · [ ] (opt) Google Maps key
- [ ] Vertex AI enabled (or Claude key) · [ ] Apple + Google Play accounts · [ ] Domain + GitHub
- [ ] Budget alerts (Google Cloud, Mapbox) · [ ] Lawyer review of privacy policy + terms
