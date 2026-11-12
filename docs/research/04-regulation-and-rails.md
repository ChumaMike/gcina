# 04 — Regulation and payment rails (South Africa)

Researched 12 Nov 2026 for W3Node Node Engine 2026 (Agentic Finance, judging Sat 14 Nov).
Primary sources first. Every claim has a URL and year. "Not found" means it was searched for and
not confirmed. This is not legal advice.

**Bottom line:** Gcina's testnet demo raises no regulatory issue. A real pilot is possible but
must run **through a licensed CASP**. The rules on self-custody and on using foreign-currency
stablecoins for domestic payments are **moving right now**. The exchange-control drafts were sent
back for redrafting on 22 Oct 2026, and the SARB has said it does not favour USD stablecoins for
payments inside South Africa.

---

## 1. FSCA: crypto as a financial product, and CASP licensing

**Declaration (2022).** On 19 Oct 2022 the FSCA declared crypto assets a "financial product"
under the FAIS Act. Anyone who, as a regular feature of their business, gives **advice** or
renders **intermediary services** on crypto assets needs to be an authorised FSP or the
representative of one. Intermediary services include custody, trading on behalf of clients,
running trading platforms, sales and marketing.
Source: SARB/FSCA Joint Communication, *Crypto assets for domestic payment purposes* (2026), §2.3,
§5.3–5.4.
https://www.resbank.co.za/content/dam/sarb/what-we-do/payments-and-settlements/regulation-oversight-and-supervision/designation-notices/280526%20Joint%20Communication_Crypto%20assets%20for%20domestic%20payment%20purposes.pdf

**Licensing numbers.**
- *12 Dec 2025:* 512 applications received, **300 approved**, 14 declined and 121 withdrawn. The
  FSCA had opened 81 investigations into unlicensed CASPs, of which 56 were still open. Licensing
  started on 1 Jun 2023. Source: FSCA press release, 15 Dec 2025, copy at
  https://jutacomplinews.co.za/media/filestore/2026/01/FSCA_Press_Release-Update_on_licensing_and_supervision_of_crypto_asset_service_providers_._2.pdf
- *31 Mar 2026 (latest figure found):* 533 applications and **310 approved**, with 17 declined and
  124 withdrawn. This was reported by Moonstone from the FSCA's year-end update. I could not open
  the FSCA list itself. https://www.moonstone.co.za/fsca-highlights-common-casp-compliance-failures/ (2026)
- Official list: "Approved list of crypto asset service providers" on fsca.co.za (linked from the
  Dec 2025 release).

**Crypto payments specifically (most important for Gcina).** The SARB and FSCA issued a joint
communication, dated 28 May 2026 going by its file name and reported on 2 Jun 2026. It says:
- Crypto assets, **including stablecoins**, are not "money" or "funds" under the National Payment
  System (NPS) Act. They fall outside the NPS Act and are **not legal tender** (§1.1).
- Its scope expressly covers "business-to-business payments within South Africa" (§3.1).
- An intermediary that facilitates a crypto payment between payer and payee **is rendering a
  FAIS intermediary service and must be licensed** (§5.4, §5.7, §6).
- **Peer-to-peer transfers that rely only on decentralised protocols involve no intermediation,
  so no party needs FSP authorisation.** The communication likens this to paying in cash (§5.5).
- Key line: "Intermediaries facilitating crypto asset payment-type activities … must be
  authorised by the FSCA as FSPs under the FAIS Act." (§6)

**Does Gcina need an FSP licence?**
- *Our reading:* the answer is grey.
- **Non-custodial software, where the business signs with its own keys on the XRPL**, is closest
  to the §5.5 decentralised peer-to-peer case. Gcina never holds the funds or keys.
- However, Gcina picks the payee, sets the amount and submits the transaction. The SARB/FSCA say
  "there is always one or more intermediaries" unless the transfer is pure DeFi, and the FSCA
  could treat this kind of orchestration as an "intermediary service".
- The **independent policy co-signer** makes the problem sharper, because a third party then
  holds a signing key.
- **Lowest-risk route:** partner with a licensed CASP and act as its software and technology
  provider (or become a representative under s13 FAIS), rather than applying for our own CASP
  licence. Get a written legal opinion before going live.

