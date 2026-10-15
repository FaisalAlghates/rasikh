# AI Engineering Office · المكتب الهندسي الذكي — full spec (Module 14)

Source of truth for Phase 9 in PLAN.md. CLAUDE.md holds the short rules (§1 Module 14, §5b roles, §7 engineering AI rule);
this file holds the detail. Follow CLAUDE.md §7 strictly.

## Positioning (non-negotiable)

- Rasikh is a 24/7 design copilot FOR licensed engineering offices. It never replaces them. In Saudi Arabia permit
  drawings are prepared by an engineering office licensed by the Saudi Council of Engineers (SCE) and activated on
  Balady, which submits the permit request; the owner cannot self-certify.
- Every AI output is a DRAFT watermarked "مسودة — تتطلب مراجعة واعتماد مهندس مرخّص" until a verified engineer of the
  office reviews and approves it in the app. The platform never stamps, signs or submits anything in an engineer's name.
- Code compliance = a deterministic, versioned rule engine, never the model's opinion. The LLM only explains results.

## 1. Offices and engineers

- Office profile: commercial registration, SCE classification, Balady activation, disciplines (architectural,
  civil/structural, mechanical incl. plumbing/HVAC/fire, electrical, industrial), cities served, team. Admin verifies
  documents before the office can approve or release anything.
- Engineer profile: SCE membership no., grade, discipline, expiry. Approval rights only in own discipline; access pauses
  automatically when membership expires.
- Each office gets a private workspace and its own "office AI": title block, standard details, sheet templates, style
  preferences, and past projects (uploaded with client consent) as a private retrieval library. Offices never see each
  other's data.

## 2. Design brief intake (Arabic/English; text, voice note, or a photo of a hand sketch)

- Plot: deed/cadastral data (OCR suggestion, human confirms), exact dimensions and polygon, street sides and widths,
  north, levels.
- Zoning per plot: use, max floors/height, setbacks per side, coverage ratio, FAR, parking. Entered by the office from
  that municipality's building regulations (configurable per city); never guessed by AI.
- Program: type (villa, duplex, townhouse, apartment building, small commercial), floors, bedrooms, men's/women's majlis,
  dining, open/closed kitchen, maid/driver rooms, bathrooms, roof annex, basement, pool, elevator, parking, privacy
  (separate guest entry, screened openings), style (modern Najdi, Salmani, contemporary, classic), budget range.
- Brief agent converts free text into a validated program (zod schema), asks only for missing items, and the user
  confirms before generation.

## 3. Concept generation (deterministic geometry + AI ranking)

- Layout engine (Cloud Run, me-central2): constraint solver placing rooms inside the buildable envelope (plot minus
  setbacks), honoring areas, adjacencies (majlis by entrance, kitchen by dining and service entry, stacked wet areas),
  circulation, stair/elevator core, daylight, cross-ventilation, privacy, optional Qibla orientation, structural grid
  (spans configurable).
- 3–6 options per brief. The LLM never draws geometry freehand: it sets parameters, ranks options and explains
  trade-offs in Arabic.
- Each option: dimensioned plans per level, room schedule, built-up area per floor vs allowed, coverage/FAR and parking
  checks.
- Web plan editor for the office (walls, doors, windows, rooms snapping to grid); every edit re-runs all checks live.

## 4. Saudi Building Code (SBC) checks — SBC 2024, mandatory since 30 Jun 2025

- Versioned rule packs. Each rule stores SBC part + clause, edition, parameters, test, message ar/en. Residential first:
  SBC 201 (occupancy, minimum room sizes/heights, egress, stairs, guards, natural light/ventilation, accessibility),
  SBC 801 (fire: exits, travel distance, separations in apartment buildings), SBC 601/602 (energy envelope,
  window-to-wall ratio), SBC 701/702 (fixtures, sanitary), SBC 401 (electrical load schedule), SBC 501 (ventilation),
  SBC 301/304 (load assumptions, preliminary sizing only).
- License the code text from the National Committee for the Saudi Building Code; never scrape or redistribute it. A
  licensed engineer enters and double-checks every rule's parameters; each rule has pass and fail test fixtures.
- Report states checked / passed / failed / NOT CHECKED (needs engineer) with clause references, highlighted on the
  plan. "Not checked" is never shown as passed.
- Municipal zoning checks are reported separately from SBC checks.

## 5. Drawing set (drafts until approved)

- Architectural: site plan, floor plans, roof plan, 4 elevations, 2 sections, door/window schedule, area table; office
  title block, scale bar, north arrow, Arabic + English labels.
- Exports: PDF (A1/A3), DXF (ezdxf), IFC4 BIM model (IfcOpenShell or web-ifc) for Revit/ArchiCAD handoff, glTF for 3D.
- Preliminary structural: grid, column/beam/slab layout, load assumptions, preliminary sizes from a validated
  calculation library, foundation recommendation conditional on the soil report. Marked "preliminary — final design and
  calculations by the office's structural engineer".
