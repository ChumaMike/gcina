# Gcina: the story

> Status: **DRAFT v0 (15:55)**. Built from `CONTRACTS.md` only. Anything marked **[R?]** waits for a fact
> from `docs/research/`, and **[EV?]** waits for a hash or result in `docs/demo-evidence.md`. Nothing marked
> goes on stage or into the README until it is filled from a source.

*Gcina* (isiZulu/isiXhosa: "keep, protect"). Say it "GEE-nah" (the "Gc" is a soft click).

> **Name risk (02b Part 2): CAUTION.** An FSCA-registered funeral-cover brand already trades as "Gcina" on
> gcina.co.za. Fine for the hackathon; before any public launch, use a compound such as "Gcina Pay" and do a
> trade-mark search. Have this answer ready if a judge asks.

## One line

**Gcina is an AI bookkeeper that pays your suppliers for you and can't be talked into paying a fraudster,
because the money only moves when the rules you set say yes.**

Tagline: **The agent pays. The ledger keeps.**

## The 30-second problem

**Named customer: Meyiswa Training Academy (MTA)**, a South African skills-training academy and our first
design partner.

> **Honesty rule:** MTA is a family business of our team (run by Chuma's brother). Say so openly if asked:
> "our first design partner is a business we're close to", never "an independent customer". Every detail about
> how MTA pays suppliers is a **placeholder** until the MTA owner interview is in (R's script in
> `docs/research/02-customer.md` §2 works with the business name swapped for MTA). The buyer we scale through is
> still the **bookkeeper who runs payments for many small clients**.

**Founder-market fit:** Chuma did MTA's admin from July 2022 to 2024, so he has paid or prepared these supplier
payments himself (coordinator, status 16:24). On stage: "I did the admin at MTA for two years. I know what that
inbox looks like." **[Chuma: one true detail from those years: how suppliers were paid, who approved, any
changed-banking-details email you saw]**

**What Chuma saw at MTA (first-hand, `docs/customer-evidence-mta.md`):** payments were approved by hand: the
facilitator sends the attendance register, the owner approves who gets paid and how much, and payment follows
through payroll and accounting software. **Sometimes the same person got paid twice.** He knows of no
changed-banking-details incident at MTA, so we never claim one.

So the pain at our design partner is **double payment**; the risk the courts and banks warn about is the **fake
new banking details**. Either way, a small business pays twice, and Gcina stops both.

Then one day an email arrives that looks exactly like a regular supplier's: *"Due to an audit, our banking
details have changed. Please pay today to avoid supply interruption."* Same name, same amount, a new account.

**The stat (rank 1 in research):** "In 2025, South Africa's Supreme Court of Appeal ruled that if your business pays a hacked invoice into a fraudster's account, you still owe your supplier the full amount."
Source: *Intengo Imoto v Zoutpansberg Motor Wholesalers*, 2025 (6) SA 143 (SCA); also *ENS v Hawarden* [2024] ZASCA 90 (`docs/research/01-problem-evidence.md` §2, §5). So the business pays **twice**: once to the fraudster, then again to the real supplier.

**Backup stat (rank 2):** South Africans lost **R2.4 billion** to digital banking crime in 2025, up from about
R1.9 billion in 2024, and SABRIC says it's driven by tricking people rather than hacking systems
(SABRIC, Aug 2026). **Never call this "BEC losses"**: it's all digital banking crime.

**Third line:** Standard Bank, Absa, Nedbank and FNB all publicly warn businesses about the "changed banking
details" scam, and all give the same advice: verify the change through a channel you already trust before you
pay. **That check is the rule Gcina enforces.**

Now picture handing supplier payments to an AI agent. It's faster than any bookkeeper, but it can be fooled by
the same email. **Would your CFO sign off on that?** Not unless the agent physically *can't* pay the wrong person.

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
- **RLUSD**, Ripple's dollar stablecoin, is issued natively on XRPL, and VALR, Yellow Card and Chipper Cash
  listed it in Africa on 4 Sep 2025 (04 §6). Our policy engine is asset-agnostic, so the same guardrails work
  for a rand stablecoin at home and RLUSD for cross-border supplier invoices.
- Every payment carries the invoice number on-ledger (a memo), so the audit trail is public and permanent.

## The proof: "the ledger refuses the agent"

We run the same fake "new banking details" invoice twice:

