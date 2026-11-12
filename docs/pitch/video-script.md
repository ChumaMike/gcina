# Gcina: demo video script (target 2:48, hard cap 3:00)

**Voice: Chuma**, one voice for the whole video (first-hand story; recorded after the screen takes). Dalindyebo drives the
screen recording. The limit is 3 minutes (CONTRACTS.md); we aim for 2:48 to leave room.

> Status: **v2 (12 Nov, 22:30)**: matches the live dashboard (Gcina at work card, What the AI sees, judge-free). Record Friday morning.
> Upload: YouTube **Unlisted** (or Drive, "anyone with the link"). Title: *Gcina: the agent pays, the ledger keeps (W3Node Node Engine 2026, Agentic Finance)*.

## Recording plan

- **Tool**: OBS Studio (preferred: separate scenes, clean audio). Fallback: Windows Snipping Tool → Record
  (Win + Shift + R), which records the screen only, so record the voice-over separately and join them in Clipchamp.
- **Canvas**: 1920×1080, 30 fps. Browser zoom 125%, terminal font 20 pt, dark terminal theme.
- **OBS scenes**:
  1. `Dashboard`: the browser window (deployed `gcina-web`).
  2. `Split`: dashboard left 60%, agent terminal right 40%.
  3. `Phone`: phone mirrored (scrcpy over USB, or the dashboard in Chrome DevTools at 360×780 as a stand-in, labelled).
  4. `Explorer`: testnet explorer tab.
- **Audio**: record the voice-over **separately**, after the screen takes, reading the script below. Use a headset mic in a quiet room and normalise to −16 LUFS.
- **Edit**: Clipchamp (built into Windows). Cut waiting time (the ledger confirms in seconds, but trim the dead air anyway), add captions, and add the title cards.
- **Before recording**: Do Not Disturb on, close everything else, no bookmarks bar, **no `.env`, seeds, tokens or emails visible anywhere**, browser profile with no personal tabs.

## Shot list + voice-over

| # | Time | Scene / what's on screen | Voice-over | Caption (burned in) |
|---|---|---|---|---|
| 1 | 0:00–0:14 | Title card: logo + **Gcina**, "The agent pays. The ledger keeps." Small: *W3Node Node Engine 2026 · Agentic Finance (Ripple / XRPL)* | "I'm Chuma. I did the admin at a training academy in Soweto, and sometimes the same person got paid twice." | MTA, Soweto · double payments, first-hand |
| 2 | 0:14–0:30 | The fake inv-002 email full screen, "our banking details have changed" highlighted | "The other way to pay twice: a fake 'new banking details' email. In 2025 our Supreme Court of Appeal ruled that if you pay it, you still owe your real supplier." | Supreme Court of Appeal, 2025 |
| 3 | 0:30–0:42 | Dashboard Overview, **Gcina at work** card + **See it on the public ledger** card | "Gcina is an AI agent that pays your suppliers. But its account on the XRP Ledger needs two votes, and the agent only has one." | Agent 1 vote · Your rules 1 · Owner 2 · Ledger needs 2 |
| 4 | 0:42–1:00 | inv-001 arrives → card: Reading → Checking → Two signatures → On the ledger, all green → explorer page | "Mzansi Catering, order PO-1001, R 360, to their registered address. The agent reads it, our rules co-sign, and it's paid in RLUSD on the test network. No human." | ✅ Paid on its own · real testnet transaction |
| 5 | 1:00–1:09 | inv-004 arrives → card stops red at Checking | "The same invoice again: refused as a repeat." | ⛔ Duplicate refused |
| 6 | 1:09–1:23 | inv-002 arrives → card stops red, reason in plain words | "The fake banking details: an invoice that's already paid, now to a new account. Refused outright." | 🛑 Fake banking details refused |
| 7 | 1:23–1:45 | Compromised run: card shows "Agent ✓ / Your rules ✗", meter **1 of 2 votes**, red bar. Hold 2 s silent on the bar. | "What if the AI itself is tricked? We force it to obey the fraudster. Our rules refuse, so it goes to the ledger alone…" *(2 s silence)* "That wasn't us. That was the ledger." | The XRP Ledger refused the agent on its own |
| 8 | 1:45–2:00 | inv-005: rendered email → flip **What you see / What the AI sees** (white text in red) → card stops at Reading | "This one hides an instruction in white text, telling AI assistants to pay another address. The agent spots it and stops." | 🕵️ Hidden instruction caught |
| 9 | 2:00–2:16 | Phone view: inv-003 Khaya Print & Stationery, R 810, held → **Approve** → paid + QR | "Bigger payments go to the owner. R 810 is above their limit, so they approve it on their phone." | 👤 Owner approves from the phone |
| 10 | 2:16–2:23 | Limits: change "ask me above", save, "The agent can't change these." | "The limits are the owner's. The agent can read them, never change them." | Limits set outside the agent |
| 11 | 2:23–2:34 | Terminal `pnpm fire-agent` → FIRED … tesSUCCESS → explorer page | "And the owner can fire the agent, on the ledger, with their own key." | 🔑 Owner fires the agent, on the ledger |
| 12 | 2:34–2:40 | Accessibility sheet: language list (11), text size, Listen | "In all 11 written official languages, on the phone." | 11 languages · screen-reader friendly |
| 13 | 2:40–2:48 | End card: logo, github.com/ChumaMike/gcina · gcina.vercel.app, team names | "Gcina. The agent pays. The ledger keeps." | github.com/ChumaMike/gcina |

**Runtime check**: 2:48. Running long: trim shot 2, then 12. Never cut 4, 7, 9 or 10 (10 is the track's "human sets limits" item).

## Captions

- Burn in the short captions above (Clipchamp text, bottom third, white on 60% black, 48 px).
- Also upload a full `.srt` to YouTube generated from the voice-over (YouTube auto-captions, then correct
  "Gcina", "Meyiswa", "Zoutpansberg", "Mzansi", "Khaya", "XRP Ledger" by hand).
- After recording shot 8b, run `pnpm rehire-agent` before anything else.

## Checks before uploading

- [ ] ≤ 2:50 on the final export.
- [ ] Every tx hash shown on screen is also in `docs/demo-evidence.md` and the README.
- [ ] No seeds, tokens, `.env` files, personal phone numbers or emails visible in any frame (scrub through at 2× speed).
- [ ] **No `/judge` QR code in any frame**: it carries the judge passcode in the link. Show judge mode only live, in the room.
- [ ] Link set to Unlisted / "anyone with the link", tested in an incognito window.
- [ ] Link added to the README and the BuilderBase submission.
