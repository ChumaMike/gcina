# Gcina: the story

> Status: **DRAFT v0 (15:55)**. Built from `CONTRACTS.md` only. Anything marked **[R?]** waits for a fact
> from `docs/research/`, and **[EV?]** waits for a hash or result in `docs/demo-evidence.md`. Nothing marked
> goes on stage or into the README until it is filled from a source.

*Gcina* (isiZulu/isiXhosa: "keep, protect").

## One line

**Gcina is an AI bookkeeper that pays your suppliers for you and can't be talked into paying a fraudster,
because the money only moves when the rules you set say yes.**

Tagline: **The agent pays. The ledger keeps.**

## The 30-second problem

> **Honesty rule (from R, 02-customer.md §1):** Gumede is our **first design partner, a food business
> owner we already work with**, never "an independent customer". Every detail about how he pays suppliers
> below is a **placeholder** until the interview fills §4 of `02-customer.md`. If he pays fewer than ~5
> suppliers by EFT, use R's reframe: **Gumede is the human face, the bookkeeper who runs payments for
> 20 small clients is the buyer.**

Gumede runs Kota~tainment, a kota business. **[R? interview: how many suppliers he pays by EFT, how
invoices and banking details reach him (WhatsApp / email / paper), who does the payment.]**

Then one day a message arrives that looks exactly like his meat supplier's: *"Due to an audit, our banking
details have changed. Please pay today to avoid supply interruption."* Same logo, same amount, a new account.

**[R?] one hard SA stat on invoice / changed-banking-details fraud (SABRIC or SAFPS, with year).**

If he pays it, the money is gone, and in South Africa the business that paid usually carries the loss.
**[R? confirm with the court-case / Mondaq source in 01-problem-evidence.md before saying this line.]**

Now picture handing that job to an AI agent. It's faster than Gumede, but it can be fooled by the same email.
**Would your CFO sign off on that?** Not unless the agent physically *can't* pay the wrong person.

## What Gcina does

1. **Reads the invoice** the way a careful bookkeeper would: supplier, amount, order number, payment details,
   and any "our details have changed, pay urgently" pressure.
2. **Matches it** to an open order and to the supplier's registered payment address.
3. **Pays on its own** when everything checks out and the amount is inside the owner's limits.
4. **Holds it for the owner** when something is off (new address, too big, over today's budget), and
   explains why in plain English. The owner approves or rejects from their phone.
5. The owner **sets the limits** (per payment, per day, "ask me above") on a dashboard. The agent can
   read them. It can't change them.

## How it works (the first point in the pitch where we say "XRP Ledger")

The agent pays from a business account on the **XRP Ledger** that has **no single key**. That account
needs **2 votes** before any payment moves, and no single machine has 2:

| Key | Held by | Vote weight |
|---|---|---|
| Agent key | the AI agent | 1 |
| Policy key | an independent policy service that enforces the owner's limits | 1 |
| Owner recovery key | the owner, offline | 2 |

The quorum is 2. So:

- **Agent alone = 1 vote. The ledger itself refuses the payment.** Not our code. The ledger.
- Agent + policy = 2. That happens only when the payment is inside the owner's limits and goes to an approved supplier.
- The owner alone = 2. That's the recovery and override path.

The account's master key is switched off, so the multi-signature rule can't be bypassed.

## Why XRPL

- **Multi-signing is built into the ledger** (`SignerList` + a disabled master key). We didn't write a smart
  contract that could have a bug; the rule lives in the ledger protocol. **[R? confirm in 05-xrpl-fit.md]**
- **Fast and cheap enough for supplier payments**: settles in seconds, fees are fractions of a cent.
  **[R? exact finality + fee figures from 05-xrpl-fit.md]**
- **RLUSD**, a dollar stablecoin on XRPL, plus SA exchanges on XRPL, give a real path to settling in
  rands for the supplier. **[R? which partners actually support RLUSD / XRPL ZAR rails: 04-regulation-and-rails.md]**
- Every payment carries the invoice number on-ledger (a memo), so the audit trail is public and permanent.

## The proof: "the ledger refuses the agent"

We run the same fake "new banking details" invoice twice:

1. **Normal agent**: it spots the changed address and the urgency itself, and refuses to pay. Held for the owner.
2. **Compromised agent** (we deliberately make it obey the fraudster): it signs a payment to the
   fraudster. The policy service refuses to co-sign. So the agent tries to go **straight to the ledger
   with only its own signature**, and the XRP Ledger rejects it: **[EV? exact engine result, e.g. `tefBAD_QUORUM`]**.

Testnet proof:
- ✅ Autonomous payment, inv-001: **[EV? tx hash link]**
- 🛑 Agent-only attempt rejected by the ledger: **[EV? result + link/log]**
- 👤 Human-approved payment, inv-003: **[EV? tx hash link]**

That's the answer to "would your CFO sign off?": **even if the AI is fooled, the money doesn't move.**

## Business model and go-to-market

**[R? all of this section must be checked against 00-verdict.md GTM bullets and 02-customer.md.]**

1. **Beachhead**: owner-run SA food and hospitality businesses with 5–20 regular suppliers, starting with
   Kota~tainment. **[R? Gumede interview: how he pays today, what limits he'd set, what he'd pay]**
2. **Channel**: bookkeepers and accountants who already run accounts payable for many small businesses.
   One sale to a bookkeeper brings many client businesses (R's working range: ~10–30), and they prepare the
   EFTs, so they already feel the fraud risk. **[R? sourced number from 02b-segments-and-name.md]**
3. **Pricing**: **[R?/Chuma? a monthly fee per business + a small per-payment fee. Needs a source-backed number or Chuma's decision.]**
4. **Rails**: testnet XRP today → RLUSD on XRPL with a licensed SA partner (e.g. VALR / Yellow Card)
   to get suppliers paid in rands. **[R? confirm each partner's XRPL / RLUSD status + licensing]**
5. **Expansion**: same guardrails for payroll runs, stokvel/co-op payouts, and cross-border supplier
   payments in the region. **[R? pick the 1–2 that research supports]**

## What's next

- Live pilot with Kota~tainment on testnet amounts, using his real supplier list. **[Chuma? Gumede agreed?]**
- Licensed rails partner for RLUSD ↔ ZAR.
- Bookkeeper pilot: 1 practice, 10 clients.
- **The ask: a place in Ripple's UDAX Cape Town accelerator (with UCT)** to take Gcina from testnet to a
  regulated pilot.
