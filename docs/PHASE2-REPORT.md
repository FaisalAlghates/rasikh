# Phase 2 report — Design system + signature screens

Date: 2026-10-11. Screenshots: `docs/screenshots/phase2/{before,after,flow}` (web 1440px + 390px, Flutter app at 390px).

## What shipped

**Web (Next.js)** — `apps/web/src/components/ui`: Button, IconButton, Field/Input, Select, Dialog, Sheet, Tabs, Card, StatTile, StatusDot,
PropertyCard, Timeline, EmptyState, Toast, Skeleton, GlassPanel, ArchImage, ShurfaDivider, ShurfaLoader (Radix primitives + tokens).
`/design-lab` shows every component in light **and** dark side by side, in Arabic and English (language link + theme toggle).
Landing page: full-bleed dusk hero with one headline, role fork, 3 steps, Property Record story (timeline, labelled as an example),
insights teaser, trust section, footer CTA. No fake numbers or testimonials (asserted by an e2e test).

**App (Flutter)** — `apps/mobile/lib/widgets`: RkButton, RkIconButton, RkField, RkSelect, sheet/dialog/toast helpers, RkTabs, RkCard,
StatTile, StatusDot, PropertyCard, RkTimeline, EmptyState, Skeleton, GlassPanel (solid fallback), ArchImage, ShurfaLoader, ShurfaDivider,
HeroScene. Gallery screen (debug builds: Profile → Component gallery) with theme + language switches. 3-screen intro, signed-in shell
with four destinations and the floating glass dock (the one glass layer per screen).

## Self-critique loop (web landing + lab + app)

| # | Gap found (against the design principles) | Fix |
|---|---|---|
| 1 | Reem Kufi used at 20–28 px (brief: large sizes only); tashkeel collided in cards | Small headings use IBM Plex Sans Arabic semibold; Reem Kufi only ≥ 40 px |
| 2 | Hero sub-copy (stone on clay-lit sky) below AA contrast | Sand at 90 % |
| 3 | Tallest tower collided with the CTA buttons | Scene towers scaled to 80 %; headline zone kept clear |
| 4 | Dead black band under the hero skyline | Ground band reduced, scene re-anchored |
| 5 | Role cards had no affordance | Mirrored arrow (RTL-aware) + hover shift |
| 6 | Insights skeleton read as broken UI | Bar-chart placeholder + explicit "coming in a later release" caption |
| 7 | Arch image showed an empty dark arch with a hard rectangle at the bottom | Portrait crop of the scene (`crop="arch"`) |
| 8 | Arabic display line-height 1.15 clipped diacritics | 1.3 for Arabic display |
| 9 | Error state invisible: `.hairline` (unlayered CSS) beat `border-danger` | Moved `.hairline` into `@layer components` |
| 10 | Property card truncated title/place to "…" in narrow columns | `line-clamp-2` instead of single-line truncate |
| App 11 | Auth helper text garbled: whole field forced LTR inside an RTL page | Only the input is LTR; label/helper keep page direction; `+966` prefix wrapped in LRM |
| App 12 | StatTile/EmptyState shrank to content width in the gallery | Blocks stretch to full width |
| App 13 | Helper/error text used default (too large, wrong colour) styles | Theme `helperStyle`/`errorStyle` at 13 px, muted/danger tokens |
| App 14 | Map tab scene cropped to empty sky + two far towers | `focusX` crop keeps the near Najdi towers in frame |

## Acceptance

- Lighthouse (mobile, simulated slow 4G, production build): **performance 93 (ar) / 99 (en)**, accessibility 100, best-practices 96, SEO 100.
  LCP 3.0 s (ar) / 2.1 s (en); CLS 0; TBT 40 ms.
- WCAG: axe-core run (A + AA + 2.1/2.2 AA rules, including colour contrast) on landing (ar, en) and the lab: **0 violations**.
  Token contrast pairs are also enforced at build time.
- Reduced motion: `prefers-reduced-motion` stops the entrance animation (e2e-tested); Flutter loaders/skeletons stop with the platform's "disable animations".
- Tests this phase: web e2e 34 total (20 new), Flutter 23 (13 new) — all passing.

## Known gaps

- **Arabic LCP is 3.0 s (target < 2.5 s).** The LCP element is the headline waiting for the Reem Kufi web font. Plan (Phase 9): subset the font to the
  glyphs the product uses and self-host it.
- **iOS and Android screenshots were not produced** (no Android SDK on this machine; iOS needs macOS). App screenshots are the Flutter web build at 390 px.
- **Flutter web phone sign-in** against the Auth emulator asks Google for reCAPTCHA parameters and fails; email sign-in works. Phone auth on web is not a product
  target (app = Android/iOS). It works from the Next.js site. To be verified on a real device in Phase 9.
- Fonts in the Flutter app are fetched at runtime by `google_fonts`; bundle them as assets before store release (offline + privacy).
- Hero is a static illustration until Phase 3 replaces it with the live 3D map.
- The Flutter gallery is debug-only and shows one theme at a time (toggle), whereas the web lab shows both side by side.
- Intro is shown on every signed-out launch (not persisted).
