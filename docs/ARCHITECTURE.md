# Software Architecture Document: Rasikh

| Field   | Value                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| Version | 1.0 (2026-10-17)                                                                                                    |
| Method  | C4 model (context, containers, components) plus architecture decisions                                              |
| Related | [DIAGRAMS](DIAGRAMS.md) (every diagram, also as SVG) · [SRS](SRS.md) · [DATA-MODEL](DATA-MODEL.md) · [API](API.md) · [SECURITY](SECURITY.md) · [OPERATIONS](OPERATIONS.md) |

## 1. Architectural drivers

The design is driven by a small number of constraints that outrank convenience:

| Driver                       | Consequence                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Data residency (PDPL)        | Firestore, Storage and Functions in `me-central2`; a stateless web tier that logs no personal data.              |
| Trust in evidence            | Hash at capture, write-once storage, server re-verification before sealing; ledgers are append-only.             |
| Compliance cannot be guessed | A deterministic, versioned rule engine decides; a model may only explain. Unverified rules stay "not checked".   |
| Multi-tenancy                | Everything under `orgs/{orgId}`; deny-by-default rules; roles only in custom claims set by the server.           |
| Arabic first, accessible     | RTL logical CSS, AA contrast in tokens, reduced motion, DGA shell and page templates.                            |
| Cost discipline              | Free tier and emulators for development; AI behind one interface with a cost cap; no paid service without a yes. |
| One truth for rules          | `packages/shared` holds domain logic and the engineering engine; web, functions and (ported) app agree.          |

## 2. System context (C4 level 1)

```
              ┌──────────── people ────────────┐
              │ owner · tenant · vendor · broker │
              │ manager · office lead · engineer │
              │ design client · Rasikh team      │
              └────────────────┬────────────────┘
                               ▼
                    ┌────────────────────┐        no integration (no public API):
                    │       Rasikh        │        Ejar · Mullak · Balady · Amanat
                    └──┬────┬────┬────┬───┘
        Firebase ◄─────┘    │    │    └────► Google Maps Platform (optional 3D view)
   (Auth, Firestore,        │    └─────────► model provider (local engine today)
    Storage, Functions,     └──────────────► Mapbox (map) · OpenStreetMap data
    Messaging, App Check)
```

## 3. Containers (C4 level 2)

| Container       | Technology                                                                                     | Responsibility                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app         | Next.js 16 App Router, TypeScript strict, Tailwind 4, Radix, next-intl, three.js, Mapbox GL v3 | All three sections, public site, admin; server components for public pages, client components for workspaces.                                       |
| Mobile app      | Flutter 3.47, Riverpod, go_router, FlutterFire, ARB                                            | Property management flows with camera and offline queue; domain ported to Dart.                                                                     |
| Cloud Functions | Node 22, TypeScript, 2nd gen, Genkit, zod                                                      | Privileged operations: organization creation and claims, invitations, inspection sealing, tickets, AI, data export and delete, scheduled reminders. |
| Firestore       | Native mode, `me-central2`                                                                     | System of record; rules are the primary authorization layer.                                                                                        |
| Cloud Storage   | `me-central2`                                                                                  | Receipts, inspection evidence, ticket photos; write-once.                                                                                           |
| Shared package  | `packages/shared`, zod 4, Vitest                                                               | Domain logic, schemas, the engineering engine (layout, rules, options, sheets, knowledge).                                                          |
| Design tokens   | `packages/design-tokens`                                                                       | One JSON to CSS variables, Tailwind theme and a Flutter ThemeExtension.                                                                             |
| Emulator Suite  | Firebase CLI, demo project `demo-rasikh`                                                       | Local development and every automated test; no cloud account needed.                                                                                |

### 3.1 Why the engine runs in the browser

The engineering engine is a pure TypeScript library (`packages/shared/src/engineering`). It runs in the browser (instant feedback, no server cost, works offline once loaded) and in tests, and the same code can run in a Cloud Function when an office wants a job queue. Determinism is a feature: the same brief gives the same options, so approvals can bind to a SHA-256 of an exact version.

## 4. Components of the web app (C4 level 3)

