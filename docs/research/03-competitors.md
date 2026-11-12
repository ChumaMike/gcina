# 03 — Competitors and positioning

Research date: 12 Nov 2026. All claims come from pages fetched or search-indexed on that date. Each claim gives a source and the year of that source. "Not found" means I looked and found no source. It does not mean the thing doesn't exist. Vendor marketing is flagged where it is the only source.

Gcina in one line: an AI accounts-payable agent for South African SMEs. It reads invoices, matches them to POs and pays suppliers on the XRP Ledger. The agent's account has its master key disabled and a SignerList: agent (weight 1), independent policy co-signer (weight 1) and human operator (weight 2). The agent alone cannot move money, and the co-signer holds unknown or changed destinations for a human.

---

## A. South African AP and bill pay

### Sage Business Cloud Accounting (SA)
- **What it does:** cloud accounting with bank feeds. Sage advertises supplier payments: "Make supplier payments quickly and securely in just a few clicks." Source: https://www.sage.com/en-za/sage-business-cloud/payments-and-banking/ (live page, 2026). A Netcash integration also offers paying suppliers: https://netcash.co.za/?p=1704.
- **Live in SA:** yes.
- **Pricing:** not checked in this pass.
- **AI / agents:** Sage announced "Sage Ai" for South Africa, pan-African markets and the Middle East on 11 Mar 2026. It includes Sage Copilot and specialised agents, among them an **AP Agent** for vendor invoice processing that Sage claims runs at "over 90% accuracy". Sources: https://www.sage.com/en-ae/news/press-releases/2026/03/sage-ai-arrive-in-africa-and-the-middle-east-helping-smbs-reduce-admin-and-unlock-growth/ (2026; the page returned 403 to my fetcher, so these details come from the search index) and https://iol.co.za/news/partnered/2026-05-22-sage-ai-gains-momentum-in-africa-and-the-middle-east-helping-smbs-reduce-admin-and-unlock-growth/ (2026). A secondary report says the agents "cannot execute financial adjustments without human approval" (miningweekly.com, 2026, https://www.miningweekly.com/article/ai-helps-lighten-the-load-of-administration-2026-04-09).
- **Payment-redirection control:** not found in Sage's SA pages. It relies on the bank or payment provider (for example Netcash AVS).
- **Threat level:** **High.** This is the incumbent SME ledger in SA, and it now has an AP Agent. It is the closest functional competitor on the "reads invoices" half.

### Xero (SA)
- **Bill pay in SA:** **Xero's native bill payments are not offered in SA, as far as I could verify.** Xero's SA "pay bills" page describes batch payment files instead: "Select which bills you want to pay, create and export a payment file from Xero and upload it to your online banking." Source: https://www.xero.com/za/accounting-software/pay-bills/ (2026). Xero's bill payments service (processed by Crezco) is documented on Xero's UK FAQ: https://www.xero.com/uk/accounting-software/bill-payments-faqs/ (2026). I found no SA equivalent.
- **Pricing (ZAR):** Starter R485/mo, Standard R857/mo, Premium R1,195/mo after an intro discount. Source: same SA page (2026).
- **SA payment add-ons on the Xero App Store:** Paysoft Flow (EFT to suppliers, ZAR 260/mo + R6 per transaction), Payaccsys Integrated (bill processing "with account verification"), Waupay and BatchPay. Source: https://apps.xero.com/za/function/payments (2026). **(corrected 12 Nov evening)** On tonight's fetch, neither the Paysoft Flow nor the Payaccsys listing showed any pricing, so the R260 + R6 figure is unconfirmed. Payaccsys AVS does not gate payments: "Unverified accounts won't be blocked for payment". Paysoft Flow's listing names CDV, not AVS. See section F.
- **AI / agents:** not assessed for SA.
- **Payment-redirection control:** none native. Controls sit with the bank or the add-on (for example Payaccsys account verification).

### Stitch (payouts and account verification)
- **What it does:** API payouts to any SA bank account, 24/7, including over RPP/PayShap. Its Bank Account Verification Service (BAVS) verifies "recipient bank accounts in real time, mitigating failed or fraudulent payments." Source: https://stitch.money/payouts (2026). A 2022 Stitch blog post says verification is applied automatically to new account details: https://stitch.money/blog/stitch-payouts-makes-it-easier-for-businesses-to-move-money (2022).
- **Live in SA:** yes. **Pricing:** not public. **AI:** none found.
- **Threat level:** this is infrastructure, not a competitor. It is a possible **partner** for the ZAR off-ramp and for account checks.

