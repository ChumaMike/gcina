# 00 — Verdict: is Gcina a winning answer?

**Draft 1, 12 Nov 2026 16:05 (R).** Final at 21:00 after the Gumede interview and the 5b rails follow-up.
Sources are in files 01–05. Every number below links back to them. Nothing here is a new number.

## Bottom line (sceptic's read)

**Yes, it fits the track almost word for word, and the problem is real. But three things will get us caught out
if we don't fix them in the story tonight:**

1. **"Why would a kota supplier take crypto?"** The SARB/FSCA said in May 2026 that it is "unlikely to consider
   foreign currency-pegged stablecoins as payment instruments for domestic transactions" ([04 §2](04-regulation-and-rails.md)).
   Paying a Joburg meat supplier in RLUSD is therefore the weakest sentence in the pitch.
2. **No SA number for the size of BEC/invoice fraud exists.** SABRIC, SAFPS and SAPS don't split it out ([01](01-problem-evidence.md)).
   The R2.4bn SABRIC figure is *all* digital banking crime and must never be called "invoice fraud".
3. **Validation is one connected person who hasn't been interviewed yet.** Gumede is also Chuma's supervisor ([02](02-customer.md)).

### The smallest reframe that fixes all three (recommend P adopts it)
> **Gcina is the spending control for AI agents that pay suppliers: the agent can propose, but only the
> ledger-enforced quorum can pay.** The **buyer is the bookkeeper** who runs supplier payments for many small
> businesses. The **lead pain is liability, not crypto**: SA's Supreme Court of Appeal says that if you pay a
> hacked invoice, you pay twice. **Settlement:** the demo is RLUSD on XRPL testnet. In production, a licensed SA
> exchange (CASP) settles. It uses RLUSD for supplier invoices priced in dollars (imports), and a rand
> stablecoin or EFT payout at home as the rules allow.

The demo and code don't change. Only the words do: lead with **"you pay twice"**, not "crypto payments".

## Viability scores (1 = bad, 5 = strong)

