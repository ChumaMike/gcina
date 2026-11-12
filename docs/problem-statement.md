# Gcina: problem, gap and value proposition
*(Coordinator, 12 Nov 2026. Figures and sources: docs/stats-sheet.md; competitors: docs/research/03-competitors.md.)*

## Problem statement
South African small businesses that pay many suppliers and people lose money in two ways: **paying the wrong account** (fake "changed banking details" invoices) and **paying the same person twice**. **The law makes the loss theirs.** The Supreme Court of Appeal ruled in 2024 and 2025 that a business that pays a hacked invoice must still pay its real supplier. Benchmarks put duplicate or erroneous payments at **0.8–2% of everything paid out**. AI agents could take over this admin, but **no CFO surveyed in 2025 would let an AI agent make payments with full access**, because nothing stops an agent that is tricked or hacked.

**One line:** *Small businesses pay twice, to fraudsters and to duplicates, and they can't hand the job to AI because nothing stops an AI from paying wrong.*

## Why the problem persists
1. **The check is human, manual and skippable.** Every big bank's advice is "verify banking changes through a trusted channel". That depends on a busy owner remembering, every time, under pressure ("pay today or supply stops").
2. **Payment systems trust whoever has the login.** Accounting and bank software executes whatever an authorised user (or bot) submits. There's no independent party that can say no.
3. **Verification is opt-in and narrow.** Bank account-verification services (AVS, about R2 per check) confirm that an account belongs to a name. They don't flag that the details *changed* since last month, and they're run per payment, by choice.
4. **Duplicates hide in manual workflows.** Registers, spreadsheets, re-sent invoices and several approvers mean the same payment gets keyed twice (seen first-hand at MTA).
5. **The fraud is social, not technical.** SABRIC says losses are driven by tricking people, not hacking systems, so security software alone doesn't stop it.
6. **AI makes it worse before it makes it better.** AI writes more convincing fake invoices, and AI agents that pay can be prompt-injected by them.

## The gap
| What exists | What it does | What it misses |
|---|---|---|
| Accounting software with AI (e.g. Sage's AP Agent, SA, Mar 2026) | Reads invoices, and a human approves payment | The AI and the payment run on the same trusted system; no independent enforcement |
| Payout APIs (Stitch, Paystack, Ozow, Peach) | Move money fast, with optional account checks | Execute whatever they're told; checks are opt-in |
| Bank AVS / "verify account owner" | Confirms an account belongs to a name | Doesn't detect changed details, duplicates or limits |
| Agent-wallet toolkits (Ripple XRPL agent kit / x402, Stripe, Coinbase, Privy) | Give AI agents wallets and spending caps | Built for developers and agent-to-API payments, not a small business's supplier and fraud workflow |

**Nobody offers:** an AI that does the payables work **plus** a rule-keeper the AI can't override **plus** a ledger that refuses the AI on its own, all controlled by the owner from a phone.

## Unique value proposition
**Gcina is the AI payments clerk your CFO can sign off on: it pays the right supplier, once, within your limits, and even if it's fooled or hacked, the ledger won't let it pay wrong.**

### What makes it different
1. **Three independent locks, not one.**
   - **Judgement:** the AI reads the invoice and flags urgency and changed-details language.
   - **Rules:** a separate policy service holds the second key and only co-signs approved payees, within limits, never twice.
   - **Ledger:** XRPL multi-sign with the master key disabled means the agent alone gets `tefBAD_QUORUM`.

   Each lock works even if the one before it fails.
2. **Enforced by the ledger, not by our code.** The rule "two signatures or nothing" is native to the XRP Ledger: no smart contract to audit, and no trust in our servers to keep it. That's proven on testnet.
3. **Built around SA's real failure modes:** changed banking details (court-backed), duplicate payments (seen first-hand at MTA), and the owner stays in charge from an Android phone, in plain South African English.
4. **The owner keeps the last word.** Limits, approved suppliers and held payments live outside the agent; the owner's recovery key outranks everything.
5. **Ripple-native:** pays in **RLUSD**, treasury converts XRP→RLUSD on XRPL's native AMM, and every payment carries its invoice in a memo for the audit trail.
6. **An honest production path:** settlement through a licensed SA exchange (CASP), RLUSD for dollar invoices, rands at home; sold through bookkeepers who run payments for many SMEs.

### Against other hackathon teams in this track (what judges will see)
- Most entries will show **"an agent with a wallet and a spending cap"**. Gcina shows **why the cap matters**: a live fake invoice, a compromised agent, and the ledger refusing it, tied to a real SA court ruling and a real customer story.
- Many will enforce limits in their own backend or a smart contract. **Ours are enforced by XRPL itself** and survive a hacked agent.
- We start from a **named design partner (MTA)** and a **legal fact** ("you pay twice"), not from the technology.
