# 02 — The named customer and who else buys this

> **SUPERSEDED 12 Nov evening:** Gumede/Kota~tainment is **out** (Chuma, 16:05). The named design partner is **MTA**
> (Meyiswa Training Academy, Soweto; disclosed family business): see `docs/customer-evidence-mta.md` and `00-verdict.md`.
> **Do not name Gumede or Kota~tainment anywhere.** The interview script (§2) is still useful: reuse Parts C–E as a WhatsApp
> question to MTA's owner and 2–3 bookkeepers/owners. The archetypes (§3) still stand.


Owner: R (Research). Status: v1 written 12 Nov 2026 (16:15). The interview answers go in §4 tonight.
Segment numbers and the bookkeeper channel are in [`02b-segments-and-name.md`](02b-segments-and-name.md).

## 1. Named customer: Gumede, owner of Kota~tainment

**Kota~tainment** is a kota (township street-food) business. Here Gumede wears his **business-owner hat**.

### Sceptic notes (read before the pitch)
1. **He's a connected party.** Gumede is also Chuma's supervisor on another project. A judge who finds this
   out will discount the validation unless we're open about it. Say: *"our first design partner is a food
   business owner we already work with"*, never *"an independent customer"*.
2. **A kota shop may not have an AP problem.** Small food businesses often buy stock at a cash-and-carry or
   wholesaler with card or cash at the till, and pay few invoices by EFT. If that's Gumede's reality, the
   fake-banking-details story doesn't fit *him*. It fits his **suppliers' other customers**, or a business
   one size up. The interview's first job is to find out how many suppliers he pays **by EFT against an invoice**.
3. **Suppliers want rands, not XRP.** Ask whether any supplier would ever take a stablecoin. Expect "no".
   The production story must be "the supplier still gets rands in the bank" (see `04-regulation-and-rails.md`).
4. **One interview isn't "validated users".** Top band needs *validated users* (plural). Try for
   Gumede + one bookkeeper + one other owner tonight, even if two of them are 3-minute WhatsApp voice notes.

If the interview shows he has fewer than about 5 invoice-paying suppliers, use the **reframe** in `00-verdict.md`:
keep Gumede as the human story ("this is who gets hurt"), and make the **bookkeeper who runs payments for
20 small clients** the buyer.

## 2. 10-minute phone interview script (Chuma, tonight)

**Before you dial:** have this open, record nothing without asking, type answers straight into §4.
Keep it to his business, not Skhokho. Don't pitch until Part E: we want facts first, then reactions.

**Opening (30 s)**
> "Gumede, I'm building something for the hackathon this weekend about how small businesses pay their suppliers.
> Can I ask you ten minutes of questions as the owner of Kota~tainment? There are no right answers. I'd like to
> quote you on stage as 'the owner of a Joburg food business'. Is that okay, or would you rather I don't use your name?"

→ Record: **consent to name: yes / first name only / anonymous**.

**A. How you pay today (3 min)**
1. "Who do you buy from in a normal week? Roughly how many different suppliers?" (meat, bread, chips, packaging, gas, rent…)
2. "How do you pay each of them: cash, card at the till, EFT on an invoice, debit order, on account?"
   → *Count the EFT-against-invoice suppliers. This number decides the pitch.*
3. "When you pay by EFT, where do the invoice and banking details come from: WhatsApp, email, paper?"
4. "Who actually does the payment on the banking app: you, a manager, a bookkeeper?"
5. "Roughly how much goes out to suppliers in a month?" (a range is fine: under R20k / R20–100k / over R100k)
6. "How long does paying suppliers take you each week? What's the most annoying part?"

**B. Approvals and control (1.5 min)**
7. "Does anyone else ever pay suppliers for you? Do they have their own banking login, or yours?"
8. "Is there an amount where you'd want to say yes yourself before it goes?" → **his number in rand**.
9. "If you could set one rule for paying suppliers, what would it be?" (only known suppliers / max per day / never a new account…)