**FSCA statements on stablecoins, 2025–2026.**
- The FSCA treats stablecoins as crypto assets under the 2022 Declaration (Joint Communication
  2026, §3.1).
- I found no stand-alone FSCA stablecoin rulebook. The Dec 2025 FSCA release repeats that the
  SARB "does not currently recognise crypto assets as currency".

## 2. SARB: exchange control and stablecoins

**Court rulings conflict on whether crypto is "capital" under the 1961 Exchange Control
Regulations.**
- *Standard Bank v SARB* 2025 (5) SA 289 (GP), Pretoria, 15 May 2025: crypto is **not** "capital",
  so it falls outside exchange control. Source: Baker McKenzie (2025),
  https://insightplus.bakermckenzie.com/bm/financial-services-regulatory/south-africa-coin-vs-capital-cryptocurrency-is-not-subject-to-exchange-control
- *Mangundhla v SARB*, Johannesburg High Court (Wilson J), 1 Jun 2026: Bitcoin is **both "money"
  and "capital"**, and sending it to foreign exchange wallets is an export of capital. The court
  called *Standard Bank* "clearly wrong". https://allafrica.com/stories/202606050720.html (2026)
- The conflict needs a Supreme Court of Appeal ruling. I did not find the status of that appeal.

**New regime, which is in redraft.**
- **17 Apr 2026:** National Treasury published the draft Capital Flow Management Regulations,
  2026, to replace the 1961 Regulations. The draft expressly brings crypto into the regime.
  https://www.treasury.gov.za/public%20comments/CapFlow/Draft%20Capital%20Flow%20Management%20Regulations%202026%20April.pdf
- **3 Aug 2026:** Treasury and the SARB published a draft Crypto Assets Manual for cross-border
  activities, with comments due by 30 Sep 2026.
  https://www.resbank.co.za/en/home/publications/publication-detail-pages/media-releases/2026/crypto-assets
  What the draft says:
  - A transfer from a domestic Authorised CASP to a **non-custodial (self-hosted) wallet is a
    reportable cross-border outflow**, even though nothing leaves the country.
  - "For now", only **individuals** may move crypto offshore.
  - Baker McKenzie (2026) reads the draft as **barring companies from any crypto transaction
    classed as a capital import or export**, which would include a CASP-to-self-hosted wallet
    transfer.
  - **Rand-denominated trades inside a local Authorised CASP**, with no movement to a foreign
    CASP or self-hosted wallet, would be **outside the reporting regime**.
  https://www.bakermckenzie.com/en/insight/publications/2026/08/south-africa-proposed-framework-for-cross-border-crypto-asset-transactions
- **22 Oct 2026:** In the medium-term budget policy statement (MTBPS), Finance Minister Godongwana
  said Treasury and the SARB will **redraft** both the Regulations and the Manual after thousands
  of comments. He also signalled a move away from prior approvals. No date has been set for a
  second draft. Quote: "it is clear that we need to take a different approach".
  https://www.businessday.co.za/news/2026-10-22-treasury-and-reserve-bank-to-redraft-crypto-asset-regulations/
- **9 Sep 2026:** VALR, Luno, AltCoinTrader and EasyEquities started a coalition against the
  corporate cross-border ban and the self-custody rule. The SARB said its "approach to stablecoins
  has not been settled". https://techcentral.co.za/sarb-stablecoin-approach-cross-border-crypto/285961/ (2026)

**Stablecoin stance (SARB/IFWG).**
- **Joint Communication (2026), §4.5.2–4.5.3:**
  - Rand-pegged stablecoins have "some characteristics of digital money". The SARB wants to test
    domestic rand-stablecoin payment use cases in the **IFWG Regulatory Sandbox**.
  - Key line: "The SARB is thus unlikely to consider foreign currency-pegged stablecoins as payment
    instruments for domestic transactions."
  - The reason given is the risk of dollarisation.
- **IFWG discussion paper on rand-pegged stablecoins:** comments closed 18 May 2026. The paper
  suggests stablecoin activity may fall within "deposit" or "the business of a bank" under the
  Banks Act. https://regulationinnovation.org/?p=9421 (2026). This is a secondary source; I did
  not open the IFWG original.
- **IFWG Stablecoin Landscape Diagnostic, Mar 2025:** identified six rand-backed or rand-pegged
  arrangements. This is reported in secondary sources; I did not open the original.

