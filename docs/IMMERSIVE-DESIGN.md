# Immersive redesign — "Najd Dusk, in motion"

Concept: **every lit window is a documented home.** A Najdi street at dusk is the backdrop of the whole entry experience.
As you scroll (web) or swipe (app) the camera moves down the street, the sun sinks and more windows light up.
Original artwork, no stock assets, one brand colour (clay), same palette and motion curve as the tokens.

## Web (`apps/web`)

| Piece | Where | What it does |
|---|---|---|
| 3D city | `src/lib/scene/NajdScene.ts` | three.js, instanced: ~150 towers, ~5k shurfa pyramids, ~6k triangular windows (custom shader: lit by scroll progress and by pointer proximity), sky shader with sun, ground sunset reflection, embers. Camera follows a Catmull-Rom path with one keyframe per section. |
| Loader | `components/immersive/SceneBackdrop.tsx` | Persistent canvas. Starts on the visitor's **first real input** (or after 8 s), builds in time slices, adaptive quality (drops DPR, then falls back to the poster). Calm "ambient" mode on sign-in/onboarding; off elsewhere. |
| Scroll engine | `ScrollEffects.tsx` | Inertial smooth scroll (fine pointers), reveal-on-view, `--p` progress variables, pinned steps (`data-step`). |
| Kinetic type | `SplitWords.tsx` + CSS | Words rise out of masks; works without JS. |
| 3D tilt | `Tilt.tsx` | Cards tilt toward the pointer with a moving clay highlight and depth layers. |
| Others | `Magnetic.tsx`, `CursorGlow.tsx`, frieze, doorway of three arches with parallax, line-drawing timeline, pinned "how it works" | |

Fallbacks: no WebGL / save-data / low memory / slow device → illustrated dusk poster (`public/hero-dusk.svg`, generated from `HeroScene`).
Reduced motion → one still frame, no entrance animation, no pin, no smooth scroll, nothing hidden.
Automated browsers (`navigator.webdriver`) skip the 3D unless a test sets `window.__RK_FORCE_SCENE = true`.

## App (`apps/mobile`)

`widgets/live_city.dart`: the same street in true one-point perspective (CustomPainter, no assets): camera dolly driven by the intro
page position, windows light up, embers, pointer/finger sway, reduced-motion still frame. Intro pages move the camera; sign-in and
onboarding sit on a translucent panel over an ambient city; the map tab uses it as the stand-in for the live 3D map.
Dock: sliding clay pill, haptic tick, cross-fading tabs, staggered entrances (`Reveal`), press-scale on buttons (`Pressable`).

## Measured

- Lighthouse mobile (simulated slow 4G, production build, 3D scene included): performance **92 (ar) / 96 (en)**, accessibility 100, best-practices 96, SEO 100. CLS ≤ 0.02. TBT 40–150 ms.
- axe (WCAG A/AA/2.2 AA): 0 violations on the landing with the scene **off** and with the scene **on**.
- Tests: web e2e 51 passing (new: scene boot, WebGL-less fallback, reduced motion, pinned steps, tilt, axe with scene); Flutter 27 passing.

## Known gaps

- Software WebGL was used for every screenshot and test; real-GPU frame rates (60 fps target) are **not yet measured** on phones.
- Arabic LCP remains 3.0 s in the simulation (headline waits for Reem Kufi); font subsetting planned for Phase 9.
- App screenshots are the Flutter web build; Android/iOS builds not run (no Android SDK; iOS needs macOS).
- The scene is a stand-in for the Phase 3 live map (Mapbox) on the map tab and property pages.