```
apps/web/src
├── app/[locale]/…            routes: landing, sections/[section], map, workspace, design, admin, legal pages
├── components/
│   ├── shell/                header, footer, search, breadcrumbs, content template (DGA)
│   ├── ops/ inspect/ maint/ building/ broker/ ai/      property-management and broker workspaces
│   ├── eng/                  engineering office: DesignHome, BriefPanel, ConceptsPanel, PlanView, Model3D,
│   │   └── sheets/           Frame (title block), Elevation (4 looks), Thermal, Structural, Levels, symbols
│   ├── map/                  MapView (Mapbox), houseLayer (three.js custom layer), GoogleEarthView
│   └── ui/                   tokens-based primitives (Button, Dialog, Tabs, Select …)
├── lib/                      firebase client, hooks, roles (accessFor), nav (information architecture),
│   └── eng/ map/ scene/      model3d + textures, kingdom data, houses, portfolio twin
└── messages/                 ar.json, en.json
```

### 4.1 The engineering engine (shared package)

| Module                                                     | Role                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `brief.ts`                                                 | Reads a client's free text into a programme (plot, rooms, floors, type, style, budget) and reads it back.            |
| `catalog.ts`                                               | 88 property types, land uses, which type is allowed on which land use, unit and hall profiles.                       |
| `regulations.ts`                                           | The Ministry's unified residential requirements with clauses; turns them into a plot's zoning.                       |
| `layout.ts`                                                | Generates a plan from a variant: bands, courtyard, side-court, terrace, pavilion; roof annex.                        |
| `options.ts`, `styles.ts`, `library.ts`                    | Search over ~1,700 variants, farthest-first selection of 6 to 12; style fit ranking; learning from the library.      |
| `rules.ts`                                                 | Zoning and code rules with versioned parameters; `not_checked` until an engineer verifies them.                      |
| `openings.ts`, `site.ts`, `geometry.ts`                    | Doors and windows, parking and pool, outside walls from the rooms themselves.                                        |
| `disciplines.ts`, `structcalc.ts`, `mep.ts`, `envelope.ts` | Preliminary structural scheme and calculation, cooling, electrical and plumbing numbers, symbols, thermal build-ups. |
| `sheetset.ts`, `exports.ts`, `permit.ts`                   | The drawing set catalogue and numbering, DXF and IFC writers, the permit checklist.                                  |
| `workflow.ts`                                              | Statuses, approval blocks, release rule (all required disciplines, same hash).                                       |
| `knowledge.ts` (in `packages/shared`)                      | Design practice notes and product guidance with their basis; powers notes and the assistant.                         |

## 5. Key runtime flows

### 5.1 Signing an inspection

1. The owner side captures evidence in-app (hash, time, GPS) into Storage under `orgs/{org}/inspections/…` (create-only).
2. `signInspection` (callable) checks membership and role, requires `auth_time` to be recent (fresh sign-in), downloads each file and recomputes its SHA-256 against Firestore.
3. A mismatch refuses the signature; a match records the signature. The second signature seals the record with a content digest; after that rules deny all edits.

### 5.2 Engineering: brief to release

```
client ─ brief ─► project (status brief)
office ─ accept, enter zoning (Ministry values + height) ─► accepted
office ─ run search (browser) ─► versions + BOQ + check summary ─► concepts
client ─ picks ─► picked ─► office develops (edits re-run checks) ─► review
each engineer ─ approve(discipline, sha256 of version) ─► approvals/{discipline}
lead ─ release (all required approved same hash) ─► released
client ─ hand-off ─► orgs/{org}/designs/{project} ─► Property Health Record
```

Rules enforce each step (who may write which status, that only verified engineers of the right discipline approve, that a client sees only shared options and released versions).

### 5.3 The assistant

`aiAssist` checks sign-in and membership, validates input with zod, runs the scope classifier, gathers facts with the caller's permissions (and matching knowledge entries), reserves the daily and monthly budget in a transaction, then calls the Genkit flow behind `ModelProvider`. Only metadata is logged. The result is marked as AI output and never applied without a tap.

### 5.4 The map

