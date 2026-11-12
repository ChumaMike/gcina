# 01 — Problem evidence: changed-banking-details fraud and SME payables in South Africa

Researched 2026-11-12 for the W3Node Node Engine 2026 pitch (Agentic Finance / XRPL).
Rule used: no number without a source URL and year. "Loaded" means the page was fetched
and the figure checked on it during this research. "403" means the site blocked the
automated fetch; the claim comes from search snippets or a secondary source and has to be
checked by hand before anyone says it on stage.

**Bottom line up front:** South Africa has **no published national figure for
business-email-compromise (BEC) or payment-redirection losses**. The strong SA evidence is
(a) every major bank publicly warns businesses about changed-banking-details invoices,
(b) the courts consistently put the loss on **the payer**, and (c) SABRIC's digital-banking
crime totals are large and growing, but they **do not break out BEC**. Do not present the
SABRIC rand totals as BEC losses.

---

## 1. Fraud evidence

### 1a. SABRIC (banking industry crime centre): primary source, strongest

| Figure | Year of data | Source (published) | Status |
|---|---|---|---|
| Digital banking crime losses **R2.4 billion** in 2025, up from about **R1.9 billion** in 2024; banking-app crime was over 70% of digital losses | 2025 | SABRIC media release, "SABRIC release the 2025 Annual Banking Crime Statistics Report" (Aug 2026): https://www.sabric.co.za/?p=4450 (mirror on BASA: https://banking.org.za/?p=4344) | Loaded |
| **110,074** digital banking crime incidents in 2025; apps made up about 89% of cases and 70.5% of the client claim amount | 2025 | BusinessTech reporting SABRIC, 26 Aug 2026: https://businesstech.co.za/news/?p=872115 | Loaded (secondary; the incident count is not on the SABRIC release page) |
| Total financial-crime losses fell from **R3.3 bn (2023) to R2.7 bn (2024)**; digital banking fraud was **65.3%** of incidents; about 64,000 incidents and over R1.4 bn in losses in 2024 | 2024 | SABRIC media statement, Annual Crime Statistics 2024 (28 Aug 2025): https://www.sabric.co.za/?p=3440 | Loaded |
| SABRIC on cause: digital fraud was driven by social engineering, "rather than technical compromises of banking platforms" | 2024 | same as above | Loaded |

**Caveats:**
- Neither SABRIC release page mentions business email compromise, payment interception,
  invoice fraud or beneficiary changes. The 2024 and 2025 figures for digital banking losses
  differ between sources (R1.4 bn in the 2024 release against "about R1.9 bn" for 2024 in
  the 2025 release), probably because of restatement or a different definition. Quote the
  2025 release only.
- A vendor-sponsored ITWeb piece (CyberWin, 30 Sep 2026) states that BEC "isn't even
  counted in that R2.4 billion":
  https://www.itweb.co.za/article/why-the-next-fraud-case-against-your-business-will-start-with-an-e-mail/GxwQDq1DyGbMlPVo
  This is plausible (SABRIC counts losses to bank clients through bank channels, and an
  authorised payment to a wrong account is customer-authorised), but I could not confirm it
  from SABRIC. **VENDOR-ONLY — don't say on stage.**
- The full 2025 SABRIC PDF report was not reachable. The release page's "HERE" link points
  to the SABRIC home page, and the 2023 PDF was too large to fetch. A BEC section may exist
  inside the full report. It is worth one manual look at sabric.co.za.

### 1b. SAFPS (Southern African Fraud Prevention Service)

| Figure | Year | Source | Status |
|---|---|---|---|
| Members avoided about **R7.44 bn** in potential fraud losses in 2025 (up 47%); database enquiries reached 131 million (up 63%) | 2025 | IT-Online on the SAFPS 2025 Annual Report, 19 Aug 2026: https://it-online.co.za/?p=320796 | Loaded |
| Impersonation listings up **38%** in 2024; savings R5.04 bn | 2024 | Daily Maverick, 15 May 2025: https://www.dailymaverick.co.za/article/2025-05-15-fraud-prevention-service-saves-clients-more-than-r5-billion-as-scams-soar-in-2024 | Loaded |

