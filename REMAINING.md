# Rasikh — what remains, in detail

Last updated: 2026-10-12. References: `PLAN.md` (phases), `CLAUDE.md` (rules), `docs/ENGINEERING_OFFICE.md` (engineering office spec). Arabic version: `REMAINING.ar.md`.

## Current state

- Done (web + backend + Flutter, with tests): phases 1–6.
- Not started: phase 7 (broker CRM), 8 (AI), 9 (AI engineering office), 10 (polish and launch).
- Uncommitted changes: `apps/mobile/android/app/src/debug/AndroidManifest.xml` (cleartext allowed in debug builds), `apps/mobile/lib/data/auth_repository.dart` (debug error print), `CLAUDE.md`, `PLAN.md`, `docs/ENGINEERING_OFFICE.md`, and these REMAINING files.

## 1. In progress now: Flutter app on the Android emulator

1. **Free disk space on C:** only 0.09 GB free. Biggest: `C:\dev` (10.5 GB), `.gradle` (4.5 GB), `Temp` (3.5 GB). Clean old Temp files first; move or clean the rest with your OK.
2. **Why "create workspace" fails on the emulator:** read the `functions error:` line from logcat and the Functions emulator log. Suspects: full disk, Functions emulator host/port from the device (10.0.2.2), `me-central2` region wiring, App Check.
3. **Finish the device pass:** workspace, properties, leases, inspections (camera + GPS), tickets, buildings. Fix device-only bugs.
4. **Save:** record device findings in PLAN.md, commit pending changes.

## 2. Gaps in finished phases

- Server-side Arabic PDF: monthly statement and inspection comparison (today: browser print on web, on-screen totals in the app).
- Ownership transfer of a property record, with the new owner's consent.
- Outside reminders for owners (email, SMS, push). Paid provider, needs your decision. Today: in-app notice, browser notifications, .ics files.
- Verification on real devices: camera, GPS, evidence upload queue on a real Android phone and on iOS (so far emulator only; iOS untried).
- Switching between several organizations (today the first one is active).

## 3. Phase 7 and 4. Phase 8: done (2026-10-12)

Broker CRM and the ad checker are done on web, backend and Flutter. The AI is built with a cost-free fake model; connecting a real provider (Vertex AI Gemini or Claude) needs your decision and a key, then one new class in `firebase/functions/src/ai/provider.ts`. See PLAN.md Phase 7 and 8 for the gaps.

## 5. Phase 9 — AI engineering office (10 slices)

Full spec in `docs/ENGINEERING_OFFICE.md`.

- 9a Offices, engineers, roles: profiles, admin verification (CR, SCE classification, Balady activation), discipline-scoped approval, access pause on SCE expiry, rules tests per role.
- 9b Brief intake: plot, zoning and program zod schemas; brief agent that asks only for missing items; human confirmation before generation.
- 9c SBC rule engine: versioned rule packs, report with checked / passed / failed / NOT CHECKED, one pass and one fail fixture per rule, zoning reported separately.
- 9d Layout engine (Cloud Run): 3–6 options, golden tests for 5 briefs, web plan editor with live checks.
- 9e 3D model (glTF/IFC) per plan: empty/furnished and model/AI-render toggles, sun study, massing on the Rasikh map; web and Flutter viewer.
- 9f Drawing set and exports: PDF, DXF, IFC4, glTF, draft watermark, title block, Balady permit checklist.
- 9g Discipline agents (structural, mechanical, electrical, industrial), shared model, clash detection, BOQ and schedule.
- 9h Workflow: queued jobs, versions and redlines, approval with SHA-256, release to the Property Health Record, quotes and invoices (no payments).
- 9i Precedent library and RAG with citations, private office libraries, opt-in only.
- 9j Renovation and restoration: existing-building intake, condition assessment, existing-structure rule pack, existing/demolish/new set, heritage flag.
- **Your decisions before starting:** stack additions (Cloud Run, Cloud Tasks, Python services with ezdxf and IfcOpenShell, three.js, a Flutter glTF viewer); SBC text license; licensed 3D furniture library; image-generation model for renders; lawyer review of the draft-watermark wording and terms.
- Numbering note: CLAUDE.md calls it Module 14, but §1 modules currently end at 9.

## 6. Phase 10 — Polish, security, launch

- Design QA against Najd Dusk; empty, error and loading states; Arabic error messages; web and app consistency.
- Security: rules review, App Check enforcement, dependency audit, secret scan, rate limits, scheduled Firestore backup.
- Performance: Lighthouse ≥ 90 on mobile, bundle analysis, Flutter profiling.
- Arabic legal pages: privacy (PDPL), terms, disclaimers; export and delete my data.
- Crashlytics and privacy-respecting analytics.
- Store readiness and web SEO.
- Staging, then production deploy (only with your confirmation); final report: shipped, gaps, monthly cost drivers.

## 7. Yours to do (I cannot)

- Upgrade Firebase project `rasikh-eca19` to Blaze before deploying Functions; two projects (staging, production) in me-central2.
- Decide the App Hosting region and record it in CLAUDE.md (currently unverified).
- Mapbox: rotate the token, restrict to `http://localhost:3000` then to the production domain, delete the old one. Optional Google Maps key.
- Enable App Check and a phone OTP (+966) provider in Firebase.
- Vertex AI (or a Claude key) and budget alerts (Google Cloud, Mapbox).
- Apple and Google Play accounts; domain and GitHub.
- SAIP trademark search, rasikh.sa / .com / .app, store names, social handles.
- Lawyer review of privacy policy and terms, and of the engineering-office draft-watermark wording.
- Licenses: SBC text, 3D furniture library, precedent library.

## 8. Standing constraints

- Replies in Arabic. No paid services without asking. No deploys without your confirmation. Keys never in code or chat.
- Rasikh complements Ejar and Mullak, never replaces them; no payment processing, no public listings.
- Never stamp, approve or submit anything in an engineer's name; compliance is decided only by the rule engine.