### Paystack Transfers (SA)
- **What it does:** transfers to SA bank accounts via API. The pricing page lists "ZAR 3 per transfer (failed or successful)". Source: https://paystack.com/za/pricing (2026). An older support table shows a ZAR 1 band (https://support.paystack.com/en/articles/2130370), so the two sources conflict.
- **Account validation:** a separate API checks personal and business accounts at "ZAR 3 for every successful request" (support.paystack.com, 2026).
- **AI:** none. **Redirection control:** a validation API that the caller must choose to use.

### Ozow Payouts
- **What it does:** EFT payouts via API to accounts at SA's major banks. Source: https://ozow.com/our-products/ozow-payouts (2026).
- **Verification:** the legacy docs describe a CDV account-validity pre-check, which is "a preliminary check on account validity". There is also a merchant-side verification webhook before each payout. Source: https://oldhub.ozow.com/docs/payouts (undated legacy docs).
- **Pricing:** not public. **AI:** none.

### Peach Payments Payouts
- **What it does:** bulk payouts via API or CSV. Real-time clearance payouts launched for SA merchants in Aug 2025. Sources: https://developer.peachpayments.com/docs/peach-payouts (2025–26) and https://www.finextra.com/pressarticle/106757/peach-payments-introduces-real-time-clearance-payouts (2025).
- **Verification:** a separate bank-account verification API to "Confirm beneficiary details before payouts are made" (developer docs, 2026).
- **Pricing:** not public. **AI:** none.

### Bank and scheme-level account verification (AVS / AVS-R)
- **AVS** is a BankservAfrica (now trading as PayInc) service that lets banks check details of accounts held at other banks. **AVS-R** is the real-time version. RealPay says AVS-R confirms the account number, whether the account is open, the account type, and whether the ID or company registration number matches. Sources: https://electrum.co.za/schemes/account-verification-services (2025) and https://www.realpay.co.za/products/avs-r (2026). I found no PayInc-branded page.
- **Standard Bank:** checks that the account number and beneficiary name match before payment, at **R2 per verification**. It cannot verify a business that has no registration number. Source: https://www.standardbank.co.za/southafrica/personal/products-and-services/security-centre/protect-yourself/account-verification-services (2026).
- **FNB:** "Verify Account Owner" confirms that the payee account belongs to the named person or company. It is fee-based. Source: https://www.online.fnb.co.za/rhelp_0_15/OBE_SA_Downloads/Verify_Account_Owner.htm (undated help page).
- **Relevance:** these checks are the SA standard defence against payment redirection. They are **opt-in and per payment**, and they confirm only that an account belongs to the named entity. They do not catch a fraudster who opens a real account in a lookalike name, and they do not tell you that the bank details changed since the last invoice. Gcina should **use AVS-R as an input** to its co-signer rather than pitch against it.

### Dext / Hubdoc (invoice capture)
- **Dext:** available in SA. The Business plan is R366.46/mo (5 users, 250 docs/mo, excl. VAT). Source: https://dext.com/za/business/pricing (2026). It integrates with Xero and Sage in SA (https://apps.xero.com/za/app/dext-prepare, 2026). It does capture and extraction only, with no payments in SA and no redirection control. Dext Payments exists in the UK (https://dext.com/uk/business/product/dext-payments/pricing-detail, 2026), but I found no SA availability.
- **Hubdoc (SA):** not found.

---

## B. Global AP automation

### BILL (Bill.com)
- **What it does:** AP/AR automation with a payments network. Plans: Essentials $49, Team $65 and Corporate $89 per user per month. Source: https://www.bill.com/pricing (2026).
- **Live in SA:** **No evidence it serves SA-based businesses.** NetSuite's BILL onboarding docs say sign-up needs a valid US address and an EIN or SSN/ITIN. Source: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0530035100.html (2025–26). BILL can *pay* vendors in many countries (137 countries per a 2019 announcement: https://www.bill.com/press-release/billcom-expands-international-payments-footprint-more-130-countries).
- **Redirection control:** vendors in the BILL network control their own bank details. When an account changes, BILL emails the vendor, and if the vendor clicks "I didn't request this change" BILL tells them to contact the payer. Sources: https://vendorpayhelp.bill.com/hc/en-us/articles/360056648731 and https://support.wf.bill.com/hc/en-us/articles/360043300072 (undated help pages).
- **AI:** not assessed in this pass. **(corrected 12 Nov evening)** BILL now runs a registered "Payment Agent" in a live pilot with Visa and Billtrust (20 Oct 2026). It pays buyer-approved invoices by card through supplier portals. See section F.

