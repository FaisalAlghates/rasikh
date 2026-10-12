# Rasikh — what remains

Last updated: 2026-10-12. References: `PLAN.md` (phases and gaps), `CLAUDE.md` (rules), `docs/ENGINEERING_OFFICE.md` (phase 9 spec), `docs/STORE-READINESS.md`. Arabic version: `REMAINING.ar.md`.

## Current state

- **Done (web, backend and Flutter, with tests):** phases 1–8.
- **Phase 10 (polish, security, launch):** mostly done for what can be done without paid services.
- **Not started:** phase 9 (AI engineering office), which waits for your decisions.
- **GitHub:** private repo `FaisalAlghates/rasikh`, `main` is up to date; CI (GitHub Actions) passes.
- **Firebase dev project `rasikh-eca19` (Spark, free):** Firestore in me-central2 with rules and indexes deployed, Email/Password sign-in enabled, web app registered. Storage and Functions are not deployed (they need Blaze).
- **Tests:** 162 backend and rules, 68 shared logic, 114 Flutter, 78 browser (desktop and mobile).

## 1. Work I can still do (free)

- Run the production web build against the real Firebase project to check sign-in and Firestore reads.
- Phase 10: shorten the simulated LCP on the landing page (3.0 s against a 2.5 s target; real measured time is about 0.3 s), measure the workspace and map pages, final design review of the older screens, a rules review pass.
- Gaps from finished phases: server-side Arabic PDF reports (account statement, inspection comparison); ownership transfer with the new owner's consent; switching between several organizations; an admin screen for the indicative-prices import.
- Device testing: the rest of the Flutter screens on the Android emulator (properties, leases, inspections, tickets, buildings, broker, assistant, privacy); camera, GPS and the evidence upload queue on a real phone and on iOS.

## 2. Phase 9 — AI engineering office (not started)

Spec: `docs/ENGINEERING_OFFICE.md`; ten slices (9a to 9j) in `PLAN.md`. Needs your decisions first:

- Stack additions: Cloud Run, Cloud Tasks, Python services (ezdxf, IfcOpenShell), three.js, a glTF viewer in Flutter.
- Licenses: Saudi Building Code text, a 3D furniture library, a precedent library.
- An image-generation model for renders.
- Lawyer review of the draft-watermark wording and the office terms.
- All of it needs Blaze, and several parts need paid licenses.

## 3. Yours to do (I cannot)

- **Blaze plan** (billing) for the Firebase project, plus a budget alert. Then Storage (me-central2), Functions deploy, phone sign-in, App Check, scheduled backups.
- **A real AI model:** Vertex AI (Gemini) or a Claude key in Secret Manager, then one class in `firebase/functions/src/ai/provider.ts`. Today the model is a free fake.
- **Domain** and `NEXT_PUBLIC_SITE_URL`; restrict the Firebase web API key and the Mapbox token to the domain; rotate the old Mapbox token.
- **Lawyer review** of the privacy policy, terms and disclaimers (all marked drafts), and a real privacy contact address.
- **Apple and Google Play accounts**, signing keys, store screenshots and the Android feature graphic.
- **Decisions:** reminders by email, SMS or push (paid provider); analytics (none, or consent-based); App Hosting region.
- **Trademark and names:** SAIP search, rasikh.sa / .com / .app, store names, social handles.
- **Deploy** to production, with your confirmation.

## 4. Standing constraints

- Replies in Arabic. No paid services without asking. No deploys without your confirmation. Keys never in code or chat.
- Rasikh complements Ejar and Mullak, never replaces them; no payment processing, no public listings.
- Never stamp, approve or submit anything in an engineer's name; compliance is decided only by the rule engine.
