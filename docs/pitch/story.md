# Gcina: the story

> Status: **DRAFT v0 (15:55)**. Built from `CONTRACTS.md` only. Anything marked **[R?]** waits for a fact
> from `docs/research/`, and **[EV?]** waits for a hash or result in `docs/demo-evidence.md`. Nothing marked
> goes on stage or into the README until it is filled from a source.

*Gcina* (isiZulu/isiXhosa: "keep, protect"). Say it "GEE-nah" (the "Gc" is a soft click).

> **Name risk (02b Part 2): CAUTION.** An FSCA-registered funeral-cover brand already trades as "Gcina" on
> gcina.co.za. Fine for the hackathon; before any public launch, use a compound such as "Gcina Pay" and do a
> trade-mark search. Have this answer ready if a judge asks.

## One line (approved framing, `docs/problem-statement.md`)

**Problem:** *Small businesses pay twice, to fraudsters and to duplicates, and they can't hand the job to AI because
nothing stops an AI from paying wrong.*

**Value proposition:** **Gcina is the AI payments clerk your CFO can sign off on: it pays the right supplier, once, within your limits, and even if it's fooled or hacked, it still can't pay on its own.**

> Wording note: the approved UVP ends "the ledger won't let it pay wrong". We say "it still can't pay on its own",
> because the ledger enforces the two-vote rule while the supplier list, limits and duplicate check live in the policy
> service. Same promise, nothing a judge can catch.

**Three independent locks, each working even if the one before it fails:**
1. **Judgement**: the AI reads the invoice and flags urgency, lookalike senders and changed-details language.
2. **Rules**: a separate policy service holds the second key and only co-signs approved payees, within limits, never twice.
3. **Ledger**: XRPL multi-sign with the master key off, so the agent alone gets `tefBAD_QUORUM`.

## Why the problem persists (from `docs/problem-statement.md`)
- The bank's advice ("verify through a trusted channel") is a **manual check a busy owner can skip** under "pay today" pressure.
- Payment systems **trust whoever has the login**; nothing independent can say no.
- Account verification (AVS) confirms a name, **not that the details changed**, and it's opt-in per payment.
- **Duplicates hide in manual workflows**: registers, spreadsheets, re-sent invoices (seen at MTA).
- The fraud is **social, not technical** (SABRIC), and **AI makes it worse first**: better fake invoices, and paying agents that can be prompt-injected.

**Positioning line (C, 17:45):** *Gcina: autonomous supplier payments, independent financial control. We separate the agent's ability to initiate a payment from its authority to spend.*

Each part exists somewhere; what Gcina adds is the **combination**: an AI that does the payables work **plus** a
rule-keeper the AI can't override **plus** a ledger that refuses the AI on its own, all controlled by the owner from a phone.

> **Rule (C, 17:45): never say "first", "only" or "nobody"** about our position. Ramp already flags changed bank
> details (US), a Visa + BILL + Billtrust pilot (20 Oct 2026) lets agents execute human-approved invoice payments,
> Sage SA has an AP agent, and SA Xero add-ons (Payaccsys, Paysoft, Netcash) run account checks.

## Against other teams in this track
- Most will show "an agent with a wallet and a spending cap". We show **why the cap matters**: a live fake invoice, a
  compromised agent, and the ledger refusing it, tied to a real SA court ruling and a real customer story.
- Many enforce limits only in their own backend or a smart contract. **Our two-vote rule is enforced by XRPL itself**
  and survives a hacked agent.
- We start from a named customer (MTA) and a legal fact ("you pay twice"), not from the technology.

Tagline: **The agent pays. The ledger keeps.**

## The 30-second problem

**Named customer: Meyiswa Training Academy (MTA)**, a training academy in Soweto where Chuma did the admin.

> **R's never-say #9:** say "design partner" only once MTA's owner confirms. Until then: "MTA, where I did the admin"
> or "our starting customer".