- MEP schematics: lighting/power points, preliminary load schedule, plumbing fixture layout, AC zoning.
- Preliminary BOQ and cost range from office-maintained unit rates (never a quote).
- Balady permit checklist: deed, cadastral report, design contract, supervision office and contractor contracts, latent
  defects insurance, soil report, traffic study if required. Shows ready/missing. Rasikh does NOT submit to Balady; the
  office does, under its credentials.

## 6. 3D model of every plan (live, same geometry as the drawings)

- Every concept option and every plan edit regenerates a 3D model (glTF/IFC) automatically: orbit, dollhouse cut-away
  per floor, first-person walk-through, measure tool. three.js on web, glTF viewer in Flutter; works on mid-range phones
  (LOD, lazy textures).
- Toggle 1 — Empty / Furnished (whole model or per room). Empty = walls, openings, floors, finishes only. Furnished = AI
  auto-furnishing from a licensed 3D furniture library, chosen by room type, size and door/window positions (bed and
  walkway clearances, majlis seating along walls, dining for the stated family size, kitchen layout). User can move,
  swap or delete items; style presets (modern Najdi, contemporary, classic) and material/finish palettes. The LLM only
  chooses style and items; a deterministic placer positions them so no item blocks a door, window or required clearance.
- Toggle 2 — Model / AI render. Model = clean real-time 3D. AI render = photoreal interior and exterior images generated
  from the current camera view, geometry locked so the image matches the plan; labelled "illustrative".
- Sun study at the plot's real coordinates; massing placed on the Rasikh 3D map at the real plot.
- Furniture never changes the plan or the code checks; optional clearance warnings only. It lives on its own layer:
  never in permit drawings, off by default in DXF/IFC exports.

## 7. Office workflow, 24/7

- Clients submit briefs and receive concept options at any hour; long jobs run as queued jobs (Cloud Tasks / Cloud Run
  jobs) with progress and push notifications.
- Pipeline: Brief → Concepts → Client picks → Office develops → Discipline reviews → Approval (engineer id, SCE no.,
  timestamp, SHA-256 of every file) → Final set released → attached to the Property Health Record as construction
  documents.
- Versions, redlines and comments per sheet; clients see released versions only.
- Office quotes and invoices are recorded; no payment processing at launch.

## 8. Precedent research

- Curated, licensed precedent library: typologies and patterns tagged by climate (hot-arid), privacy, courtyards, Najdi
  elements, plot size. Store references and summaries, never copied drawings; respect copyright.
- Retrieval (RAG) over the library plus the office's private projects; every suggestion cites the precedents it drew on.
- No training on client data without explicit opt-in.

## 9. Agents (Genkit, typed inputs/outputs)

- Brief agent, Zoning/program agent, Layout ranking agent, Code-explainer agent (reads rule-engine results only),
  Drawing QA agent (missing dimensions, labels, sheets), Client explainer (plain Arabic).
- Scope classifier: architecture, engineering and real estate only.
- Never: final structural or fire-safety sign-off, stamping, legal advice, or claiming compliance for unchecked rules.

## 10. Five discipline engineers (one office, one shared IFC model)

- Architect agent: program, layout, facades (modern Najdi, Salmani, contemporary), privacy, daylight, accessibility.
  Rules: SBC 201, SBC 602 (residential energy), SBC 601 (non-residential).
- Civil/structural agent: site levels and grading, rainwater drainage, water/sewer/power connection points, fences and
  retaining walls; structural system (RC frame, flat slab, ribbed hollow-block slab), grid, preliminary member sizes,
  foundations conditional on the soil report. Rules: SBC 301–306 (incl. 303 soils & foundations, 304 concrete).
- Mechanical agent: cooling loads for the plot's climate (Riyadh hot-arid default), AC system options (split, ducted,
  VRF), ventilation, plumbing and drainage, tanks and pumps, fire protection where required. Rules: SBC 501, SBC 701/702,
  SBC 801.
- Electrical agent: lighting and power layouts, load and panel schedules, utility connection load estimate, earthing,
  low-current (CCTV, intercom, data, smart home), solar-ready roof. Rules: SBC 401.
- Industrial agent: construction sequence and schedule (Gantt), BOQ and cost range, value-engineering options with
  savings, prefab/modular feasibility, procurement list, site-supervision quality checklists, and an operations &
  maintenance manual saved to the Property Health Record.
- Coordination: clash detection on the shared model (duct vs beam, pipe vs column, panel vs door) before any release;
  each discipline's sheets approved only by an engineer of that discipline; the office's lead engineer releases the
  full set.

## 11. Renovation & restoration (الترميم)

- Existing-building intake: old permit and drawings (OCR, human confirms), photo/video walk-through, optional room scan
  on supported iPhones (Apple RoomPlan via a platform channel) to draft as-built plans; an engineer verifies dimensions
  on site.
- Condition assessment: cracks, rebar corrosion, spalling, damp and leaks, settlement, age of MEP systems; each finding
  has severity and photos with the same timestamp + SHA-256 as inspections.
