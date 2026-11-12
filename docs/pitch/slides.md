# Gcina: slide deck and script (5 minutes)

Deck: https://claude.ai/artifact/48YheDEhqLqAGfavradDwc (private until Chuma shares it).
Order (Chuma, 12 Nov): problem → evidence and who says so → our solution (then live demo) → why us → business model.
Backups for Q&A: security model, roadmap and team. Hard Q&A answers: [`qa.md`](qa.md).

| # | Slide | Time |
|---|---|---|
| 1 | The problem: small businesses pay twice | 0:00–0:35 |
| 2 | The evidence, and who says so | 0:35–1:05 |
| 3 | Our solution: an AI that pays suppliers but can't pay alone | 1:05–1:35 |
| (demo) | Live dashboard: inv-001 paid, inv-004 repeat refused, inv-002 fake details held + agent alone refused by the ledger, inv-003 owner approves | 1:35–3:20 |
| 4 | Why Gcina, not what already exists | 3:20–4:10 |
| 5 | Business model and the ask | 4:10–5:00 |

## Slide 1 · The problem (0:00–0:35)
"I did the admin at Meyiswa Training Academy, a training academy in Soweto. Payments were approved by hand from
attendance registers, and sometimes the same person got paid twice. That's one way a small business pays twice.
The other is an email that says 'our banking details have changed'. Pay it, and you still owe your real supplier.
AI agents could take this admin off a business's hands, but an agent can be fooled by that same email. So almost
nobody lets one press 'pay'. I'm Chuma, this is Dalindyebo, and this is Gcina."

## Slide 2 · The evidence, and who says so (0:35–1:05)
"Who says this isn't just us? Our Supreme Court of Appeal, in 2025: a buyer paid R290,000 into a fraudster's
account and still owed the seller. The payer carries the risk. SABRIC says South Africans lost R2.4 billion to
digital banking crime last year, mostly by being tricked. Benchmarks say one to two in every hundred payments a
business makes is a duplicate or an error. And finance chiefs want AI: 54% of big-company CFOs call AI agents a
priority, but in another survey not one of 60 would let an agent near payments. Every big SA bank gives the same
advice: check changed banking details before you pay. That check is our rule."

## Slide 3 · Our solution (1:05–1:35, then the demo)
"Gcina is an AI agent that pays your suppliers for you. It reads the invoice, matches it to your order, and pays.
But it can't pay alone. The business's account on the XRP Ledger has no single key. The agent has one vote. Our
policy service has one vote, and it checks your rules: approved suppliers, your limits, and no repeats. The
owner's key, kept offline, has two. The ledger needs two to move money. So a fooled agent can't pay anyone on its
own: the ledger itself refuses it. We separate the agent's ability to start a payment from its authority to spend.
Let me show you." → switch to the dashboard; demo beats as in [`pitch-5min.md`](pitch-5min.md).

## Slide 4 · Why Gcina, not what already exists (3:20–4:10)
"So why not Ramp, or Visa's new pilot, or the payment apps on Xero and Sage? They're good. But Ramp is US, Canada
and the UK, and its AI alerts you. Visa's pilot lets an agent pay invoices a person already approved, by card, in
the US. The SA payment add-ons move rands well, but a person builds every batch, and one of them says plainly
that unverified accounts won't be blocked. Gcina is the one where the AI does the work, and the spending power
sits outside the AI, on a public ledger, with the owner holding the override. Why us? I did this admin. I saw the
double payments. And we built it: it's paying real testnet RLUSD tonight. Where they beat us is scale and real
rands, so the SA tools are our partners, not our targets."

## Slide 5 · Business model and the ask (4:10–5:00)
"Who pays? Small businesses like MTA that pay ten or more suppliers by EFT. We grow through bookkeepers: one
practice runs supplier payments for many businesses. SAIPA alone has over 10,000 members. We're aiming at about
R149 to R299 a month per business, less than their accounting software. In production we run behind a licensed
South African crypto provider, so suppliers still get rands in their bank account; RLUSD is for paying suppliers
across borders. Our ask: a place in Ripple's UDAX accelerator to take Gcina from testnet to a real pilot with MTA.
The agent pays. The ledger keeps. Thank you."

## Never say
"first", "only" or "nobody" about our position · "the ledger refuses double payments" (the policy does) ·
"R1 to R2 in every R100" (APQC counts payments) · R2.4bn as invoice-fraud losses · "design partner" until MTA's
owner confirms · that MTA was hit by fake banking details.
