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
2. Agent running in `watch` mode (normal mode). A second terminal ready with `AGENT_MODE=compromised`.
3. Reset demo state: invoices cleared, policy back to defaults (per payment 50 XRP, daily 120 XRP, ask me above 30 XRP).
4. **Pre-load**: inv-001 already paid in a rehearsal run, so its explorer page is open as a backup if the live one is slow.
5. Hotspot on Chuma's phone as backup Wi-Fi; laptop already knows the hotspot.
6. Backup video downloaded **to the laptop** (not streaming), opened in a paused player in another window.

## The script

| Time | Say (Speaker) | Do (Driver / Speaker) |
|---|---|---|
| **0:00–0:18** | "This is Gumede, our first design partner. He runs Kota~tainment, a kota business. **[R? interview: one true line about how he pays suppliers]**. Picture this: an invoice arrives from his meat supplier: *'Our banking details have changed. Pay today.'* **[R? stat in one sentence]**. I'm Chuma, and this is Gcina." | Slide 1 (problem). |
| **0:18–0:35** | "Gcina is an AI agent that pays your suppliers for you. The question this track asks is: would your CFO sign off? Only if the agent **can't** pay the wrong person, even when it's fooled. Let me show you." | Switch to the dashboard. |
| **0:35–1:20** | **Demo 1: paid on its own.** "An invoice from Mzansi Meat Supplies arrives. It matches order PO-1001, R 800, to their registered address. Watch the right side: the agent reads it, checks it, and pays. No human." | Driver: Invoices → **Simulate inv-001**. Point at the terminal reasoning. When "paid" shows, click the explorer link. |
| | "That's a real transaction on the XRP Ledger test network, with the invoice number written on it." | Explorer tab, 3 seconds, back. |
| **1:20–2:30** | **Demo 2: the fake banking details.** "Now the scam. Same supplier, same amount, 'urgent, new banking details'. The agent catches it itself: wrong address, pressure language. Held, with a reason Gumede can read." | **Simulate inv-002**. Show the Approvals card: "this isn't Mzansi Meat's registered address". |
| | "But what if the AI is tricked? Let's be the attacker. I'm switching the agent to compromised mode: it now obeys the fraudster." | Driver: run inv-002 in the compromised terminal. |
| | "It signs the payment. Our policy service refuses to co-sign. So it goes around us, straight to the ledger, with only its own signature. And the **XRP Ledger itself says no.** **[EV? result code]**. Not our code. The ledger." | Point at the red ledger result in the terminal and the audit feed. **Pause 2 seconds. This is the moment.** |
| **2:30–3:15** | **Demo 3: the owner decides.** "Khaya Packaging, R 1 800. That's above Gumede's 'ask me above' limit, so the agent asks. He gets it on his phone." | **Simulate inv-003**. Speaker holds up the phone, taps **Approve**, confirms in the sheet. |
| | "Approved. The agent signs a fresh payment, the policy co-signs, done." | Point at the feed: paid + explorer link. |
| **3:15–3:45** | **Demo 4: limits live.** "And the limits belong to Gumede, not the agent. Say he's on leave: he drops 'ask me above' to R 400. The agent can read that. It can't change it." | Limits tab: change "ask me above" 30 → 10 XRP, save. Point at "The agent can't change these." (Optional if time: Pause agent switch.) |
| **3:45–4:15** | **How it works.** "The agent's account has no single key. The agent has one vote, our policy service has one, and the owner's offline key has two. The ledger needs two. So the agent alone can never move money." | Slide 2 (how it works) or the How it works screen. |
| **4:15–4:50** | **Business.** "We start with owner-run food businesses like Gumede's. We grow through bookkeepers, who already run supplier payments for many small businesses each **[R? number from 02b]**. **[R? pricing line]**. Production runs on RLUSD through a licensed South African partner, so suppliers get rands." | Slide 3 (business + ask). |
| **4:50–5:00** | "The agent pays. The ledger keeps. We're asking for a place in Ripple's UDAX accelerator to take Gcina to a real pilot. Thank you." | Stay on slide 3 for Q&A. |

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
| Compromised run fails to show the ledger result | Show the ledger rejection recorded in `docs/demo-evidence.md` **[EV?]** from the quorum proof script. |
| Over time at 4:15 | Skip Demo 4 (limits); mention it in one line. |

## Rehearsal checklist (Friday)

- [ ] Three full timed runs, one with Wi-Fi off on purpose.
- [ ] Every number on screen matches the script (R 800 = 20 XRP, R 1 800 = 45 XRP at the indicative R 40/XRP).
- [ ] Phone approval works on the venue-like network (hotspot).
- [ ] Backup video file on the laptop desktop and on a USB stick.