### Ramp Bill Pay and Ramp Agents for AP
- **What it does:** Bill Pay is "available on our free plan with no monthly software fee". Per-payment fees vary. Source: https://ramp.com/accounts-payable (2026).
- **AI agents:** "Agents for AP" launched on 7 Oct 2025. They code line items, summarise vendor history for approvers, check invoices against "over 60 fraud signals" and complete card payments in vendor portals. Ramp says: "You stay in control. The clicks go away." Source: https://ramp.com/blog/ramp-ap-agents-announcement (2025).
- **Redirection control:** a fraud-prevention agent "Flags suspicious activity—like unexpected changes to vendor banking details or unverified accounts—before payment goes out." Source: https://ramp.com/accounts-payable (2026). Ramp's help article on Bill Pay fraud says scanning starts once a draft is matched to a vendor: https://support.ramp.com/hc/en-us/articles/37791491771027-Bill-Pay-Fraud (2025–26).
- **(corrected 12 Nov evening)** Ramp does more than flag. High-severity (red) alerts need a written reason to dismiss, and Ramp logs who dismissed them (same help article, 2025–26). Ramp also offers vendor bank-account ownership verification and a vendor-level payment hold. But ownership verification is opt-in per request, and I found no Ramp page saying an alert automatically blocks a payment. See section F.
- **Live in SA:** **No.** Press reports Ramp in the US, Canada (Jul 2026) and the UK (Sep 2026). Sources: https://fintech.global/2026/07/29/ramp-enters-canada-with-global-finance-platform-push/ (2026) and https://itbrief.co.uk/story/ramp-launches-finance-platform-in-uk-for-businesses (2026). Ramp's own application process requires a US EIN (bill.com learning page, 2026). I found no official Ramp country list.
- **Threat level:** **Conceptually the closest.** Ramp is AI agents + AP + bank-change fraud flagging. But the flag is software-side: Ramp's agent and Ramp's platform hold the payment authority.

### Payhawk
- **AI agents:** "AI Office of the CFO" launched in Apr 2025 with a Financial Controller agent. Procurement, Travel and Payments agents followed in Sep 2025. The Procurement agent can "raise card limits or create purchase orders". Sources: https://payhawk.com/blog/payhawk-launches-four-enterprise-ready-ai-agents (2025) and https://www.cpapracticeadvisor.com/2025/09/16/payhawk-adds-enterprise-ready-ai-agents-to-digital-cfo-platform/169006/ (2025).
- **Live in SA:** not found. **Pricing:** not public. **Redirection control:** not found.

### Tipalti
- **What it does:** global AP and supplier payments. **Tipalti Detect** tracks payee details (account numbers, emails, contacts) to flag payee fraud risk, and Tipalti markets "AI Agents" for AP tasks, including fraud monitoring. Sources: https://tipalti.com/product/finance-ai/ (2026) and https://tipalti.com/resources/learn/invoice-fraud/ (2025–26). Both are vendor marketing.
- **Live in SA:** not confirmed. **Pricing:** not public.

### Brex
- **What it does:** bill pay with 2-way PO matching (Dec 2024). "Agents on Brex" was in Early Access in the Fall 2025 release. Sources: https://www.brex.com/product-announcements/a-smarter-bill-pay (2024) and https://www.brex.com/product-announcements/fall-release-2025 (2025).
- **Redirection control:** a 2023 press report says Brex flags suspicious invoices. I found no specific vendor bank-change verification.
- **Live in SA:** not found.

---

## C. Agent-payment infrastructure ("limits outside the agent")

### XRPL / Ripple agent tooling
- **x402 on XRPL:** the XRPL docs list XRPL as an x402 settlement chain, with the implementation contributed by **T54**, which runs a hosted mainnet facilitator. Agents pay in XRP or RLUSD. The doc describes **no spend limits or policy controls**. Source: https://xrpl.org/docs/agents/agentic-payments-x402 (2026). Press reports the T54 facilitator launched around Feb 2026 and claims "8M+ x402 payments in 30 days". That claim is unverified and comes from secondary sources such as kucoin.com flash news (2026).
- **XRPL AI Starter Kit (Ripple, 10 Jun 2026):** an official XRPL Docs MCP server (`https://xrpl.org/mcp`) that serves documentation only, plus Claude skills for wallet creation, balances and payments. Sources: https://xrpl.org/resources/dev-tools/ai-tools (2026) and https://thedefiant.io/news/tradfi-and-fintech/ripple-xrpl-ai-starter-kit-mastercard-agent-pay-machines (2026). Community MCP servers also exist (for example tamago-labs/xrpl-mcp), but they are unofficial.
- **Native multi-signing:** a SignerList holds 1–32 weighted signers with a quorum. You can disable the master key "so multi-signing is the only way to authorize transactions". Source: https://xrpl.org/docs/concepts/accounts/multi-signing (2026). **Gcina is built on this primitive. Ripple's own agent kit does not package it as an agent guardrail, which leaves room for Gcina.**

