# CLAUDE.md — Rasikh · راسخ (project memory)

Read this before every task. It is the source of truth; PLAN.md tracks progress.

## 1. Product

Rasikh is an Arabic-first website + mobile app for running rental property in Saudi Arabia.
It COMPLEMENTS the government Ejar platform: it never replaces Ejar contracts, Ejar deposit holding,
or Ejar's official handover form. Core promise: "documentation that prevents disputes, from move-in
day to move-out day, in one property record."

- Brand: Rasikh / راسخ = "firmly rooted". Tagline ar: "عقارك على أرض ثابتة"; en: "Your property, on solid ground."
- Mark: three stacked Najdi shurfa triangles forming a solid base + wordmark (Reem Kufi / Fraunces).
- Roles (one account may hold several): Owner (1–50 units), Tenant, Building/owners-association manager,
  Licensed broker (stores and shows REGA FAL license no.), Inspector/Vendor, Admin.

### Modules

1. Portfolio & 3D map — properties, buildings, units.
2. Leases & payment ledger — lease records referencing the Ejar contract number, schedule, reminders,
   receipt uploads. We RECORD payments; we never process, lend, or finance rent.
3. Guided inspections — move-in/move-out, room-by-room, photos/video with capture timestamp + SHA-256 + GPS,
   two-party sign-off, comparison PDF ready to attach in Ejar.
4. Property Health Record (سجل العقار) — timeline of every event; transferable to a new owner with consent.
5. Maintenance — tickets, photos, category, urgency, suggested responsibility (consumable → tenant,
   basic/structural → owner, per Ejar guidance), vendor assignment, SLA timer.
6. Buildings & owners associations — shared expenses (each with receipt), balances visible to all owners,
   vendor quote comparison, votes. Copy: we complement the official Mullak platform; never claim official registration.
7. Broker CRM — leads, viewings, immutable timestamped activity log, ad-compliance checker (REGA mandatory ad data).
8. Insights — neighborhood rent/sale indicators from official open data (always "indicative"); Riyadh rent-freeze
   helper (no annual increase on Riyadh contracts for 5 years from 2025-09-25; renewal notice 60 days before expiry).
9. AI assistant restricted to real-estate tasks inside the product (see §7).
10. AI engineering office (المكتب الهندسي الذكي) — a 24/7 design copilot FOR licensed engineering offices. Each office
    has its own private AI workspace. A client brief (plot dimensions, area, program, style) becomes concept floor plans,
    Saudi Building Code checks from a deterministic rule engine, a drawing set (PDF, DXF, IFC, glTF), preliminary
    structural/MEP schematics, a BOQ range and a Balady permit checklist. Every output is a draft until a verified
    SCE-licensed engineer of that office approves it; Rasikh never stamps drawings or submits permits. Covers new builds
    AND renovation/restoration of existing buildings, through five discipline agents working as one office:
    architectural, civil/structural, mechanical, electrical, industrial. Full spec: `docs/ENGINEERING_OFFICE.md`.

### Out of scope at launch (feature-flagged OFF; must not ship enabled)

Public listings marketplace or public booking (needs REGA platform / tourism license), lending/BNPL/rent
financing, legal opinions, official valuations, stamping or approving drawings in an engineer's name, submitting Balady
permit applications, and final structural or fire-safety design without a licensed engineer's review.

## 2. Tech stack

Verify latest stable versions in official docs before installing; never guess APIs.

- Monorepo: pnpm workspaces + Turborepo.
- apps/web: Next.js (App Router, TS strict), Tailwind, Radix primitives styled with our tokens, GSAP or Framer Motion,
  Mapbox GL JS v3, Google Maps JS Map3DElement (optional), next-intl (ar default, en). Firebase App Hosting.
- apps/mobile: Flutter (latest stable), Riverpod, go_router, FlutterFire (Auth, Firestore, Storage, Functions,
  Messaging, Crashlytics, App Check), mapbox_maps_flutter (Standard), ARB localization (ar default).
- firebase/: Cloud Functions 2nd gen (TS) in me-central2; Genkit for every AI flow; Firestore + Storage in me-central2;
  rules, indexes, Emulator Suite config.
- packages/shared: domain types + zod schemas + enums; JSON Schema → Dart models (freezed/json_serializable).
- packages/design-tokens: one tokens JSON → CSS variables/Tailwind theme AND Flutter ThemeExtension.
- Use official Firebase agent skills if available.
- Data residency: all user data in me-central2. If App Hosting lacks me-central2, use the nearest supported region,
  keep the web server stateless, never log personal data there, and record the choice below.

**Recorded decisions** (update here):

