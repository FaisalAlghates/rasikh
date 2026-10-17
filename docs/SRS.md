# Software Requirements Specification: Rasikh (راسخ)

| Field    | Value                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document | SRS-RASIKH-001                                                                                                                                                  |
| Version  | 1.0 (baseline, 2026-10-17)                                                                                                                                      |
| Standard | Structured after ISO/IEC/IEEE 29148:2018 (supersedes IEEE 830)                                                                                                  |
| Status   | Baselined against the code at commit `5058fa1`; every requirement is traceable                                                                                  |
| Owner    | Product owner (Faisal Alghates)                                                                                                                                 |
| Audience | Product, engineering, QA, legal and compliance reviewers, licensed engineers                                                                                    |
| Related  | [ARCHITECTURE](ARCHITECTURE.md) · [DATA-MODEL](DATA-MODEL.md) · [API](API.md) · [SECURITY](SECURITY.md) · [TEST-PLAN](TEST-PLAN.md) · [CLAUDE.md](../CLAUDE.md) |

**ملخص تنفيذي (بالعربية).** راسخ منصة عربية أولاً لسوق العقار السعودي بثلاثة أقسام منفصلة (إدارة الأملاك، المكتب الهندسي الذكي، الوساطة العقارية). تحدد هذه الوثيقة ما يجب أن يفعله النظام وما لا يجوز له فعله، بمتطلبات مرقّمة قابلة للاختبار. أهم القيود: النظام **يكمّل** إيجار ومُلّاك ولا يحل محلهما؛ لا يعالج الإيجار ولا يموّله؛ لا يختم ولا يقدّم طلبات الرخص باسم مهندس؛ المطابقة للكود تقررها قواعد محسوبة لا الذكاء الاصطناعي؛ وكل مخرج هندسي مسودة حتى يعتمده مهندس مرخّص. البيانات في منطقة الدمام (`me-central2`).

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements of Rasikh so that product, engineering, QA and compliance share one testable definition of "done". It is the contract between the owner's intent (`CLAUDE.md`) and the implementation; where they disagree, `CLAUDE.md` wins and this document is corrected.

### 1.2 Scope

Rasikh is an Arabic-first web application and mobile application for the Saudi property market. It has three **sections**, each a separate subscription with its own workspace and data:

1. **Property management**: portfolio, leases and payment ledger, guided inspections, Property Health Record, maintenance, buildings and owners associations, an assistant.
2. **AI engineering office**: a design copilot for licensed engineering offices, from client brief to a code-checked, permit-style drawing set and bill of quantities, with engineer approval.
3. **Real estate brokerage**: licence reminders, leads, viewings, contracts, an immutable activity log and an ad compliance checker.

**Out of scope at launch** (feature-flagged off, must not ship enabled; FR-OUT-01): a public listings marketplace or public booking; lending, BNPL or rent financing; legal opinions; official valuations; stamping or approving drawings in an engineer's name; submitting Balady permit applications; final structural or fire-safety design without a licensed engineer's review. Rasikh never replaces an Ejar contract, the Ejar deposit or the official handover form, and never claims to be the Mullak platform.

### 1.3 Definitions, acronyms and abbreviations

| Term           | Meaning                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Ejar           | The government rental-contract platform. Rasikh references its contract numbers and never replaces it.          |
| Mullak         | The government owners-association platform. Rasikh complements it.                                              |
| REGA, FAL      | Real Estate General Authority; broker licence ("Fal").                                                          |
| SCE            | Saudi Council of Engineers. Engineer membership and office classification.                                      |
| Balady, Amanah | The municipal permit platform; a regional municipality (Amanah) whose planning requirements govern a plot.      |
| SBC            | Saudi Building Code. Rule text is licensed; unverified rules stay "not checked".                                |
| PDPL           | Saudi Personal Data Protection Law.                                                                             |
| DGA            | Digital Government Authority; its Platforms Code guides design and accessibility (conformity is not certified). |
| Section        | One of the three products an account subscribes to (`property`, `office`, `broker`).                            |
| Organization   | A tenant of the data model (`orgs/{orgId}`); one section per organization.                                      |
| Draft          | Any engineering output not yet approved by a verified engineer of the right discipline; carries a watermark.    |
| SHA-256 digest | The fingerprint of an evidence file or a design version; approvals and sign-offs bind to it.                    |
| SLA            | The time allowed to resolve a maintenance ticket by urgency.                                                    |
| BOQ            | Bill of quantities. Always an indicative range, never a quotation.                                              |

### 1.4 References

- `CLAUDE.md` (product rules, stack, design system, AI rules): the source of truth.
- `PLAN.md` (phases and known gaps); `REMAINING.md` (items that need the owner).
- `docs/ENGINEERING_OFFICE.md` (engineering office spec and implementation status).
- Ministry of Municipalities and Housing, unified residential requirements, decision 1/4500943139 (2024), transcribed with clauses in `packages/shared/src/engineering/regulations.ts`; to be verified by an engineer against the official PDF.
- Saudi PDPL and its implementing regulations; DGA Platforms Code (design.dga.gov.sa); WCAG 2.2.

