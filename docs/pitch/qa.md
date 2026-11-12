# Gcina: the 12 hardest judge questions

> Status: **DRAFT v0 (16:10)**. Two sentences per answer, said calmly. **[R?]** = must be checked
> against `docs/research/` before Saturday; don't say a marked number until it's filled.

### 1. Why blockchain? Why not just a bank API with limits?
A bank API limit lives in software the business and its vendors control, so a bug, a stolen API key or a
hacked app can change it. On the XRP Ledger the rule "two votes or no payment" is enforced by the network
itself, so even our own software can't override it, and every payment carries its invoice number in a public, permanent record.

### 2. What stops someone hacking the policy service?
The policy service only holds one vote, so a hacked policy service still can't pay anyone on its own; it
would need the agent's key too, and the two run separately with separate keys. The owner's recovery key
(two votes) stays offline, so the owner can always remove a compromised signer from the account.

### 3. What if both the agent and the policy service are compromised?
Then you've lost two independent systems, and the damage is still capped: the agent account only holds a
float the owner tops up, not the business's main treasury. In production we'd run the policy signer on
separate infrastructure (an HSM or a separate provider) and add daily limits on the float itself.

### 4. What if the AI hallucinates an amount?
The agent's number never stands alone: it must match an open purchase order for the same supplier and
amount, and the policy service decodes the **signed** transaction and rejects it if it doesn't match the
proposal. A wrong amount gets held or rejected; it doesn't get paid.

### 5. Is this legal in South Africa? FSCA, exchange control?
Crypto payments are lawful but aren't legal tender, and the SARB and FSCA say any intermediary must hold a
FAIS licence, so in production Gcina runs as software behind a licensed crypto asset service provider that
carries KYC and the Travel Rule. Today's demo is on testnet and moves no value, and our guardrails (limits,
multi-sign quorum, independent co-signer) are the controls that provider's compliance team would want. *(04 §1, §3, §7)*

### 6. How does the supplier actually get rands?
The payment lands in the supplier's account at a licensed SA exchange, which sells it to ZAR and pays it out
by EFT the same day (VALR, for example, gives 30 free ZAR withdrawals a month), so the supplier never handles
a raw wallet. We haven't yet confirmed an RLUSD-on-XRPL → ZAR route with VALR, and that's our first partner conversation. *(04 §6–7)*
Be honest: the ledger's guarantee covers the payment decision; the last step to a rand EFT (e.g. through a
payout provider such as Stitch or Peach) happens off-ledger. *(03-competitors.md §D point 4.)*

### 6b. Why a US-dollar stablecoin for local payments? The SARB doesn't like that.
That's right: the SARB's 2026 communication says foreign-pegged stablecoins are unlikely to be approved for
domestic payments. Our policy engine is asset-agnostic, so at home we'd pay in a rand stablecoin (through the
IFWG sandbox if needed) and keep RLUSD on XRPL for cross-border supplier invoices once the exchange-control rules allow it. *(04 §2, §7)*

### 7. Who pays you, and how much?
The business pays an add-on of about R149–R299 a month, roughly a quarter of what it already pays for Xero,
and bookkeepers get a practice tier priced per client file. It's an early estimate we're testing with our
starting customer and accounting practices, anchored on one fraud loss costing far more than a year of Gcina. *(02b §6: inference, not data. **[Chuma? confirm]**)*