- App Hosting region: _UNVERIFIED._ The official locations page could not be fetched; the region list is shown by `firebase apphosting:backends:create`. Decide at first deploy, then record here. Web server stays stateless, no personal data logged.
- Local dev: Firebase emulators run against demo project `demo-rasikh`. Real dev project: `rasikh-eca19` (Spark; needs Blaze before Functions deploy). Console state (2026-10-12): Firestore database `(default)` created in **me-central2 (Dammam)**, Standard edition, production mode (deny all until rules are deployed); Authentication started with **Email/Password** enabled (Phone needs Blaze); web app "Rasikh Web" registered, its public config kept in the gitignored `apps/web/.env.production.local`; Storage not set up (needs Blaze); Firestore rules and indexes deployed on 2026-10-12 (free, Spark); Functions and Storage are not deployed (they need Blaze).
- Windows dev quirks: Java emulators need an ASCII project path (use the `C:\dev\rasikh` junction); `@swc/core` needs `SWC_NATIVE_BINDING_CACHE` pointing to a user-only directory; start the emulators with `FUNCTIONS_DISCOVERY_TIMEOUT=90` (a cold load of the functions bundle can exceed the default 10 s and then no function is served).
- Stack versions verified 2026-10-11: Next 16.4 (uses `proxy.ts`, not `middleware.ts`), React 19.3, Tailwind 4.3, next-intl 4.14, zod 4.6, firebase JS 13, firebase-functions 7.4, Flutter 3.47.7 / Dart 3.13.5.

## 3. Design system — "Najd Dusk" (quiet luxury)

Principles: restraint over density; one oversized image or map per screen; editorial typography; ONE brand color;
motion guides, never decorates; mobile first; speed is part of design.
Avoid: shiny gold, heavy gradients, stock-photo families, more than one glass layer per screen, generic admin templates.

Colors: night #0E0D0B · charcoal #1A1815 · sand #F4EEE4 · stone #8C8478 · najdi-clay #B5532C (brand) ·
clay-light #D9825A (clay on dark) · success #4F7A5A · warning #C08A2E · danger #A63D32.
Check WCAG 2.2 AA for every text/background pair; adjust lightness if needed; record final values in the tokens file.
(Note: stone on sand and clay on night/sand need explicit checks — likely fail for small text.)

Type: Arabic display Reem Kufi (large only); Arabic UI/body IBM Plex Sans Arabic; Latin display Fraunces;
Latin body IBM Plex Sans. Scale px (DGA Platforms Code): 72/60/36/30/20/16/14/12 (d1/d2/h1/h2/h3/body/small/caption);
UI face weights 400/500/600/700. Arabic line-height 1.6–1.8. Tabular numerals in tables.
Latin digits by default, setting for Arabic-Indic digits.

Spacing 4-pt grid. Radius 4/8/16/28. Hairline borders (1px stone @ 20–30%). Almost no shadows.
Motion: cubic-bezier(0.16,1,0.3,1); 200/400/700 ms; map camera ~2.5 s; honor reduced motion.

Glass (Liquid Glass-inspired): ONLY for controls floating over the map (search bar, filter sheet, property peek card,
mobile bottom dock): backdrop blur + subtle tint + 1px inner highlight; adapts light/dark; solid fallback when blur is
unsupported or reduce-transparency is on. One glass layer per screen.

Signature elements: (a) Najdi arch mask on hero property images; (b) shurfa crenellation as thin dividers + loading
indicator; (c) Property Health Record vertical timeline with clay nodes; (d) landing hero = full-bleed 3D Riyadh at dusk,
slow orbit, one headline, scroll moves the camera; (e) brand mark; (f) portfolio twin on the workspace overview: the
owner's own properties as Najdi mud-brick buildings at dusk (three.js, `lib/scene/PortfolioTwin.ts`), one floor cell
per unit with its window lit in the payment status (ok / soon / late / vacant), drag to orbit, click a unit for its card;
a flat block fallback without WebGL or in automated browsers, and a screen-reader list of the same data.
Radix primitives must get `dir` from the locale (Tabs and Select default to ltr).

DGA conformance (design.dga.gov.sa Platforms Code, followed with our own brand): container max 1280px with 16/32px
gutters (`.rk-container`), breakpoints 600/960/1280, 44px touch targets, one site shell for every page
(`components/shell`: header with current-page state, search dialog, language, theme, sign-in or account menu, mobile
drawer; footer with grouped links, accessibility tools for text size and contrast, legal line; skip link; breadcrumbs),
and the DGA templates: about, help + FAQ, contact form with an error summary, sitemap, search, accessibility statement,
404, cookie notice (essential storage only), and "was this page helpful?" on content pages. The information
architecture lives in `lib/nav.ts`; workspace access by role in `lib/roles.ts`. Rasikh is private: never show the
government digital stamp or an "official government site" banner.

