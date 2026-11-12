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

| Ramp (US) | AI fraud agent checks about 60 signals per bill and flags new or changed bank details; AP agents | Controls live inside the same platform the agent runs on; US only |
| Visa + BILL + Billtrust pilot (20 Oct 2026) | AI agents **execute** invoice payments that a human has **already approved** | The agent doesn't decide; trust rests on platform authentication (Visa Trusted Agent Protocol) |
| SA Xero payment add-ons (Payaccsys, Paysoft Flow, Netcash) | Batch supplier payments with optional account verification (AVS/CDV) | No AI agent; checks are opt-in |

**Honest position (C, updated after a teammate's competitor review):** many of our parts exist on their own (AI invoice reading, changed-details flags, approvals, agents executing approved payments). **We are not "the first" and we never say "only" or "nobody".** What's different is the **combination and where the control sits**: the agent may **decide and initiate**, but its **authority to spend is enforced outside it**: by an independent co-signer and the ledger's two-key rule, not by the same platform the agent runs on.

## Unique value proposition
**Gcina: autonomous supplier payments, independent financial control.** Gcina lets a small business hand supplier payments to an AI agent **by separating the agent's ability to initiate a payment from its authority to spend**. The agent proposes; an independent co-signer and the XRP Ledger's two-key rule decide. Even if it's fooled or hacked, it still can't pay on its own.

**Judge answer, "why not Ramp or Sage?":** "They automate accounts payable and add fraud checks inside their own platform, and Visa's new pilot lets agents pay invoices a human already approved. Gcina is built for the next step, letting the agent decide, so we take spending authority *out of the agent's hands*: a separate co-signer holds the second key, and the XRP Ledger refuses anything without both. That's verifiable on a public ledger, not just in our logs, and it's built for SA small businesses that can't afford Ramp-style finance teams."

### What makes it different
1. **Three independent locks, not one** (each part exists elsewhere; the combination, and keeping spending authority outside the agent, is ours).
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