**Domestic payment from one SA business to another in stablecoin: what applies.**
- *NPS Act:* does not apply, because the transfer is not a "payment" in law.
- *FAIS:* applies to any intermediary involved.
- *FIC Act / Directive 9:* applies to any CASP in the chain.
- *Exchange control:* only applies if the coins cross to an offshore CASP or a self-hosted wallet
  (under the draft, which is being redrafted).
- *Policy:* a USD stablecoin such as RLUSD for domestic payments runs against the SARB's stated
  stance. A rand stablecoin is the policy-aligned choice.

## 3. FIC Act and the Travel Rule

- **CASPs became accountable institutions** when Schedule 1 to the FIC Act was amended in Dec 2022
  (item 22). Directive 9 applies to CASPs under items 12 and 22. Source: Directive 9 of 2024,
  Government Notice 5543, 15 Nov 2024.
  https://www.gov.za/sites/default/files/gcis_document/202411/51556gon5543.pdf
- **Directive 9 (Travel Rule) took effect on 30 Apr 2025.** It requires ordering, intermediary and
  beneficiary CASPs to:
  - obtain, verify, hold and transmit originator and beneficiary information securely, before or
    at the time of the transfer;
  - screen against UN sanctions lists;
  - suspend or reject transfers when information is missing.
  The FIC's final guidance is PCC 61 of 2026. Summary of that guidance: "if you cannot transmit,
  verify and monitor the data, you should not be executing the transaction".
  https://www.moonstone.co.za/fic-tightens-crypto-rules-no-data-no-transfer-standard-emerges/ (2026)
- **Self-hosted (unhosted) wallets:**
  - The Directive defines an unhosted wallet as one where "the user has exclusive control of the
    private keys".
  - Under §8, CASPs need risk-based policies for transfers to or from unhosted wallets, including
    how they obtain more information about the wallet holder.
  - PCC 61 treats these transfers as **higher risk, requiring enhanced due diligence**.
  - Transfers between two unhosted wallets fall outside the Travel Rule itself, according to
    practitioner commentary.
  - Values: the rule applies regardless of value within a business relationship. For once-off
    transactions under R5 000, information must still be recorded (PCC 61, per Moonstone).
  - **Implication for Gcina:** a supplier receiving into a self-hosted wallet would face EDD at
    whichever CASP they cash out through. Paying CASP account to CASP account is cleaner.

## 4. POPIA (invoice data and LLM calls)

- **What we process:** Invoices hold suppliers' banking details. For sole traders they also hold
  personal information (name, ID or VAT number, phone). Under POPIA, the SME is the **responsible
  party** and Gcina is its **operator**. Gcina therefore needs a **written operator agreement**
  under s21, which includes security safeguards under s19.
- **Cross-border transfer (s72):** Sending invoice text to a US LLM API is a transfer outside the
  Republic. Section 72(1) allows it only if one of these applies:
  - (a) the recipient is bound by law, binding corporate rules or a binding agreement that gives
    adequate protection, including limits on onward transfer;
  - (b) the data subject consents;
  - (c) or (d) the transfer is needed for a contract;
  - (e) the transfer benefits the data subject and consent is impracticable.
  https://popia.co.za/section-72-transfers-of-personal-information-outside-republic/ (statute, 2013)
- **Practical approach:**
  - Rely on (a) through the provider's data-processing terms, with zero data retention where it is
    offered.
  - Redact or tokenise bank account numbers and ID numbers before the LLM call. Account numbers
    are needed only for matching, which can be done locally.
  - Disclose the transfer in the privacy notice.

## 5. Tax (SARS), briefly

- Normal income tax rules apply to crypto. A gain is either revenue or capital (CGT) under
  existing case law.
- **Paying for goods or services in crypto is a barter transaction** under normal barter rules.
  This means every stablecoin payment is a disposal: the business must record the ZAR value at the
  time and the base cost of the coins. Quote: "normal income tax rules apply to crypto assets".
  https://www.sars.gov.za/individuals/crypto-assets-tax/ (accessed 2026)
- A 1:1 stablecoin normally gives a negligible gain, **but RLUSD is USD-pegged, so ZAR/USD
  movements create real forex gains or losses** that must be accounted for. A rand stablecoin
  avoids this.