**Relevance is weak.** SAFPS measures identity and application fraud (impersonated IDs,
fake bank statements, mule accounts), not supplier-payment redirection. The "25% increase in
business fraud" figure that circulates in coverage could not be traced to a SAFPS primary
document, so it is left out. The mule-account finding (accounts "opened weeks in advance and
emptied within hours", same IT-Online article) does support the point that redirected money
disappears fast. That is useful for the "block before paying, not after" argument.

### 1c. Bank advisories (all five big banks warn about this exact scam)

| Bank | What it says | URL | Status |
|---|---|---|---|
| Standard Bank | Fraudsters pose as suppliers or attorneys, monitor email threads and send fake banking-detail changes. Quote: "Stop and always verify banking changes through a trusted channel." Businesses should require approvals for detail changes. | https://www.standardbank.co.za/southafrica/personal/learn/how-to-avoid-the-change-of-banking-details-scam (undated) | Loaded |
| Absa CIB | Fraudsters impersonate executives, suppliers or attorneys to change bank details. Quote: "Always confirm any email change of banking detail requests." | https://cib.absa.africa/home/insights-and-events/business-email-compromise/ (undated, © 2026) | Loaded |
| Nedbank | Has a "Change of banking details scam" section. Quote: "Be careful when a supplier asks you to use updated banking details to make payments." | https://personal.nedbank.co.za/home/fraud-awareness/schemes-and-scams.html (undated) | Loaded |
| FNB | July 2025: verify any change of banking details using contact details from past records. Quote: "It is imperative to authenticate such a request directly with the person giving such a directive." | BusinessTech, 28 Jul 2025: https://businesstech.co.za/news/business-opinion/833019/fnb-fraud-warning-2/ | Loaded |
| Capitec | Blog "Watch out for invoice scams": fake invoices change the original banking details to the fraudster's | https://www.capitecbank.co.za/blog/articles/protect-your-money/watch-out-for-invoice-scams/ | 403, seen in search only; check by hand |

None of the advisories gives a count or a rand figure. They establish that the problem is
known and widespread, not how big it is.

### 1d. Insurer data

| Claim | Year | Source | Status |
|---|---|---|---|
| iTOO Special Risks (Ryan van de Coolwijk): "Business e-mail compromise is now the most common cause of insurance claims" (that is, of iTOO's cyber claims) | 2023 | TechCentral, 8 Jun 2023, **promoted content paid for by iTOO**: https://techcentral.co.za/increasing-cyberattacks-in-sa-highlight-importance-of-insurance/226787 | Loaded |

This is an insurer's own statement in sponsored content, three years old, with no
percentage. It can be said on stage only with attribution ("one SA cyber insurer, iTOO,
said in 2023 that BEC was its most common cyber claim"). There are no Santam, Hollard or
Chubb SA claim-share figures (see Not found). A related point from coverage: a standard
cyber policy may **not** cover a third party's compromised mailbox (that is the supplier's
email, the typical case). The source is secondary, so check it before using.

### 1e. Global anchor (NOT South African; context only)

| Figure | Source | Status |
|---|---|---|
| FBI IC3 2025: BEC **24,768 complaints, US$3,046,598,558 losses** (2024: 21,442 complaints, US$2.77 bn). BEC is the #2 loss category after investment fraud. Total cybercrime losses were US$20.877 bn from 1,008,597 complaints. | FBI IC3 2025 Internet Crime Report (Apr 2026): https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf | Loaded (PDF text extracted and checked) |
| The same report lists **South Africa** among the top-20 foreign complainant countries, with **1,532 complaints** (all crime types, not BEC-specific) | same | Loaded |

---

## 2. Who carries the loss in South African courts

The trend since 2024 is clear: **the payer carries the loss unless a professional who held
the money, or who had a contract to verify, was negligent.** For a small business paying a
supplier, the business is the payer.

| Case | Court / year | Facts (one line) | Who lost |
|---|---|---|---|
| **Fourie v Van der Spuy & De Jongh Inc** [2019] ZAGPPHC 449; 2020 (1) SA 560 (GP) | Gauteng HC Pretoria, 30 Aug 2019 | Client's email was hacked; attorneys paid about R1.75 m from trust into a fraudster's account on spoofed instructions | **Attorneys** (holder of trust money, negligent for not checking the new details). Summary: https://www.golegal.co.za/two-cases-eft-fraud/ (seen in search, not fetched) |
| **Hartog v Daly** [2023] ZAGPJHC 40 | Gauteng HC Johannesburg, 24 Jan 2023 | Attorney paid R1.4 m of clients' money into a fraudster's account after an intercepted email | **Attorney (payer)**. Claim against Standard Bank failed. https://www.dailymaverick.co.za/article/2023-01-30-lawyer-ordered-to-pay-clients-r1-4-million-stolen-by-scammer/ (seen in search, not fetched) |
| **Gerber v PSG Wealth Financial Planning** [2023] ZAGPJHC 270 | Gauteng HC Johannesburg, 2023 | Client's email was hijacked; PSG overrode its own checks and paid retirement funds to a new fraudster account | **PSG (the institution)**, ordered to pay R811,488.98 because of a contractual duty to protect. https://techfinancials.co.za/2023/03/31/financial-services-company-ordered-to-pay-client-more-than-r800000-lost-in-cybercrime-fraud/?amp=1 (loaded); https://www.moonstone.co.za/why-the-high-court-rejected-psg-wealths-defences-against-liability-for-clients-loss/ (loaded, 30 Mar 2023) |
| **Hawarden v ENS** [2023] ZAGPJHC 14, **overturned by ENS v Hawarden [2024] ZASCA 90** | HC Jan 2023, then SCA about 10 Jun 2024 | Buyer paid R5.5 m (balance of a R6 m house) into a fraudster's account after the conveyancer's emailed details were intercepted | HC: ENS liable. **SCA: the buyer (Hawarden) bears the loss**; she had "ample means to protect herself" and had been warned to verify. https://www.moonstone.co.za/sca-overturns-precedent-setting-cyber-crime-judgment/ (loaded, 13 Jun 2024); https://www.rsm.global/southafrica/insights/legal-insights/ens-not-liable-intercepted-payment-property-transfer-rules-supreme-court (loaded) |
| **Intengo Imoto (Northcliff Nissan) v Zoutpansberg Motor Wholesalers (Hyundai Louis Trichardt)** 2025 (6) SA 143 (SCA); [2025] ZASCA 93 | SCA, 2025 | Buyer paid R290,000 for two vehicles into a fraudster's account after receiving altered invoices | **Buyer (payer) still owes the price.** EFT payment counts only when the creditor receives the money. Quote: "Falling victim to BEC fraud does not excuse payment obligations." https://connectedworld.clydeco.com/post/102kqmg/verify-before-you-pay-south-africas-sca-reinforces-buyers-duty-in-bec-fraud-ca (loaded, Clyde & Co, 1 Jul 2025); https://www.legal500.com/intelligence/south-africa/corporate-commercial-law/who-is-responsible-for-the-loss-when-payment-details-are-hacked (loaded, Barnard Inc, 21 Nov 2025): "debtors remain responsible for ensuring that payment is correctly made to the creditor" |

Cliffe Dekker Hofmeyr has a three-part series on this. Part 3 (May 2026) is on purchasers:
https://www.cliffedekkerhofmeyr.com/en/news/publications/2026/South-Africa/Dispute-Resolution/dispute-resolution-alert-19-may-A-prudent-question-is-one-half-of-wisdom-The-consequences-of-business-email-compromise-on-purchasers-Part-3-
(403 to the fetcher; worth reading by hand). No 2026 SCA ruling reversing the trend was found.

**Pitch line:** the SCA has twice (2024, 2025) put the loss on the party that pressed "pay".
An SME that pays a hacked invoice pays twice: once to the fraudster and again to the real
supplier.

---

## 3. SME payables burden, late payment and market size

| Figure | Year | Source | Status / caveat |
|---|---|---|---|
| Government paid **464,188 invoices late (after 30 days), worth R43.6 bn**, in 2024/25; **142,801 invoices worth R18.2 bn** were older than 30 days and unpaid at end March 2025 | FY2024/25 | National Treasury, Annual Report on Non-Compliance with Payment of Suppliers' Invoices within 30 days 2024/25: https://archive.treasury.gov.za/legislation/pfma/Compliance%20on%20Payment%20of%20Suppliers/Annual%20Report%20-%20Non-Compliance%20with%20Payments%20of%20Supplier's%20Invoices%20-%202024-25.pdf | Loaded (PDF text extracted). Primary. The treasury.gov.za link redirects to archive.treasury.gov.za. |
| Q3 2025/26: **89,499 invoices worth R10.8 bn** paid late; 90,856 invoices worth R15.5 bn older than 30 days and unpaid | Oct–Dec 2025 | SAnews (government news agency), 1 Jul 2026: https://www.sanews.gov.za/node/82588 | Loaded |
| 91% of SA SMEs owed money outside payment terms; about R99,800 owed per SME; about 89.5 hours a year chasing late payments | 2019 | Xero "State of Late Payments", Channelwise, 29 Nov 2019: https://channelwise.co.za/late-payments-drag-smes-down/ | Loaded. **Vendor-commissioned and 7 years old.** Use cautiously. This is the receivables side, not payables. |
| SA small and medium businesses spend about 202 working days (1,616 hours) a year on admin; invoice processing is 13% of admin time | study about 2017 | Sage SA blog, 22 Jan 2018 (Plum Consulting for Sage): https://www.sage.com/en-za/blog/small-business-admin/ | Loaded. **VENDOR-ONLY — don't say on stage** (vendor blog, old). |
| **2,615,715** SMMEs registered as formal businesses (FinScope 2021/22 estimate) | 2021/22 | Minister of Small Business Development, parliamentary reply, 18 Oct 2022: https://www.pa.org.za/speech/310284280 | Loaded. Official, but "registered" is a loose definition. |
| About **267,959** formal businesses employing one or more people (from tax and PAYE filings) | pre-Covid (2018 study) | Small Business Institute study, Daily Maverick, 12 Oct 2020: https://www.dailymaverick.co.za/article/2020-10-12-small-business-is-suffering-from-analysis-paralysis/ | Loaded. A stricter definition; this is the realistic market of businesses with payroll and supplier runs. |

**Note:** the two SMME counts differ by a factor of ten because they define "formal"
differently. Use about 268,000 employing businesses as the serviceable market. That is more
credible to judges than 2.6 million.

---

## 4. VENDOR-ONLY — don't say on stage

- "BEC isn't counted in SABRIC's R2.4 bn" — CyberWin sponsored ITWeb piece, 2026 (link above).
- "R2.4 m average BEC attack cost (SABRIC)" — Ubuntu Guard blog; not traceable to SABRIC.
  https://ubuntuguard.co.za/blog/sabc-cyberattack-2025.html (not fetched)
- "67% of SA organisations hit by BEC" — Ubuntu Guard blog; no primary source found.
- "92% of SA companies experienced impersonation fraud or BEC in the past 12 months" — Mimecast 2022 (vendor), seen in search only.
- "38% of SA executives rank BEC in their top three cyber threats" — attributed to PwC Digital Trust Insights, but found only in an e4 vendor piece (Bizcommunity, 18 Jun 2025): https://www.bizcommunity.com/article/business-email-compromise-how-to-plug-workflow-leaks-to-ensure-you-dont-become-a-victim-926414a . The SA sample is small (about 71–94 respondents). If the PwC SA report itself confirms it, this could be upgraded.
- Sage "202 days a year on admin" (vendor blog, 2018).
- iTOO "BEC is our most common claim" is paid promoted content. Usable only with explicit attribution, as noted above.

---

## 5. Three headline stats for the stage (ranked by credibility)

1. **"South Africa's Supreme Court of Appeal ruled in 2025 that if you pay a hacked invoice
   into a fraudster's account, you still owe your supplier the full amount."**
   Source: Intengo Imoto v Zoutpansberg Motor Wholesalers, 2025 (6) SA 143 (SCA):
   https://connectedworld.clydeco.com/post/102kqmg/verify-before-you-pay-south-africas-sca-reinforces-buyers-duty-in-bec-fraud-ca
   (also ENS v Hawarden [2024] ZASCA 90: https://www.moonstone.co.za/sca-overturns-precedent-setting-cyber-crime-judgment/)
2. **"South Africans lost R2.4 billion to digital banking crime in 2025, up from about
   R1.9 billion the year before, and the banks say it is driven by tricking people rather
   than hacking systems."**
   Source: SABRIC 2025 Annual Banking Crime Statistics release (Aug 2026): https://www.sabric.co.za/?p=4450
   (Do not call this "BEC losses". It is all digital banking crime.)
3. **"Every one of South Africa's big banks (Standard Bank, Absa, Nedbank, FNB) now
   publicly warns businesses about suppliers' 'changed banking details', and all of them
   give the same advice: verify the change through a channel you already trust before you
   pay. That check is the rule Gcina enforces."**
   Sources: https://www.standardbank.co.za/southafrica/personal/learn/how-to-avoid-the-change-of-banking-details-scam ;
   https://cib.absa.africa/home/insights-and-events/business-email-compromise/ ;
   https://personal.nedbank.co.za/home/fraud-awareness/schemes-and-scams.html ;
   https://businesstech.co.za/news/business-opinion/833019/fnb-fraud-warning-2/

Optional global line, clearly flagged as US data: "In the US alone, the FBI recorded
US$3 billion in business email compromise losses in 2025."
https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf

---

## 6. Not found (searched, nothing credible)

- **An SA-specific total of BEC, invoice-redirection or payment-interception losses (count
  or rand).** Not in the SABRIC 2024 or 2025 release pages, SAFPS or SAPS. This is the
  biggest gap.
- A SABRIC category for "business email compromise" or "payment interception" (the full
  2025 PDF was not reachable; check by hand).
- Santam, Hollard, Chubb SA or Old Mutual Insure figures for BEC's share of cyber claims.
  Only iTOO's 2023 sponsored statement exists.
- SAPS crime statistics that separate cyber or BEC fraud. SAPS reports "commercial crime"
  only.
- A primary SAFPS document for "business fraud up 25%".
- A current (2024–2026) Xero SA figure for average days late on invoices. Only 2017 (10
  days) and 2019 (18 days) figures exist in coverage, and 2024 coverage gives no days figure.
- An SBI "SME Landscape" report with a current formal-SME count. The latest SBI figure
  found is from 2018.
- A Capitec *Business* page specifically on this scam (only a general Capitec blog, which
  returned 403).
- Any 2026 SCA ruling changing the "payer bears the loss" position.