### Coinbase: x402, AgentKit, CDP wallets, Policy Engine
- **Policy Engine:** project-level and account-level rules, for example `ethValue <=` a cap and `evmAddress in` an allowlist. Any matching reject rule overrides an accept, and a request with no matching rule is rejected. Sources: https://docs.cdp.coinbase.com/wallets/security-and-policies/policy-engine/overview.md and https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/policy-engine (2026).
- **Agentic Wallets:** only the owner sets per-call and per-session caps. Agents can read the caps but cannot change them. Source: https://docs.cdp.coinbase.com/agentic-wallet/mcp/mcp-tools/overview (2026).
- **Where it is enforced:** at Coinbase's signing service, before signing. Third parties say this happens in an AWS Nitro enclave; I did not confirm that on a Coinbase page. **This is outside the agent, but it is inside Coinbase, not the ledger.**
- **Live in SA:** developer platform availability for SA not confirmed. **EVM/Solana only** (no XRPL).

### Stripe: Agent Toolkit, ACP, Issuing for agents, Privy
- **ACP:** "an open standard created by Stripe, OpenAI, and Meta" for agent checkout. Source: https://docs.stripe.com/agentic-commerce/protocols/acp (2026). Stripe's agentic commerce page is marked "US only": https://stripe.com/use-cases/agentic-commerce (2026).
- **Issuing for agents:** virtual cards "scoped, controlled, and monitored in real time". Source: https://edge-docs.stripe.com/issuing/agents (2026). Card network and issuer limits sit outside the agent.
- **Privy (Stripe-owned, per 2025 secondary reports):** the policy engine enforces per-transaction and time-window caps, recipient and contract allowlists, and chain/token limits inside a secure enclave before signing. Source: https://docs.privy.io/wallets/overview/solutions/agent-wallets (2026). **Key quorums** support m-of-n authorisation keys, including the "user + server key" pattern for transactions. Sources: https://docs.privy.io/controls/key-quorum/overview and https://docs.privy.io/controls/common-use-cases/quorum-approval (2026). **This is structurally the closest thing to Gcina's design, but it is enforced by Privy's API/enclave, not by the ledger.**
- **SA:** Stripe does not operate as a direct merchant platform in SA (Paystack, a Stripe company, does). Agentic features are US-first.

### Skyfire (KYAPay)
- Skyfire's own docs say agent spending limits (daily/weekly/monthly, per-transaction) are **early access** and "not publicly available yet". Source: https://docs.skyfire.xyz/docs/agent-spending-limits (2026).

### Crossmint agent wallets
- The user adds the agent as a signer with a spend cap, allowed counterparties and a time window: "The permissions are enforced onchain, so a transaction outside them is rejected at the wallet level." Source: https://docs.crossmint.com/agents/how-agents-pay (2026). Crossmint argues that app-level checks only stop "honest mistakes, not a compromised agent" (same docs, 2026). **This is the same thesis as Gcina, already shipped on smart-contract chains.**

### Visa Intelligent Commerce / Mastercard Agent Pay
- Mastercard Agent Pay was announced in Apr 2025 and uses "Agentic Tokens". "Agent Pay for Machines" was announced on 10 Jun 2026, with Ripple named as a partner. Visa Intelligent Commerce launched in Apr 2025, and Visa's Trusted Agent Protocol followed in Oct 2025. Sources: https://thedefiant.io/news/tradfi-and-fintech/ripple-xrpl-ai-starter-kit-mastercard-agent-pay-machines (2026) and https://stablecoininsider.org/visa-intelligent-commerce-vs-mastercard-agent-pay/ (2026, secondary). Limits are enforced by the card network and issuer. These are consumer and merchant checkout rails, not supplier EFT. **(corrected 12 Nov evening)** Visa has since moved into B2B. Visa Intelligent Commerce and the Trusted Agent Protocol power a live pilot in which BILL's agent pays approved supplier invoices by card (20 Oct 2026). Visa also announced commercial payment controls and a "Supplier Validation" pilot (21 Oct 2026). These are card payments, not EFT. See section F.