### 8. Why would a small business owner trust an AI with money?
They don't have to trust it: it can only pay approved suppliers, within limits they set, and anything
unusual comes to their phone first. **[MTA owner's own words from the interview, if we have them.]**

### 9. Why XRPL over Ethereum or Solana?
Multi-signing with weighted signers and a disabled master key is a **native ledger feature** on XRPL, so
there's no custom smart contract to audit or exploit. It also settles in seconds for a fraction of a cent,
and RLUSD gives a dollar stablecoin on the same ledger. **[R? exact fee/finality numbers in 05-xrpl-fit.md]**

### 10. Isn't the policy service just a centralised gatekeeper again? Isn't your limit logic still software?
Yes, the limits and the supplier list live in our co-signer service. What the ledger enforces is the
**quorum**: the agent alone can't pay, and getting around the rules means stealing a second, independent key.
*(Be exact here. Don't claim the ledger itself checks the supplier list: 03-competitors.md §D point 3.)*
It's one vote out of two, not a gatekeeper with the keys to the money. The owner holds the override, so the business never depends on us to get its money out.

### 11. What's different from Ramp, Sage or Xero?
They automate accounts payable and add fraud checks inside their own platform, and Visa's new pilot lets agents pay invoices a human already approved. Gcina is built for the next step, letting the agent decide, so we take spending authority *out of the agent's hands*: a separate co-signer holds the second key, and the XRP Ledger refuses anything without both. That's verifiable on a public ledger, not just in our logs, and it's built for SA small businesses that can't afford Ramp-style finance teams. **Short version: SA tools check or alert; Gcina makes the payment need a second, independent signature the agent can't produce.** *(R 03-competitors §F; docs/problem-statement.md, C 17:45. Ramp flags changed bank details too (US); Visa + BILL + Billtrust
piloted agent-executed, human-approved invoice payments on 20 Oct 2026; Sage SA has an AP agent. Never say "first",
"only" or "nobody".)*

### 11a. What makes Gcina different from other teams' agent wallets?
Three independent locks: the AI's own judgement, a rule-keeper with its own key that the AI can't override, and the
XRP Ledger refusing the agent on its own. Each one still holds if the one before it fails, and the whole thing is
built around a real SA failure ("you pay twice"), not around the technology.

### 11b. Coinbase, Privy, Turnkey and Safe already enforce agent limits. Why you?
They enforce limits in a vendor's enclave or a smart contract, and they're built for developers and
agent-to-API payments rather than a small business's supplier and fraud workflow in South Africa. Gcina's quorum is the XRP Ledger's own multi-sign (no contract, no
custodian), and a changed bank account can only get past it with the owner's key. *(Source: 03-competitors.md §D. **Never say "nobody else does external limits"**: that's false.)*

### 12. Who's your customer, and have you spoken to them?
Our starting customer is Meyiswa Training Academy in Soweto, where I did the admin for two years; it's a family business of our team (say this openly). Call it a "design partner" only once MTA's owner confirms, and the buyer we scale through is the bookkeeper who runs payments for many small clients. I also did MTA's admin myself from 2022 to 2024, so I've been the person paying those invoices. **[MTA interview: how it pays suppliers, has it seen fake banking-details emails, what limits it would set, would it pay for this.]**

### 13. "Gcina" is already a funeral-cover brand in SA. Isn't that a problem?
Yes, we found it: an FSCA-registered funeral-cover product trades as Gcina, so it's fine as a hackathon name
but we'd launch under a compound name such as "Gcina Pay" after a trade-mark search. The word means "keep,
protect", which is exactly the job. *(02b Part 2)*

---

### 13b. Why would anyone let an AI pay suppliers at all?
They mostly won't yet: in a July 2025 PYMNTS survey of 60 CFOs at US$1bn+ US companies, none would give an AI agent substantial or full
access to systems like payments, and in a Wakefield survey paid for by the AI vendor Maximor, 97% of US mid-market CFOs
say human oversight is critical, even though 88% already use agentic AI. Gcina keeps that oversight on the ledger: the agent handles the routine payments, and anything
unusual needs the owner. *(docs/stats-sheet.md; these are US surveys, say so.)*

### 14. Has MTA actually been hit by fake banking details?
Not that I know of: what I saw in two years of MTA's admin was the same person sometimes getting paid twice,
and Gcina's duplicate check stops exactly that. The fake-banking-details risk comes from the courts and all four
big banks' warnings, so we stop both. *(customer-evidence-mta.md; never claim an MTA fraud incident.)*

### 15. Why not stokvels, or another market?
The same engine protects any money one person controls for many people, and stokvels are our next market: NASASA
estimates about 11 million members and R50 billion a year, though it's their own estimate. We start with supplier
payments because the loss is legally the business's (SCA 2025) and we've seen the double payments first-hand. *(06-stokvel-problem.md, idea-comparison.md)*

## Spare questions
- **Is your stat about BEC?** No, and we never say so: the R2.4 billion is all SA digital banking crime (SABRIC 2025). Our core fact is the 2025 SCA ruling that the payer still owes the supplier. (if time)
- **Does the agent ever see the owner's dashboard token?** No: the agent has its own token that gets
  "forbidden" on every limit, supplier and approval route; only the dashboard server holds the operator token.
- **What happens to a held payment after it expires?** The signed payment has a short ledger expiry; once the owner approves, the agent signs a fresh one, so nothing old and stale can be replayed.
- **Duplicate invoices?** The policy service rejects an invoice that's already been paid (inv-004 in the demo).
