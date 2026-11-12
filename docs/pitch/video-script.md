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
| 2 | 0:12–0:28 | A fake invoice email, full screen (inv-002 fixture text, styled) with "banking details have changed" highlighted | "And in 2025 our Supreme Court of Appeal ruled: pay a hacked invoice into a fraudster's account, and you still owe your supplier. Either way, you pay twice." | Supreme Court of Appeal, 2025 · *Intengo Imoto v Zoutpansberg* |
| 3 | 0:28–0:36 | Dashboard Overview | "Gcina is an AI agent that pays suppliers inside limits the owner sets and the agent can't break." | Gcina = AI accounts payable, with guardrails |
| 4 | 0:36–0:56 | `Split`: simulate inv-001 → terminal reasoning → "paid" in the feed → click the explorer link → `Explorer` | "A real invoice: Mzansi Catering, order PO-1001, R 360. The agent matches it to the order and the registered address, and pays it by itself on the XRP Ledger test network." | ✅ Paid on its own · real testnet transaction |
| 4b | 0:56–1:05 | `Split`: simulate inv-004 → "Looks like a repeat of inv-001" | "The same invoice again, the MTA problem. Already paid, so it's refused." | ⛔ Duplicate refused |
| 5 | 1:05–1:25 | `Split`: simulate inv-002 → agent flags it → policy refuses it (feed line) | "Now the fake one. Same supplier, same amount, new address, urgent. The agent catches it itself: new address, 'pay today', a lookalike email, and 'don't call us', the one check every bank tells you to do. Already paid, now to a new account: refused outright." | 🛑 Refused: repeat of inv-001 to a new address |
| 6 | 1:25–1:55 | Terminal in compromised mode: agent signs → policy refuses → direct ledger submit → **red ledger rejection `tefBAD_QUORUM`**. Zoom in on the result line. | "But what if the AI itself is tricked? Here we force it to obey the fraudster. It signs the payment. Our policy service refuses. So it goes straight to the ledger with only its own signature, and **the XRP Ledger rejects it.** The agent alone can never move money." | Compromised agent → rejected by the ledger itself |
| 7 | 1:55–2:15 | `Phone`: inv-003 Khaya Print & Stationery, R 810, above the limit → Approve → confirm sheet → paid + explorer link | "Bigger payments come to the owner. Khaya Print & Stationery, R 810: above the owner's limit, so they approve it from their phone, and it's paid." | 👤 Owner approves from the phone |
| 8 | 2:15–2:23 | Limits screen: change "ask me above", save, show "The agent can't change these." | "The limits are his. He can change them any time. The agent can read them, but never change them." | Limits set by a human, outside the agent |
| 9 | 2:23–2:36 | How it works screen (diagram) | "How? The agent's account has no single key. Agent: one vote. Policy service: one vote. Owner's offline key: two. The ledger needs two." | Agent 1 + Policy 1 = 2 ✓ · Agent alone = 1 ✗ |
| 10 | 2:36–2:46 | End card: github.com/ChumaMike/gcina · gcina.vercel.app, "Built on the XRP Ledger testnet", team names | "Gcina. The agent pays. The ledger keeps. We start with businesses like MTA, and grow through the bookkeepers who pay suppliers for them." | github.com/**[repo?]** |

**Runtime check**: 2:46. If an edit runs long, cut shot 8 down to 5 s first, then trim shot 3.

## Captions

- Burn in the short captions above (Clipchamp text, bottom third, white on 60% black, 48 px).
- Also upload a full `.srt` to YouTube generated from the voice-over (YouTube auto-captions, then correct
  "Gcina", "Meyiswa", "Zoutpansberg", "Mzansi", "Khaya", "XRP Ledger" by hand).

## Checks before uploading

- [ ] ≤ 2:50 on the final export.
- [ ] Every tx hash shown on screen is also in `docs/demo-evidence.md` and the README.
- [ ] No seeds, tokens, `.env` files, personal phone numbers or emails visible in any frame (scrub through at 2× speed).
- [ ] Link set to Unlisted / "anyone with the link", tested in an incognito window.
- [ ] Link added to the README and the BuilderBase submission.