**C. Fraud (2 min)**: *ask plainly, then stay quiet and let him talk*
10. "Have you ever had a message or invoice saying a supplier's banking details changed?"
11. "Has it happened to anyone you know: another owner, a supplier, a family business? What happened? Did they get the money back?"
12. "If a supplier WhatsApped you new banking details tomorrow, what would you do before paying?"
13. "Has a supplier ever been paid twice, or paid the wrong amount?"

**D. Trust in an agent (1.5 min)**
14. "If software read your invoices and paid suppliers on its own, up to a limit you set, would you let it? What limit?"
15. "What would make you NOT trust it?"
16. "If it found a changed-banking-details invoice, how should it tell you: WhatsApp, SMS, app?"

**E. Show and price (1.5 min)**: *now give the 15-second pitch*
> "It pays your known suppliers automatically under your limit. If anything looks off, like a new bank account,
> it can't pay. It's physically locked until you approve on your phone."
17. "Would that be useful to you? Honestly, 1 to 10?"
18. "What would you pay per month for that? R50? R150? R500? Nothing?"
19. "Would you rather your bookkeeper or accountant ran it for you?"
20. "Who else should I speak to: another owner, your bookkeeper, a supplier?" → **get one name for tonight**.

**Close (15 s):** "Thank you. Can I send you the 3-minute video on Friday?"

### Red flags to listen for (be honest in §4)
- Fewer than 3 EFT suppliers → AP pain is weak for him (use the reframe).
- "I'd never let software pay": fine, the product keeps the human approval path. Note his limit anyway.
- Price answer of "nothing" → note it. Willingness to pay then has to come from the bookkeeper channel.

## 3. Other customer archetypes (who pays, pain, how to reach)

Numbers for each are in `02b-segments-and-name.md`. Nothing here is a claim we say on stage until it's sourced there.

| Archetype | Who pays / uses | Pain | Trigger to buy | How we reach them |
|---|---|---|---|---|
| **A. Bookkeeper / small accounting practice running AP for ~10–30 SME clients** (likely the real channel) | Practice owner pays, charges clients | Monthly payment runs across many bank logins; liable-feeling when a client is defrauded on a payment they prepared; client approvals by WhatsApp | A client loses money to a changed-banking-details invoice; month-end crunch | Bookkeeper bodies (SAIPA, ICB/IAC members), Xero/Sage partner networks, accounting WhatsApp groups |
| **B. Small restaurant group / franchisee (2–5 sites)** | Owner or ops manager | 20–60 suppliers, invoices arrive by email/WhatsApp at each site; managers need limits; fraud exposure is real because volumes are big | New site opening; a fraud near-miss; moving to a bookkeeper | Franchise associations, restaurant suppliers, POS partners |
| **C. Spaza / township retailer buying from wholesalers** | Owner | Mostly cash today; carrying cash is a robbery risk; wholesaler credit is informal | Wholesaler pushes digital payment; a robbery | Wholesalers and B2B ordering apps. **Caution:** the AP-invoice-fraud story fits them weakly; their pain is cash handling, not BEC |
| **D. Gumede-type owner-operator (1 site)** | Owner | Few EFT suppliers; time, not fraud, is the pain | Growth to a 2nd site | Direct, through Skhokho-style merchant communities (no shared code; just the network) |

**Recommendation:** pitch **D as the human face, A as the buyer**. Bookkeepers own the payment run, have many
clients each (one sale → many accounts), and already feel the fraud risk because they prepare the EFTs.

## 4. Interview results (fill in tonight)

| # | Question | Answer (his words where possible) |
|---|---|---|
| — | Consent to name | |
| 2 | EFT-against-invoice suppliers (count) | |
| 3 | Where invoices/banking details arrive | |
| 5 | Monthly supplier spend (range) | |
| 8 | "Ask me first" amount (R) | |
| 9 | His one rule | |
| 10–11 | Fraud experience (own / someone he knows) | |
| 14 | Would let an agent pay? limit? | |
| 17 | Usefulness 1–10 | |
| 18 | Price per month | |
| 19 | Prefer bookkeeper runs it? | |
| 20 | Next person to call | |

**Quote for the stage** (one line, with his consent): …
