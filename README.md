<div align="center">

# Rasikh · راسخ

**Your property, on solid ground.** · **عقارك على أرض ثابتة**

Arabic-first platform for running rental property in Saudi Arabia: one property record from move-in day to move-out day.

[![CI](https://github.com/FaisalAlghates/rasikh/actions/workflows/ci.yml/badge.svg)](https://github.com/FaisalAlghates/rasikh/actions/workflows/ci.yml)
![Web](https://img.shields.io/badge/web-Next.js%2016-black)
![App](https://img.shields.io/badge/app-Flutter%203.47-02569B)
![Backend](https://img.shields.io/badge/backend-Firebase%20·%20me--central2-FFCA28)
![Status](https://img.shields.io/badge/status-pre--launch-B5532C)

</div>

> Rasikh **complements** the government platforms Ejar and Mullak. It never replaces an Ejar contract, the Ejar deposit or the official handover form, it does not process rent, and it does not run a public listings marketplace.

## What it does

| Module                     | What you get                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Portfolio and 3D map**   | Properties, buildings and units on a Mapbox 3D map that follows Riyadh time of day.                                                                               |
| **Leases and payments**    | Lease records that reference the Ejar contract number, a payment schedule, free in-app and calendar reminders, receipt uploads.                                   |
| **Guided inspections**     | Room-by-room move-in and move-out with in-app camera evidence: capture time, SHA-256 and GPS. Two-party sign-off with fresh re-authentication, comparison report. |
| **Property Health Record** | A timeline of every event on the property.                                                                                                                        |
| **Maintenance**            | Tickets with photos, urgency and SLA timer, suggested responsibility (a suggestion, not a ruling), vendors with their own login.                                  |
| **Buildings and owners**   | Shared expenses that each need a receipt, balances visible to every owner, quote comparison, one ballot per unit. Complements Mullak.                             |
| **Broker CRM**             | FAL license reminders, leads with a forward-only funnel, viewings, brokerage contracts, an immutable server-timestamped log, and an ad compliance checker.        |
| **Real-estate AI**         | Server-side Genkit flows behind one provider interface: scope classifier, disclaimers, limits, marked output, suggestions applied only on a tap.                  |
| **Privacy rights (PDPL)**  | Export my data and delete my account; Arabic and English privacy policy, terms and disclaimers (drafts pending legal review).                                     |

Out of scope at launch and feature-flagged **off**: public listings or booking, rent financing, legal opinions, official valuations, and anything that stamps or submits on an engineer's behalf.

## Architecture

```
apps/web               Next.js 16 (App Router, TypeScript strict), Tailwind 4, Radix, next-intl (ar default, en)
apps/mobile            Flutter 3.47, Riverpod, go_router, FlutterFire, ARB localization (ar default)
firebase/functions     Cloud Functions 2nd gen (TypeScript) in me-central2, Genkit for every AI flow
firebase               Firestore and Storage rules, indexes, emulator suite
packages/shared        Domain logic, zod schemas and enums shared by web and functions
packages/design-tokens One tokens file: CSS variables and Flutter theme ("Najd Dusk")
docs                   Setup guides, design notes, the engineering-office spec
```

**Design principles**

- **One source of truth for rules.** Domain logic (schedules, SLA, balances, ad checks, inspection digest) lives in `packages/shared` and is ported to Dart with identical test fixtures, so web, app and server agree.
- **Deny by default.** Firestore and Storage rules check organization membership and role on every access, with emulator tests per role. Roles live in custom claims set only by Functions.
- **Evidence you can trust.** Inspection media is hashed at capture, queued offline with retry, write-once after sign-off, and re-checked on the server before sealing.
- **Data stays in the Kingdom.** All user data in `me-central2` (Dammam). No model keys in clients; AI runs only in Functions.
- **Arabic first.** RTL with logical CSS, mirrored icons, Hijri and Gregorian dates, SAR formatting, AA contrast checked in the tokens.

## Getting started

Prerequisites: Node 22, pnpm, Java (for the emulators), Flutter 3.47 (for the app), Firebase CLI.

```bash
pnpm install
pnpm --filter @rasikh/shared build        # shared is consumed from dist/
pnpm --filter @rasikh/functions build     # Functions bundle (lib/index.js)
pnpm emulators                            # Auth, Firestore, Storage, Functions on demo-rasikh
pnpm --filter @rasikh/web dev             # http://localhost:3000/ar
```

```bash
cd apps/mobile && flutter run             # uses the emulators in debug builds
```

Local development runs against the **demo project** `demo-rasikh`, so no cloud setup is needed. Copy `apps/web/.env.example` to `apps/web/.env.local` and add your own Mapbox token; never commit keys. Steps for a real Firebase project are in [docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md) (Arabic).

<details>
<summary>Windows notes</summary>

- Java-based emulators need an ASCII project path; use a junction such as `C:\dev\rasikh`.
- `@swc/core` needs `SWC_NATIVE_BINDING_CACHE` pointing to a directory only your user can write to.
- The Android emulator reaches the host at `10.0.2.2`; debug builds allow cleartext to it.

</details>

## Testing

```bash
pnpm test                                  # unit, security-rules and integration tests
pnpm --filter @rasikh/web e2e              # Playwright (needs the emulators)
cd apps/mobile && flutter test             # widget and domain tests
```

| Layer                   | Coverage                                                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| `packages/shared`       | Domain, inspections, maintenance, buildings, broker logic                      |
| `firebase/functions`    | Functions, Firestore and Storage rules per role, AI guard and a 46-prompt eval |
| `apps/web` (Playwright) | End-to-end flows for each module in Arabic, plus legal pages and PDPL rights   |
| `apps/mobile` (Flutter) | Domain ports with shared fixtures, and widget flows with in-memory fakes       |

CI runs lint, typecheck, test and build on every pull request.

## Security and privacy

- Firebase Auth with phone OTP (+966) and email; sensitive actions need a fresh sign-in.
- Create-only, append-only ledgers for building expenses, contributions, ballots and the broker activity log.
- App Check on web and mobile; secrets only in `.env` (gitignored) or Secret Manager.
- AI: metadata-only logs, per-person daily limit and monthly organization cap, jailbreak and off-topic refusal before any model call.
- Saudi PDPL: explicit consent, purpose-limited data, export and delete my data.

Found a security problem? Please report it privately to the maintainer instead of opening a public issue.

## Status and roadmap

Authoritative detail lives in [PLAN.md](PLAN.md) (phases and known gaps) and [CLAUDE.md](CLAUDE.md) (product rules).

| Phase | Scope                                         | Status                           |
| ----- | --------------------------------------------- | -------------------------------- |
| 1–3   | Foundation, design system, 3D map             | Done                             |
| 4     | Leases and payment ledger                     | Done                             |
| 5     | Guided inspections and Property Health Record | Done                             |
| 6     | Maintenance, buildings and associations       | Done                             |
| 7     | Broker CRM and ad checker                     | Done                             |
| 8     | Real-estate AI                                | Done with a cost-free fake model |
| 9     | AI engineering office (المكتب الهندسي الذكي)  | Specified, not started           |
| 10    | Polish, security, performance, launch         | In progress                      |

Known gaps before launch: connect a real AI provider, server-side Arabic PDF reports, ownership transfer with consent, paid reminder channels (email, SMS, push), App Check enforcement and scheduled backups (need Blaze), lawyer review of the legal pages.

## نبذة بالعربي

راسخ منصة عربية أولاً لإدارة العقار المؤجَّر في السعودية: توثيق العقود والدفعات والفحص والصيانة والعمائر وأعمال الوساطة في سجل واحد للعقار. **تكمّل** منصتي إيجار ومُلّاك ولا تغني عنهما، ولا تعالج دفعات الإيجار ولا تعرض إعلانات للعامة. بياناتك تُحفظ في الدمام، والذكاء الاصطناعي يعمل على الخادم فقط وكل مخرجاته اقتراحات تراجعها بنفسك.

## License

Proprietary. All rights reserved. © Rasikh.