### Google AP2
- AP2 was announced in Sep 2025 and uses cryptographically signed **mandates** (Intent, Cart, Payment). An Intent Mandate carries user constraints such as price limits. Sources: https://thepaypers.com/payments/news/google-launches-agent-payments-protocol-ap2 (2025) and https://cmswire.com/digital-experience/google-pushes-standards-for-agentic-ai-commerce-with-ap2 (2025). It is a protocol for proving user intent, not a custody control. A 2026 claim that AP2 was donated to the FIDO Alliance is unverified (spark.money, 2026).

### Turnkey
- The policy engine denies by default and can require multi-party approvals. **Caveat: "the Root Quorum bypasses any policies."** Source: https://docs.turnkey.com/concepts/policies/overview (2026). Enforcement happens at Turnkey's enclave.

### Safe (smart account)
- The Allowance Module enforces per-token spending limits **on-chain**. The spender can be a bot. **Limits cap amounts but "do not restrict who the spender sends to."** Source: https://help.safe.global/en/articles/40842-set-up-and-use-spending-limits (2026). Safe also documents an agent quickstart: https://docs.safe.global/home/ai-agent-quickstarts/agent-with-spending-limit (2026). An n-of-m Safe multisig is the long-standing on-chain quorum pattern on EVM chains.

---

## D. Positioning: testing "existing AP tools trust the software; Gcina makes the ledger refuse the agent"

**Where the line holds**
- **For AP tools it holds.** Sage's AP Agent, Ramp Agents for AP, Payhawk, Tipalti, Brex and BILL all detect or flag fraud inside their own software, and their platforms hold the payment authority. BILL's defence is a vendor email, and Ramp's is a fraud agent that flags. **(corrected 12 Nov evening)** Ramp's red alerts also need a logged reason to dismiss, and it offers opt-in ownership verification and manual vendor holds. Visa/BILL agent payments run under network and platform controls. Each of these is still enforced inside one vendor's platform. If their software is compromised, or fooled by a changed-banking-details invoice that passes, nothing outside the platform refuses the payment.
- **For SA it holds strongly.** None of the global agentic AP players is live in SA (BILL needs a US address and EIN; Ramp covers the US, Canada and UK). Xero has no native bill pay in SA. SA's defence today is opt-in AVS/AVS-R per payment (Standard Bank R2, FNB fee-based). That proves the account belongs to the named entity. It does not prove the account is the one this supplier has always used.

**Where the line is weak (judges may push back)**
1. **"Limits outside the agent" is already shipped** by:
   - Coinbase CDP Policy Engine: a signing service rejects requests outside rules.
   - Privy: enclave policies plus **m-of-n key quorums**, which is nearly Gcina's agent + server + human design.
   - Turnkey: deny-by-default policies and multi-party approval.
   - Crossmint: on-chain signer permissions.
   - Safe: on-chain allowance and multisig.
   - Stripe Issuing / Visa / Mastercard: network-side card limits.

   "Nobody else does it" is false. Do not say it.
2. **"The ledger refuses" is also true of Safe and Crossmint** on EVM. The XRPL difference is that it is a native protocol feature (SignerList + disabled master key), with no smart contract to audit and no custodian enclave to trust. That is a real but narrow technical difference.
3. **The policy co-signer is still software.** The ledger enforces the *quorum*. The allowlist and limit logic lives in Gcina's co-signer service. The honest claim is that the agent *alone* cannot pay and that compromising it requires a second, independent key. It is not that the ledger itself checks the allowlist.
4. **Rail mismatch.** SA suppliers are paid by EFT in ZAR. Paying them on XRPL needs XRP/RLUSD acceptance or a ZAR off-ramp (for example Stitch or Peach payouts) after the on-ledger step. That step happens off-ledger, and the ledger guarantee ends there. Be ready for "how does the supplier get rand?"

**Where Gcina is genuinely different**
- It combines SA SME AP (invoice → PO match → pay) with a specific threat, changed-banking-details invoice fraud, and an **on-ledger quorum that includes a human operator key**. Unknown or changed destinations stop at the co-signer and need the human key. No product found does all of this, and none of the agent-wallet players (Coinbase, Privy, Crossmint, Safe) has an AP or invoice workflow or SA focus.
- XRPL's agent kit (x402, MCP, skills) ships without guardrails, according to the x402 doc. Gcina shows how to make an XRPL agent safe by default using a primitive already on the ledger, which is a strong fit for a Ripple-sponsored track.