### 1.5 Document conventions

Requirement identifiers are `FR-<MODULE>-<nn>` (functional), `NFR-<AREA>-<nn>` (non-functional), `IR-<nn>` (interfaces), `DR-<nn>` (data) and `CR-<nn>` (constraints). Keywords follow RFC 2119 (**shall** is mandatory, **should** is recommended, **may** is optional). Priority uses MoSCoW: **M**ust, **S**hould, **C**ould. Each requirement states how it is verified (see §6 and [TEST-PLAN](TEST-PLAN.md)). "Status" in §6 records whether the requirement is implemented in the baseline.

---

## 2. Overall description

### 2.1 Product perspective

Rasikh is a standalone, multi-tenant system. It complements government platforms and has **no integration** with Ejar, Mullak, Balady or the Amanat: no public interface exists, and the system records numbers and documents the user enters. External services it uses: Firebase (Auth, Firestore, Storage, Functions, Messaging, App Check, Hosting), Mapbox (map), OpenStreetMap data (through Mapbox), and optionally Google Maps Platform (photorealistic 3D view, off by default).

```
Users (web, mobile) ──► Next.js web / Flutter app ──► Firebase Auth · Firestore · Storage
                                    │                          ▲
                                    └──► Cloud Functions (me-central2) ── Genkit flows ──► model provider (fake today)
Mapbox GL ◄── web map     Google Maps JS API (optional)     Rasikh team ──► /admin
```

### 2.2 Product functions (summary)

Portfolio and Kingdom map; lease and payment records with reminders; guided inspections with hashed evidence and two-party sign-off; a property timeline; maintenance tickets with SLA; building finances and ballots; broker CRM with an immutable log and ad checker; a bounded real-estate assistant; the engineering office (brief reading, municipal requirements, option search, drawings, BOQ, approvals, release, hand-off); privacy rights; a public site with the DGA page templates; admin tools for the Rasikh team.

### 2.3 User classes and characteristics

| Class                      | Role keys                   | Technical level | Notes                                                                                     |
| -------------------------- | --------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| Property owner             | `owner`                     | Low             | 1 to 50 units; Arabic speaker; phone first.                                               |
| Building / association mgr | `manager`, `building_owner` | Low             | Shared finances; owners vote per unit.                                                    |
| Tenant                     | `tenant`                    | Low             | Joins by invitation; sees only their own lease and tickets.                               |
| Vendor / inspector         | `vendor`                    | Low             | Sees only assigned tickets.                                                               |
| Broker                     | `broker`                    | Medium          | REGA FAL licence holder.                                                                  |
| Engineering office lead    | `office_lead`               | High            | Releases sets, manages the team; cannot approve until verified.                           |
| Engineer                   | `engineer`                  | High            | Approves only their own discipline; access ends with SCE membership or office membership. |
| Design client              | `owner` (client of office)  | Low             | Submits briefs, picks options, sees released versions only.                               |
| Rasikh team                | `platformAdmin` claim       | High            | Verifies offices and engineers, keeps municipal requirements, answers public messages.    |

A person may hold several roles and belong to up to five organizations; the web works in one at a time.

### 2.4 Operating environment

Web: current evergreen browsers (Chrome, Edge, Safari, Firefox), responsive from 360 px, RTL and LTR. Mobile: Flutter 3.47 on iOS and Android. Server: Cloud Functions 2nd gen (Node 22, TypeScript), Firestore and Storage in `me-central2` (Dammam). Development: Firebase Emulator Suite against the demo project `demo-rasikh`.

### 2.5 Design and implementation constraints

- **CR-01** All user data shall be stored in `me-central2`. If Firebase App Hosting lacks that region, the nearest supported region may serve a stateless web server that logs no personal data (decision recorded in `CLAUDE.md`).
- **CR-02** AI shall run only server-side in Genkit flows behind one provider interface; no model keys in clients, code or prompts; secrets only in `.env` (gitignored) or Secret Manager.
- **CR-03** No paid service shall be added, and nothing shall be deployed, without the owner's explicit confirmation.
- **CR-04** Compliance copy shall never market Rasikh as replacing Ejar or Mullak; legal pages require lawyer review before launch.
- **CR-05** The user interface shall contain no hard-coded strings; text lives in translation files (`ar` default, `en`).
- **CR-06** Stack: pnpm workspaces and Turborepo; Next.js 16 App Router (TypeScript strict), Tailwind 4, Radix, three.js, Mapbox GL v3; Flutter 3.47 with Riverpod and go_router; zod 4 schemas shared by web and functions.

### 2.6 Assumptions and dependencies

Users have a smartphone or a modern browser and a reliable data connection (inspection capture queues offline). The Mapbox token and optional Google key are supplied by the owner. The Saudi Building Code text is licensed separately: until an office engineer enters verified parameters, code rules stay "not checked". Firebase Blaze is required to deploy Functions, Storage, phone OTP and hosting (a dependency owned by the owner).

---

## 3. Specific requirements: functional

### 3.1 Accounts, sections and organizations (AUTH, ORG)

