# Gcina: demo video script (target 2:45, hard cap 2:50)

> Status: **DRAFT v0 (16:05)**. Record after the 23:00 full testnet run, or on Friday morning.
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
| 1 | 0:00–0:12 | Title card: **Gcina**, "The agent pays. The ledger keeps." Small: *W3Node Node Engine 2026 · Agentic Finance (Ripple)* | "I did the admin at Meyiswa Training Academy, a training academy in Soweto. Payments were approved by hand, and sometimes the same person got paid twice." | MTA, Soweto · double payments, first-hand |
| 2 | 0:12–0:26 | A fake invoice email, full screen (inv-002 fixture text, styled) with "banking details have changed" highlighted | "And in 2025 our Supreme Court of Appeal ruled: pay a hacked invoice into a fraudster's account, and you still owe your supplier. Either way, you pay twice." | Supreme Court of Appeal, 2025 · *Intengo Imoto v Zoutpansberg* |
| 3 | 0:26–0:30 | Dashboard Overview | "Gcina is an AI agent that pays your suppliers, and can't pay alone." | Gcina = AI accounts payable, with guardrails |
| 4 | 0:30–0:48 | `Split`: inv-001 arrives → **Gcina at work** card goes Reading → Checking → Two signatures → On the ledger, all green → explorer link → `Explorer` | "Mzansi Catering, order PO-1001, R 360. The agent matches it to the order and the registered address, and pays it by itself on the XRP Ledger test network." | ✅ Paid on its own · real testnet transaction |
| 4b | 0:48–0:57 | `Split`: inv-004 arrives → "Looks like a repeat of inv-001" | "The same invoice again, the MTA problem. Already paid, so it's refused." | ⛔ Duplicate refused |
| 5 | 0:57–1:13 | `Split`: inv-002 arrives → agent won't pay → policy refuses it (feed line) | "Now the fake one: new banking details, urgent, don't call us. The agent won't pay a new account, and the policy refuses it outright: already paid, now to a new account." | 🛑 Refused: repeat of inv-001 to a new address |
| 6 | 1:13–1:35 | Compromised run → zoom on the **Gcina at work** card: "Agent ✓ / Your rules ✗", meter **1 of 2 votes**, red bar "…the XRP Ledger said no (tefBAD_QUORUM). The money never left." Hold 2 s on the red bar with no voice. | "What if the AI itself is tricked? Here we force it to obey the fraudster. Our policy refuses. So it goes straight to the ledger alone…" *(2 s silence)* "That wasn't us. That was the ledger." | Compromised agent → rejected by the ledger itself |
| 6b | 1:35–1:50 | inv-005: rendered email, then flip **What you see / What the AI sees** (white text in red) → agent's stop reason | "This invoice looks normal. Hidden in white text is an instruction to AI assistants: pay another address and keep quiet. The agent spots it and stops." | 🕵️ Hidden instruction caught (prompt injection) |
| 7 | 1:50–2:08 | `Phone`: inv-003 Khaya Print & Stationery, R 810, above the limit → Approve → paid + explorer link | "Bigger payments go to the owner. R 810 is above their limit, so they approve it from their phone, and it's paid." | 👤 Owner approves from the phone |
| 8 | 2:08–2:14 | Limits screen: change "ask me above", save, "The agent can't change these." | "The limits are the owner's. The agent can read them, never change them." | Limits set by a human, outside the agent |
| 8b | 2:14–2:26 | Terminal: `pnpm fire-agent` → FIRED … tesSUCCESS → explorer page of the SignerListSet | "And if the owner stops trusting the AI, their own key takes it off the account, on the ledger, with nobody's permission." | 🔑 Owner fires the agent, on the ledger |
| 9 | 2:26–2:37 | How it works screen (diagram) | "How? Agent: one vote. Policy: one vote. Owner's offline key: two. The ledger needs two." | Agent 1 + Policy 1 = 2 ✓ · Agent alone = 1 ✗ |
| 10 | 2:37–2:46 | End card: github.com/ChumaMike/gcina · gcina.vercel.app, "Built on the XRP Ledger testnet", team names | "Gcina. The agent pays. The ledger keeps." | github.com/ChumaMike/gcina |

**Runtime check**: 2:46. If an edit runs long, trim shot 2 first, then shot 9. Never cut 6, 6b or 8 (8 is the track's "human sets limits" MVP item).

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