- Rule pack for existing structures: SBC 2024 Code for Repair, Rehabilitation and Treatment of Existing Concrete
  Structures. Any structural change (removing a wall, new opening, extra floor, roof annex) is flagged "needs structural
  engineer + permit".
- 2–3 options (refresh / partial / full), each with scope, phased schedule and cost range; drawings show existing / to
  demolish / new in standard colours.
- Tenanted units: works scheduled around the lease, tenant notices, linked to Maintenance and the Property Health Record.
- Heritage buildings (e.g. old mud-brick Najdi houses): documentation only; flag that registered heritage sites need
  Heritage Commission approval.

## Acceptance

- ≥ 1 pass + 1 fail fixture per rule.
- Golden tests: 5 briefs (villa on 20×30 m, duplex, 4-floor apartment building, corner plot, irregular plot) yield plans
  inside setbacks and coverage.
- DXF and IFC open in a viewer without errors.
- Rules tests prove: offices cannot see each other; clients see released versions only; only verified engineers of the
  right discipline can approve; AI outputs keep the draft watermark until approval.
- Clash detection catches a seeded duct/beam clash.
- One renovation case (existing villa: scan → condition report → options) produces an existing/demolish/new set and flags
  every structural change for engineer review.
- The 3D model updates within seconds of a plan edit, and both toggles (empty/furnished, model/AI render) work on web
  and app.

## Decisions and costs to confirm BEFORE building (CLAUDE.md §8: ask before paid services or stack changes)

- Stack additions: Cloud Run + Cloud Tasks (layout engine, jobs), Python services (ezdxf, IfcOpenShell), three.js on web,
  a glTF viewer in Flutter. All need your OK.
- Paid/licensed inputs: SBC text licence (National Committee for the Saudi Building Code), licensed 3D furniture library,
  image-generation model for AI renders, precedent library licences, Vertex AI usage. None are bought by Claude.
- Legal: lawyer review of the draft-watermark wording, office/engineer terms, and client-consent for private precedents.
- Data: engineer/office verification documents are sensitive (PDPL): purpose-limited, in me-central2, admin-only access.

## Implementation status (2026-10-16)

Built on the existing free stack, without the stack additions or paid inputs listed above.

- **Where the code lives:** `packages/shared/src/engineering/` (schemas, brief reader, layout engine, rule engine, openings, discipline calculators, DXF/IFC writers, furniture placer, permit checklist, renovation, sun, precedents, workflow, option search; 55 tests), `firebase/firestore.rules` (offices, engineers, rule packs, projects, versions, approvals, comments, findings, quotes; `firebase/functions/test/rules-office.test.ts`), `firebase/functions/src/links.ts` (`inviteEngineer`), `apps/web/src/components/eng/` and the pages `/engineering`, `/design`, `/design/[id]`, the office workspace inside `/workspace`, and office verification in `/admin`. End-to-end: `apps/web/e2e/engineering.spec.ts`.
- **Layout engine:** deterministic TypeScript in the browser instead of Cloud Run; rectangular plots and rooms (front band, corridor, back band, stair core). Every habitable room and bathroom spans its band, so it reaches the corridor and an outside wall; only store rooms share a column; en-suites stay together; a bathroom in a deep band gets a closet behind it. Irregular plots and courtyard typologies are not handled yet.
- **Option search (`options.ts`):** about 1,700 variants per villa brief (stair side, band split, footprint width and side, front or back yard, mirroring, central or side entrance, dining with guests or family, master suite front or back, size). An option is offered only when it holds every requested room, passes every zoning rule and every automatic code rule (verified values, or else would pass on the starting values), every room has a proper door, and the corridor duct clears the beams. Farthest-first selection then picks 6–12 options that differ in at least two visible traits (a mirror image counts half). If nothing passes, the office sees the most frequent reasons instead of a non-compliant design. Each option is stored with its bill of quantities (17 items in 7 sections, priced with the office rates) and its check summary, so the client sees the same numbers.
- **Rule engine:** zoning checks pass/fail on the office's municipal values; building-code rules keep starting parameters that are NOT from the code text and stay "not checked" until a verified engineer of the office enters the clause and parameters from the licensed code and confirms them (per office, per rule pack version). Fire, energy, structure, electrical and plumbing are always "needs engineer".
- **Exports:** DXF R12 and IFC4 written as text (structure validated by tests; not yet opened in a CAD/BIM viewer here), glTF from the 3D model (furniture removed), PDF through the browser's A3 print.
- **Not done (needs your decisions or paid inputs):** model-written explanations (today the "why it fits" notes are deterministic and translated), voice/photo briefs and deed OCR, AI renders (image model), licensed furniture library (placeholder boxes today), SBC text licence, licensed precedent libraries and RAG, Cloud Run/Tasks jobs, push notifications, hand-off of released sets to the client's Property Health Record, the Flutter viewer, walk-through mode, massing on the Rasikh map, Apple RoomPlan scans, Python ezdxf/IfcOpenShell. Lawyer review of the watermark wording and office terms.