Mapbox Standard (globe) with HTML pins per city, clustered property circles, indicator fills under the 3D buildings and a three.js custom layer that stands each property's building on its pin: `houses.ts` chooses the plan (released design, or a plausible building from the unit count), `houseLayer.ts` places it in Mercator space (x east, y south, z up) at true scale. Without a token or WebGL a flat schematic gives the same interactions.

## 6. Cross-cutting concerns

| Concern              | Approach                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization        | Rules first (membership plus role per document), Functions for privileged writes, claims written only by the server.                    |
| Validation           | zod schemas in `packages/shared`, reused by web forms, Functions and tests.                                                             |
| Internationalization | next-intl (web), ARB (app); document content that is bilingual by design (sheet title blocks, knowledge) lives in shared code.          |
| Observability        | Audit log for sensitive actions; AI metadata log; Crashlytics for the app; no personal data in server logs.                             |
| Error handling       | Callables throw `HttpsError` with stable codes (`auth_required`, `not_allowed`, `invalid_input`, `resource-exhausted`).                 |
| Configuration        | `.env.local` for public client keys, Secret Manager for server secrets, feature flags in `packages/shared`.                             |
| Testing              | Unit (shared, functions), security rules per role, Playwright with axe, Flutter widget and domain tests. See [TEST-PLAN](TEST-PLAN.md). |

## 7. Deployment view

Development: emulators on `demo-rasikh`. Target: one Firebase project (`rasikh-eca19`, Firestore in me-central2) with Functions in me-central2 and a hosted Next.js server (region decision recorded when deploying). Rules and indexes can deploy on the free Spark plan (done for Firestore on 2026-10-12 and refreshed for the engineering collections); Functions, Storage, phone OTP and hosting need Blaze. See [OPERATIONS](OPERATIONS.md).

## 8. Architecture decision records

| ADR | Decision                                                                             | Why                                                                                                    | Consequence                                                                 |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 001 | Firebase on `me-central2` as the backend.                                            | Managed auth, rules, emulators; data residency; small team.                                            | Vendor coupling; Blaze needed for Functions and Storage.                    |
| 002 | Rules as the first authorization layer, claims set only by Functions.                | Deny-by-default with testable per-role behaviour; clients cannot escalate.                             | Rules are complex; every role needs emulator tests.                         |
| 003 | Domain logic in a shared TypeScript package, ported to Dart with identical fixtures. | Web, server and app must agree on schedules, SLA, balances, digests.                                   | Two implementations to keep in step; fixtures guard it.                     |
| 004 | Deterministic rule engine decides compliance; the model only explains.               | A model must never mark an unchecked rule as passed; approvals bind to exact versions.                 | Slower to add rules; unverified rules stay "not checked" by design.         |
| 005 | Engineering engine in the browser, not a server job.                                 | Instant feedback, zero cost, deterministic, testable.                                                  | Heavy work on low-end devices; a worker or Cloud Run job is a later option. |
| 006 | One provider interface for AI; a free local engine by default.                       | No cost or keys while the product is validated; a real model is one class.                             | Free-form questions are limited until a model is chosen.                    |
| 007 | Sections as separate subscriptions with separate workspaces, free at launch.         | Different buyers, different data; billing can start per section without redesign.                      | A person needing two sections creates two workspaces.                       |
| 008 | Mapbox for the map; Google 3D only as an optional dialog.                            | Mapbox Standard fits the design system; Google's terms forbid mixing its imagery into other renderers. | Two map surfaces; the Google one needs a key and billing.                   |
| 009 | Real photographs only from free licences, credited; no scraping of any site.         | Copyright and confidentiality; the library is consent-based.                                           | Reference photos are curated, not exhaustive.                               |
| 010 | Printing through the browser to A3, sheet frame as DOM with print CSS.               | No server rendering cost; one sheet per page; vector output.                                           | Output quality depends on the browser's print engine.                       |
| 011 | Videos recorded from the real app with burned-in captions (Playwright).              | Always matches the product; reproducible with `pnpm videos`.                                           | No voice-over; must be re-recorded after UI changes.                        |
