# Changelog

## Unreleased

- Project skeleton, CLAUDE.md, PLAN.md.
- Phase 1: monorepo (pnpm + Turborepo), design tokens with enforced AA contrast, shared zod schemas, Firebase rules + createOrganization callable, Next.js web (ar/en, phone OTP + email, onboarding), Flutter app (same flows), Playwright e2e, Flutter widget tests, CI workflow.
- Fix: Arabic stays default regardless of browser language (found by e2e).
- Fix: Storage rules now forbid overwriting existing files (write-once).
