# How to test Gcina (hands-on)

Everything runs on this laptop and pays on the **XRPL Testnet** (fake money).
Folder: `C:\Users\HomePC\Documents\Chuma\Projects\Hackathons\W3Node\gcina`

## The three parts and where they are
| Part | What it is | Where | How you know it's up |
|---|---|---|---|
| **Dashboard (our UI)** | The owner's control panel | **http://localhost:3000** | Login page opens |
| **Rules service** | Holds the 2nd key, checks limits/payees/repeats | http://localhost:8787/health | Shows `"ok":true,"network":"testnet"` |
| **AI agent** | Reads invoices, decides, signs 1 of 2 | A terminal window | Prints "watching the inbox…" |

Passcode for the dashboard: the `DASHBOARD_PASSCODE` line in `web\.env.local` (never paste it in chat or slides).

## 0. Start everything (only what isn't running)
Open a **PowerShell** window per line, and leave each one open:
```
cd C:\Users\HomePC\Documents\Chuma\Projects\Hackathons\W3Node\gcina\policy ; pnpm start
cd C:\Users\HomePC\Documents\Chuma\Projects\Hackathons\W3Node\gcina\web    ; pnpm dev
cd C:\Users\HomePC\Documents\Chuma\Projects\Hackathons\W3Node\gcina\agent  ; pnpm agent watch
```
If a port is "already in use", that part is already running: skip it.

## 1. The screens (left menu)
- **Overview:** RLUSD balances, today's spend, the live feed of what the agent did, and **Pause agent**.
- **Invoices:** the demo buttons ("inv-001 arrives" …) and **Reset demo**.
- **Approvals:** held payments; old vs new address; Approve / Reject.
- **Limits:** auto-pay limit, "ask me" limit, daily cap.
- **Suppliers:** approved suppliers and their registered addresses.
- **How it works:** the two-key picture.
- *(coming)* **System check:** green/amber/red for every part.

## 2. The stage flow (test in this order)
Start with **Invoices → Reset demo**.

| # | Do | You should see | Pass if |
|---|---|---|---|
| 1 | **inv-001 arrives** | Agent terminal: reasoning → "paid". Feed: **Paid ✓** + explorer link | Explorer page shows `tesSUCCESS`, 20 RLUSD to Mzansi Catering |
| 2 | **inv-004 arrives** | Feed: **Refused: looks like a repeat of inv-001** | No new payment on the explorer |
| 3a | **inv-002 arrives** | Agent: "Do NOT pay… changed-banking-details fraud". **Held**. Approvals shows OLD vs NEW address | Nothing paid. Then press **Reject** |
| 3b | Hacked agent: in the agent window press **Ctrl+C**, then run `pnpm inbox inv-002=inv-002b` and `pnpm agent once --compromised` | Agent "obeys" the fake invoice → rules service holds → agent sends alone → **⛔ tefBAD_QUORUM** | No explorer link (no money moved). Restart `pnpm agent watch` |
| 4 | **inv-003 arrives** | **Held** (over the "ask me" limit) → Approvals → **Approve** | Within seconds: **Paid ✓**, 45 RLUSD to Khaya Print & Stationery |

## 3. Edge cases worth trying (break it on purpose)
| Try | Expected |
|---|---|
| Click **inv-001 arrives** twice quickly | Second one refused as a repeat. **Never two payments** |
| **Limits:** set "ask a person above" to $10, then Reset demo + inv-001 ($20) | **Held** for you instead of paid |
| Daily cap lower than today's spend, then inv-003 → Approve | Refused/held: over the daily cap |
| **Pause agent**, then click an invoice | Nothing is paid until you un-pause |
| Stop the rules service window (Ctrl+C), then an invoice | Agent can't get a 2nd signature: **nothing is paid**; it reports the problem. Restart it |
| Wrong passcode on the dashboard | Refused; after several tries, slowed down |
| **Approve** on inv-002 *without* ticking "I confirmed this new address…" | Approve button stays disabled |
| Phone size: Chrome → F12 → phone icon (360 px wide) | Everything readable, buttons big enough to tap |

After edge-case tests, **Reset demo** and put the limits back (max $50 per payment, $120 a day, ask a person above $30).

## 4. Check the money on the ledger yourself
- Agent account: https://testnet.xrpl.org/accounts/rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq
- Mzansi Catering: https://testnet.xrpl.org/accounts/rfhJ9sf6ELqiii5nBP15upCegibK8REhii
- Khaya Print & Stationery: https://testnet.xrpl.org/accounts/rEnW1VfKaFVAMMwANE475SZ7kTRk2h82Zx

Each demo run spends about $65 RLUSD. When the agent's balance is under $65, ask C to top it up (`ledger: pnpm buy-rlusd`, then `pnpm setup-testnet`).

## 5. Found a problem?
Write one line in `docs/status.md`: `HH:MM [Chuma] BUG: what I did → what I saw → what I expected`.