| ID         | Requirement                                                                                                                                                      | Pri | Verification                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------- |
| FR-AUTH-01 | The system shall let a user sign up and sign in with email and password, and with a Saudi mobile number (`+9665XXXXXXXX`) by SMS code.                           | M   | e2e `auth-onboarding`; phone needs Blaze |
| FR-AUTH-02 | The system shall reject non-Saudi or malformed mobile numbers before any code is sent.                                                                           | M   | e2e `auth-onboarding`                    |
| FR-AUTH-03 | Signed-out visitors shall be redirected from signed-in pages to sign-in; signed-in and sign-in pages shall be `noindex`.                                         | M   | e2e `auth-onboarding`, `seo`             |
| FR-AUTH-04 | Sensitive actions (signing an inspection, deleting an account) shall require a fresh re-authentication.                                                          | M   | e2e `inspections`, `privacy-rights`      |
| FR-SEC-01  | The landing page shall present the three sections; choosing one shall open that section's own page (video, steps, what it offers and never does) before sign-up. | M   | e2e `sections`, `landing-and-lab`        |
| FR-SEC-02  | Onboarding shall offer only the roles of the chosen section (`SECTION_ROLES`), and `createOrganization` shall reject a role outside its section.                 | M   | unit `enums`, `organizations`; e2e       |
| FR-SEC-03  | Each section shall be a separate subscription; at launch every section is free (`LAUNCH_FREE`), and the organization stores `section` and `plan`.                | M   | unit `organizations`                     |
| FR-ORG-01  | `createOrganization` shall create the organization, add the caller as a member and write role claims, up to five organizations per account.                      | M   | unit `organizations`                     |
| FR-ORG-02  | Roles shall be held in custom claims set only by Cloud Functions or the Admin SDK; clients shall never write them.                                               | M   | rules `rules`                            |
| FR-ORG-03  | A person with several organizations shall switch between them from the account menu; the choice shall be remembered per device.                                  | S   | e2e `shell`                              |
| FR-ORG-04  | The workspace shall show only the sections allowed by the person's roles (`accessFor`); each workspace section shall have its own address and Back shall work.   | M   | e2e `shell`                              |

### 3.2 Portfolio, leases and payments (PROP, LEASE)

| ID          | Requirement                                                                                                                                                                                                                                               | Pri | Verification          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------- |
| FR-PROP-01  | Owners and managers shall create properties (city, district, kind), units, and optionally a precise map pin.                                                                                                                                              | M   | e2e `ops`, `map`      |
| FR-LEASE-01 | The system shall record a lease with the Ejar contract number, tenant name and email, start and end dates, annual rent, billing cycle, deposit note.                                                                                                      | M   | e2e `ops`             |
| FR-LEASE-02 | Saving a lease shall generate its payment schedule (e.g. 12 monthly instalments); a payment has status `due` or `paid`.                                                                                                                                   | M   | unit, e2e `ops`       |
| FR-LEASE-03 | Staff shall record a payment; tenants shall never record payments. Rasikh shall not collect, process or finance rent.                                                                                                                                     | M   | e2e `ops`             |
| FR-LEASE-04 | A tenant shall be invited by email; the invitation shall bind on first verified sign-in (`claimInvites`) and give access to their lease only.                                                                                                             | M   | e2e `ops`, `links`    |
| FR-LEASE-05 | Tenants shall upload a receipt per payment; staff shall see it; the file is write-once.                                                                                                                                                                   | M   | e2e `ops`, rules      |
| FR-LEASE-06 | For Riyadh renewals the system shall warn (never block) when the new rent exceeds the previous rent during the rent-freeze period (5 years from 2025-09-25), and shall remind of the renewal notice 60 days before expiry.                                | M   | unit `domain`; e2e    |
| FR-LEASE-07 | Reminders shall be computed on the device from the user's records, shown live on the overview, offered as browser notifications and a downloadable `.ics` calendar file with alarms; a scheduled function shall also send push reminders at 07:00 Riyadh. | S   | e2e `ops`; unit `ops` |
| FR-LEASE-08 | The system shall record expenses and produce an annual report (collected, expenses, net).                                                                                                                                                                 | M   | e2e `ops`             |

### 3.3 Guided inspections and Property Health Record (INSP, REC)

