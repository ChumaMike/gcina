# 00 — Verdict: Gcina (final, Gcina only)

**Final v2, 12 Nov 2026 (R).** Supersedes draft 1. Chuma's decision 17:41: **Gcina, no pivot.** Stokvels and cross-border
are roadmap lines only (stokvel research is parked in `06`/`07`, for the roadmap slide's market-size line).
Numbers come from files 01–05 and the line-by-line check in [`08-stats-verification.md`](08-stats-verification.md).
**If 08 marks a number NOT FOUND or CORRECT-TO, 08 wins.**

## Bottom line
A **strong track answer with an honest, court-backed problem**. Business remains the soft third, mainly because the
customer evidence is one team member's first-hand memory at a family business. That's real, but not yet "validated users".

## Viability scores (1 = bad, 5 = strong)

| Dimension | Score | Why |
|---|---|---|
| Problem severity | **4** | Two pains: paying the **wrong account** (SCA *Hawarden* 2024, *Intengo Imoto* 2025: the payer still owes) and paying **twice** (APQC duplicate/erroneous-payment benchmark; seen at MTA) |
| Evidence strength | **3** | Court rulings + all four big banks' warnings are primary and current. No SA total for BEC/invoice-fraud losses exists. Survey stats are US-centric |
| Track fit | **5** | Agent initiates; the XRPL quorum decides. Master key disabled, agent weight 1 of quorum 2 → `tefBAD_QUORUM`. All 3 MVP items are covered |
| Customer validation | **2.5** | MTA (Soweto training academy) is a disclosed, connected design partner. Evidence = Chuma's own 2022–24 admin experience (duplicates), **not yet confirmed by MTA's owner**. No bookkeeper or independent user yet |
| Commercial viability | **3** | Bookkeeper channel (SAIPA 10k+, 46% of SA practices advise on apps); price anchors Xero SA R485–857/mo, BILL $49–89/user. Our R149–299 is an inference |
| Demo-ability | **4** | Deterministic fixtures, fast finality, a clear "ledger refused" beat. Risk: RLUSD float (AMM buy pending at 17:41) and the deploy |
| Regulatory risk | **2** | Testnet is fine. Production = software behind a licensed CASP. SARB/FSCA May 2026 is cool on USD stablecoins for domestic payments; no SA exchange confirmed for RLUSD-on-XRPL → rand |

### The cheapest validation win left (do it tonight)
**Ask MTA's owner to confirm in one WhatsApp:** *"Did the academy ever pay a learner or supplier twice? Would you use
something that refuses repeats and only pays approved people within your limits? What would you pay a month?"*
A one-line reply turns "a team member remembers" into "the owner says", which is the difference judges care about.
Also send the fake-banking-details question (02 §2, Part C) to 2–3 bookkeepers or owners Chuma knows. Keep their replies anonymous unless they consent.

## 3 stats for the stage (ranked by credibility; check against 08 before slides lock)
1. **"In 2024 and again in 2025, South Africa's Supreme Court of Appeal ruled that if you pay a hacked invoice into a
   fraudster's account, you still owe your supplier."** *ENS v Hawarden* [2024] ZASCA 90; *Intengo Imoto v Zoutpansberg
   Motor Wholesalers* [2025] ZASCA 93 (R290,000; the buyer still owed the seller). ([Clyde & Co](https://connectedworld.clydeco.com/post/102kqmg/verify-before-you-pay-south-africas-sca-reinforces-buyers-duty-in-bec-fraud-ca), [Moonstone](https://www.moonstone.co.za/sca-overturns-precedent-setting-cyber-crime-judgment/))
2. **"Standard Bank, Absa, Nedbank and FNB all warn businesses about 'changed banking details' invoices. The advice is
   always the same: check before you pay."** (01 §1c)
3. **"Benchmarks find that about 1 to 2 in every 100 payments a business makes are duplicates or errors."**
   (APQC via [CFO.com](https://www.cfo.com/news/metric-of-the-month-detect-and-prevent-duplicate-or-erroneous-payments/656852/): it counts **payments, not rands**, so never say "R1–2 in every R100"; no "1,686 organisations", no "1.5% median".) Paired with the MTA story.
Context lines (say with their scope): SABRIC R2.4bn in 2025 = **all digital banking crime**; FBI IC3 US$3.05bn BEC = **US**;
PYMNTS 0% = **60 CFOs of US $1bn+ firms** (Sep 2025 report, link in 08); Deloitte 54% = **200 North American $1bn+ CFOs**, Jan 2026; Wakefield 14/97/88% = **vendor-commissioned (Maximor AI)**; AFP 74% = **US organisations**.

## 30-second problem statement
> "Small businesses lose money paying the wrong account and paying the same person twice. When a supplier's email is
> hacked and the invoice says *'our banking details have changed'*, our Supreme Court of Appeal says the loss is yours:
> you still owe the supplier. And at the training academy in Soweto where I did admin, sometimes the same person got
> paid twice. AI agents could do this work, but nobody wants an AI holding the banking login. Gcina's agent does the
> paying, and even if it's fooled or hacked, it still can't pay on its own."

## Overstatements found (challenge per C 17:02): fix before slides/README lock
| Where | Says | Problem | Say instead |
|---|---|---|---|
| `docs/customer-evidence-mta.md` stage quote | "the **ledger** refuses anything twice, anything over the limit, or anything to an account the owner never approved" | **Technically false.** The ledger refuses the agent's lone signature; duplicates, limits and payees are the **policy co-signer's** rules | "…and anything twice, over the limit, or to an account the owner never approved gets refused. The agent can't get round it, because the ledger won't accept its signature alone." |
| `docs/problem-statement.md` problem para | "**no CFO surveyed** in 2025 would let an AI agent make payments with full access" | Survey = 60 CFOs at US $1bn+ firms; sounds universal and SME-relevant | "In a 2025 survey of 60 CFOs at large US firms, none would give an AI agent full access to make payments." |
| `docs/problem-statement.md` gap | "**Nobody offers:** …" | Breaks C's 17:45 rule (never 'nobody/only/first'); Coinbase/Privy/Turnkey and the Visa/BILL pilot enforce limits outside the agent | "What we haven't seen for SA small businesses: …" |
| `docs/problem-statement.md` vs-teams | "Many will enforce limits in their own backend… **Ours are enforced by XRPL itself**" | Our limits **are** in a backend (the policy service). XRPL enforces the two-key rule | "Our two-key rule is enforced by XRPL itself, so the limits service can't be skipped, even by a hacked agent." |
| `docs/problem-statement.md` diff. 2 | "Enforced by the ledger, not by our code" | True only for "two signatures or nothing". OK if the sentence keeps that scope | Keep, but never shorten it to "the ledger enforces our limits" |
| `docs/problem-statement.md` diff. 5 | "treasury converts XRP→RLUSD on XRPL's native AMM" | Only true once L's swap hash exists (P already gates this) | Gate on demo-evidence.md |
| `docs/idea-comparison.md` | "74% of orgs **hit by BEC**" | AFP counts **attempts or losses**, US-centric treasury respondents | "74% of organisations faced BEC attempts or losses (AFP 2026, mostly US)" |
| `docs/customer-evidence-mta.md` | duplicates framed as supplier payments | MTA duplicates were **learner stipend** payments from attendance registers | Say "the same person got paid twice", which the problem statement's "suppliers and people" already covers |
| "design partner" (everywhere) | implies an agreed partnership | MTA's owner hasn't confirmed anything yet | Until the WhatsApp reply: "a training academy in Soweto where I worked" |

## Final "never say" list
1. "R2.4bn lost to invoice/BEC fraud" (SABRIC's R2.4bn is all digital banking crime).
2. Any SA total for BEC losses: none is published.
3. "67% / 92% of SA firms hit by BEC", "R2.4m average BEC cost", "BEC isn't counted in SABRIC", Sage's "202 admin days a year", PwC 38% (vendor-only).
4. "First", "only", "nobody else" (Coinbase, Privy, Turnkey, Safe, Crossmint, Visa/BILL and Ramp all exist).
5. "The ledger enforces our limits / blocks fraudsters / blocks duplicates." The ledger enforces **the two-key rule**; the policy enforces payees, limits and duplicates.
6. "The failed attempt is on the blockchain / here's its explorer link." A `tef` result never reaches a ledger; we log it.
7. "Suppliers get rands automatically today" / "VALR supports RLUSD on XRPL." Not confirmed (04 §8).
8. "Legal / approved / regulator-ready." Say "testnet demo; production runs behind a licensed CASP".
9. "Validated users" / "customers" (plural). Say "design partner" only once MTA's owner confirms.
10. "MTA paid via Xero." Chuma isn't sure; say "payroll and accounting software".
11. "No CFO would…" without scope (60 US $1bn+ CFOs).
12. Deloitte 54% **without scope**. It's verified, but say "54% of 200 large North American CFOs call AI agents in finance a transformation priority (Deloitte, Jan 2026)".
15. "R1–2 in every R100" for duplicates (APQC counts payments), "1,686 organisations", "1.5% median" (vendor blog only).
16. "268,000 formal businesses with employees" (not found; SBI 2018 ≈ 250,000) and "FinScope 2.6m SMMEs" (label not found).
17. Wakefield CFO stats without "commissioned by a finance-AI vendor"; AFP 74% as "global".
13. "Gcina is a registered/unique brand." gcina.co.za is an FSCA-registered funeral-cover brand. Don't claim the name; do a CIPC search before launch.
14. RLUSD issuer details (clawback/charter) unless verified (05 C0 note).

## Top 5 judge questions (short answers; P's qa.md has the long versions)
1. **"Why not just a bank API or Ramp/Sage?"** They trust whoever holds the login, and their AI checks run inside the same system. Gcina separates the agent's ability to *initiate* a payment from its authority to *spend*: the ledger needs a second, independent signature.
2. **"What stops the policy service being hacked?"** One key is weight 1, under a quorum of 2. The policy only co-signs Payments to approved payees, within limits, with a capped fee and no partial-payment flag. The owner's offline key (weight 2) rotates both.
3. **"Is this legal / how do suppliers get rands?"** Testnet today. In production Gcina is software behind a licensed SA crypto exchange (CASP) that does KYB, the Travel Rule and rand payouts. SARB is cool on USD coins for local payments, so rand rails come first there, with RLUSD for dollar-priced invoices.
4. **"What if the AI misreads an amount?"** It can only propose. The policy checks the amount against the open PO and limits, and anything over the owner's limit waits for the owner.
5. **"Who pays and have you validated it?"** Small businesses through their bookkeepers, about R149–299/month (our estimate against Xero SA's R485–857). Validation is early: first-hand at a Soweto training academy, next 5 bookkeeping practices.

## GTM in 5 bullets
1. **Beachhead:** SA SMEs that pay many people or suppliers from approved lists (training academies paying stipends from registers, food service, distributors).
2. **Channel:** bookkeepers/small practices (SAIPA 10k+, SAIT 9k+; 46% already advise clients on apps, Xero/KLA 2025).
3. **Pricing:** about R149–299 per business per month, or per client file for practices (inference; test with the first 5 practices).
4. **Rails:** a licensed CASP for KYB/Travel Rule/rand payout (VALR listed RLUSD 2025, XRPL route to be confirmed); AVS bank-account check (about R2–R12, via Stitch etc.) before any payee is approved.
5. **Expansion:** stipend registers and stokvel payouts (NASASA estimate ~11m members, ~R50bn/yr, labelled estimate); cross-border RLUSD supplier invoices with a licensed partner; the Ripple UDAX accelerator.