- **VAT:** I believe crypto assets have been an exempt "financial service" since 2019 (VAT Act
  s2(1)(o)). This was **not re-verified in this session**, so confirm with a tax practitioner.

## 6. Rails for a real pilot

**RLUSD (Ripple USD)**
- Issued by a NYDFS-regulated New York trust company.
- Natively issued on **XRPL and Ethereum**. Sources: VALR blog (2025),
  https://blog.valr.com/blog/xrp-stablecoin-rlusd; Ripple press release (2025).
- **Africa launch, 4 Sep 2025:** **VALR** listed RLUSD for institutional and retail clients;
  **Yellow Card** for treasury and cross-border use; **Chipper Cash** for cross-border payments.
  https://ripple.com/ripple-press/ripples-usd-backed-stablecoin-rlusd-arrives-in-Africa/
- **Not found:** whether VALR supports RLUSD **deposits and withdrawals on XRPL** (as opposed to
  Ethereum), and whether there is an RLUSD/ZAR pair. **Check this with VALR before promising an
  XRPL to ZAR route.** Other exchanges did add XRPL RLUSD: Gemini in Dec 2025 and Binance (deposits)
  in Feb 2026.
- VALR describes itself as a licensed FSP, number 53308. This comes from a search snippet and was
  not checked on the FSCA list.

**Other Ripple activity in SA**
- **Absa and Ripple:**
  - Partnership announced on 15 Oct 2025.
  - **Absa Digital Asset Custody**, built on Ripple Custody, went live on 21 Sep 2026.
  https://news.bitcoin.com/crypto-news/absa-ripple-digital-asset-custody-launch-south-africa/ (2026)
- **Mercury**, a Ripple ODL partner, is reported to be in the first cohort of the IFWG Regulatory
  Sandbox. This is from secondary sources (2026).
- **Onafriq** has had a remittance partnership with Ripple since 2023.
- **Not found:** any Ripple Payments licence or named Ripple Payments customer in South Africa.

**ZAR stablecoins.** **None was found on the XRP Ledger.**

| Coin | Chains | Access / notes | Source |
|---|---|---|---|
| ZARP | Base, Ethereum, Polygon, Solana (Gnosis linked) | Bought or redeemed via AFRIDAX, ChainEX, OVEX and DEXs; redeemed at R1. The issuer says it acts as a representative of Inves Capital and its CASP licence is "pending" | https://zarpstablecoin.com/ (2026) |
| ZARU | Not named at launch; later reported live on Circle's **Arc** chain (secondary source) | Launched 3 Feb 2026 by Luno, Sanlam SAM, EasyEquities and Lesaka. Standard Bank is the banker and Moore audits monthly. **Institutional only** at launch | https://www.sanlamonline.co.za/knowledge-hub/zaru (2026) |
| ZARsc (Super Group) | Solana; reserves at Absa | Secondary source | https://solanacompass.com/news/supercoin-launches-zarsc-south-africas-first-fsca-licensed-rand-stablecoin-on-solana |
| ZARC | Stellar | Secondary source | https://shiftmarkets.com/blog/zarc-south-africa-stablecoin-launch |
| mZAR / yZAR (Mesh) | Not checked | Secondary source | fanews.co.za (2025) |

- Business Day (Oct 2026) counts about **10 rand-pegged stablecoins** on the market.
- **Not found:** an Absa or Standard Bank-*issued* ZAR stablecoin. Standard Bank is ZARU's banker
  and Absa holds ZARsc's reserves; neither bank is the issuer.

**Off-ramp (how the supplier gets rands).** The supplier, or Gcina on the supplier's behalf, needs
an account at a licensed CASP. The coins are sold to ZAR there and withdrawn by EFT.
- **VALR:** 30 free normal ZAR withdrawals a month, then **R8.50** each. Fast withdrawals to
  Standard Bank are free. Source: VALR blog and support pages via search (2025–26); the support
  page itself returned 403. Confirm current pricing before quoting.
- **Luno:** I did not find a ZAR withdrawal fee.
- **Spread:** trading spreads and fees for converting RLUSD to ZAR were not found.

## 7. What we can honestly say

