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

- **Left 60%**: the deployed dashboard (`gcina-web`), Overview tab, zoom 125%.
- **Right 40%**: the agent terminal (`pnpm agent watch`), font 20 pt+, dark theme.
- Second browser tab ready: the XRPL testnet explorer (pre-opened on the inv-001 hash from rehearsal).
- **Phone**: logged in to the dashboard, on the Approvals tab, brightness up, Do Not Disturb on.

## Pre-flight (T-15 min, off stage)

1. Policy service healthy: open `/health`, see `ok: true` and `testnet`.
2. Terminal 1 (on the projector): `cd agent && pnpm agent watch` (normal mode; the dashboard's invoice buttons feed it).
   Terminal 2 (in `agent/`), command typed but **not** run: `pnpm inbox inv-002=inv-002b && pnpm agent once --compromised`.
   A held invoice is never picked up again, so the compromised beat re-sends the fake one as a new id, `inv-002b`. Stop terminal 1 (Ctrl+C) just before running terminal 2, so the normal agent doesn't grab inv-002b first; restart it after. (Source: `agent/README.md` "Demo run".)
3. Reset demo state (`pnpm inbox reset` in `agent/`, or the dashboard's reset): invoices cleared, policy back to defaults (per payment 50 RLUSD, daily 120 RLUSD, ask me above 30 RLUSD).
4. **Pre-load**: inv-001 already paid in a rehearsal run, so its explorer page is open as a backup if the live one is slow.
5. Hotspot on Chuma's phone as backup Wi-Fi; laptop already knows the hotspot.
6. Backup video downloaded **to the laptop** (not streaming), opened in a paused player in another window.

## The script

| Time | Say (Speaker) | Do (Driver / Speaker) |
|---|---|---|
| **0:00–0:18** | "I did the admin at Meyiswa Training Academy, a training academy in Soweto. Payments were approved by hand, and sometimes **the same person got paid twice**. True story. And in 2025 our Supreme Court of Appeal ruled that if you pay a hacked invoice into a fraudster's account, you still owe your supplier the full amount. Either way, you pay twice. I'm Chuma, and this is Gcina." | Slide 1 (problem). *(Sources: `docs/customer-evidence-mta.md`; Intengo Imoto v Zoutpansberg, SCA 2025.)* |
| **0:18–0:32** | "Gcina is an AI agent that pays your suppliers for you. In a 2025 survey of 60 big-company CFOs, not one would let an AI agent start payments on its own. So, would your CFO sign off? Only if the agent **can't** pay the wrong person, or pay twice, even when it's fooled. Let me show you." | Switch to the dashboard. |
| **0:32–1:00** | **Demo 1: paid on its own.** "An invoice from Mzansi Catering arrives. It matches order PO-1001, R 360, to their registered address. Watch the right side: the agent reads it, checks it, and pays. No human." | Driver: Invoices → **Simulate inv-001**. Point at the terminal reasoning. When "paid" shows, click the explorer link. |
| | "That's a real transaction on the XRP Ledger test network, with the invoice number written on it." | Explorer tab, 3 seconds, back. |
| **1:00–1:20** | **Demo 2: the double payment.** "Now the thing I saw at MTA. The same invoice comes in again: same supplier, same amount, same order. Gcina refuses: already paid. No second payment." | **Simulate inv-004**. Point at "Rejected: already paid" in the feed. |
| **1:20–2:30** | **Demo 3: the fake banking details.** "Now the scam. Same supplier, same amount, 'urgent, new banking details'. The agent catches it itself: a new payment address, 'pay today', a lookalike email address, and 'don't call us, our phones are down'. That last one blocks the exact check every bank tells you to do. Held, with a reason the owner can read." | **Simulate inv-002**. Show the Approvals card: "this isn't Mzansi Catering's registered address". Speaker taps **Reject** on it (the owner says no). |
| | "But what if the AI is tricked? Let's be the attacker. I'm switching the agent to compromised mode: it now obeys the fraudster." | Driver: Ctrl+C terminal 1, then press Enter in terminal 2 (`pnpm inbox inv-002=inv-002b && pnpm agent once --compromised`). Restart terminal 1 afterwards. |
| | "It signs the payment. Our policy service refuses to co-sign. So it goes around us, straight to the ledger, with only its own signature. And the **XRP Ledger itself says no**: `tefBAD_QUORUM`, not enough signatures. Not our code. The ledger." | Point at the red ledger result in the terminal and the audit feed. **Pause 2 seconds. This is the moment.** |
| **2:30–3:15** | **Demo 4: the owner decides.** "Khaya Print & Stationery, R 810. That's above the owner's 'ask me above' limit, so the agent asks. It lands on their phone." | **Simulate inv-003**. Speaker holds up the phone, taps **Approve**, confirms in the sheet. |
| | "Approved. The agent signs a fresh payment, the policy co-signs, done." | Point at the feed: paid + explorer link. |
| **3:15–3:45** | **Demo 5: limits live.** "And the limits belong to the owner, not the agent. Say they're going on leave: they drop 'ask me above' to R 180. The agent can read that. It can't change it." | Limits tab: change "ask me above" 30 → 10 RLUSD (R 540 → R 180), save. Point at "The agent can't change these." (Optional if time: Pause agent switch.) |
| **3:45–4:15** | **How it works.** "The agent's account has no single key. The agent has one vote, our policy service has one, and the owner's offline key has two. The ledger needs two. So the agent alone can never move money." | Slide 2 (how it works) or the How it works screen. |
| **4:15–4:50** | **Business.** "We start with owner-run businesses like MTA that pay their suppliers by EFT. We grow through bookkeepers, who already run supplier payments for many small businesses; SAIPA alone has over 10,000 members. We're aiming at about R149 to R299 a month per business, less than they pay for their accounting software. **[Chuma? confirm]** In production we run as software behind a licensed South African exchange, so suppliers still get rands by EFT. At home that means a rand stablecoin; RLUSD is for paying suppliers across borders." | Slide 3 (business + ask). |
| **4:50–5:00** | "The agent pays. The ledger keeps. We're asking for a place in Ripple's UDAX accelerator to take Gcina to a real pilot. Thank you." | Stay on slide 3 for Q&A. |

**Never say** "the ledger refuses a double payment": the duplicate check is in our policy service. The ledger refuses the *agent on its own*.

**Words to avoid before 3:45:** blockchain, wallet, crypto, token, on-chain, drops, seed, multisig.
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
| Over time at 4:15 | Skip Demo 5 (limits); mention it in one line. |

## Rehearsal checklist (Friday)

- [ ] Three full timed runs, one with Wi-Fi off on purpose.
- [ ] Every number on screen matches the script ($ 20.00 RLUSD ≈ R 360.00, $ 45.00 RLUSD ≈ R 810.00 at the indicative R 18/USD; if L falls back to XRP, re-check against CONTRACTS §2).
- [ ] Phone approval works on the venue-like network (hotspot).
- [ ] Backup video file on the laptop desktop and on a USB stick.