**Recommended one-liners (most defensible first)**
1. **"Sage and Ramp ask their AI to spot the fraud. Gcina makes the XRP Ledger refuse the payment: an AP agent that cannot pay a new bank account until a human co-signs."**
2. ~~Shorter: "The first AP agent for SA small businesses that the ledger itself won't let go rogue."~~ **(corrected 12 Nov evening)** The team rule bans "first", "only" and "nobody". Use the approved line instead: **"Autonomous supplier payments, independent financial control: we separate the agent's ability to initiate a payment from its authority to spend."**
3. If challenged on Coinbase/Privy: "They enforce limits in a vendor's enclave. Gcina's quorum lives in the XRP Ledger's own multi-sign: no smart contract, no custodian, and the human operator key is the only way past a changed bank account."

---

## E. Comparison table

| Product | SA availability | AI agent | Limits enforced where | Bank-change / redirection control | Price (public) |
|---|---|---|---|---|---|
| **Gcina** | Built for SA | Yes (AP agent) | **XRP Ledger multi-sign quorum** (agent 1 + co-signer 1 + human 2, master disabled) | Unknown or changed destination held for the human key | n/a (hackathon) |
| Sage Business Cloud Accounting (SA) | Yes | AP Agent (announced SA, Mar 2026) | Sage software + bank | Not found (bank/Netcash AVS) | Not checked |
| Xero (SA) | Yes; **no native bill pay** (payment file export) | Not assessed | Bank | Via add-ons (e.g. Payaccsys account verification) | R485–R1,195/mo |
| Stitch Payouts | Yes | No | Stitch platform | BAVS real-time account verification | Not public |
| Paystack Transfers | Yes | No | Paystack platform | Account validation API (ZAR 3/request) | ZAR 3/transfer (conflicting ZAR 1 in older doc) |
| Ozow Payouts | Yes | No | Ozow platform | CDV pre-check + verification webhook | Not public |
| Peach Payouts | Yes | No | Peach platform | Bank account verification API | Not public |
| Bank AVS / AVS-R (Standard Bank, FNB) | Yes | No | Bank | Name/ID ↔ account match, opt-in per payment | Std Bank R2/verification; FNB fee-based |
| Dext | Yes (capture only) | AI extraction | n/a (no payments in SA) | None | R366.46/mo Business |
| BILL | **No evidence** (US address + EIN) | Not assessed | BILL platform | Vendor-controlled bank details + change-confirmation email | $49–$89/user/mo |
| Ramp Bill Pay + Agents for AP | **No** (US, CA, UK) | Yes (Oct 2025) | Ramp platform | Fraud agent flags bank changes (60 signals); red alerts need a logged dismissal reason; opt-in ownership verification; manual vendor hold (corrected 12 Nov evening) | Free plan; payment fees |
| Payhawk | Not found | Yes (2025 agents) | Payhawk platform | Not found | Not public |
| Tipalti | Not confirmed | "AI Agents" (marketing) | Tipalti platform | Tipalti Detect payee-risk monitoring | Not public |
| Brex | Not found | Early access (2025) | Brex platform | Suspicious-invoice flags (2023 report) | Not checked |
| Coinbase CDP Policy Engine / Agentic Wallet | Not confirmed | Agent wallets | **Coinbase signing service** | Address allowlist rule | Not checked |
| Privy (Stripe) | Not confirmed | Agent wallets | **Privy enclave + m-of-n key quorums** | Recipient allowlist | Not checked |
| Turnkey | Not confirmed | Agent wallets | Turnkey enclave (root quorum bypasses) | Policy rules | Not checked |
| Crossmint | Not confirmed | Agent wallets/cards | **On-chain** signer permissions; card networks | Allowed counterparties | Not checked |
| Safe | Global (on-chain) | Agent quickstart | **On-chain** allowance module / multisig | Allowance does not restrict recipient | Not checked |
| Skyfire | Not confirmed | Agent payments (KYAPay) | Skyfire (limits early access) | Not found | Not checked |
| Stripe ACP / Issuing for agents | ACP "US only" | Agent checkout | Stripe / card network | n/a (consumer checkout) | Not checked |
| Visa IC / Mastercard Agent Pay | Not confirmed for SA | Agent tokens | Card network / issuer | n/a (card checkout); Visa Supplier Validation in pilot, GA 2027 (corrected 12 Nov evening) | n/a |
| Visa + BILL + Billtrust agent pilot (Oct 2026) | Not stated (US-context) | BILL Payment Agent pays buyer-approved invoices | Visa TAP/Intelligent Commerce + BILL payment controls + Billtrust acceptance policy | Buyer approval upstream; card via tokenised credentials | Not public |
| Paysoft Flow / Payaccsys / Netcash (SA) | Yes | No | Provider + bank (OTP authorisation for Netcash) | CDV (Paysoft Flow); optional AVS that does not block (Payaccsys); Netcash validates details + lock batch | Not public on fetched pages |
| Google AP2 | Protocol | Mandates | Signed mandates (not custody) | n/a | Open protocol |
| XRPL x402 (T54) + Ripple AI Starter Kit | Global (on-chain) | Agent payments + docs MCP | **None described** in x402 doc | None | Open source / facilitator |

