# Avatar V2 verification

Verified the actual standalone WebGL output and the production Next.js application
using the existing dashboard's `USE_MOCK=1` mode. No production service or financial
state was changed. Baseline: `453072fa4023c872d72f33ee404120660bdc6029` on
`feat/polished-sasl-avatar`. Implementation branch: `feat/avatar-v2-voice`.

## Windows Chrome follow-up · 13 November 2026

- The updated standalone preview played the sample warning through Windows
  Chrome 157 using Microsoft David (`en-US`). The 7.48-second utterance produced
  thirteen native word-boundary events. The Windows output meter registered
  speech with silence before and after playback. The host had three `en-US`
  voices and no `en-ZA` voice. Voice naturalness was not assessed by ear.
- Native pause, resume, replay from pause, replay after Stop, cancellation and
  natural completion passed. Pausing for 1.3 seconds kept the status at
  “Reading paused.” Rendered mouth pixels changed more than the forehead
  during speech. Four additional controller regression tests passed.
- The standalone desktop and 390/320px viewport checks passed in Windows
  Chrome. Front, side, face and both hands rendered, and all ten digit controls
  changed the corresponding hand. Both hands have five distinct digits in the
  open pose. Palm-facing poses still show a pronounced wrist crease, and the
  closed-pose captures do not establish collision clearance for every digit.
- Reassigning 24 hem triangles to the teal uniform removed the skin-colored
  patch in side view. The bundled GLB is 3,080,152 bytes. It retains 74,995 triangles
  and its existing joint weights. The Blender source includes the matching
  material rule. Verification used the packaged GLB directly.
- The compact 160 × 190 rig demo on Intel UHD Graphics 617 (ANGLE/D3D11)
  rendered 29.84–30.10 fps across three four-second samples, with 11 draw calls
  per frame. No frames rendered during a one-second interval after Pause settled.
  The dashboard regression measured 30.1 fps and 11 draws per frame. These
  measurements cover one Windows machine. Physical phones were not tested.
- ESLint, TypeScript and all 17 rig, hand and speech unit tests passed. The
  styled Windows Webpack production build passed with a temporary Tailwind
  PostCSS adapter and cached official Google fonts. The default Windows
  Turbopack build failed during CSS worker IPC. The app build configuration
  stayed as committed.
- Chrome dashboard regressions passed for desktop, touch/mobile/landscape,
  keyboard, read highlights, reduced motion, WebGL loss and recovery, loading
  cancellation and teardown. The dashboard speech double also passed replay
  after Stop, highlight cleanup, selection cancellation and Escape teardown.

## Initial verification · 12 November 2026

| Check | Result |
|---|---|
| Whole-project ESLint | Pass |
| TypeScript `--noEmit` | Pass |
| Production `next build` | Pass |
| Existing rig tests, adapted for skinned GLB | 4/4 pass |
| New hand/deformation tests | 4/4 pass |
| New speech controller tests | 5/5 pass |
| Production Chromium regression script | Pass |
| Chromium voice integration script | Pass, with explicit speech double plus native unavailable-voice check |
| Standalone inspection script | Pass |
| Original compact layout | Panel ≤320px; avatar ≤160px wide × 190px tall; selected text alongside it on desktop and 390px/320px phones |
| Standalone default size | Opens compact; explicit enlargement/detail views work; Front/reset restores compact size |
| Desktop 1440 × 1000 | Captured and visually inspected |
| Mobile 390 × 844, touch | Captured and visually inspected; face, hands and primary controls remain visible |
| Small mobile 320 × 568 / landscape 844 × 390 | No horizontal overflow; controls and close reachable |
| Hover, touch, keyboard text selection | Preserved; no audio starts on selection |
| Reading highlights, replay, slower, pause/resume | Preserved |
| Pointer/keyboard rotation, Home/reset | Rendered output changes and restores correctly |
| Reduced motion, including during speech | Stable rendered pose; rig disabled; requested audio remains independent |
| Missing WebGL / context loss | Text and voice remain available; retry restores one canvas |
| Close during delayed GLB load | Fetch aborted; late completion does not revive the closed viewer |
| Repeated close/open | One canvas when open, none when closed; no ongoing draws after close |
| Escape | Cancels audio, clears highlights and restores launcher focus |
| Standalone views | Front, face, side, left/right open and closed inspected |
| Individual digits | All ten move independently through keyboard-operated curl control |
| Page/runtime errors during passing runs | None |

## Hands, model and rendering

The initial GLB was **3,078,796 bytes**, with **74,995 triangles**, **163 bones** and
**11 material primitives**. It loads on demand and needs no texture service or
compression decoder. Source assets are licensed CC0; the exact inputs and build
script are checked in. No application dependencies or lockfiles changed.

Hand tests verify that every digit is independently addressable, closing folds
fingertips toward the palm, and each wrist/palm/five-digit region is one connected
skin surface. Camera tests project deformed skin bounds through the whole demo
at four aspect ratios and the allowed turn range. The low-performance renderer's
vertex output matches GPU skinning within `1e-5` across animation, turn and blink
poses. Both open/closed hands were also inspected visually; these tests do not
claim a general collision guarantee for arbitrary future signing poses.

Rendering was measured in **Chromium 156.0.8078.79**, **Node 24.22.1**, Linux,
using **SwiftShader software rendering with no hardware GPU**. The final production
run with the compact viewport observed **10.6 rendered fps and 11 draw calls/frame** during the rig study.
An earlier V2 run was 5.6 fps; the fallback avoids expensive bone-texture work and
uses diffuse studio shading. V1's recorded result in this environment was 12 fps,
so the more detailed skinned model remains slower on this software renderer.
The 30 fps cap is a target, not a measured hardware result. Smoothness on the
presentation laptop and a physical phone still requires device verification.
Paused, reduced-motion, hidden and offscreen states stop ongoing animation work.

## Voice evidence and limits

The 5 speech unit tests cover explicit start, en-ZA preference, selected voice/rate,
reliable word boundaries, stale/out-of-range events, pause/resume, cancellation,
replacement/replay, unmount, missing boundaries, errors, unsupported APIs and a
voice that never starts. The browser integration test uses a clearly named,
deterministic SpeechSynthesis double to exercise the actual React UI and ensure
selection never autoplays, spoken highlights follow boundaries, settings work,
new selection/close cancel, replay replaces the old request, and reduced-motion
speech keeps the rendered character still.

The native Chromium check returned **zero installed voices**. Its actual Listen
failure path was exercised successfully. **Audible native speech and voice
naturalness were not verified in this environment.** The standalone HTML uses
real browser SpeechSynthesis, not the test double. Open it in Chrome on the
presentation laptop, choose an available voice, press Listen and audibly check
pause/resume and stop before the hackathon. No prerecorded or generated audio is
presented as proof of browser playback. Jaw movement is explicitly approximate;
SpeechSynthesis does not expose phonemes or its audio stream.

## Captures and review

The [gallery](README.md#actual-visual-previews) contains direct captures of the
running implementation, converted to WebP without compositing or retouching.
`v2/voice-controls-test-double.webp`, if inspected, is explicitly a UI test capture
with simulated speech events; it is not evidence of audible playback. V1 captures
are retained for comparison. The HTML was tested over localhost because this
managed Chrome blocks `file:` navigation. It bundles the GLB and Three.js inline.

The only build observation outside this work is the existing Next `metadataBase`
warning. This change does not alter the financial dashboard, AI payment agent,
policy engine or blockchain integration. No merge or production deployment was
performed. The draft PR awaits character review and presentation-device voice/GPU
checks before any merge decision.
