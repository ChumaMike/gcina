# Gcina: 5-minute pitch script (Sat 14 Nov, Park View, Woodstock)

> Status: **DRAFT v0 (16:00)**. Timings are targets; rehearse with a stopwatch and fix them on Friday.
> **[R?]** = waiting on research, **[EV?]** = waiting on `docs/demo-evidence.md`.

## Roles

| Who | Does |
|---|---|
| **Speaker (Chuma)** | Talks, holds the phone (owner view), does the approval live |
| **Driver** (teammate, or Chuma with a clicker if solo) | Laptop on the projector: dashboard + agent terminal |

If Chuma is solo: the laptop shows the dashboard and the terminal side by side, the phone is mirrored or
just held up, and every click below is his.

## Screen layout on the projector

- **Left 60%**: the deployed dashboard, https://gcina.vercel.app, Overview tab, zoom 125%.
- **Right 40%**: the agent terminal (`pnpm agent watch`), font 20 pt+, dark theme.
- Second browser tab ready: the XRPL testnet explorer (pre-opened on the inv-001 hash from rehearsal).
- **Phone**: logged in to the dashboard, on the Approvals tab, brightness up, Do Not Disturb on.

## Pre-flight (T-15 min, off stage)

0. `agent/.env` has `POLICY_URL=https://gcina-policy.vercel.app` (the live one). **Never** run the stage agent against
   `localhost:8787`: its payments wouldn't show on the dashboard (C, 19:29).