---

## F. Update 12 Nov 2026 (evening): Ramp fraud agent, Visa agentic AP pilot, SA Xero payment add-ons

I fetched every source below on the evening of 12 Nov 2026. Where a page did not say something, I write "not stated". Vendor marketing is flagged.

### F1. Ramp Fraud Prevention Agent ("60 signals")
- **What it checks:** "reviews every AP transaction against 60 signals and flags risk before payment leaves your account." Ramp does not publish the list. The alert triggers it names are "new or changed bank account details, unusual invoice amounts, or vendors that haven't been verified across our network." Sources: https://ramp.com/ap-fraud-prevention (2026, vendor marketing) and https://support.ramp.com/hc/en-us/articles/37791491771027-Bill-Pay-Fraud (2025–26).
- **Where it is enforced:** inside Ramp's Bill Pay software. Alerts are yellow or red. To dismiss a red alert, the user must give a reason, and Ramp logs who dismissed it (help article above). The help pages I read do not say an alert automatically holds or blocks the payment. **Ownership verification** of a vendor's bank account exists, but it is opt-in: "An ordinary ACH request does not automatically request ownership verification." It uses "bank or verification-provider data, or supporting bank documents". Source: https://support.ramp.com/vendor-verification (2026). A manual **vendor-level hold** blocks current and future payments to that vendor until removed: https://support.ramp.com/hold-payment-for-bills-and-vendors (2026, from the search index).
- **Context:** Ramp frames this around US Nacha ACH rules: https://ramp.com/compliance (2026) and https://ramp.com/blog/2026-nacha-rule-changes (2026). The agents launched in Oct 2025 (Bloomberg, 2025: https://www.bloomberg.com/news/articles/2025-10-07/fintech-ramp-launches-fraud-fighting-bill-payment-ai-agents).
- **Availability:** US, Canada and UK per press reports (see section B). The fetched Ramp pages give no country list. Not SA.
- **How Gcina differs (honest):** Ramp's agent and Ramp's platform decide whether a flagged payment goes out. In Gcina, the agent's key alone cannot reach the XRPL quorum. A changed destination stops at an independent co-signer and needs the owner's weight-2 key.
- **Where they beat us:** Ramp checks 60 signals on every bill, has a cross-customer vendor network and documented ownership verification, and has live customers at scale. Gcina has an allowlist/limit co-signer and a hackathon build.

### F2. Visa + BILL + Billtrust live pilot (Visa Intelligent Commerce / Trusted Agent Protocol)
- **What it is:** announced 20 Oct 2026 as a live pilot in which trusted AI agents "initiate and complete approved buyer invoice payments end-to-end through supplier portals." BILL's registered Payment Agent uses tokenised **card** credentials instead of shared portal logins. Billtrust recognises the agent via Visa's Trusted Agent Protocol. Sources: https://investor.visa.com/news/news-details/2026/Visa-BILL-and-Billtrust-Launch-First-Live-Pilot-for-Trusted-AI-Agent-Payments-Between-Buyer-and-Supplier-Platforms/default.aspx (2026) and https://www.bill.com/press-release/visa-bill-and-billtrust-launch-first-live-pilot (2026).
- **What the agent can do:** pay only invoices the buyer has already approved: "The agent only executes eligible payments that have already been approved by the buyer" (BILL, 2026). It does not choose which invoices to pay. Accounting Today's "no human authentication" headline means no human logs into the supplier portal. Buyer approval is still required. Source: https://www.accountingtoday.com/news/bill-billtrust-visa-pilot-ai-payments-that-dont-need-human-authentication (2026).
- **Where limits and approval are enforced:** buyer approval happens in BILL. Agent identity is checked by Visa TAP and the Agentic Directory. Tokens and payment controls come from Visa Intelligent Commerce. Billtrust applies the supplier's acceptance policy. That is three companies' controls, all on the card rail. A day later Visa announced Commercial Payment Controls (live "in supported countries and territories to eligible issuing financial institutions") and **Commercial Supplier Validation**, which "helps verify payments are sent to the intended supplier". Supplier Validation is in pilot, with general availability in 2027. Source: https://corporate.visa.com/en/sites/visa-perspectives/press-releases/three-capabilities-for-automated-payments.html (2026).
- **Markets:** not stated. The press release is US-context (Las Vegas dateline, US banks). I found no SA availability. The pilot pays suppliers by card through portals, not by EFT to an SA supplier's bank account.
- **How Gcina differs (honest):** Visa/BILL put identity, approval and limits across several companies' platforms on the card network. Gcina puts the spend quorum on the XRP Ledger itself, and the owner's key is part of that quorum. Gcina targets SA SMEs whose suppliers take EFT and have no supplier portal.
- **Where they beat us:** live real-money transactions, Visa's network and issuer controls, BILL's base of roughly 500,000 businesses (Accounting Today, 2026) and a supplier-validation product on the way. That is far more trust and distribution than Gcina has.

