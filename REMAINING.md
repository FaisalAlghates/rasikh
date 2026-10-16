# Rasikh — what remains

Last updated: 2026-10-16. References: `PLAN.md` (phases and gaps), `CLAUDE.md` (rules), `docs/ENGINEERING_OFFICE.md` (phase 9 spec), `docs/STORE-READINESS.md`. Arabic version: `REMAINING.ar.md`.

## Current state

- **Done (web, backend and Flutter, with tests):** phases 1–8.
- **Phase 10 (polish, security, launch):** mostly done for what can be done without paid services.
- **Phase 9 (AI engineering office):** built on the free stack; the paid parts wait for your decisions (section 2).
- **GitHub:** private repo `FaisalAlghates/rasikh`, `main` is up to date; CI (GitHub Actions) passes.
- **Firebase dev project `rasikh-eca19` (Spark, free):** Firestore in me-central2 with rules (engineering office included, 2026-10-16) and indexes deployed, Email/Password sign-in enabled, web app registered. Storage and Functions are not deployed (they need Blaze).
- **Tests:** 189 backend and rules, 141 shared logic, 30 web unit, 115 Flutter, 123 browser (desktop and mobile).

## 1. Work I can still do (free)

- Run the production web build against the real Firebase project to check sign-in and Firestore reads.
- Phase 10: a Lighthouse run of the production build (the Lighthouse launcher cannot start Chrome on this machine; measured instead with Playwright under mobile throttling on 2026-10-15: landing LCP 2.0 s, content pages and map 0.7-0.8 s, CLS about 0, TBT 120-200 ms), final design review of the older screens, a rules review pass.
- Gaps from finished phases: server-side Arabic PDF reports (account statement, inspection comparison); ownership transfer with the new owner's consent; switching organizations in the Flutter app (done on the web); an admin screen for the indicative-prices import.
- Device testing: the rest of the Flutter screens on the Android emulator (properties, leases, inspections, tickets, buildings, broker, assistant, privacy); camera, GPS and the evidence upload queue on a real phone and on iOS.

## 2. Phase 9 — AI engineering office (built on the free stack; paid parts pending)

Built 2026-10-16: offices and engineers with verification, briefs, options, rule engine, plan editor, 3D, drawings and exports, disciplines, approvals and release, renovation, precedents (details in `docs/ENGINEERING_OFFICE.md`, "Implementation status"). The assistant designs 6–12 different options per brief, each holding every requested room (and the parking, pool and guest entrance on the site) and passing every zoning and automatic code check, each with its own bill of quantities. Five design types (bands, courtyard, side court, terrace, guest pavilion) and the roof annex. The Ministry of Municipalities and Housing requirements are built in; each Amanah's own requirements are added by the Rasikh team with their source (no live connection to Balady or the Amanat exists to use). A basement is still added during design development. Property types (88) and land uses decide what the engine designs; specialist buildings (hospitals, airports, factories, malls ...) get checks only. A design library the engine learns from grows with the offices' released designs (client consent, credited); importing the openly licensed Swiss Dwellings dataset (CC BY 4.0, ~875 MB, apartments only) awaits your approval. Released sets go into the client's Property Health Record (needs the updated Firestore rules deployed, with your confirmation). Code rules read "passed" only after an office engineer enters their values from the licensed code. Still needs your decisions:

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
- **A real support address** for the contact page and privacy policy.
- **Give yourself the team inbox** on the real project: with a service-account key, run `node scripts/set-platform-admin.mjs --project rasikh-eca19 <your email>` in `firebase/functions` (after the rules deploy).
- **Deploy** to production, with your confirmation.

## 4. Standing constraints

- Replies in Arabic. No paid services without asking. No deploys without your confirmation. Keys never in code or chat.
- Rasikh complements Ejar and Mullak, never replaces them; no payment processing, no public listings.
- Never stamp, approve or submit anything in an engineer's name; compliance is decided only by the rule engine.