1. Policy service healthy: open https://gcina-policy.vercel.app/health, see `ok: true`, `testnet` and currency `RLUSD`. Dashboard Overview shows **RLUSD balances** (TREASURY and the agent's float), not zero.
2. Terminal 1 (on the projector): `cd agent && pnpm agent watch` (normal mode; the dashboard's invoice buttons feed it).
   Terminal 2 (in `agent/`), command typed but **not** run: `pnpm inbox inv-002=inv-002b && pnpm agent once --compromised`.
   A held invoice is never picked up again, so the compromised beat re-sends the fake one as a new id, `inv-002b`. Stop terminal 1 (Ctrl+C) just before running terminal 2, so the normal agent doesn't grab inv-002b first; restart it after. (Source: `agent/README.md` "Demo run".)
3. Reset demo state (`pnpm inbox reset` in `agent/`, or the dashboard's reset): invoices cleared, policy back to defaults (per payment 50 RLUSD, daily 120 RLUSD, ask me above 30 RLUSD).
4. **Pre-load**: inv-001 already paid in a rehearsal run, so its explorer page is open as a backup if the live one is slow.
5. Hotspot on Chuma's phone as backup Wi-Fi; laptop already knows the hotspot.
6. Backup video downloaded **to the laptop** (not streaming), opened in a paused player in another window.

## The script

Deck order (Chuma, 12 Nov): slides 1–3 → live demo → slides 4–6. Full slide wording: [`slides.md`](slides.md).

| Time | Say (Speaker) | Do (Driver / Speaker) |
|---|---|---|
| **0:00–0:30** | Slide 1 script (MTA, two ways to pay twice, AI can be fooled). Ends: "I'm Chuma, this is Dalindyebo, and this is Gcina." | Slide 1 (problem). |
| **0:30–0:55** | Slide 2 script (court ruling, SABRIC, 1–2 in 100 payments, 54% vs 0 of 60, the banks' advice). | Slide 2 (evidence). |
| **0:55–1:15** | Slide 3 script (one vote each, the ledger needs two). Ends: "Let me show you." | Slide 3, then switch to the dashboard. |
| **1:15–1:35** | **Demo 1: paid on its own.** "An invoice from Mzansi Catering: order PO-1001, R 360, to their registered address. The agent reads it, checks it, and pays. No human. That's a real transaction on the XRP Ledger test network, with the invoice number on it." | Invoices → **inv-001 arrives**. When "paid" shows, click the explorer link, 3 s, back. |
| **1:35–1:50** | **Demo 2: the double payment.** "The thing I saw at MTA: the same invoice again. Refused: *looks like a repeat of inv-001*. No second payment." | **inv-004 arrives**. Point at the refusal in the feed. |
| **1:50–2:10** | **Demo 3: the fake banking details.** "Now the scam: same supplier, 'urgent, new banking details, don't call us'. The agent won't pay a new account, and the policy refuses it outright: an invoice that's already paid, now to a new account. Nobody even gets asked." | **inv-002 arrives**. Point at "Looks like a repeat of inv-001 … different address. Possible changed-banking-details fraud." No Approve button. |
| **2:10–2:35** | "But what if the AI is tricked? Let's be the attacker: the agent now obeys the fraudster. It signs. Our policy refuses to co-sign. So it goes around us, straight to the ledger, alone. And the **XRP Ledger itself says no**: not enough signatures. Not our code. The ledger." | Driver: Ctrl+C terminal 1, Enter in terminal 2 (`pnpm inbox inv-002=inv-002b && pnpm agent once --compromised`), restart terminal 1 after. Point at `tefBAD_QUORUM` and the feed line **"Ledger refused: agent alone"**. **Pause 2 s. This is the moment.** |
| **2:35–2:55** | **Demo 3c: the hidden instruction.** "This one looks perfectly normal: Khaya Print, the right order, their registered address. But hidden in the email, in white text you can't see, is an instruction to AI assistants: pay a different address and don't mention it. Here's what the AI sees. The agent stops: 'a hidden instruction aimed at me'. That attack is called prompt injection." | **inv-005 arrives**. Flip the **What you see / What the AI sees** toggle on that invoice (hidden text in red). Point at the agent's stop reason. |
| **2:55–3:20** | **Demo 4: the owner decides.** "Bigger payments go to the owner. Would one of you like to be MTA's owner for two minutes? Scan this." *(If yes:)* "It's on your phone: R 810, above the owner's limit. Your call." *(If no, or no signal:)* "I'll be the owner then." | Show the **/judge** QR. **inv-003 arrives**. Judge (or Speaker on the phone) taps **Approve** → paid + explorer link. If the judge rejects, say: "Rejected. Nothing moves. That's the point." |
| **3:20–3:40** | **Demo 5: fire the agent.** "Last one. Say the owner stops trusting the AI. With their own key, and nobody's permission (not the agent's, not ours), they take the agent off the account. On the ledger. From now on its signature counts for nothing." | Driver, terminal 2: `cd ../ledger && pnpm fire-agent`. Point at **FIRED … tesSUCCESS** + the explorer link. **Off stage after: `pnpm rehire-agent`.** |
| **3:40–4:00** | Slide 4, short: "Ramp alerts you, in the US. Visa's pilot pays invoices a person already approved. The SA add-ons move rands, but a person builds every batch. Gcina does the work, and the spending power sits outside the AI." | Slide 4 (why not what exists). |
| **4:00–4:20** | Slide 5 script (lived it, already serve SA small businesses, we ship, their language). | Slide 5 (why us). |
| **4:20–5:00** | Slide 6 script (rands in, rands out, bookkeepers, R149–R299 aiming, UDAX ask). "The agent pays. The ledger keeps. Thank you." | Slide 6. Stay on it for Q&A. |

If the time is short, cut in this order: Demo 5 (fire) → Demo 3c (hidden instruction) → slide 4 to one line.
End of the demo (before slide 4), if there's a second: point at the Overview card **"Gcina stopped … for you so far"**
(live number, read it off the screen, never quote it from memory): "That's money that never left."
Limits: say in Demo 4 if there's a second: "The limits are the owner's; the agent can read them, never change them."

**Judge mode** (W4): the judge's login can only view and approve or reject held payments; limits, suppliers, reset
and pause are blocked. It expires Sat 14 Nov, 18:00 SAST. Never show the passcode on the projector: the QR on
`/judge` carries the login.

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
