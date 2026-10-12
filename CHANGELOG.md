# Changelog

## Unreleased

- Project skeleton, CLAUDE.md, PLAN.md.
- Phase 1: monorepo (pnpm + Turborepo), design tokens with enforced AA contrast, shared zod schemas, Firebase rules + createOrganization callable, Next.js web (ar/en, phone OTP + email, onboarding), Flutter app (same flows), Playwright e2e, Flutter widget tests, CI workflow.
- Fix: Arabic stays default regardless of browser language (found by e2e).
- Fix: Storage rules now forbid overwriting existing files (write-once).
- Phase 2: web + Flutter design system (19 components each), /design-lab and app gallery, landing page, app intro + glass dock shell, theme toggle, axe/a11y + Lighthouse checks, 14-item self-critique loop (docs/PHASE2-REPORT.md).
- Immersive redesign: procedural 3D Najdi city (three.js) with scroll-driven camera and lit windows, kinetic type, 3D tilt cards, pinned storytelling, smooth scroll; matching perspective city, dock pill and entrances in the Flutter app (docs/IMMERSIVE-DESIGN.md).
- Phase 4: owner operations (properties, units, leases with Ejar number, payment schedule + records + receipts, expenses, annual report), tenant view, tenant invites, daily reminders, Riyadh rent-freeze helper.
- Free reminders (no paid service): computed on the device from the user's own records, shown live on the overview, browser notifications on the web, and a downloadable/shareable .ics calendar file with alarms (web + app).
- Phase 4 on the Flutter app: Dart port of the domain logic and .ics builder (same fixtures as TypeScript), owner overview, properties and units, lease form with Riyadh freeze note, lease detail with record-payment and tenant invite, expenses, yearly report, tenant lease view, 47 widget/unit tests.
- Phase 5: guided move-in/move-out inspections (room-by-room templates, in-app camera with capture time, GPS and SHA-256, integrity check), two-party sign-off with fresh re-authentication, server-side re-hash of every file before signing, write-once after the first signature, move-out comparison report, Property Health Record; web, backend and Flutter (offline-first evidence queue).
- Phase 6: maintenance tickets (suggested responsibility, SLA timer, vendor assignment, tenant rating) and building bookkeeping (members and shares, receipt-backed ledger, balances, quote comparison, votes, monthly statement) on web and backend.
- Fix: tenant schedule widened the page on phones (hidden receipt input escaped its scroll box); the schedule is now a list.
- Fix: Flutter app now connects the Firestore and Storage emulators.
- Fix: RTL input handling (only the input is LTR), Arabic display line-height, layered hairline utility.
- Phase 7: broker CRM and ad compliance checker (FAL profile with 60/30/7-day reminders, leads with a forward-only funnel, viewings, brokerage contracts, a create-only server-timestamped activity log private to each broker, and a live ad checklist) on web, backend rules and Flutter, with shared logic ported to Dart using the same fixtures.
- Fix (Android emulator): the Firebase Android SDK rejects a fake API key that is not 39 characters starting with A; debug builds now allow cleartext to the emulator host.
