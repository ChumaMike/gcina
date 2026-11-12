# 07 — Stokvel treasury: competitors and the gap

Research date: 12 Nov 2026. Every claim below comes from a page I fetched or a search-index snippet on that date. Each one gives a source URL and the year of that source. "Not found" means I looked and found nothing. It does not mean the thing doesn't exist. Where the only source is the vendor's own page, I say so. Banks change these products often, so check them again before the pitch on Sat 14 Nov.

**Product under test:** an AI agent that acts as a stokvel's treasurer. It tracks contributions, reconciles who has paid, chases late payers on WhatsApp and proposes the month's payout according to the rotation. The money sits in an XRPL account with its master key disabled and a multi-sign quorum. The agent has weight 1 and can never pay alone. An independent rules co-signer enforces the constitution (payout order, amount and date). Committee members hold the other keys. Any member can see the balance and every payment on the public ledger in real time.

---

## A. Bank stokvel and group-savings accounts

### FNB Stokvel Account — the strongest incumbent
- **Withdrawals:** FNB's own SA page says "All payouts require initiation and approval from 3 signatories." (https://www.fnb.co.za/savings-account/stokvel-account.html, live page 2026). The RMB Private Bank copy of the page says payouts need at least 2 signatories (https://www.online.rmbprivatebank.com/savings-account/stokvel-account.html, live page). **The two sources conflict, so quote the FNB SA page.**
- **Member visibility:** members can view balances and inContact notifications in the FNB App or on USSD *120*321# (FNB page, 2026). An IT-Online report says members "can receive invitations to view account activity" and can see deposits, withdrawals and balances (https://it-online.co.za/?p=311833, Feb 2026).
- **Digital approval:** yes, fully digital since early 2026. The chair, treasurer and secretary each register in the app with a selfie and a Home Affairs ID check, and each accepts the constitution and mandates. FNB says "everything from account opening through to transactions and payouts can now be done digitally" (https://www.timeslive.co.za/news/business/2026-02-12-digital-stokvels-boost-safety-accessibility/, 2026; same detail at it-online, 2026). Members can also apply in a branch.
- **Opening requirements:** the group's constitution, proof of residence, and passports for foreign signatories. Meeting minutes are needed only to change signatories in a branch (FNB page, 2026).
- **Fees:** the account is free to open. The product rules say there is no monthly account fee but transaction fees apply (https://www.rmbprivatebank.com/downloads/promotions/2022/FNBStokvelSavingsAccountProductRules.pdf, 2022). Current fee amounts were not found.
- **Interest:** the page says "earn up to" a rate, but the figure did not render. A search snippet showed "up to 6.25%", which I could not confirm (FNB page, 2026).
- **Scale:** FNB services 120,000 stokvel savings clubs (TimesLive, 2026).
- **Automation:** no contribution-tracking tool is described (FNB page; it-online, 2026). **There is no per-member reconciliation, no chasing and no payout proposal.**

### Standard Bank Society Scheme plus the SEYVA Stokvel add-on — the second-strongest incumbent
- **Withdrawals:** 3 to 4 signatories, and payments need approval from 3 signatories (https://www.standardbank.co.za/southafrica/personal/products-and-services/grow-your-money/savings-and-investment/our-accounts/society-scheme-savings-account, 2026). The constitution template says digital withdrawals on the SEYVA app need "at least three authorised signatories", and a signatory change made in the app also needs 3 (https://www.standardbank.co.za/static_file/South%20Africa/PDF/Terms%20and%20Conditions/Society%20Scheme%20Constitution%20template.pdf; seen in the search index only, undated).
- **Member visibility:** with SEYVA, every member can view the balance and transaction history: "giving each member visibility" (product page, 2026). The constitution template gives members a right to view statements in the SEYVA app.
- **Opening requirements:** **the account must be opened in a branch.** It needs at least 5 members, a R100 opening deposit, and an ID plus proof of residence (under 3 months old) for each signatory (product page, 2026).
- **Fees:** no monthly fee on balances above R10,000. Cash deposit fees apply, but the first 5 ATM deposits and first 2 branch deposits are free (product page, 2026).
- **Interest:** tiered, from 3.23% (R0–R999) to 5.08% (R100k+), effective 25 Sep 2026 (product page, 2026).
- **Automation:** SEYVA handles statements, IT3Bs, signatory and member management, payouts and linking mandates (product page, 2026). **No contribution chasing or rotation logic was found.**

### Absa Grocery Stokvel / Club Account / Investment Club
- **Withdrawals:** the approval rule was not found on the product page. NotifyMe alerts go to up to 3 signatories (https://www.absa.co.za/personal/save-invest/products/grocery-stokvel/, 2026).
- **Member visibility:** e-statements on Online Banking, and the page claims you can "track member contributions easily" (Absa page, 2026). The page does not say whether every ordinary member gets access.
- **Opening requirements:** at least 2 members and a R50 opening deposit. Each elected signatory needs an ID and proof of residence. You apply in a branch (Absa page, 2026). The Club Account needs at least 3 members (search snippet, absa.co.za/personal/save-invest/products/club-account; that page returned 404 when fetched).
- **Fees:** "No monthly management fee." **Interest:** tiered, but the rates are not shown (Absa page, 2026).
- **Digital approval:** not found.

### Nedbank Group Savings (formerly the Stokvel / Club Savings account)
- **Withdrawals:** the account needs at least 3 signatories, and "at least two signatories" must be present for certain transactions. The minimum withdrawal is R100 (https://personal.nedbank.co.za/save-and-invest/accounts/on-demand/group-savings.html, 2026).
- **Member visibility:** not stated. Statements are available in the Money app (same page, 2026).
- **Fees:** zero monthly fee, free stop orders from a Nedbank account and free Nedbank ATM deposits. Teller cash deposits are charged. **Interest:** 4.00% to 5.75% (same page, 2026).
- **Opening requirements:** R100 opening deposit and 3 signatories. Third-party guidance adds the constitution, the group's address and the minutes of the meeting that decided to open the account (search snippets, justmoney.co.za; not fetched). For a new stokvel, 3 signatories must go to a branch (search snippet from the Nedbank stokvel FAQ PDF; not fetched).
- **Digital approval:** not found.

### Capitec Stokvel Account — new, launched 10 Sep 2026
- **What is known:** launched on 10 Sep 2026 as a digital savings account for groups, inside Capitec's personal banking business. It was "in gestation for a good two years" (https://dailyinvestor.com/banking/157920/capitec-coming-after-south-africas-r50-billion-goldmine/, Oct 2026; https://www.billionaires.africa/2026/10/07/billionaire-michiel-le-rouxs-capitec-targets-south-africas-r50-billion-stokvel-market/, 2026).
- **Signatories, visibility, fees, interest and requirements:** **not found.** capitecbank.co.za returned 403 to my fetcher. **Check this by hand before the pitch.** Capitec is the bank with the largest retail reach, so this is the most important unknown.

### TymeBank, African Bank, Discovery Bank, Old Mutual
- **TymeBank:** GoalSave is a personal goal-savings feature, and I found no group or stokvel account. **Not found.**
- **African Bank:** in 2018 it planned the MyWORLD account to be run by multiple members through its app (Mail & Guardian, 2019, https://mg.co.za/business/2019-05-24-new-shots-fired-in-banking-wars/; search snippet only). No current group feature was found.
- **Discovery Bank:** no stokvel or group account was found.
- **Old Mutual:** publishes stokvel research (the Savings & Investment Monitor), but I found no stokvel account or Money Account group feature. **Not found.**

---

## B. Stokvel apps and fintechs

### South Africa
- **StokFella:** live since 2016. It claims 42,229+ members and is an authorised FSP (FSP48812) (https://www.stokfella.com/, live page, vendor claim). It handles admin, monthly payments and claims, plus an "on behalf" function that lets a member capture payments for someone without a smartphone (howwemadeitinafrica.com; search snippet). Its banking partners are listed as Pay@, Visa and Mastercard. **Who holds the money and who can withdraw: not stated.** Pricing: a subscription after a free period (2018 report, search snippet); current prices were not found.
- **Stokvels.CoZa:** a free web admin tool with contribution tracking, roles, reports and automated reminders. Members see the transaction history. It says: "Stokvels.CoZa is a management tool only." **It holds no money and has no AI** (https://stokvels-landing.pages.dev, 2026, vendor).
- **Stoki (Lilosoft Pty Ltd):** a free iOS app. It tracks contributions, loans and payouts, produces reports and works in EN, AF, ZU and XH. **The listing does not say whether it holds or moves money** (https://apps.apple.com/ar/app/stoki/id6757810060, 2026).
- **Stokvel Manager:** schedules and tracks payouts, but "the actual distribution of funds is decided by your group" (stokvel-manager-web.netlify.app; search snippet, 2026). It is a tracker only.
- **StokvelOS:** a portfolio project in beta. It does AI contribution tracking and "AI fraud detection", sends plain-English governance reports, and its README mentions a WhatsApp agent (https://creatively-nanda-co-za.vercel.app/projects/stokvel-os and the peerlist page; search snippets only, both returned 402/403). **This is the closest SA match on the AI and WhatsApp side. Nothing shows that it holds or controls money.**
- **Thela Pay:** a prototype P2P wallet with "a group ledger purpose-built for stokvels". It is FICA-registered as a Bank Agent and raising pre-seed. It has approached Bank Zero and Jumo about partnerships. Custody and approvals are not stated (https://innovationbridge.info/ibportal/content/thela-pay, 2026).
- **Not found:** Stokvella, Hello Stokvel / Wealthy Stokvel and a Spazapp stokvel product. I did not search for them separately, to save budget.

### Kenya (chamas)
- **Chamasoft:** an e-wallet that collects via M-Pesa and pays out to M-Pesa or a bank, and it records bank transactions. Bank reconciliation works only with partner institutions: "Equity bank is the only supported institution for now" (https://help.chamasoft.com/?p=203, undated). **No signatory-approval step is described.**
- **Bank-side multi-approval exists in Kenya.** With Equitel Multiple Approval, one signatory starts a withdrawal and the others approve with their PINs (equitel.com; search snippet). Bank of Africa e-Chama: "You can only withdraw once all the signatories have approved" (boakenya.com; search snippet). Kenya has solved the approval half, but nothing I found automates the treasurer's work.
- **OneKitty:** a WhatsApp-linked contribution tracker with "live updates", and "funds are automatically sent to the intended person when the set date arrives" (https://onekitty.co.ke/, live page, vendor; reported by TechCabal in 2025). **Who holds the funds is not stated.** OneKitty is the closest on WhatsApp plus automatic payout, but it shows no on-chain transparency and no quorum.

### Nigeria (ajo / esusu)
- **WeSpare** (Canadian, launching in Nigeria): "No individual holds the group's money." Collections and payouts run through Anchor, which TechCabal describes as a CBN-licensed microfinance bank. WeSpare also covers missed contributions (https://techcabal.com/2026/03/06/wespare-ajo/, 2026; search snippet, since the page returned 403). Custody sits with a single company and its partner bank.
- **Thrifto** (launched Mar 2026) calls itself "bank-backed", but the bank is not named (techeconomy.ng; search snippet, 2026). **AJOPAY** integrates with Sterling Bank (search snippet).

### Blockchain or crypto ROSCAs
- **ChamaAgent (Celo):** an ERC-8004 agent that "replaces the treasurer with code". Each group has its own Solidity escrow holding cUSD. The contract enforces one contribution per member per cycle, fixed amounts, payout order and timing windows. The agent has "zero custodial authority" (https://www.karmahq.org/project/chamaagent/about, 2026, project's own page; registered as #9146 on Celo mainnet). **This is the closest architectural competitor:** an agent with no power to pay and rules enforced by code. Differences: it uses a cUSD smart contract on Celo rather than a native multi-sign quorum, it has no human committee keys that I could find, it has no WhatsApp channel and no reconciliation of rand bank payments, and it is not stokvel- or SA-specific. Users and liveness were not found.
- **CoSave (Celo):** an AI agent that creates circles, onboards members, tracks contributions, sends reminders and runs payout schedules. "Funds are managed by smart contracts on the Celo blockchain" (https://www.karmahq.org/project/cosave/about, undated, project page). Multi-sig and single-admin powers are not stated. Status is not stated.
- **Others on Celo, Arbitrum and Base:** Ronda (Celo, ETHGlobal Buenos Aires), Ajo, Cult Finance, ChamaPay, SusuFlow AI, ArbiCycle (Arbitrum), Chord Finance and Starosca (Base) (Karma, ETHGlobal and Chainlink project pages; search snippets, 2025–26). These are mostly hackathon entries, and I found no user numbers.
- **XRPL:** **I found no stokvel or ROSCA project on XRPL.** The nearest is a community emergency fund on XRPL Commons in which neighbours pool XRP, vote via multi-signature and release funds through escrow (search snippet for hackathons.xrpl-commons.org/projects, dated 26 Mar 2026; I could not see it on the fetched page).
- **Valora and Kotani Pay:** a wallet and an off-ramp respectively. Neither has a savings-circle feature that I found (Valora blog; TechCrunch, search snippets).

---

## C. The gap, tested honestly

**The brief's hypothesis was that banks give ordinary members little visibility and need branch visits. That is now partly wrong, and a judge from FNB or Standard Bank would know it.**

1. **The big banks now offer digital approval and member visibility.** FNB has been fully digital since Feb 2026, needs 3 signatories to approve every payout and lets members view balances. Standard Bank's SEYVA gives "each member visibility" and digital 3-signatory approval, though the account must still be opened in a branch. Capitec entered in Sep 2026. Nedbank and Absa look less digital, because member visibility and app approvals were not found.
2. **What no bank does is the treasurer's job.** None of the bank pages describe per-member contribution reconciliation, chasing late payers, or proposing the payout according to the rotation. The signatories still do that by hand on WhatsApp and in notebooks. Thela Pay describes the norm: "payouts are managed manually by a treasurer" (innovationbridge, 2026).
3. **Banks enforce who signs, not what is signed.** Any 3 signatories can pay any amount to any account. Nothing in the bank rules checks that a payout matches the constitution (right member, right amount, right month). This is the real trust gap: collusion or pressure on the committee. Standard Bank's constitution template routes disputes over signatories to a written resolution signed by all members or to a court order.
4. **The apps automate tracking but mostly don't touch the money.** Stokvels.CoZa, Stoki, Stokvel Manager and StokvelOS are trackers, so the money still sits in a bank account the app cannot see or control. Where apps do hold funds, as WeSpare, Chamasoft, OneKitty and Thrifto do, custody is one company plus its partner bank, and members see the app's view rather than an independently verifiable ledger.
5. **On-chain ROSCAs already combine "the agent can't steal" with "the rules are enforced by code".** ChamaAgent and CoSave do this on Celo. So "agent without custody" alone is not new. What I did not find anywhere is the full combination:
   - rules enforcement **plus** human committee keys, as in a real stokvel constitution,
   - real treasurer work on rand payments (reconciliation, WhatsApp chasing),
   - on XRPL.

**Verified gap, stated narrowly:** no product I found does all three of the following:
- (a) does the treasurer's work: reconciling, chasing on WhatsApp and proposing the rotation payout,
- (b) holds the pool under a quorum in which a constitution co-signer **and** the human committee must both agree, so that neither the agent nor any committee majority alone can pay off-rule,
- (c) gives every member a ledger view that no single provider controls.

Banks cover (c) only partly, as the bank's own view, and cover (b) only as "enough humans sign". Trackers cover (a) only. ChamaAgent covers (b) without a committee and without (a).

---

## D. Unique value proposition and differentiators

**Recommended UVP line:**
> "An AI treasurer that does all the stokvel admin but can never pay alone: every payout needs the constitution's rules **and** your committee to agree, and every member can see it happen."

**Three differentiators that hold up against the closest competitors (FNB, SEYVA and ChamaAgent):**
1. **It enforces the payout itself, not just who signs.** FNB and Standard Bank need 3 signatures but would pay any amount to any account. Our rules co-signer refuses a payout that breaks the constitution's order, amount or date, even if the committee signs. A bank cannot offer this without building per-stokvel rule engines.
2. **It does the treasurer's work.** The agent reconciles who paid, chases late payers on WhatsApp and drafts the month's payout. This is the manual job that FNB, Standard Bank, Absa, Nedbank and the on-chain ROSCAs all leave to a person. ChamaAgent automates collection, but only for cUSD paid on-chain, with no WhatsApp and no rand reconciliation.
3. **It keeps human control and a ledger nobody controls.** Unlike ChamaAgent's code-only escrow, committee keys stay in the SignerList, so the group can still decide by quorum for funerals and emergencies. Unlike bank apps, the balance and history sit on a public ledger that members, or an auditor, can check without trusting the bank's or the app's view.

**Weak spots a judge will attack:**
- **"FNB already does digital 3-signatory approval with member visibility, for free."** True since Feb 2026. Answer that we sit above the bank. Our differentiators are rule enforcement and automated treasury work, not visibility alone.
- **On- and off-ramps for rands.** Members pay in rands and want rands out. How does money reach XRPL (RLUSD or XRP), at what cost, and through whom? See 04-regulation-and-rails.md. Without a clean ramp the product is a demo.
- **Interest.** Bank stokvel accounts pay 3.2% to 6% (Standard Bank and Nedbank pages, 2026). An XRPL account earns nothing unless we add a yield product, which brings its own risk.
- **Regulation.** Stokvels have a Banks Act exemption that is tied to membership of NASASA or a similar body (Government Notice 620, 2014: https://www.gov.za/sites/default/files/gcis_document/201409/37903gon620.pdf, seen in the search index only, not fetched; confirm against 04-regulation-and-rails.md). Holding the pool in crypto-assets may bring the CASP/FAIS regime into play.
- **Privacy (POPIA).** A public ledger shows amounts and timing to everyone. Payout addresses can link to members, so a judge will ask how we stop the whole world seeing who received R12,000 this month.
- **Key management for gogos.** Committee members have to hold and protect keys on low-end Android phones. Lost keys and the SignerList recovery process are real problems.
- **Who runs the rules co-signer?** If we run it, we are a single point of failure and arguably a custodian. Is it independent?
- **Capitec.** Its Sep 2026 stokvel account has not been checked yet. If it bundles contribution tracking, differentiator 2 narrows.
- **Prior art on-chain.** ChamaAgent and CoSave already pair an agent with a contract. We should say plainly that our novelty is the combination: XRPL native multi-sign, a committee plus a rules quorum, WhatsApp, and SA stokvel rules.

---

## E. Comparison table

| Product | Who holds the money | Who can withdraw | Member visibility | Automation / AI | Fees | Digital approval |
|---|---|---|---|---|---|---|
| FNB Stokvel Account | FNB | 3 signatories initiate and approve (FNB SA page, 2026; RMB copy says 2) | Yes: balances in app/USSD by invitation (2026) | None found | No monthly fee; transaction fees (2022 rules) | Yes, fully digital since Feb 2026 |
| Standard Bank Society Scheme + SEYVA | Standard Bank | 3 of 3–4 signatories (2026) | Yes: "each member visibility" via SEYVA (2026) | Statements and IT3Bs; no chasing | R0/month above R10k; cash deposit fees (2026) | Yes for payouts; opening is branch-only |
| Absa Grocery Stokvel / Club | Absa | Signatories; rule not found | e-statement on Online Banking; access for all members unclear | "track member contributions" claim (2026) | No monthly management fee (2026) | Not found; apply in branch |
| Nedbank Group Savings | Nedbank | 2 of at least 3 signatories present (2026) | Not stated; statements in Money app | None found | R0/month; teller cash fees (2026) | Not found; branch to open (FAQ snippet) |
| Capitec Stokvel Account | Capitec | Not found | Not found | Not found | Not found | "digital" (Oct 2026 report) |
| TymeBank / African Bank / Discovery / Old Mutual | n/a | No group product found | n/a | n/a | n/a | n/a |
| StokFella | Not stated (FSP48812) | Not stated | App shows balances and contributions (2018) | Admin, "on behalf" capture | Subscription; amount not found | n/a |
| Stokvels.CoZa / Stoki / Stokvel Manager | Group's own bank account (Stoki: not stated) | Group's bank signatories | Transaction history in app | Tracking and reminders; no AI | Free (2026) | n/a |
| StokvelOS (beta) | Not shown to hold funds | n/a | Reports | AI tracking, fraud flags, WhatsApp agent (self-reported) | Not found | n/a |
| Chamasoft (KE) | E-wallet plus Equity Bank link | No approval step described | App records | Recording and reconciliation (Equity only) | Not found | Not found |
| OneKitty (KE) | Not stated | Auto-payout on the set date | Live updates via WhatsApp | WhatsApp bot, auto-payout | Not found | Not found |
| WeSpare (NG) | Anchor MFB via WeSpare | Platform (no individual) | App | Collections, payouts, default cover | Not found | n/a |
| ChamaAgent (Celo) | Per-group escrow contract (cUSD) | Contract rules; agent cannot | Public chain | Autonomous agent triggers collection and payouts | Gas only (not stated) | On-chain, no committee found |
| CoSave (Celo) | Smart contract | Not stated | Public chain | AI agent: onboarding, reminders, payouts | Not found | Not stated |
| **Ours (XRPL)** | XRPL account, master key disabled | Quorum: agent (1) + rules co-signer + committee; agent never alone | Public ledger, real time | AI treasurer: reconcile, WhatsApp chasing, payout proposal | TBD + XRPL fees + ramp costs | Yes, multi-sign |

---

## Sources not reachable
- capitecbank.co.za (403).
- The Absa Club Account page (404).
- The StokvelOS pages (402/403).
- The TechCabal WeSpare and OneKitty articles (403).
- The Equitel page (empty).

For these, the claims above come from search-index snippets and are marked as such.
