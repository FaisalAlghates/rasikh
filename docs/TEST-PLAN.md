# Test plan

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Version | 1.0 (2026-10-17)                                                  |
| Scope   | Web, Cloud Functions, Firestore and Storage rules, Flutter app    |
| Related | [SRS](SRS.md) §6 (traceability) · [ARCHITECTURE](ARCHITECTURE.md) |

## 1. Strategy

A test pyramid with the most weight where mistakes cost most: pure rules and domain logic (fast, many), security rules per role (exhaustive), and a Playwright suite that exercises each section in Arabic with accessibility checks (slow, focused on journeys). AI behaviour is held by an evaluation set. Nothing is mocked that a free emulator can provide.

| Level            | Tooling                                  | What it proves                                                                                                    | Where                                      |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Unit (domain)    | Vitest                                   | Schedules, SLA, balances, ad checks, digests, the engineering engine (rules, options, styles, sheets, knowledge). | `packages/shared/src/**/*.test.ts`         |
| Unit (functions) | Vitest on the Emulator Suite             | Callables validate, authorize and write correctly; the AI guard and flows.                                        | `firebase/functions/test/*.test.ts`        |
| Security rules   | Vitest with the rules emulator           | Per-role access: who reads and writes what, write-once and append-only behaviour.                                 | `firebase/functions/test/rules-*.test.ts`  |
| AI evaluation    | Vitest                                   | 46 prompts: in-scope answers, off-topic and jailbreak refusals, disclaimers.                                      | `ai-eval.test.ts`                          |
| Web unit         | Vitest                                   | 3D model construction per style, map house generator, the Google loader URL.                                      | `apps/web/src/**/*.test.ts`                |
| End to end       | Playwright (desktop and mobile projects) | Journeys per section, plus axe for WCAG A and AA, legal pages, PDPL rights, SEO, shell.                           | `apps/web/e2e/*.spec.ts`                   |
| Flutter          | `flutter test`                           | Domain ports with the shared fixtures; widget flows with in-memory fakes.                                         | `apps/mobile/test`                         |
| Static analysis  | ESLint, TypeScript strict, Prettier      | Style, types, formatting on every change.                                                                         | CI                                         |
| On request       | Playwright (real map), video recorder    | The real Mapbox map with buildings; walkthrough videos.                                                           | `e2e/map-real.spec.ts`, `videos/*.spec.ts` |

## 2. How to run

```bash
pnpm test                                       # shared + functions (functions use the emulators)
pnpm lint && pnpm typecheck
pnpm emulators                                  # in one terminal (FUNCTIONS_DISCOVERY_TIMEOUT=90 on Windows)
pnpm --filter @rasikh/web dev                   # in another
pnpm --filter @rasikh/web e2e                   # Playwright, desktop and mobile
RK_REAL_MAP=1 pnpm --filter @rasikh/web e2e map-real   # needs the network and a Mapbox token
pnpm --filter @rasikh/web videos                # re-record the walkthrough videos
cd apps/mobile && flutter test
```

Rules and function tests can run in a fresh emulator with `firebase emulators:exec --only firestore,auth,storage --project demo-rasikh "vitest run"` from `firebase/functions`.

## 3. Test design principles

- **A pass and a fail for every rule.** Each zoning and code rule has at least one passing and one failing fixture; the engine must also prove unverified rules stay `not_checked`.
- **Golden briefs.** Villa on 20 by 30 m, duplex, four-floor apartment building, corner plot, narrow deep plot, rich brief, hotel, warehouse: plans must sit inside setbacks and coverage, hold every room, and pass every automatic check.
- **Determinism.** The option search and sheet numbering are deterministic; tests assert it, because approvals bind to hashes.
- **Per-role rules tests.** Every role gets an emulator test: allowed, denied, and the boundary (a tenant versus another tenant, an office versus another office, a client versus a draft).
- **Journeys in Arabic.** E2E runs on the Arabic UI; accessibility is asserted with axe (WCAG 2.2 A and AA) on landing, map, shell pages, sections, style gallery and the engineering flows; no sideways scroll at 390 px.
- **No flaky waits.** E2E waits on state (status text, test ids) rather than time; the dev server is warmed before long flows.

## 4. Coverage by requirement group

| Requirements        | Key tests                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts, sections  | `organizations.test`, `rules.test`; e2e `auth-onboarding`, `sections`, `shell`, `landing-and-lab`                                                                                                                           |
| Leases and payments | `ops.test`, `links.test`; e2e `ops`; shared schedule and freeze tests                                                                                                                                                       |
| Inspections, record | `inspections.test`, `rules-inspections`; e2e `inspections` (tamper, re-sign, seal); Flutter inspection tests                                                                                                                |
| Maintenance         | `tickets.test`, `rules-tickets`; e2e `maintenance`                                                                                                                                                                          |
| Buildings           | `rules-buildings`; e2e `buildings`                                                                                                                                                                                          |
| Broker              | `rules-broker`; e2e `broker`; ad-checker unit tests                                                                                                                                                                         |
| AI                  | `ai.test`, `ai-eval.test`, `rules-ai`; e2e `assistant`                                                                                                                                                                      |
| Engineering         | `engineering.test`, `options.test`, `regulations.test`, `catalog.test`, `library.test`, `styles.test`, `sheetset.test`, `knowledge.test`; `rules-office`, `rules-library`, `rules-regulations`; e2e `engineering`, `styles` |
| Map                 | `lib/map/*.test`, `model3d.test`; e2e `map`; `map-real` on request                                                                                                                                                          |
| Privacy             | `account.test`; e2e `privacy-rights`, `legal`                                                                                                                                                                               |
| Site and admin      | e2e `shell`, `seo`, `admin`                                                                                                                                                                                                 |

## 5. Entry and exit criteria

**Entry** for a change: the code compiles, lint and typecheck pass, the emulators start.
**Exit** (merge or release): unit and rules tests pass in a fresh emulator; the end-to-end suite passes on desktop (mobile project where applicable); axe reports no WCAG A or AA violation; new behaviour has a test; `CHANGELOG.md` is updated.

## 6. Defect handling

A bug found by a person becomes a failing test first, then a fix, then a changelog line. Examples already handled this way: blank printed drawing sets (a print rule hid the sheets; now asserted), role clicks that became ambiguous after the section step (e2e updated with the section picker).

## 7. Known gaps

- Lighthouse and Core Web Vitals are checked manually; automate them in CI before launch.
- Load and soak tests of the Functions under the AI limits are not done (they need Blaze).
- The real model has no evaluation beyond the local engine; run the 46-prompt set against any provider before enabling it.
- Cross-browser coverage is Chromium; add WebKit and Firefox projects before launch.
- DXF and IFC are validated structurally by tests but not yet opened in a CAD or BIM viewer.
