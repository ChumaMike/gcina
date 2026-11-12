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
**[R? 04-regulation-and-rails.md: FSCA crypto asset service provider licensing, SARB exchange control, FIC Travel Rule.]**
Draft: today this is a testnet demo moving no real money; in production, the money side runs through a
licensed partner, and Gcina is the software that decides and signs within the owner's rules.

### 6. How does the supplier actually get rands?
**[R? which partner offers RLUSD/XRP → ZAR off-ramp on XRPL, and how.]**
Draft: in production we'd pay in RLUSD through a licensed SA exchange partner that converts to rands
in the supplier's bank account, so the supplier doesn't need to know anything about crypto.

### 7. Who pays you, and how much?
**[R?/Chuma? pricing from 00-verdict.md GTM.]** Draft: a monthly fee per business plus a small
fee per payment, sold mainly through bookkeepers who manage accounts payable for many small businesses.

### 8. Why would a kota shop owner trust an AI with money?
He doesn't have to trust it: it can only pay approved suppliers, within limits he sets, and anything
unusual comes to his phone first. **[R? Gumede's own words from the interview, if we have them.]**

### 9. Why XRPL over Ethereum or Solana?
Multi-signing with weighted signers and a disabled master key is a **native ledger feature** on XRPL, so
there's no custom smart contract to audit or exploit. It also settles in seconds for a fraction of a cent,
and RLUSD gives a dollar stablecoin on the same ledger. **[R? exact fee/finality numbers in 05-xrpl-fit.md]**

### 10. Isn't the policy service just a centralised gatekeeper again?
It's one vote out of two, not a gatekeeper with the keys to the money, and the ledger, not the service,
decides whether the quorum is met. The owner holds the override, so the business never depends on us to get its money out.

### 11. What's different from Xero bill pay, Sage or Ramp?
**[R? 03-competitors.md.]** Draft: those tools trust their own software to follow the rules; Gcina
assumes the AI *will* be fooled one day and makes the ledger refuse it, which is what a CFO needs before
letting an agent pay anyone.

### 12. Who's your customer, and have you spoken to them?
Our first design partner is a food business owner we already work with, Gumede at Kota~tainment (say this openly: he's a connected party), and our buyer is the bookkeeper who runs payments for 10–30 small clients. **[R? 02-customer.md: what he told us: how he pays suppliers, has he seen fake banking-details invoices, what limits he'd set, would he pay for it.]**

---

## Spare questions (if time)
- **Does the agent ever see the owner's dashboard token?** No: the agent has its own token that gets
  "forbidden" on every limit, supplier and approval route; only the dashboard server holds the operator token.
- **What happens to a held payment after it expires?** The signed payment has a short ledger expiry; once the owner approves, the agent signs a fresh one, so nothing old and stale can be replayed.
- **Duplicate invoices?** The policy service rejects an invoice that's already been paid (inv-004 in the demo).
