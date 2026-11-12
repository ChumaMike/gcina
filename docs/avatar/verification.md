# Verification · 12 November 2026

Verified against the production Next.js build, running the existing dashboard with `USE_MOCK=1`. No production backend or database changes were made.

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass, whole web project |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm build` | Pass |
| `node --test tests/avatar-rig.test.mjs` | 4/4 pass |
| Chromium production app checks | Pass |
| Desktop 1440 × 1000 | Captured and visually inspected |
| Mobile 390 × 844 with touch | Captured and visually inspected; both hands clear, page heading reachable |
| Small mobile 320 × 568 | No horizontal overflow; panel controls reachable by scrolling |
| Landscape 844 × 390 | Panel fits; close control reachable |
| Pause | Character render loop and text progression stop |
| Reduced motion, changed while open | Stable neutral pose, no ongoing draws, rig demo disabled |
| Keyboard rotation/Home and pointer drag/reset | Rendered output changes and returns to front |
| Text selection | Mouse hover, touch and keyboard focus verified; replay and slower state work |
| Missing WebGL | Accessible fallback; text selection and close remain functional |
| Lost WebGL context | Error UI and retry successfully recreate a single canvas |
| Four repeated close/open cycles | One canvas on open, none on close; no draws after closure |
| Escape | Clears highlights and restores launcher focus |
| Browser page/runtime errors | None during the passing run |

The rig has **52,928 triangles**, 30 visible geometry resources and 14 materials. Static parts are batched within joints; the curls are instanced. Node tests sample the whole rig demo and ±17° view rotation at several aspect ratios, projecting the head and hand bounding boxes into the camera frame to catch clipping.

The browser run used **Chromium 156.0.8078.79 on Linux, Node 24.22.1 and SwiftShader software rendering**. The final production run observed **12.0 rendered frames/second and 76 draw calls/frame** in the instrumented movement study after the slow-renderer fallback. An earlier unoptimised shadow-heavy version was about 3.7 fps in this environment. These are software-renderer observations, not hardware GPU/mobile benchmarks. The renderer caps at 30 fps; confirm smoothness on the actual presentation laptop/phone. GPU-dependent shadows are disabled and pixel ratio lowered automatically when sustained frame timing is slow.

Existing unrelated project observations: Next emits its pre-existing `metadataBase` warning; the existing XRPL agent endpoint can return 502 without a reachable testnet service even in mock mode. Neither changes the avatar test result. Dependencies and lockfile are unchanged.

The standalone preview is tested over localhost because managed Chrome blocks `file:` navigation. It bundles the rig, renderer and Three.js in one HTML file, requires no external assets, and can run without an internet connection. Its control, reduced-motion and external-request checks are recorded alongside the app captures. Screenshot files are direct captures converted to WebP without compositing or retouching.