Modes: dark default on map screens; light "sand" editorial on content pages; user override.
RTL first: logical CSS properties only, mirrored directional icons, Hijri + Gregorian dates, SAR formatting.

## 4. Maps

- The map covers the whole Kingdom (`/map`): it arrives from the globe onto Saudi Arabia, shows a pin per city (all 13
  region capitals plus the main cities, `lib/map/kingdom.ts`), and flies into a city at ~58°. Owners see their own
  properties: at the exact pin when set (from the phone while at the property, or by clicking on the map), otherwise
  near their city; everyone else sees labelled samples. Pins must fall inside a box around the Kingdom (schema + rules).
- Mapbox Standard (web + app). lightPreset follows Riyadh local time (dawn/day/dusk/night); marketing pages fixed to dusk.
  Hide most POI labels. Neighborhood indicators in the "middle" slot (under 3D buildings). User properties = clay
  extrusions/markers with soft glow. Select property → flyTo, pitch ~60°.
- Web only, optional, feature-flagged: Google Photorealistic 3D (Map3DElement) flyover on property page. Check coverage
  first; fall back to Mapbox. No Flutter dependency on Google 3D Maps (mobile SDKs experimental, native only).
- Performance: 60 fps target on mid-range phones, clustering, lazy-loaded map bundles, 2D fallback without WebGL.
- Restrict every key/token by domain or bundle ID. Never commit secrets (.env + Secret Manager).

## 5. Data & security

- Auth: Firebase Auth phone OTP (+966) and email. Roles in custom claims, set only by Functions.
- The Rasikh team is not an organization role: a `platformAdmin` custom claim set only with the Admin SDK
  (`firebase/functions/scripts/set-platform-admin.mjs`) opens `/admin`, the inbox of public contact messages and page
  ratings (read, mark answered, delete after answering). Functions that write claims keep the existing ones.
- Multi-tenant by organization: orgs/{orgId}/...
- Firestore rules deny by default; every read/write checks org membership + role; emulator unit tests.
- Inspection media write-once after sign-off; SHA-256 + capture metadata in Firestore.
- Audit log for sensitive actions. App Check on web and mobile.
- Saudi PDPL: explicit consent screens, purpose-limited data, export/delete my data, Arabic privacy policy page.

### 5b. Roles & permissions (engineering office; deny by default, emulator test per role)

- Engineering office: own workspace, projects, briefs sent to it and its private precedent library; runs AI concepts and
  checks, edits plans, manages its team, releases final sets. Can approve nothing until an admin verifies CR, SCE
  classification and Balady activation.
- Engineer: projects assigned by their office; edits and reviews; approves only in own discipline; access pauses when
  SCE membership expires or they leave the office.
- Design client (owner): own briefs, concept options and released versions; submits briefs, picks options, comments.
  Never sees drafts under internal review or other clients' projects.

## 6. Quality bar

- Landing Lighthouse ≥ 90 mobile, LCP < 2.5 s, AVIF images. WCAG 2.2 AA, Arabic screen-reader labels.
- Tests: unit (shared + functions), security-rules, Playwright e2e (web), Flutter widget + integration.
- GitHub Actions CI on every PR: lint, typecheck, test, build.
- Every phase ends with: run all tests, screenshots of new screens (web desktop + mobile width, app iOS + Android),
  and a list of known gaps.

## 7. AI rules

- AI runs only server-side in Genkit flows inside Cloud Functions (me-central2). No model keys in clients.
- Scope: real-estate tasks inside this product only. A classifier step first rejects anything else with a polite Arabic message.
- Provider configurable behind one interface (Gemini via Vertex AI default; Claude optional).
- Never give legal rulings, official valuations or financial advice; short disclaimer + suggest a licensed professional.
- Use only data the requesting user may see (fetch with their permissions).
- Log metadata, not raw personal data; per-user rate limits; monthly cost cap; a human confirms before any AI suggestion
  changes a record; AI output is visually marked.
- Engineering AI: only the versioned SBC rule engine decides compliance; the model explains results and never marks an
  unchecked rule as passed. Drawings stay watermarked drafts until a verified engineer of the right discipline approves
  them.

## 8. Working rules

- Plan first, small reviewable steps, commit after each step.
- Check current official docs before using any SDK; if this brief is outdated, say so and propose a fix.
- Ask before adding any paid service or changing the stack.
- No hard-coded UI strings; use translation files.
- Keep CHANGELOG.md; tick PLAN.md checkboxes as phases complete.
- Never put keys in code or prompts; ask for them and store in .env (gitignored) or Secret Manager.
- Do not deploy anything without explicit confirmation.
- Compliance copy: never market Rasikh as replacing Ejar or Mullak; have a lawyer review privacy policy and terms (PDPL).
