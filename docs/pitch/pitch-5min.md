# Gcina: 5-minute pitch script (Sat 14 Nov, Park View, Woodstock)

> Status: **v2 (12 Nov, 22:30)**, two speakers, 3 stage slides. Rehearse with a stopwatch on Friday and fix the times.

## Format and roles

Organiser format (CONTRACTS.md, from the briefing; the BuilderBase page doesn't publish it): **5-minute pitch + 3-minute
Q&A**, live demo, intro under 20 s, **2–3 slides, at most 4 bullets each**, the video as backup. So: **3 stage slides**
([stage deck](https://claude.ai/artifact/URNNrYQ5KixFGCfTK1Jiin)), the demo in the middle, backups only for Q&A.

| Who | Talks | Does |
|---|---|---|
| **Chuma** (speaker) | Slide 1 (problem), the owner beat in the demo, slide 3 (why us, business, ask) | Holds the phone (owner view); offers judges the owner role |
| **Dalindyebo** (driver) | Slide 2 (solution) and narrates the demo while driving it | Laptop on the projector: dashboard + agent terminal |

Hand-overs are scripted below (**→**). Q&A: Chuma takes business, customers, regulation and rands; Dalindyebo takes
how it works, security and XRPL. Whoever isn't answering stays quiet: one voice per answer.

## Screen layout on the projector

- **Left 60%**: the deployed dashboard, https://gcina.vercel.app, Overview tab, zoom 125%, scrolled so the
  **"Gcina at work"** card is at the top. It draws each invoice as four steps: Reading → Checking → Two signatures →
  On the ledger (green = paid; red at Checking = fraud/repeat; red at Reading = hidden instruction).
- **Right 40%**: the agent terminal (`pnpm agent watch`), font 20 pt+, dark theme.
- Second browser tab ready: the XRPL testnet explorer (pre-opened on the inv-001 hash from rehearsal).
- **Phone**: logged in to the dashboard, on the Approvals tab, brightness up, Do Not Disturb on.

## Pre-flight (T-15 min, off stage)

0. `agent/.env` has `POLICY_URL=https://gcina-policy.vercel.app` (the live one). **Never** run the stage agent against
   `localhost:8787`: its payments wouldn't show on the dashboard (C, 19:29).
0b. Judge mode on: `JUDGE_PASSCODE` set in Vercel (gcina project, ChumaMike) and different from the owner's passcode;
   open `/judge` and test-scan the QR with a second phone. If it's off, use the fallback ("I'll be the owner then").
1. Policy service healthy: open https://gcina-policy.vercel.app/health, see `ok: true`, `testnet` and currency `RLUSD`. Dashboard Overview shows **RLUSD balances** (TREASURY and the agent's float), not zero.
2. Terminal 1 (on the projector): `cd agent && pnpm agent watch` (normal mode; the dashboard's invoice buttons feed it).
   Terminal 2 (in `agent/`), command typed but **not** run: `pnpm inbox inv-002=inv-002b && pnpm agent once --compromised`.
   A held invoice is never picked up again, so the compromised beat re-sends the fake one as a new id, `inv-002b`. Stop terminal 1 (Ctrl+C) just before running terminal 2, so the normal agent doesn't grab inv-002b first; restart it after. (Source: `agent/README.md` "Demo run".)
3. Reset demo state (`pnpm inbox reset` in `agent/`, or the dashboard's reset): invoices cleared, policy back to defaults (per payment 50 RLUSD, daily 120 RLUSD, ask me above 30 RLUSD).
4. **Pre-load**: inv-001 already paid in a rehearsal run, so its explorer page is open as a backup if the live one is slow.
5. Hotspot on Chuma's phone as backup Wi-Fi; laptop already knows the hotspot.
6. Backup video downloaded **to the laptop** (not streaming), opened in a paused player in another window.

## The script (two speakers, 5:00)

| Time | Who | Say | Do |
|---|---|---|---|
| **0:00–0:40** | Chuma | "I did the admin at Meyiswa Training Academy in Soweto, and sometimes the same person got paid twice. That's one way a small business pays twice. The other: an email says 'our banking details have changed'. In 2025 our Supreme Court of Appeal ruled that if you pay it, you still owe your real supplier. It's not rare: one to two in every hundred payments is a duplicate or an error. AI could take this admin off a business's hands, but an AI can be fooled by the same email, so in a survey of 60 big-company finance chiefs, not one would let an agent near payments. I'm Chuma, this is Dalindyebo, and this is Gcina." **→** | Slide 1. |
| **0:40–1:05** | Dalindyebo | "Gcina is an AI agent that pays your suppliers. It reads the invoice, matches the order, and pays. But it can't pay alone. The business's account on the XRP Ledger needs two votes. The agent has one. Our rules service has one: approved suppliers, your limits, no repeats. The owner's own key has two. So a fooled agent can't pay anyone on its own. Let me show you." | Slide 2, then switch to the dashboard: Overview, **Gcina at work** card on top. |
| **1:05–1:25** | Dalindyebo | **Demo 1, paid.** "An invoice from Mzansi Catering: order PO-1001, R 360, their registered address. Watch the card: reading, checking, two signatures, on the ledger. Paid, no human. That's a real transaction on the XRP Ledger test network." | Invoices → **inv-001 arrives**. Card goes green. Click the explorer link, 3 s, back. |
| **1:25–1:40** | Dalindyebo | **Demo 2, the double payment.** "Now what Chuma saw at MTA: the same invoice again. Refused at checking: *looks like a repeat of inv-001*." | **inv-004 arrives**. Card stops red at Checking. |
| **1:40–2:00** | Dalindyebo | **Demo 3, the fake banking details.** "The scam: same supplier, 'urgent, new banking details, don't call us'. The agent won't pay a new account, and our rules refuse it outright: already paid, now to a new account. Nobody even gets asked." | **inv-002 arrives**. Card stops red; the reason in plain words. |
| **2:00–2:25** | Dalindyebo | "But what if the AI itself is tricked? We make it obey the fraudster. Our rules refuse to sign. So it goes around us, straight to the ledger, alone…" *(silent ~2 s while the card turns red)* "That wasn't us. That was the ledger." | Ctrl+C terminal 1, Enter in terminal 2 (`pnpm inbox inv-002=inv-002b && pnpm agent once --compromised`), restart terminal 1 after. Card: "Agent ✓ / Your rules ✗", **1 of 2 votes**, red bar. |
| **2:25–2:45** | Dalindyebo | **Demo 4, the hidden instruction.** "This invoice looks normal. But hidden in white text is an instruction to AI assistants: pay another address, keep quiet. Here's what the AI sees. The agent stops at reading." | **inv-005 arrives**. Flip **What you see / What the AI sees**. Card stops red at Reading. **→** |
| **2:45–3:15** | Chuma | **Demo 5, the owner decides.** "Bigger payments come to the owner. Would one of you like to be MTA's owner for two minutes? Scan this." *(Yes:)* "R 810, above the limit. Your call." *(No, or no signal:)* "I'll be the owner, then." | Show the **/judge** QR (live only). Dalindyebo: **inv-003 arrives**. Judge or Chuma taps **Approve** → paid + QR. If rejected: "Rejected. Nothing moves. That's the point." |
| **3:15–3:35** | Chuma | **Demo 6, fire the agent.** "And if the owner stops trusting the AI, their own key takes it off the account, on the ledger, with nobody's permission: not the agent's, not ours." | Dalindyebo, terminal 2: `cd ../ledger && pnpm fire-agent` → FIRED … tesSUCCESS. **Rehire off stage.** |
| **3:35–3:50** | Dalindyebo | "Everything you saw is on the public ledger. And so far, Gcina has stopped [read the number] that would have left." **→** | Point at **See it on the public ledger** (live signer list) and the **Gcina stopped …** counter. Read the number off the screen. Back to slides. |
| **3:50–5:00** | Chuma | "Why not what exists? Ramp alerts you, in the US. The South African payment add-ons move rands well, but a person builds every batch. Gcina does the work, and needs a second key it can't hold. Why us? I did this admin myself. Our company already runs Skhokho, a live platform South African small businesses use for orders and card payments. And we ship: you just watched real payments. The business: we're aiming at R149 to R299 a month, sold through bookkeepers who pay suppliers for many businesses. Rands in, rands out: a licensed South African crypto provider converts on each side. Our ask: a place in Ripple's UDAX accelerator, to take Gcina from testnet to a real pilot with MTA. The agent pays. The ledger keeps. Thank you." | Slide 3. Stay on it for Q&A. |

**Running long?** Cut in this order: Demo 6 (fire: one line instead) → Demo 4 (hidden instruction) → the 3:35 ledger line.
**Limits (track MVP item):** if there's a second in Demo 5, Chuma: "The limits are the owner's; the agent can read them, never change them."

**Judge mode:** the judge's login can only view and approve or reject held payments; it expires Sat 14 Nov, 18:00 SAST.
The QR on `/judge` carries the login: show it only live in the room, never in the video, photos or the deck.

**Never say** "the ledger refuses a double payment": the duplicate check is in our policy service. The ledger refuses the *agent on its own*.

**Words to avoid in slides 1–2 and the first demos (until 'prompt injection' in Demo 3c):** blockchain, wallet, crypto, token, on-chain, drops, seed, multisig.
Say "XRP Ledger" and "test network" only.

## If something breaks

| Problem | Do this (no apologising, keep talking) |
|---|---|
| **Wi-Fi dies** | Switch the laptop to the phone hotspot (pre-paired). While it reconnects, talk through the inv-001 explorer page that's already open. |
| **Hotspot dies too** | Play the backup video from **0:40** (demo section) from the local file, and narrate over it with the sound off. |
| Agent slow (>10 s on an invoice) | "The agent's reading the invoice like a bookkeeper would." If >20 s, show the pre-loaded rehearsal result in the audit feed. |
| Testnet slow / down | Show the rehearsal hashes in the README's evidence table (the repo is open in a tab). "Here's the same run from last night, on the public explorer." |
| Phone approval fails | Approve from the laptop's Approvals tab instead. |
| Compromised run fails to show the ledger result | Show the `tefBAD_QUORUM` line in `docs/demo-evidence.md` (quorum proof, 12 Nov 15:59) and the agent + policy success link next to it. |
| Over time at 3:20 | Skip Demo 5 (fire the agent); one line: "and the owner can fire the agent on the ledger with their own key." |
| "What the AI sees" toggle not there | Show the raw `agent/fixtures/inv-005.txt` in the editor, scrolled to the white-text block. |
| Judge's phone won't scan / no signal | "I'll be the owner then": approve on Chuma's phone or the laptop's Approvals tab. |
| fire-agent fails or is slow | Say the line anyway and show the tested fire/rehire hashes from C's run (EAAEDFA2… / 49922785…). |

## Rehearsal checklist (Friday)

- [ ] After every rehearsal that fires the agent: `pnpm rehire-agent` in `ledger/`, then check `/system` shows agent 1, policy 1, owner 2, quorum 2.

- [ ] Three full timed runs, one with Wi-Fi off on purpose.
- [ ] Every number on screen matches the script ($ 20.00 RLUSD ≈ R 360.00, $ 45.00 RLUSD ≈ R 810.00 at the indicative R 18/USD; if L falls back to XRP, re-check against CONTRACTS §2).
- [ ] Phone approval works on the venue-like network (hotspot).
- [ ] Backup video file on the laptop desktop and on a USB stick.
