# Where the UI components came from

Components copied or adapted into `web/src/components/ui/`, re-tokened to Gcina's CSS variables
(`--primary`, `--ok`, `--gold`, `--danger`, `--agent`, …), checked at 360 px and 1440 px, and made to
respect reduced motion (the OS setting and Gcina's own "Reduce motion" switch).

The 21st.dev registry (`https://21st.dev/r/...`) needs a signed-in account for downloads, so where a
21st.dev listing mirrors an open-source library we took the source from that library's public registry
and record the URL we actually downloaded. 21st.dev answers every path with a page, so we do not list 21st.dev URLs we could not open signed in.

| File | Listing on 21st.dev | Source taken from | Licence | What we changed |
|---|---|---|---|---|
| `animated-list.tsx` | Magic UI Animated List (mirrored on 21st.dev) | https://magicui.design/r/animated-list.json (Magic UI) | MIT | Rewritten with the CSS `reveal` utility instead of the `motion` library (no new dependency); stable keys so only new rows slide in; staggered delay capped at 8 rows. |
| `hold-to-confirm.tsx` | 21st.dev search "hold to confirm" (pattern only, no listing copied) | Written for Gcina after that pattern | ours | Touch, mouse and keyboard (hold Space/Enter); letting go cancels; fill shown even with reduced motion because it is feedback; a "Can't hold? Tap here" route next to it on Approvals. |
| `empty-state.tsx` | 21st.dev search "empty state" (pattern only, no listing copied) | Written for Gcina | ours | Photo + one sentence + one action, using `next/image` and the `lift` surface. |
| `number-ticker.tsx` (C) | Magic UI Number Ticker (mirrored on 21st.dev) | https://magicui.design/r/number-ticker.json (Magic UI) | MIT | C's file: requestAnimationFrame count-up without `motion`; jumps straight to the value with reduced motion. |

Magic UI: https://github.com/magicuidesign/magicui (MIT, © Magic UI).
Photos are credited separately in `web/public/photos/CREDITS.md`.
