# Gcina stats sheet (coordinator, 12 Nov 2026)
One page of numbers we can say on stage. Each line has its year and source. SA = South African data.
Full detail is in docs/research/01-problem-evidence.md.

## Problem 1: paying the wrong account (changed-banking-details / BEC fraud)
- **SA law, 2025:** if you pay a hacked invoice into a fraudster's account, you **still owe the supplier**. *Intengo Imoto v Zoutpansberg Motor Wholesalers*, 2025 (6) SA 143 (SCA), a **R290,000** vehicle payment. Also *ENS v Hawarden* [2024] ZASCA 90: the buyer lost **R5.5m**. https://connectedworld.clydeco.com/post/102kqmg/verify-before-you-pay-south-africas-sca-reinforces-buyers-duty-in-bec-fraud-ca · https://www.moonstone.co.za/sca-overturns-precedent-setting-cyber-crime-judgment/
- **SA, 2025:** **R2.4bn** lost to digital banking crime (up from about R1.9bn in 2024), across **110,074** incidents, driven by social engineering. (All digital banking crime, **never call it BEC**.) SABRIC, Aug 2026: https://www.sabric.co.za/?p=4450
- **SA:** Standard Bank, Absa, Nedbank and FNB all publicly warn businesses about "changed banking details" invoices (FNB, Jul 2025). See 01-problem-evidence §1c.
- **Global, 2025:** **74%** of organisations were hit by BEC attempts or losses in 2025 (63% in 2024). AFP Payments Fraud & Control Survey 2026 (465 treasury pros, US-centric): https://www.nacha.org/news/business-email-compromise-attempts-rose-sharply-2025-report-finds
- **Global, 2025:** **US$3.05bn** in BEC losses from 24,768 complaints (US only). FBI IC3 2025: https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf

## Problem 2: paying twice (duplicate / erroneous payments)
- **First-hand (MTA, 2022–2024):** learners were paid from an owner-approved attendance register, and **the same person was sometimes paid twice**. docs/customer-evidence-mta.md
- **Benchmark:** **0.8%** (best performers) to **2%** (worst) of all disbursements are duplicate or erroneous, with a median of about **1.5%** across 1,686 organisations. APQC (date of survey not shown): https://www.cfo.com/news/metric-of-the-month-detect-and-prevent-duplicate-or-erroneous-payments/656852/ · https://www.apqc.org/resources/benchmarking/open-standards-benchmarking/measures/percentage-total-annual-number
  - Say it as: "Benchmarks put duplicate or erroneous payments at about 1 to 2 rand in every R100 a business pays out."

## Problem 3: nobody trusts an AI with the bank account (why the ledger guardrail matters)
- **2025:** of 60 CFOs at $1bn+ US firms, **0%** would give an AI agent substantial or full access to actions like initiating payments, and only **8.3%** would give moderate access. PYMNTS Intelligence, Jul 2025: https://www.pymnts.com/study_posts/the-agentic-trust-gap-enterprise-cfos-push-pause-on-agentic-ai/
- **Late 2025:** only **14%** of mid-market CFOs completely trust AI with accounting data on its own, and **97%** say human oversight is critical, yet **88%** already use an agentic AI tool. Wakefield survey of 100 US CFOs, reported Feb 2026: https://www.crowdfundinsider.com/2026/02/259113-cfos-like-ai-but-dont-trust-it-report/
- **2026 outlook:** **54%** of finance chiefs say integrating AI agents is a 2026 priority. Deloitte CFO Signals (via search; check before quoting).
  - Say it as: "CFOs want AI agents, but almost none will let one press 'pay'. Gcina is how they say yes."

## Supporting: SA small businesses are cash-strapped (a wrong payment hurts)
- **SA, FY2024/25:** government paid **464,188 supplier invoices late, worth R43.6bn**, and **R18.2bn** was still unpaid after 30 days at year end. National Treasury 2024/25: https://archive.treasury.gov.za/legislation/pfma/Compliance%20on%20Payment%20of%20Suppliers/Annual%20Report%20-%20Non-Compliance%20with%20Payments%20of%20Supplier's%20Invoices%20-%202024-25.pdf
- **SA, Oct–Dec 2025:** **89,499** invoices worth **R10.8bn** were paid late in one quarter. SAnews, Jul 2026: https://www.sanews.gov.za/node/82588
- **SA market:** about **268,000** formal businesses with employees (SBI study, 2018); 2.6m SMMEs on a loose definition (FinScope 2021/22).

## Never say (vendor-only or unverified)
"67% of SA firms hit by BEC", "R2.4m average BEC cost", "BEC isn't in SABRIC's R2.4bn", Sage "202 days on admin", and the R2.4bn described as invoice fraud.