| Dimension | Score | Why |
|---|---|---|
| Problem severity | **4** | Payer carries the loss: SCA in *Hawarden* (2024, R5.5m) and *Intengo Imoto* (2025). All four big banks issue "changed banking details" warnings ([01](01-problem-evidence.md)) |
| Evidence strength | **3** | Court and bank evidence is strong and current. No SA loss total exists; the global anchor is US (FBI IC3 2025: US$3.05bn BEC) |
| Track fit | **5** | "Agent moves money, XRPL enforces the rules": master key disabled + quorum 2, agent weight 1 → `tefBAD_QUORUM` ([05](05-xrpl-fit.md)). All 3 MVP items are covered |
| Customer validation | **2** (→3 if tonight's calls happen) | One connected design partner, not yet interviewed. No bookkeeper spoken to. "Practices run AP for clients" is an untested hypothesis ([02b](02b-segments-and-name.md)) |
| Commercial viability | **3** | Anchors: Xero SA R485–R857/month, BILL $49–89/user. R149–299/month is our *inference*, not data. Bookkeeper channel: SAIPA 10k+, 46% of SA practices already advise clients on apps |
| Demo-ability | **4** | Deterministic fixtures, fast finality. Risks: RLUSD faucet, `tef` has **no explorer page** (show the logged rejection), 60–100 s blob expiry (C2/C3/C10 in status.md) |
| Regulatory risk | **2** | Testnet demo is fine. Production needs a licensed CASP partner (FSCA: 310 approved by Mar 2026); SARB is against USD coins for domestic payments; the draft Excon manual treats exchange→self-hosted transfers as capital export (being redrafted) |
| **Name** | ⚠️ | **gcina.co.za is a live funeral-cover brand saying "FSCA Registered".** Fine for a hackathon. Do a CIPC trade-mark search before any public launch |

**Overall:** a strong *technical* and *track* answer. *Business* is the soft third. It moves from about 18/30 to
about 22/30 if we (a) use the liability framing, (b) get even two real conversations tonight, and (c) say the
regulatory answer calmly instead of avoiding it.

## 3 stats for the stage (ranked by credibility)

1. **"In 2025 South Africa's Supreme Court of Appeal ruled that if you pay a hacked invoice into a fraudster's
   account, you still owe your supplier the full amount."** *Intengo Imoto v Zoutpansberg Motor Wholesalers*,
   2025 (6) SA 143 (SCA) ([Clyde & Co, 2025](https://connectedworld.clydeco.com/post/102kqmg/verify-before-you-pay-south-africas-sca-reinforces-buyers-duty-in-bec-fraud-ca)).
   It follows *ENS v Hawarden* [2024] ZASCA 90, a R5.5m loss.
2. **"Standard Bank, Absa, Nedbank and FNB all warn businesses about 'changed banking details', and all say
   the same thing: verify before you pay."** Gcina makes that check impossible to skip
   ([Standard Bank](https://www.standardbank.co.za/southafrica/personal/learn/how-to-avoid-the-change-of-banking-details-scam); other banks in 01).
3. **"South Africans lost R2.4 billion to digital banking crime in 2025, up from about R1.9 billion,
   driven by tricking people, not hacking systems."** ([SABRIC, Aug 2026](https://www.sabric.co.za/?p=4450)).
   ⚠️ Say "digital banking crime", never "invoice fraud".

Optional global line: *"In the US, the FBI counted US$3.05 billion lost to business email compromise in 2025."* (FBI IC3 2025, see 01).
**Do not say:** "67%/92% of SA firms hit", "R2.4m average BEC cost", "202 admin days a year". These are vendor-only figures ([01](01-problem-evidence.md)).

## 30-second problem statement (for P; adjust once Gumede consents to being named)

> "A supplier's email gets hacked. You get their invoice, same amount, same logo, with one line: *'our banking
> details have changed'*. You pay. And in 2025 our Supreme Court of Appeal said: that's your loss, and you still
> owe the supplier. Pay twice. Every big bank in South Africa warns about this, and their advice is always the
> same: check before you pay. Now businesses want AI agents to pay their suppliers. An agent that can be fooled
> by one email is the last thing you want holding the banking login. So we built one that *can't* pay a new
> account, no matter what it believes."

## Top 5 judge questions and crisp answers

1. **"Why would a South African supplier accept RLUSD? Why not just a bank API?"**
   They wouldn't have to: the target is a licensed exchange paying out rands (VALR: 30 free ZAR withdrawals a month,
   then R8.50; RTC fast payouts 24/7). **Honest caveat:** VALR lists RLUSD but we found no RLUSD deposits *on XRPL*
   and no RLUSD/ZAR pair yet. That's the first partner conversation, not a solved step ([04 §8](04-regulation-and-rails.md)). The point isn't the coin, it's the
   **lock**: with a bank API the agent holds the login, and a fooled agent can pay anyone. On XRPL the agent's key
   alone is mathematically not enough, and the network itself refuses it (`tefBAD_QUORUM`). No SA bank API gives
   an SME that.
2. **"Is this legal? SARB said no to dollar stablecoins for local payments."**
   Correct, and we agree. The demo is testnet with no real value. In production Gcina is software behind a
   licensed CASP (VALR is one of 310 FSCA-approved). RLUSD covers dollar-priced supplier invoices, and the
   policy engine is currency-agnostic for a rand stablecoin when the IFWG framework lands ([04](04-regulation-and-rails.md)).
3. **"What stops the policy service being hacked, or both keys being stolen?"**
   Each key alone is weight 1, under the quorum of 2. An attacker needs the agent **and** the policy co-signer.
   The policy signs only `Payment`s with a capped fee and no partial-payment flag, to approved addresses, under
   limits (C4/C5 in status.md). The owner's offline key (weight 2) can rotate both. Production idea: one XRPL
   payment channel per approved supplier would cap the total on the ledger itself ([05](05-xrpl-fit.md)).
4. **"Isn't this what Ramp, Sage or Coinbase already do?"**
   Ramp's AP agent (Oct 2025) and Sage's AP Agent (SA, Mar 2026) ask their AI to *spot* fraud, inside their own
   software. Coinbase, Privy and Turnkey enforce limits in a company's policy engine or enclave. Gcina is the AP
   agent for SA small businesses where the **ledger counts the signatures**: no custodian, no smart contract
   to trust ([03](03-competitors.md)). Never say "nobody else enforces limits outside the agent".
5. **"Who pays, how much, and have you spoken to customers?"**
   The bookkeeper running supplier payments for 10–30 small clients. Target R149–299 per business per month
   (Xero SA is R485–R857, so it's an add-on, not a replacement). Our design partner is a Joburg food business
   owner *[insert Gumede's answer/quote from 02 §4]*, and next we test with 3–5 practices. Be honest that
   validation is early.

## GTM in 5 bullets

1. **Beachhead:** SA SMEs paying 10+ suppliers by EFT against invoices: food service (takeaway is the
   fastest-growing slice, +10% y/y, Stats SA via 02b), small restaurant groups, distributors.
2. **Channel:** bookkeepers and small accounting practices. SAIPA 10k+, SAIT 9k+ members; 46% of SA practices
   already advise clients on apps (Xero/KLA 2025). One practice brings many client businesses.
3. **Pricing:** about R149–299 per business per month, or a practice tier per client file. Our inference from
   the Xero SA and BILL anchors. Validate with the first 5 practices.
4. **Rails partner:** a licensed SA CASP for KYB, Travel Rule and ZAR payout. VALR listed RLUSD in Sep 2025, but
   RLUSD on the XRPL network and an RLUSD/ZAR route are **not confirmed** (04 §8). That's the ask to VALR /
   Ripple's Africa partners. **Local infrastructure we can name today:** bank account verification (AVS, run by
   PayInc, formerly BankservAfrica, reached via Stitch and others; about R2–R12 a check, up to 120 s) confirms the
   supplier's ZAR payout account matches their CIPC registration number *before* the address becomes "approved".
5. **Expansion:** cross-border supplier invoices in RLUSD (SA importers; Ripple's Africa partners such as Yellow
   Card and Chipper) → other markets → the Ripple UDAX accelerator ask.

## Open items before 21:00
- Gumede interview (02 §4) → update Customer validation and the Q5 answer.
- ~~04 §8 local rails + AVS~~ done 16:06: no SA exchange confirmed for RLUSD-on-XRPL → Q1/GTM 4 updated. Chuma could check VALR's RLUSD deposit screen (which networks) before Saturday.
- Links to open by hand (blocked to the fetcher): SAFLII judgments, the full SABRIC 2025 PDF, Capitec, Cliffe Dekker (see 01).