| Topic | Testnet demo (true today) | Production path (needs) |
|---|---|---|
| Money moved | Testnet XRP with no value. No CASP, Excon, FIC or FAIS issue | Real value through a **licensed CASP partner**, contracted as its technology provider or representative |
| Custody / keys | The business holds its keys in a multi-sign quorum, plus a policy co-signer | Possibly CASP-hosted accounts or wallets. The draft Excon regime (being redrafted) treated CASP-to-self-hosted transfers by companies as capital exports |
| Asset | XRP (test) | A **rand stablecoin** for domestic payments (SARB-aligned, but none on XRPL yet). RLUSD on XRPL fits **cross-border** supplier payments, once corporate cross-border crypto is allowed |
| KYC / KYB | None | The CASP does KYB on the SME and KYC/KYB on suppliers |
| Travel Rule | Not applicable | Directive 9 data for every transfer. EDD for any unhosted wallet |
| Off-ramp | Not applicable | The supplier's CASP account, sold to ZAR, then EFT to their bank |
| POPIA | Synthetic invoices | s21 operator agreement, s72 basis for the LLM call, redaction |
| Tax | Not applicable | ZAR value captured per payment for SARS barter and disposal records |

**Three questions a judge is likely to ask**

1. **"Is this legal in South Africa?"**
   Crypto payments are lawful but are not legal tender. The SARB and FSCA say any intermediary
   facilitating them must hold a FAIS licence, so in production Gcina runs as software behind a
   licensed CASP. The testnet demo moves no value, and our guardrails (spend limits, multi-sign
   quorum, independent co-signer) are exactly the controls a CASP's compliance team would want.

2. **"How does the supplier end up with rands?"**
   The payment lands in the supplier's account at a licensed SA exchange, which sells it to ZAR
   and pays it out by EFT the same day. VALR, for example, gives 30 free ZAR withdrawals a month.
   The exchange carries the KYC and Travel Rule data, so the supplier never handles a raw wallet.

3. **"Why a US-dollar stablecoin for local payments? The SARB doesn't like that."**
   That's right: the SARB's May 2026 communication says foreign-pegged stablecoins are unlikely to
   be approved for domestic payments. Our policy engine is asset-agnostic, so domestically we would
   pay in a rand stablecoin, through the IFWG sandbox if needed, and keep RLUSD on XRPL for
   cross-border supplier invoices once the redrafted exchange-control rules allow companies to use
   it.

**Open items to confirm before saying more:**
- Whether VALR supports RLUSD on XRPL and has an RLUSD/ZAR pair.
- Whether any rand stablecoin plans to issue on XRPL.
- The status of the Standard Bank appeal at the SCA.
- The content of the second-draft Capital Flow Management Regulations and Manual.
- A FAIS legal opinion on the non-custodial agent and co-signer model.

---

## 8. Local infrastructure path

Added 12 Nov 2026. RLUSD on XRPL testnet is now the demo's payment currency.

### 8a. From RLUSD on XRPL to rands in the supplier's bank

The intended chain is:

1. Gcina pays RLUSD on XRPL to the supplier's **deposit address and destination tag at an SA CASP**.
2. The CASP credits RLUSD to the supplier's account.
3. The supplier sells RLUSD for ZAR (or swaps to USDC/USDT and then sells for ZAR).
4. The CASP pays the ZAR out to the supplier's bank account by EFT, RTC or similar.

**Mechanics on XRPL.** Any XRPL deposit of RLUSD needs the receiving account to hold an RLUSD
**trustline**. Exchanges use an address plus a **destination tag**. Gemini, for example, requires
the destination address to be activated with at least 1 XRP.
- https://www.gemini.com/blog/rlusd-is-now-compatible-with-the-xrp-ledger-on-gemini (2025)
- https://github.com/ripple/RLUSD-Implementation/blob/main/doc/rlusd-xrpl-settings.md (Ripple, n.d.)

**One row per exchange:**