1. **Normal agent**: it spots the changed address and the urgency itself, and refuses to pay. Held for the owner.
2. **Compromised agent** (we deliberately make it obey the fraudster): it signs a payment to the
   fraudster. The policy service refuses to co-sign. So the agent tries to go **straight to the ledger
   with only its own signature**, and the XRP Ledger rejects it: **`tefBAD_QUORUM`** ("not enough signatures"). The transaction never enters a ledger, so the money can't move.

Testnet proof:
- 🔒 Quorum proof (`ledger/scripts/prove-quorum.ts`, 15:59 SAST): agent alone → **`tefBAD_QUORUM`**; master key → **`tefMASTER_DISABLED`**; agent + policy → **`tesSUCCESS`** ([0139C016…](https://testnet.xrpl.org/transactions/0139C0167EB5ECF95F9008CE986A1161883C063D036C104371A8325692C1DE22)). Source: `docs/demo-evidence.md`.
- ✅ Autonomous payment, inv-001: **[EV? tx hash link]**
- 🛑 Compromised agent on inv-002 rejected by the ledger: **[EV? A tab's run]**
- 👤 Human-approved payment, inv-003: **[EV? tx hash link]**

That's the answer to "would your CFO sign off?": **even if the AI is fooled, the money doesn't move.**

## Positioning (from `docs/research/03-competitors.md` §D)

- Say: **"Sage and Ramp ask their AI to spot the fraud. Gcina makes the XRP Ledger refuse the payment: an
  accounts-payable agent that can't pay a new bank account until a human co-signs."**
- Short: "The first accounts-payable agent for SA small businesses that the ledger itself won't let go rogue."
  Always keep "AP" / "for SA small businesses" in that sentence.
- **Never say** "nobody else enforces limits outside the agent" (Coinbase, Privy, Turnkey, Safe and Crossmint do).
- **Be exact:** the ledger enforces the *quorum*; the supplier list and limits live in our co-signer service.
  The claim is "the agent alone can't pay, and beating the rules needs a second, independent key".
- Why it matters for SA: none of the global agentic AP tools is live here, Xero has no native bill pay in SA,
  and bank account verification proves who owns an account, not that it's the account this supplier always used.

## Business model and go-to-market

**[R? all of this section must be checked against 00-verdict.md GTM bullets and 02-customer.md.]**

1. **Beachhead**: owner-run SA small businesses that pay a handful of regular suppliers by EFT against invoices,
   starting with MTA. **[MTA interview: how it pays today, what limits it'd set, what it'd pay]**
2. **Channel**: bookkeepers and accountants who already run accounts payable for many small businesses.
   One sale to a bookkeeper brings many client businesses (R's working range: ~10–30), and they prepare the
   EFTs, so they already feel the fraud risk. **[R? sourced number from 02b-segments-and-name.md]**
3. **Pricing** (R's inference in 02b §6, not data): an add-on at **R149–R299 a month** per business, about
   20–35% of what an SA small business already pays Xero (R485–R857/month), and well under BILL's ~$49/user
   in the US. Plus a **practice tier priced per client file** for bookkeepers. Test it with MTA and 3–5 practices.
   **[Chuma? confirm the number to say on stage]**
4. **Rails** (04 §1, §6, §7): Gcina runs **as software behind a licensed crypto asset service provider (CASP)**,
   which does KYB/KYC and Travel Rule data. The supplier's payment lands at a licensed SA exchange, is sold
   to ZAR and paid out by EFT. **Careful:** the SARB says USD-pegged stablecoins are unlikely to be approved
   for *domestic* payments, so at home we'd pay in a **rand stablecoin** and keep **RLUSD for cross-border**
   supplier invoices. Not yet confirmed: whether VALR supports RLUSD on XRPL or has an RLUSD/ZAR pair, so
   **never promise an XRPL → ZAR route on stage**.
5. **Expansion**: same guardrails for payroll runs, stokvel/co-op payouts, and cross-border supplier
   payments in the region. **[R? pick the 1–2 that research supports]**

## What's next

- Pilot with MTA on testnet amounts, using its real supplier list. **[Chuma? MTA owner agreed?]**
- Licensed rails partner for RLUSD ↔ ZAR.
- Bookkeeper pilot: 1 practice, 10 clients.
- **The ask: a place in Ripple's UDAX Cape Town accelerator (with UCT)** to take Gcina from testnet to a
  regulated pilot.