> **Honesty rule:** MTA is a family business of our team (run by Chuma's brother). Say so openly if asked:
> "our starting customer is a business we're close to", never "an independent customer". Every detail about
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

So the pain at MTA is **double payment**; the risk the courts and banks warn about is the **fake
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

**More numbers (from `docs/stats-sheet.md`, coordinator):**
- Paying twice is common: benchmarks put duplicate or erroneous payments at **0.8%–2%** of all disbursements
  (median ~1.5%, APQC, 1,686 organisations). Say: "about R1 to R2 in every R100 a business pays out".
- *ENS v Hawarden* [2024] ZASCA 90: a buyer lost **R5.5m** to an intercepted payment and carried the loss.
- **The trust gap:** of 60 CFOs at US$1bn+ US firms, **0%** would give an AI agent substantial or full access to
  initiate payments (PYMNTS Intelligence, Jul 2025); only **14%** of mid-market CFOs fully trust AI with accounting
  data, **97%** say human oversight is critical, yet **88%** already use an agentic AI tool (Wakefield, Feb 2026).
  Say: "CFOs want AI agents, but almost none will let one press 'pay'. Gcina is how they say yes."
- **Don't quote** Deloitte's "54%" until R verifies it. Never say "67% of SA firms hit by BEC" or "R2.4m average BEC cost".

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
- **XRPL's built-in exchange:** the treasury bought its $ 250 RLUSD float from the ledger's own XRP/RLUSD AMM pool
  (`docs/demo-evidence.md`, 18:00, tx 8191857E…), no exchange account needed.
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

## Positioning (from `docs/research/03-competitors.md` §D and C 17:45)

- **Why not Ramp or Sage?** "They automate accounts payable and add fraud checks inside their own platform, and Visa's new pilot lets agents pay invoices a human already approved. Gcina is built for the next step, letting the agent decide, so we take spending authority *out of the agent's hands*: a separate co-signer holds the second key, and the XRP Ledger refuses anything without both. That's verifiable on a public ledger, not just in our logs, and it's built for SA small businesses that can't afford Ramp-style finance teams."

- Say: **"Sage and Ramp ask their AI to spot the fraud. Gcina makes the XRP Ledger refuse the payment: an
  accounts-payable agent that can't pay a new bank account until a human co-signs."**
- Positioning line: "Gcina: autonomous supplier payments, independent financial control. We separate the agent's ability to initiate a payment from its authority to spend."
- **Never say** "nobody else enforces limits outside the agent" (Coinbase, Privy, Turnkey, Safe and Crossmint do).
- **Be exact:** the ledger enforces the *quorum*; the supplier list and limits live in our co-signer service.
  The claim is "the agent alone can't pay, and beating the rules needs a second, independent key".
- Why it matters for SA: Ramp and BILL aren't available here, Xero has no native bill pay in SA, Sage SA's AP agent
  runs inside Sage's own platform, and bank account verification proves who owns an account, not that it's the
  account this supplier always used.

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
5. **Expansion** (C decision 17:22, `docs/idea-comparison.md`): **Same engine, next markets:** it protects any money one person controls for many. Supplier runs today; **stokvel payouts** and stipend registers next (stokvels: about 11 million members and R50 billion a year, NASASA's own estimate via Ipsos 2024, no published method); cross-border RLUSD supplier invoices with a licensed partner. Source: `docs/research/06-stokvel-problem.md`.

## Product promises (C, 17:00, from Chuma's review)

- **"You only hear from Gcina when something's wrong."** Routine payments are quiet one-line ticks; held items come first.
- The agent can't change the rules: its token is blocked from every owner action, and the agent and policy keys live on separate systems.
- Built now: duplicate check by invoice number **or** same payee + amount + reference (the MTA case); a cooling-off setting for newly approved accounts (0 for the demo, 24 h in production); approving a changed address needs "I confirmed this with the supplier on a number I already had".
- Production next steps: owner passkey/2FA, 24 h cooling-off on new accounts, WhatsApp/SMS alert on any limit or supplier change, Xero/Sage supplier import, a bank account check (AVS-R) when an address is approved.

## What's next

- Pilot with MTA on testnet amounts, using its real supplier list. **[Chuma? MTA owner agreed?]**
- Licensed rails partner for RLUSD ↔ ZAR.
- Bookkeeper pilot: 1 practice, 10 clients.
- **The ask: a place in Ripple's UDAX Cape Town accelerator (with UCT)** to take Gcina from testnet to a
  regulated pilot.
