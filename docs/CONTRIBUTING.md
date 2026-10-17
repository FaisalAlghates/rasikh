# Contributing and engineering standards

Read [CLAUDE.md](../CLAUDE.md) first: it is the source of truth for product rules, stack and design. This page is the working agreement for anyone changing the code.

## Principles

1. **Small, reviewable steps.** One concern per commit; commit after each step; keep `CHANGELOG.md` and `PLAN.md` current.
2. **Rules before code.** If the product rule is unclear, ask or write it into `CLAUDE.md` first. If the brief is outdated, say so and propose the fix.
3. **Ask before spending.** No paid service, no new stack component and no deployment without the owner's explicit yes.
4. **Never guess an API, a regulation or a number.** Check the official docs; municipal values carry their clause and source; code rules stay "not checked" until an engineer verifies them.
5. **Compliance copy.** Never present Rasikh as replacing Ejar or Mullak, as official, or as stamping or filing for an engineer.
6. **Secrets never enter the repo, a prompt or a chat.**

## Setup and commands

See the [README](../README.md#getting-started). Quick reference:

```bash
pnpm install && pnpm --filter @rasikh/shared build && pnpm --filter @rasikh/functions build
pnpm emulators                       # terminal 1
pnpm --filter @rasikh/web dev        # terminal 2
pnpm test && pnpm lint && pnpm typecheck
pnpm --filter @rasikh/web e2e
```

## Repository map

`apps/web` (Next.js), `apps/mobile` (Flutter), `firebase/functions` (callables, Genkit), `firebase` (rules, indexes), `packages/shared` (domain, engineering engine, schemas), `packages/design-tokens`, `docs`. Domain logic belongs in `packages/shared`, not in a component.

## Coding standards

- **TypeScript strict**, no `any` without a comment; zod schemas at every boundary (forms, callables, stored documents).
- **Pure functions for rules.** Anything that decides a business outcome (schedules, SLA, compliance, approval blocks) is pure, deterministic and unit-tested; UI components only render.
- **No hard-coded UI strings.** Text goes in `messages/ar.json` and `messages/en.json` (web) or ARB (app). Document content that is bilingual by design (sheet title blocks, knowledge entries) lives in shared code with both languages.
- **RTL first.** Logical CSS properties only (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`), mirrored directional icons, `dir` passed to Radix primitives, Latin digits by default.
- **Accessibility is part of done.** WCAG 2.2 AA: contrast checked, 44 px targets, labels in Arabic, one h1 per page, reduced motion, keyboard operation. Add axe to a new page's e2e.
- **Design system "Najd Dusk".** One brand colour, tokens only (no ad-hoc hex in components except drawing sheets and 3D materials), almost no shadows, one glass layer per screen.
- **Rules and functions.** Deny by default; a new collection gets rules and a per-role emulator test in the same change. Callables validate input, check authorization themselves, and throw stable `HttpsError` codes.
- **AI.** Server-side only, behind `ModelProvider`; classifier before the model; facts fetched with the caller's permissions; log metadata, never content; outputs marked and never applied automatically.
- **Performance.** Lazy-load map and 3D bundles; provide a fallback without WebGL; keep the landing LCP under 2.5 s.

## Tests

Every behaviour change ships with a test at the lowest level that can prove it (see [TEST-PLAN](TEST-PLAN.md)). A bug becomes a failing test first. Do not merge with failing lint, types or tests, and do not skip hooks.

## Commit and review

- Message: imperative summary line, a body that says why, and the attribution trailer required by the repository's tooling.
- A pull request describes the user-visible change, the tests added, any rule or schema change, and any open decision for the owner.
- Review checklist: product rules respected (§1 of `CLAUDE.md`); rules and tests for new data; i18n and RTL; accessibility; no secrets; changelog updated; screenshots for UI changes (desktop and mobile width).

## Definition of done

Implemented, tested (unit or rules, plus e2e for a journey), accessible, translated, documented (changelog, and this suite when behaviour or a requirement changes: update the [SRS](SRS.md) requirement and its trace), and verified in a browser.