| ID         | Requirement                                                                                                                                                                                                     | Pri | Verification                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------- |
| FR-INSP-01 | Staff shall start a move-in or move-out inspection for a lease; the checklist is generated room by room from the number of bedrooms.                                                                            | M   | e2e `inspections`                |
| FR-INSP-02 | Evidence shall be captured only with the in-app camera (no file picker), stamped with capture time, GPS (when allowed) and the SHA-256 of the file.                                                             | M   | e2e `inspections`                |
| FR-INSP-03 | Evidence shall be uploadable offline with retry, and shall be write-once after sign-off (no overwrite, no delete).                                                                                              | M   | rules `rules-inspections`        |
| FR-INSP-04 | Signing shall be blocked until every item has an answer; each party signs after fresh re-authentication; the server re-verifies every file's digest before sealing; a tampered file shall refuse the signature. | M   | unit `inspections`; e2e          |
| FR-INSP-05 | Once both parties sign, the record is sealed with a content digest and cannot be edited by anyone; the tenant may add a comment before signing.                                                                 | M   | e2e `inspections`                |
| FR-INSP-06 | The system shall produce a comparison between move-in and move-out ready to attach in Ejar (it does not replace Ejar's official form).                                                                          | S   | e2e `inspections`                |
| FR-REC-01  | The Property Health Record shall show a vertical timeline of every event (leases, inspections, maintenance, approved designs) for a property.                                                                   | M   | e2e `inspections`, `engineering` |
| FR-REC-02  | A released engineering design shall be addable to a property's record by the person who commissioned it, bound to the set's SHA-256, never editable afterwards.                                                 | M   | rules `rules-office`; e2e        |
| FR-REC-03  | A record shall be transferable to a new owner with the current owner's consent. _(Known gap: not built.)_                                                                                                       | S   | none yet                         |

### 3.4 Maintenance (MNT)

| ID        | Requirement                                                                                                                                             | Pri | Verification      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------- |
| FR-MNT-01 | A tenant shall report a ticket with title, category, urgency and photos; the system shall start an SLA timer by urgency and show whether it is on time. | M   | e2e `maintenance` |
| FR-MNT-02 | The system shall suggest who bears the cost per Ejar guidance (consumables → tenant; basic and structural → owner) as a suggestion, not a ruling.       | M   | unit, e2e         |
| FR-MNT-03 | Staff shall assign a vendor, start, and resolve with a note; a vendor (own login) shall see only assigned tickets.                                      | M   | e2e `maintenance` |
| FR-MNT-04 | The tenant shall close the ticket with a rating (1 to 5) after resolution.                                                                              | S   | e2e `maintenance` |

### 3.5 Buildings and owners associations (BLD)

| ID        | Requirement                                                                                                                                                 | Pri | Verification    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------- |
| FR-BLD-01 | Staff shall create a building and add owners with their unit and share of expenses (%).                                                                     | M   | e2e `buildings` |
| FR-BLD-02 | A shared expense shall require a receipt; the ledger is create-only and append-only; each owner's balance (due, paid, remaining) is visible to every owner. | M   | e2e, rules      |
| FR-BLD-03 | The system shall compare vendor quotes, cheapest first, with the difference of the others.                                                                  | S   | e2e `buildings` |
| FR-BLD-04 | A vote shall allow one ballot per unit; the result (majority) shall be computed and shown; ballots are append-only.                                         | M   | e2e, rules      |
| FR-BLD-05 | The system shall produce a monthly statement. Copy shall say Rasikh complements Mullak and shall never claim official registration.                         | S   | e2e `buildings` |

### 3.6 Broker CRM (BRK)

| ID        | Requirement                                                                                                                                                                                            | Pri | Verification       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------------ |
| FR-BRK-01 | A broker shall store the REGA FAL licence number and expiry, and be reminded before expiry.                                                                                                            | M   | e2e `broker`       |
| FR-BRK-02 | Leads shall carry a Saudi phone number and move forward only through the funnel (never backward).                                                                                                      | M   | e2e `broker`       |
| FR-BRK-03 | The broker shall schedule viewings with place and time and record the outcome, and record brokerage contracts.                                                                                         | M   | e2e `broker`       |
| FR-BRK-04 | Every action shall append an entry to a server-timestamped activity log that offers no edit and no delete.                                                                                             | M   | e2e, rules         |
| FR-BRK-05 | An ad compliance checker shall list the mandatory REGA ad data still missing (licence, ad licence number and expiry, advertiser, area, price, etc.) and block "ready" while any is missing or expired. | M   | e2e `broker`; unit |

### 3.7 Assistant and AI services (AI)

| ID       | Requirement                                                                                                                                                                                                      | Pri | Verification                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------- |
| FR-AI-01 | Every AI feature shall run server-side in a Genkit flow behind one provider interface (`ModelProvider`); the default provider is a free local engine; a real model is a drop-in class.                           | M   | unit `ai`                   |
| FR-AI-02 | Before any model call a scope classifier shall refuse anything outside real estate and any jailbreak, with a polite Arabic message.                                                                              | M   | unit `ai-eval` (46 prompts) |
| FR-AI-03 | The assistant shall use only data the requesting user may see (it fetches with their permissions) and shall answer product questions from the knowledge base; unknown questions get an honest "no ready answer". | M   | unit `ai`; e2e `assistant`  |
| FR-AI-04 | Output shall be visibly marked as AI-made, carry disclaimers for legal, valuation and financial topics, and never change a record without a user's tap.                                                          | M   | e2e `assistant`             |
| FR-AI-05 | The system shall enforce a per-person daily limit (30) and a monthly organization cost cap, logging metadata only (never the message or the answer).                                                             | M   | unit `ai`, rules `rules-ai` |
| FR-AI-06 | The assistant shall give no legal ruling, official valuation or financial advice; it shall suggest a licensed professional.                                                                                      | M   | unit `ai-eval`              |

### 3.8 AI engineering office (ENG)

| ID        | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                      | Pri | Verification                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------- |
| FR-ENG-01 | An engineering office shall register with commercial register, SCE classification, Balady activation, disciplines and cities, and shall be unable to approve anything until the Rasikh team verifies it.                                                                                                                                                                                                                         | M   | e2e `engineering`, rules `rules-office` |
| FR-ENG-02 | Each engineer shall have a profile (SCE number, discipline, expiry); the team verifies it; approval is blocked when membership expires or the engineer leaves the office.                                                                                                                                                                                                                                                        | M   | unit `engineering`, rules               |
| FR-ENG-03 | A client shall submit a brief in their own words; the system shall read plot dimensions, programme (rooms, floors, extras), type, style and budget and read them back for confirmation.                                                                                                                                                                                                                                          | M   | unit `engineering`; e2e                 |
| FR-ENG-04 | The system shall apply the Ministry of Municipalities and Housing's requirements to the plot (setbacks, coverage, floors, annex, parking) with their clauses; Amanah-specific requirements are kept by the Rasikh team with their source. Values the local plan sets (height) shall be confirmed by the office.                                                                                                                  | M   | unit `regulations`; e2e                 |
| FR-ENG-05 | The system shall offer 6 to 12 genuinely different options for a brief, each holding every requested room, every zoning rule and every automatic code rule, each with a bill of quantities; if nothing passes it shall explain the most frequent reasons instead of offering a non-compliant design.                                                                                                                             | M   | unit `options`; e2e                     |
| FR-ENG-06 | The system shall support four design languages (Najdi, modern, Swiss, palace) that rank suitable layouts, change façades, windows and the 3D model, and always fit the plot.                                                                                                                                                                                                                                                     | M   | unit `styles`, `model3d`; e2e `styles`  |
| FR-ENG-07 | Building-code rules shall be decided only by the versioned rule engine; a rule whose parameters no office engineer has verified shall stay "not checked"; the model shall only explain results.                                                                                                                                                                                                                                  | M   | unit `engineering`                      |
| FR-ENG-08 | The system shall produce a consultant-style drawing set: framed A3 sheets coded by discipline (`AR`, `ST`, `EL`, `ME`, `FS`) with an Arabic and English title block, a stamp area, axis bubbles and level marks; the sheets follow the project's required disciplines.                                                                                                                                                           | M   | unit `sheetset`; e2e `engineering`      |
| FR-ENG-09 | The architectural set shall include site, plans per floor, elevations, sections, levels, thermal insulation (R = t/k, U = 1/ΣR, no compliance claim), accessibility, door and window schedules and areas; the structural set shall include notes, axes and columns, slab and beam layout, column schedule and a preliminary calculation summary; electrical, mechanical and fire and safety plans per floor with symbol legends. | M   | unit; e2e                               |
| FR-ENG-10 | The set shall print to A3 landscape, one sheet per page, with only the sheets on paper, and export DXF, IFC and glTF; every sheet shall carry the draft watermark until release.                                                                                                                                                                                                                                                 | M   | e2e `engineering`                       |
| FR-ENG-11 | Only a verified engineer of the right discipline, of a verified office with current membership, shall approve; the approval signs the SHA-256 of the exact version; a set is released only when every required discipline approved the same hash; only the lead releases.                                                                                                                                                        | M   | rules, unit, e2e                        |
| FR-ENG-12 | Rasikh shall never stamp, sign or submit a permit in an engineer's name; the stamp area stays empty and a released set shows an approval record, not a stamp.                                                                                                                                                                                                                                                                    | M   | e2e `engineering`                       |
| FR-ENG-13 | A client shall see only options shared with them and released versions; offices shall not see each other's projects.                                                                                                                                                                                                                                                                                                             | M   | rules `rules-office`                    |
| FR-ENG-14 | Designs shall enter the shared library only with the client's consent and the office's contribution, with no personal data, credited to the office; the search shall learn from and credit them.                                                                                                                                                                                                                                 | S   | unit `library`; e2e                     |
| FR-ENG-15 | Land use shall constrain the building type (Z-USE) over the 88-type catalogue; specialist buildings get land-use and requirement checks only.                                                                                                                                                                                                                                                                                    | S   | unit `catalog`                          |
| FR-ENG-16 | The system shall show design practice notes (climate, privacy, plan, styles) with their basis, clearly labelled as not coming from the code.                                                                                                                                                                                                                                                                                     | S   | e2e `engineering`                       |
| FR-ENG-17 | A style card shall show a real, credited photograph of the style; hovering a design shall show it as a lit 3D model that turns with the pointer.                                                                                                                                                                                                                                                                                 | S   | e2e `styles`                            |

### 3.9 Kingdom map and insights (MAP, INS)

| ID        | Requirement                                                                                                                                                                                           | Pri | Verification                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------- |
| FR-MAP-01 | The map shall cover the Kingdom (all 13 region capitals and main cities), arrive from a globe, show a pin per city and fly into a city at about 58 degrees.                                           | M   | e2e `map`                     |
| FR-MAP-02 | Owners shall see their own properties at the exact pin when set (from the phone at the property or by clicking), otherwise near their city; everyone else sees labelled samples.                      | M   | e2e `map`                     |
| FR-MAP-03 | A property shall stand on its pin as a textured building at true scale: its released design when handed off, else a plausible villa or apartment block from its unit count; the card shall say which. | S   | unit `houses`; e2e `map-real` |
| FR-MAP-04 | The map shall fall back to a flat schematic with the same interactions without a token, WebGL or in automated browsers; pins shall lie inside the Kingdom box.                                        | M   | e2e `map`                     |
| FR-MAP-05 | When a Google Maps key is configured, a property card shall offer Google's photorealistic 3D view in a dialog through Google's own element; otherwise the button is absent.                           | C   | e2e `map`, unit               |
| FR-INS-01 | Neighbourhood rent and sale indicators shall come only from official open data imported by an admin, always marked "indicative", with source and date; never a valuation.                             | S   | unit `ops`                    |

### 3.10 Privacy and compliance (PRIV)

| ID         | Requirement                                                                                                           | Pri | Verification          |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --- | --------------------- |
| FR-PRIV-01 | Sign-up shall collect explicit PDPL consent; data shall be purpose-limited.                                           | M   | e2e `auth-onboarding` |
| FR-PRIV-02 | A user shall export their data (`exportMyData`) and delete their account (`deleteMyAccount`) after re-authentication. | M   | unit `account`; e2e   |
| FR-PRIV-03 | The product shall publish an Arabic and English privacy policy, terms and disclaimers (drafts pending lawyer review). | M   | e2e `legal`           |
| FR-PRIV-04 | An audit log shall record sensitive actions (organization creation, signing, approvals).                              | M   | rules, unit           |

### 3.11 Public site and administration (SITE, ADM)

| ID         | Requirement                                                                                                                                                                                                             | Pri | Verification                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------- |
| FR-SITE-01 | One shell for every page: header with current-page state, search dialog, language, theme, account menu, mobile drawer; footer with grouped links and accessibility tools (text size, contrast); skip link; breadcrumbs. | M   | e2e `shell`                            |
| FR-SITE-02 | DGA page templates: about, help with FAQ, contact form with an error summary, sitemap, search, accessibility statement, 404, cookie notice (essential storage only), "was this page helpful?".                          | M   | e2e `shell`                            |
| FR-SITE-03 | The site shall never show the government digital stamp or an "official government site" banner; copy shall say Rasikh is private and not a government entity.                                                           | M   | e2e `legal`                            |
| FR-SITE-04 | Every public page shall have canonical and hreflang links; robots shall hide signed-in pages; the sitemap shall list the public pages in both languages.                                                                | S   | e2e `seo`                              |
| FR-ADM-01  | The Rasikh team (`platformAdmin` claim, set only with the Admin SDK) shall read, answer and delete public messages and page ratings, verify offices and engineers, and keep municipal requirements.                     | M   | e2e `admin`, rules `rules-regulations` |
| FR-OUT-01  | Features out of scope (§1.2) shall be flagged off (`FEATURE_FLAGS`) and shall not ship enabled.                                                                                                                         | M   | unit `domain`                          |

### 3.12 Mobile application (MOB)

| ID        | Requirement                                                                                                                                                                 | Pri | Verification  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------- |
| FR-MOB-01 | The Flutter app shall offer the same flows as the web for property management (ops, inspections with camera, maintenance, buildings, broker, assistant), Arabic by default. | S   | Flutter tests |
| FR-MOB-02 | Domain logic shall be ported to Dart with the same test fixtures as the shared package so web, app and server agree.                                                        | M   | Flutter tests |
| FR-MOB-03 | The app shall capture inspection photos with the device camera and queue uploads offline.                                                                                   | M   | Flutter tests |

---

## 4. External interface requirements

| ID    | Interface                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR-01 | **User interface**: Arabic first, RTL with logical CSS, mirrored directional icons, Hijri and Gregorian dates, SAR formatting; "Najd Dusk" design system (one brand colour, editorial type, one glass layer per screen); DGA container and breakpoints (600, 960, 1280); 44 px touch targets. |
| IR-02 | **Firebase**: Auth (email, phone OTP), Firestore and Storage (me-central2), Functions 2nd gen callables ([API](API.md)), Cloud Messaging for reminders, App Check on web and mobile.                                                                                                          |
| IR-03 | **Mapbox GL JS v3** (Standard style, token restricted by domain): lighting follows Riyadh local time; indicators in the "middle" slot under the 3D buildings; custom three.js layer for property buildings.                                                                                   |
| IR-04 | **Google Maps JavaScript API, `maps3d` library** (optional, key restricted by domain): photorealistic 3D view through `Map3DElement`; never copied or cached; Google attribution retained.                                                                                                    |
| IR-05 | **Government platforms**: none. Ejar, Mullak, Balady and the Amanat have no integration; the system stores numbers and documents users enter.                                                                                                                                                 |
| IR-06 | **Model provider**: the `ModelProvider` interface; today a deterministic local engine (no network, no cost); Gemini via Vertex AI or Claude are drop-in providers when approved.                                                                                                              |
| IR-07 | **Exports**: DXF R12 and IFC4 as text, glTF from the 3D model (furniture removed), `.ics` calendar files, PDF through the browser's print to A3.                                                                                                                                              |
| IR-08 | **Hardware**: device camera and geolocation (inspection evidence, map pin) with explicit permission; WebGL for 3D (fallbacks provided).                                                                                                                                                       |

---

## 5. Non-functional requirements

### 5.1 Performance and efficiency

- **NFR-PERF-01** The landing page shall score Lighthouse mobile 90 or higher with LCP under 2.5 s (AVIF images; the 3D hero lazy-loaded).
- **NFR-PERF-02** Map and 3D screens shall target 60 fps on mid-range phones, with clustering, lazy-loaded map bundles and a 2D fallback.
- **NFR-PERF-03** Option search for a brief shall return within a few seconds in the browser (it is deterministic and measured by a unit test).
- **NFR-PERF-04** The plan, 3D model, drawings and BOQ shall update within seconds of an edit.

### 5.2 Security

- **NFR-SEC-01** Firestore and Storage rules shall deny by default; every read and write shall check organization membership and role, with emulator tests per role.
- **NFR-SEC-02** Evidence and ledgers shall be write-once or append-only as specified in FR-INSP-03, FR-BLD-02, FR-BRK-04.
- **NFR-SEC-03** No secret shall be committed; keys live in `.env` (gitignored) or Secret Manager; every key and token shall be restricted by domain or bundle id.
- **NFR-SEC-04** App Check shall be enforced on web and mobile in production (needs Blaze).
- **NFR-SEC-05** Functions shall validate every input with zod and reject unknown roles or fields; AI logs shall hold metadata only.
- **NFR-SEC-06** A person shall never see another organization's data, another office's projects, or drafts under internal review.

### 5.3 Privacy and legal compliance

- **NFR-PRIV-01** Compliance with the Saudi PDPL: explicit consent, purpose limitation, export and delete my data, residency in `me-central2`.
- **NFR-PRIV-02** Verification documents of offices and engineers shall be sensitive: purpose-limited, in me-central2, admin-only.
- **NFR-LEG-01** Legal pages shall be reviewed by a lawyer before launch; the draft-watermark wording and the office terms likewise.

### 5.4 Accessibility and usability

- **NFR-A11Y-01** WCAG 2.2 AA for every page, verified by axe in the end-to-end suite; every text and background pair checked in the tokens; Arabic screen-reader labels; reduced motion honoured; one h1 per page.
- **NFR-A11Y-02** Keyboard operation for every control; Radix primitives shall receive `dir` from the locale; the 3D hover has a button for keyboard and touch.
- **NFR-USE-01** No sideways scroll at 390 px; 44 px minimum touch targets; errors summarised and tied to fields.

### 5.5 Localization

- **NFR-I18N-01** Arabic is the default and English the second language; Latin digits by default with a setting for Arabic-Indic digits; line height 1.6 to 1.8 for Arabic.
- **NFR-I18N-02** All user-facing text shall come from `messages/ar.json` and `messages/en.json` (web) and ARB files (app); the engineering sheets show Arabic and English in the title block.

### 5.6 Reliability and availability

- **NFR-REL-01** Inspection capture shall tolerate offline use with queued, retried uploads.
- **NFR-REL-02** Scheduled backups and point-in-time recovery shall be enabled for Firestore in production (needs Blaze; known gap).
- **NFR-REL-03** The scheduled reminder function shall be idempotent per day.

### 5.7 Maintainability and portability

- **NFR-MNT-01** One source of truth for domain rules in `packages/shared`; the engineering engine is pure and deterministic; the model sits behind one interface.
- **NFR-MNT-02** TypeScript strict, ESLint and Prettier clean on every pull request; CI runs lint, typecheck, test and build.
- **NFR-MNT-03** Changes keep `CHANGELOG.md` and `PLAN.md` current; commits are small and reviewable.

### 5.8 Cost

- **NFR-COST-01** The system shall run on the free Firebase tier for development (Spark, emulators) and shall add no paid service without the owner's approval; the AI provider has a monthly cost cap.

---

## 6. Verification and traceability

Verification methods: **T**est (automated), **I**nspection (review of code or document), **D**emonstration (walkthrough video), **A**nalysis. The matrix below maps requirement groups to automated tests; module-level detail is in [TEST-PLAN](TEST-PLAN.md).

| Requirements            | Primary evidence                                                                                                                                                      | Status in baseline                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| FR-AUTH, FR-SEC, FR-ORG | `firebase/functions/test/organizations.test.ts`, `rules.test.ts`; `e2e/auth-onboarding`, `sections`, `shell`                                                          | Implemented; phone OTP deploy needs Blaze                                |
| FR-PROP, FR-LEASE       | `packages/shared` domain tests; `e2e/ops`, `links`; `ops.test.ts`                                                                                                     | Implemented                                                              |
| FR-INSP, FR-REC         | `inspections.test.ts`, `rules-inspections`; `e2e/inspections`; Flutter inspection tests                                                                               | Implemented; record transfer (FR-REC-03) not built                       |
| FR-MNT, FR-BLD, FR-BRK  | `tickets.test.ts`, `rules-tickets`, `rules-buildings`, `rules-broker`; `e2e/maintenance`, `buildings`, `broker`                                                       | Implemented                                                              |
| FR-AI                   | `ai.test.ts`, `ai-eval.test.ts` (46 prompts), `rules-ai.test.ts`; `e2e/assistant`                                                                                     | Implemented on a local engine; real model pending                        |
| FR-ENG                  | `packages/shared/src/engineering/*.test.ts`; `rules-office`, `rules-library`, `rules-regulations`; `e2e/engineering`, `styles`                                        | Implemented on the free stack; SBC text licence pending                  |
| FR-MAP, FR-INS          | `lib/map/*.test.ts`; `e2e/map`; `e2e/map-real` (on request)                                                                                                           | Implemented; Google view needs the owner's key                           |
| FR-PRIV                 | `account.test.ts`; `e2e/privacy-rights`, `legal`                                                                                                                      | Implemented; lawyer review pending                                       |
| FR-SITE, FR-ADM         | `e2e/shell`, `seo`, `admin`, `landing-and-lab`                                                                                                                        | Implemented                                                              |
| NFR-A11Y                | axe in `e2e/landing-and-lab`, `map`, `shell`, `sections`, `styles`, `engineering`                                                                                     | Passing                                                                  |
| NFR-PERF-01             | Lighthouse 12, production build, Arabic landing, mobile, simulated slow 4G (2026-10-12, see PLAN.md): performance 93, accessibility 100, SEO 100, FCP 1.8 s, CLS 0.02 | Partly met: LCP 3.0 s simulated is above the 2.5 s target (open item 11) |
| NFR-REL-02, NFR-SEC-04  | Production configuration                                                                                                                                              | Open: needs Blaze                                                        |

### 6.1 Acceptance criteria for the baseline

The baseline is accepted when: every **Must** requirement marked Implemented has a passing automated test; lint, typecheck and the full end-to-end suite pass; axe reports no WCAG A or AA violation; and the open items in §7 are listed with their owner.

---

## 7. Open issues, risks and assumptions to confirm

| #   | Item                                                                                                                                                                                                                     | Owner            | Impact                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------- |
| 1   | Firebase Blaze: deploy Functions and Storage, phone OTP, hosting, App Check, backups.                                                                                                                                    | Product owner    | Blocks any real deployment                  |
| 2   | Real model provider and key (Vertex AI or Claude); an image model for photoreal renders of a design.                                                                                                                     | Product owner    | AI is a local engine and knowledge base now |
| 3   | Licensed Saudi Building Code text so an office engineer can verify the remaining rules; until then they stay "not checked".                                                                                              | Product owner    | Code rules cannot be marked passed          |
| 4   | An engineer shall verify the transcribed Ministry values against the official PDF before real permits.                                                                                                                   | Engineering lead | Municipal values are transcriptions         |
| 5   | Lawyer review of privacy policy, terms, disclaimers, the draft-watermark wording and office terms (PDPL).                                                                                                                | Product owner    | Required before launch                      |
| 6   | Domain, `NEXT_PUBLIC_SITE_URL`, restricting all keys to the domain; rotate the old Mapbox token.                                                                                                                         | Product owner    | Required before launch                      |
| 7   | Apple and Google Play accounts, signing keys and store assets.                                                                                                                                                           | Product owner    | Required for the app                        |
| 8   | Ownership transfer of a Property Health Record with consent (FR-REC-03); server-side Arabic PDF reports; paid reminder channels.                                                                                         | Engineering      | Known gaps                                  |
| 9   | Google photorealistic view: key, billing and Google's terms and pricing.                                                                                                                                                 | Product owner    | Optional                                    |
| 11  | Landing LCP is 3.0 s under simulated throttling against a 2.5 s target (about 0.3 s unthrottled); candidate fixes: font-display optional or a smaller Reem Kufi Arabic subset; also measure the workspace and map pages. | Engineering      | Misses NFR-PERF-01 under throttling         |
| 10  | DGA conformity is by following the Platforms Code, not certified; a formal audit would be needed to claim conformity.                                                                                                    | Product owner    | Do not claim conformity                     |

**Risks.** Regulatory text can change (mitigation: values with clauses, kept by the team, verified by an engineer). A real model could drift (mitigation: scope classifier, facts-only prompts, evaluation set, human confirmation). Map and 3D load on low-end phones (mitigation: fallbacks, lazy bundles). Third-party licences (mitigation: credits in `docs/CREDITS.md`, consent-based library).

---

## Appendix A. Requirement counts

Functional requirements by module are listed in §3; non-functional in §5. Use `grep -c '^| FR-' docs/SRS.md` for the live count when preparing a review.

## Appendix B. Revision history

| Version | Date       | Author | Change                                                                             |
| ------- | ---------- | ------ | ---------------------------------------------------------------------------------- |
| 1.0     | 2026-10-17 | Rasikh | First baseline from the implemented system, three sections and engineering office. |