### F3. SA payment add-ons for Xero and Sage
| Add-on | Pays supplier batches from the ledger? | Account checks | Pricing (public?) | Source (year) |
|---|---|---|---|---|
| **Paysoft Flow** (Xero) | Yes: "Select multiple bills from one or many suppliers and create a single payment batch." Draft and awaiting-approval bills are not imported. Has "Custom Approval Workflows". | Listing: "real-time Check Digit Validation (CDV)". Paysoft's site also lists AVS and CDV. Not stated whether AVS runs in Flow by default. | Not shown on tonight's fetch (earlier note of R260/mo + R6/txn unconfirmed) | https://apps.xero.com/za/app/paysoft-flow (2026); https://paysoft.co.za/ (2026) |
| **Payaccsys Integrated** (Xero) | Yes: "select and pay individual suppliers or specific invoices, or simply bulk upload payment batches." Xero bills sync automatically. | "real-time Bank Account Verifications (AVS) to participating banks", automated or ad hoc. But "Unverified accounts won't be blocked for payment". CDV not stated. | Not public; "Free 90 day trial available" | https://apps.xero.com/za/app/payaccsys-integrated (2026) |
| **Netcash** (Sage Business Cloud Accounting; also has a Xero app) | Yes: Sage "Supplier batch payments", authorised in Netcash with a One Time PIN. "Lock batch on upload" stops supplier details being edited after upload. | Netcash "validates" banking details. AVS/CDV not named in the guide. Bank-account verification is also sold as a separate report. | Not public on fetched pages (only a 2021–22 brochure found; out of date) | https://help.netcash.co.za/docs/quick-start-guides/integrated-solutions/accounting/sage-business-cloud-accounting/ (2026) |
| **Sage Pay (SA)** | This is Netcash's former name, rebranded to Netcash in Dec 2019. It is not a separate product. UK "Sage Pay" is now Opayo. | n/a | n/a | https://ucollect.helpscoutdocs.com/article/73-netcash-formerly-sagepay (undated, secondary) |
| **VendorAlert** (Xero, listed in the ZA payments category) | No. It is read-only monitoring. | Emails chosen people "When a contact's bank details change in Xero". The vendor says it alerts but does not block. | 14-day free trial | https://apps.xero.com/za/function/payments (2026); https://apps.xero.com/uk/app/vendoralert (2026, from the search index) |
| Batchly (Xero) | Bank-file payment runs: "process hundreds of bills in a single payment run" | Not stated | Not stated | https://apps.xero.com/za/function/payments (2026) |

- **How Gcina differs (honest):** these tools move rand by EFT, and their account checks are per-payment and at best optional (Payaccsys does not block unverified accounts). No AI agent decides anything, and the human authorises the whole batch. Gcina adds an agent that prepares payments, plus a rule that a changed or unknown destination cannot settle without the owner's key.
- **Where they beat us:** they are live in SA and integrated with Xero and Sage today. They pay real ZAR to any SA bank account and sponsor-bank AVS/CDV. Netcash has OTP batch authorisation and batch locking, and Paysoft Flow was Xero's SA Small Business App of the Year 2026 (from the search index). Gcina still needs a ZAR off-ramp to reach most suppliers. **Pitch implication:** treat them as rails and partners, not targets. Gcina's co-signer could call AVS (via Payaccsys, Paysoft or a bank) as one input.

### F4. Net effect on positioning
- Agent-initiated supplier payment with human approval upstream is now live outside SA (Visa/BILL). Do not imply that agents paying invoices is new. The approved line ("we separate the agent's ability to initiate a payment from its authority to spend") still holds, because the difference is *where* the authority sits: an on-ledger quorum including the owner's key, rather than one or more vendors' platforms.
- Expect the judges' question: "Ramp already catches changed bank details, and Visa already lets agents pay invoices — why you?" Honest answer: those are US-centred, card or ACH, and enforced inside the vendor. Gcina is for SA SMEs paying by EFT, and the agent cannot spend alone even if Gcina's own agent is compromised.