| Exchange (SA) | RLUSD listed? | RLUSD deposits **on XRPL**? | Route to ZAR | Trading fee (published) | ZAR withdrawal fee | ZAR withdrawal timing |
|---|---|---|---|---|---|---|
| **VALR** (says it is FSP 53308) | **Yes**: Ripple announced the listing for institutional and retail clients on 4 Sep 2025 ([ripple.com](https://ripple.com/ripple-press/ripples-usd-backed-stablecoin-rlusd-arrives-in-Africa/), 2025) | **Not found.** No VALR page confirms the XRPL network for RLUSD. VALR does run XRPL deposits for **XRP** with destination tags ([support.valr.com](https://support.valr.com/hc/en-us/articles/360029561452-How-do-I-deposit-crypto-on-VALR); [xrpscan VALR account](https://xrpscan.com/account/rDseVXFK1SkWhFH65cqAxf3HmvHCF6b94t)) | RLUSD/ZAR pair **not found**. An RLUSD → USDC/USDT → ZAR route is plausible but **not confirmed** | Not found in this session | 30 free normal ZAR withdrawals a month, then **R8.50** each. The "Fast Withdrawal" fee is shown at selection; fast withdrawals to Standard Bank are free ([VALR support via search](https://support.valr.com/hc/en-us/articles/360010571299), 2025–26; page returned 403) | **Normal: up to 2 business days.** **Fast ("Blitz") over RTC:** 24/7/365 to Standard Bank, and 24/7 under R250 000 at other RTC banks. Banks may hold a payment up to 2 h for fraud checks; above R250 000 it goes by RTGS. **PayShap: not found** ([VALR Blitz](https://support.valr.com/hc/en-us/articles/360013134379-Blitz-Processing-of-ZAR-Withdrawals)) |
| **Luno** | **Not found** (Luno co-launched ZARU, the rand coin, in 2026, not RLUSD) | Not found | Not found | Not found | Not found | Automated, faster ZAR withdrawals "at no additional charge", with instant payment promised for non-Standard Bank accounts. Date unclear (c. 2020) ([techafricanews](https://techafricanews.com/2020/01/30/luno-introduces-instant-real-time-bank-withdrawals/)) |
| **Yellow Card** | Yes, for treasury and cross-border use ([ripple.com](https://ripple.com/ripple-press/ripples-usd-backed-stablecoin-rlusd-arrives-in-Africa/), 2025) | Not found | ZAR support exists ([Yellow Card blog](https://yellowcard.io/blog/yellow-card-expands-to-south-africa-and-botswana)). RLUSD to ZAR **not found** | Not found | Not found | Not found |
| **Chipper Cash** | Uses RLUSD inside its cross-border product (2025) | Not found | **No SA ZAR off-ramp found** | Not found | Not found | Not found |

**Honest summary.** VALR is the only SA exchange where an RLUSD listing is confirmed. **I could
not confirm that VALR (or any SA exchange) accepts RLUSD on the XRPL network**, as opposed to
Ethereum, or that it has an RLUSD/ZAR pair. Binance listed RLUSD on Ethereum first with "XRPL coming
soon" in Jan 2026 (https://ripple.com/insights/rlusd-continues-to-build-on-momentum-binance-lists-rlusd-on-ethereum-with-xrpl-coming-soon/),
so Ethereum-first listings are common. **Before the pitch, Chuma should open VALR → Wallets →
RLUSD → Deposit and check which network it shows.** If it shows only Ethereum, the honest line is:
"in production, the CASP partner bridges or receives on XRPL; today the off-ramp is VALR via
Ethereum RLUSD."

**Exchange-control caveat.** The exchange-control drafts (being redrafted, see section 2) would
make the transfer from Gcina's self-hosted business wallet to the supplier's CASP account a
reportable **inflow**. The source is the Baker McKenzie note from 2026 cited in section 2.

### 8b. Supplier onboarding with bank account verification (AVS)

**What AVS is.**
- The interbank Account Verification Service was operated by **BankservAfrica**, which rebranded to
  **PayInc** on 29 Aug 2025; the SARB is taking a stake. Source: Business Day (2025),
  https://www.businessday.co.za/bd/companies/financial-services/2025-08-29-bankservafrica-rebrands-to-payinc/
- **AVS-R** is the real-time variant. It runs 24/7/365 and banks must answer within seconds.
  **AVS-B** is the batch variant, originally built for SARS.
- Checks return **yes/no only**, with no account data disclosed:
  - ID or registration number matches the account;
  - the account can transact (accepts credits/debits);
  - account type;
  - open or closed;
  - open longer than a set period;
  - optionally initials, surname, mobile number and email.
- Source: Electrum (2022), https://blog.electrum.co.za/post/account-verification-services-avs-who-how-and-why
- **Not found:** any PayInc-branded AVS product page or PayInc rate card.

**Who can access it.**
- **Only banks** participate directly. Businesses reach AVS through their bank or an approved
  third party; the fee is set bilaterally between banks (Electrum, 2022).
- Third parties found:
  - **Stitch** (BAVS API);
  - **Netcash**;
  - **RealPay** (AVS-R);
  - **TransUnion** (PDF returned 403; price on request);
  - **Windeed**;
  - **Akiba**;
  - **Standard Bank OneHub API** ([CIB API marketplace](https://corporateandinvestment.standardbank.com/cib/global/products-and-services/onehub/api-marketplace/account-verification-service));
  - **Electrum** (for banks).
- **VerifyNow, XDS, Experian, Lightstone, Searchworx:** none was confirmed as an AVS reseller in
  this session, and no prices were found.

**Prices found (per check):**
- **Standard Bank:** **R2** per verification, free for its own accounts; real-time, "under 60
  seconds"
  ([standardbank.co.za](https://www.standardbank.co.za/southafrica/personal/products-and-services/security-centre/protect-yourself/account-verification-services), 2026).
- **Windeed:** **R12.47 excl. VAT** per search, covering individual or company and the major banks
  ([windeed.co.za](https://www.windeed.co.za/?p=5884), via search).
- **Akiba API:** **R7** for consumer and commercial accounts
  ([akiba docs](https://akiba-digital.gitbook.io/akiba-api-docs/pricing), via search).
- **Stitch, Peach:** pricing not public / not found.

**Stitch BAVS.**
- Returns:
  - `accountExists`;
  - `accountOpen` (plus whether it has been open more than 3 months);
  - `accountAcceptsCredits` and `accountAcceptsDebits`;
  - `identityDocumentMatch`, which takes an **ID or business registration number**;
  - `lastNameMatch`, and `initialMatch` (individuals only);
  - optional phone and email checks.
- **Business accounts are supported.** A check can take **up to 120 s** depending on the bank,
  returning `RESULT_PENDING` until then. Results are kept for 48 h.
- Source: https://docs.stitch.money/payment-products/bank-account-verification/integration-process (2026)
- **Peach Payments** account verification: **not found** in this session.

**How Gcina would use it: the "approved payee" gate.** A supplier's XRPL destination (CASP address
plus tag) becomes **approved** only when every step below passes. Until then, the policy co-signer
refuses to sign any payment to it.

1. **Identity.** The supplier gives its CIPC registration number, or ID number for a sole trader.
   Gcina checks the company exists and is active against CIPC records. A specific CIPC API or price
   was not researched here.
2. **Payout account.** The supplier names the ZAR bank account linked to its CASP account. Gcina
   runs **AVS-R through a reseller** (Stitch BAVS first choice, because it has an API and supports
   business registration numbers). The account must return: exists, open, accepts credits, and
   registration number match. Open for more than 3 months is a risk signal, not a hard rule.
3. **CASP link.** The CASP account must be held in the same legal name, confirmed by a CASP
   attestation or by a test micro-payment that shows up in the supplier's CASP account. A
   standard CASP API for this was **not found**; it needs the partner.
4. **Owner confirmation.** The owner confirms the new payee from a **known phone number** with a
   one-time PIN or WhatsApp confirmation. The number is the one captured at onboarding, not one
   taken from the invoice. Optionally AVS's mobile-number match can tie that phone to the bank
   account.
5. **Change control.** Any change to the bank account or XRPL address on an invoice resets the
   payee to *unapproved* and repeats steps 2–4. This is the main defence against business email
   compromise and invoice-redirection fraud, which is the fraud that matters most for AP.

Data handling: AVS results are yes/no flags. Gcina stores only the flags, a timestamp and a provider
reference, which keeps the POPIA footprint small (section 4).

**Still open for section 8:**
- Whether VALR supports XRPL RLUSD, and whether it has an RLUSD/ZAR pair.
- VALR and Luno trading fees and Luno ZAR withdrawal fees.
- Whether Yellow Card or Chipper Cash has an SA off-ramp.
- PayInc direct AVS pricing.
- Stitch and Peach pricing.
- Whether VerifyNow, XDS, Experian, Lightstone or Searchworx resell AVS.
