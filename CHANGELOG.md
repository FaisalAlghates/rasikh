# Changelog

## Unreleased

- Project skeleton, CLAUDE.md, PLAN.md.
- Phase 1: monorepo (pnpm + Turborepo), design tokens with enforced AA contrast, shared zod schemas, Firebase rules + createOrganization callable, Next.js web (ar/en, phone OTP + email, onboarding), Flutter app (same flows), Playwright e2e, Flutter widget tests, CI workflow.
- Fix: Arabic stays default regardless of browser language (found by e2e).
- Fix: Storage rules now forbid overwriting existing files (write-once).
- Phase 2: web + Flutter design system (19 components each), /design-lab and app gallery, landing page, app intro + glass dock shell, theme toggle, axe/a11y + Lighthouse checks, 14-item self-critique loop (docs/PHASE2-REPORT.md).
- Immersive redesign: procedural 3D Najdi city (three.js) with scroll-driven camera and lit windows, kinetic type, 3D tilt cards, pinned storytelling, smooth scroll; matching perspective city, dock pill and entrances in the Flutter app (docs/IMMERSIVE-DESIGN.md).
- Phase 4: owner operations (properties, units, leases with Ejar number, payment schedule + records + receipts, expenses, annual report), tenant view, tenant invites, daily reminders, Riyadh rent-freeze helper.
- Fix: RTL input handling (only the input is LTR), Arabic display line-height, layered hairline utility.
