# 06 — The stokvel problem (evidence pack)

Researched 2026-11-12 for W3Node Node Engine 2026, Agentic Finance track (Ripple).
Concept: an AI agent acts as the stokvel's treasurer (tracks contributions, chases late
payers, proposes payouts). The money sits in an XRP Ledger account that no single person,
and not the agent, can move. Committee members form a multi-sign quorum, and an
independent rules service enforces the constitution.

Rules used: every number has a URL and year. "Verified" means the page was fetched and
the figure seen on it. **VENDOR-ONLY** means the only source is a company with something
to sell (bank, fintech). Where I could not find a figure, it says "not found".

---

## 1. Size of the sector

| Figure | Source (year) | Status | Notes |
|---|---|---|---|
| **800 000+ groups, ~11 million members, R50 bn a year** | NASASA, quoted by Ipsos, 13 Mar 2024: https://www.ipsos.com/en-za/stokvels-remain-untapped-human-banks-south-africa | Verified (Ipsos cites NASASA) | The figure everyone uses. NASASA's own estimate, no method published. |
| Same 800 000 / 11 m / R50 bn | Daily Maverick, 20 Aug 2026: https://www.dailymaverick.co.za/article/2026-08-20-how-one-food-stokvel-helps-45-north-west-families-fight-hunger/ | Verified (attributed to NASASA) | Shows the figure is still in circulation in 2026. |
| "More than 11 million South Africans" are members | NASASA chair Andrew Lukhele on 702 / EWN, 14 Aug 2025: https://www.ewn.co.za/more-than-11-million-south-africans-are-members-of-stokvels-nasasa | Verified | Lukhele: "Young people are joining stokvels in droves." |
| 811 830 stokvels, 11.4 m members, R44 bn | African Response survey, 2011, via IOL: https://www.iol.co.za/business-report/economy/sa-stokvels-worth-r44bn-1183129 | **Not verified** (page returned 403; numbers from search snippet only) | Almost the same as the NASASA figures. The "11 m / 800 k" figure may well date back to this 2011 survey. Treat as a likely origin, not proven. |
| 421 000 stokvels, 23% of adults (8.6 m), R25 bn | African Response survey, fieldwork Feb–Apr 2014, n = 3 750 face-to-face, via The Herald (Sapa) 15 May 2014: https://www.theherald.co.za/amp/business/2014-05-15-sa-stokvels-worth-around-r25-billion/ | Verified (421 000, 23%, R25 bn, n = 3 750 seen; the 8.6 m figure came from a search snippet) | **Contradicts** the NASASA figure: half the groups and half the money. It is the only figure I found with a stated sample. |
| NASASA "regulate[s] over 125 000+ Groups with 2 500 000+ individuals" | NASASA website (undated), https://nasasa.co.za | Verified, undated | NASASA's *registered* base is roughly 1/6 of the sector size it quotes. Most stokvels are not affiliated (see section 4). |
| 52% of adults use informal mechanisms; 7% rely on informal savings (e.g. savings groups) with no formal savings product | FinScope South Africa 2015 brochure (FinMark Trust): https://finmark.org.za/system/documents/files/000/000/481/original/Broch_FinScopeSA2015.pdf | Verified (PDF text extracted) | FinScope does not split out stokvels in the brochure. Burial societies are the main informal product (53% of informal users). I did not find a stokvel count in FinScope 2024. |
| FNB Stokvel Account inflows R13.3 bn by Dec 2024 (up 66% from R8 bn); digital stokvel savings R10.7 bn | FNB, via DailyInvestor 9 May 2025: https://dailyinvestor.com/finance/86859/one-south-african-bank-sees-r13-3-billion-in-stokvel-inflows/ | Verified, **VENDOR-ONLY** | One bank only. Shows money is moving into bank accounts, but it says nothing about the whole sector. |
| Old Mutual Savings & Investment Monitor (latest stokvel figure) | 2023 press release: https://www.oldmutual.co.za/v3/assets/blt0554f48052bb4620/blt71dbd6df4d47f4aa/64b7b3cceda544932e72ffc9/OMSIM2023_Press_Release_Insights.pdf | **Not verified** (fetch failed, HTTP 422) | A search snippet says 65% of members are in a stokvel that lends to members. I found no 2024/25 OMSIM stokvel membership figure. **VENDOR-ONLY** (Old Mutual sells savings products). |
| BDO stokvel study | none | **Not found** | |

**How dated or contested these figures are:** the "800 000 / 11 million / R50 bn" headline is
NASASA's estimate. It has no published method and appears unchanged since at least 2024, and it is
very close to an African Response survey from 2011. The only sampled figure I verified
(African Response 2014) is about half of it. Quote it as "NASASA estimates", never as a
census.

---

## 2. The problem: theft, disappearing money, scams, robbery

### 2a. Insiders (signatories or treasurers) taking the money
- **Rustenburg (North West), arrests 26 Mar 2025, R600 000.** Two members who were
  **signatories** on the stokvel's bank account allegedly withdrew R600 000 without the
  other members' consent and lost it in crypto. The *treasurer* spotted the withdrawals
  (Nov 2023). The two were charged with fraud and got R5 000 bail. Police spokesperson Col.
  Adéle Myburgh. Citizen, 31 Mar 2025:
  https://www.citizen.co.za/news/south-africa/crime/r600k-disappears-from-stokvels-bank-account
  — "Motaung and Mogotsi, who were some of the signatories, withdrew R600 000".
  **Why it matters for the pitch:** the bank account had signatories and it still failed.
  Signatory controls at a bank are only as strong as the bank's mandate (often "any two"),
  and members cannot see the balance in real time. I found no verdict yet.
- **Jeffreys Bay (E Cape), Dec 2018, R91 690.** The treasurer collected cash at monthly
  meetings and made no deposits to the club account for 11 months. She was arrested and
  charged with theft. SAPS Sgt Majola Nkohli advised members to pay electronically rather
  than rely on one treasurer. TimesLive, 19 Dec 2018:
  https://www.timeslive.co.za/news/south-africa/2018-12-19-stokvel-treasurer-charged-with-stealing-r90000-from-members/
  (older than the 2022–2026 window, but the clearest police statement on treasurer risk).
- Eswatini, undated: about E160 000 missing, "a treasurer who is said to have vanished".
  https://eswatiniobserver.com/?p=7206 — **seen in search snippet only, not fetched.**
- Botshabelo (Free State), Dec 2024: a couple went missing amid alleged stokvel money
  disappearance. https://briefly.co.za/south-africa/205705-free-state-couple-missing-alleged-stokvel-money-disappearance/
  — **search snippet only, not fetched.**
- **Prevalence: not found.** I found no survey that measures what share of stokvels lose
  money to insiders. Every piece of evidence here is a single case. Say "cases like", not "x% of".

### 2b. Fake stokvels and Ponzi schemes
- **Tshwaranang Community Stokvel (Free State), about R8 m.** It promised 30–50% in 30 days
  (2017–19). The organiser was arrested and charged with fraud, a FAIS Act breach and
  money laundering; the case went to the Hawks. Police: "The victims suffered a total loss of R8m."
  IOL, 19 Sep 2022:
  https://iol.co.za/news/crime-and-courts/2022-09-19-stokvel-scam-free-state-man-arrested-for-allegedly-swindling-people-out-of-r8m/
  Search results say the sentence was 7 years, handed down 22 Feb 2024 (not fetched).
- **United African Stokvel (digital "stokvel").** The FSCA carried out a search and seizure in
  June 2023 for unauthorised business. Citizen, 18 Jul 2023:
  https://www.citizen.co.za/business/african-united-stokvel-red-flagged-by-fsca — FSCA:
  "to provide investment products and other financial services requires authorisation by the FSCA."
  Victims put in amounts from under R15 000 to over R500 000; one lost R504 000. The FSCA said it
  "has little room to take action" because the entity was not a registered FSP.
  Daily Maverick, 25 Jul 2023:
  https://www.dailymaverick.co.za/article/2023-07-25-united-african-stokvels-digital-investment-scam-stretched-from-sa-to-neighbouring-countries/
- NASASA had rejected UAS's membership application in 2019 and warns about "WhatsApp
  stokvels". Moonstone: https://www.moonstone.co.za/investors-told-to-beware-amid-probe-into-united-african-stokvel/
  (search snippet).
- eNCA, 13 Feb 2026, "stokvel scams surge" (FSCA warning): https://www.enca.com/business/stokvel-scams-surge
  — **headline only seen; details not verified.**

### 2c. Cash-handling risk (robbery)
- **Limpopo, Sat 7 Nov 2026 (published 9 Nov 2026), about R30 000.** Three armed men robbed 16 members
  of a stokvel at a year-end contribution meeting in Musiphana village. The provincial
  commissioner, Lt-Gen Scheepers, urged groups to bank contributions.
  https://www.timeslive.co.za/news/south-africa/2026-11-09-stokvel-group-robbed-at-gunpoint-during-year-end-gathering/
  **Topical: this was five days before judging.**
- **Limpopo, Dec 2022, R60 000.** SAPS: "Stokvel members are advised to make use of EFT,
  which minimises crimes of this nature." Police say such reports are common at that time of year.
  https://www.timeslive.co.za/news/south-africa/2022-12-13-planning-to-draw-large-amounts-of-cash-out-your-stokvel-police-urge-you-to-think-again/
- **Nelson Mandela Bay, 8 robberies in 11 days, about R700 000 (Nov–Dec 2019).** SAPS Capt.
  Beetge: "the stokvel co-ordinators become prime targets as they are responsible for the money."
  https://www.theherald.co.za/news/2019-12-11-stokvel-robbers-strike-eight-times-snatching-r700000/
- Fatal cases seen in search results only (not fetched): a woman shot dead in Mpumalanga, Dec 2022
  (https://businessreport.co.za/news/crime-and-courts/2022-12-14-woman-shot-dead-as-robbers-pounce-on-stokvel-members-sharing-out-money-at-a-house-in-mpumalanga);
  a man of 62 killed in Umbumbulu, KZN (https://www.ecr.co.za/news/news/man-62-killed-stokvel-cash-robbery-umbumbulu/).
- NASASA chair Lukhele on cash safety: "people should safeguard the areas where they
  distribute their money." ECR, undated: https://www.ecr.co.za/news/news/stokvel-association-urges-safer-withdrawals/

### 2d. Money kept in personal accounts
- **Not found** as a measured figure. In the 2014 African Response survey, stokvels are "usually run by
  trusted friends or co-workers" (Herald link above). A search snippet from Sowetan/IOL coverage of
  the 2024 robberies says "several groups are beginning to deposit funds into member's bank
  accounts" (not fetched). Do not put a number on stage.

---

## 3. Why the problem persists

| Reason | Evidence | Strength |
|---|---|---|
| **Trust and social enforcement instead of controls** | "members blindly entrust the treasurer with the responsibility of keeping track of the cash flow" — Wits research report, citing Posel & Thomson 2002: https://wiredspace.wits.ac.za/bitstreams/457a5b16-37b2-4564-99b4-7199cebacfc8/download (search snippet, not fetched). Stokvels are "usually run by trusted friends or co-workers" (African Response 2014, Herald, verified). | Qualitative, no survey percentage |
| **Cash culture** | Ipsos 2024: "Cash remains the preferred mode of operation for most stokvels" (paraphrase of verified page). Police statements 2018, 2019, 2022 and 2026 all tell stokvels to move off cash (links above). | Strong, from several sources |
| **Banks feel costly and bureaucratic** | Ipsos 2024 qualitative study (6 video interviews and a 100-person online community): perceived high fees, red tape, lengthy account opening, inflexible withdrawal rules, hidden charges; "Banks therefore need to address continued member resistance". https://www.ipsos.com/en-za/stokvels-remain-untapped-human-banks-south-africa | Medium (small qualitative sample) |
| **Account opening needs every signatory to show up** | Until Feb 2026, FNB required "three signatories... to physically visit an FNB branch together"; now digital. https://www.jozigist.co.za/fnb-transforms-stokvel-banking-with-full-end-to-end-digital-account-opening (13 Feb 2026). Banks typically ask for a constitution, the minutes of the meeting that decided to open the account, and ID plus proof of address for each signatory, with withdrawals needing 2–3 signatories (Nedbank FAQ: https://www.nedbank.co.za/content/dam/nedbank/site-assets/Personal/Save_and_Invest/Brochures/Stokvel%20FAQS%20Final%20.pdf; Postbank: https://postbank.co.za/Products/Savings/bakgotsi.html — both from search snippets, not fetched) | Medium; bank product pages are VENDOR sources for their own requirements |
| **Bank signatory rules don't stop insiders** | Rustenburg 2025: signatories withdrew R600 000 without the other members knowing (Citizen, verified). | Single case, but a strong one |
| **Members can't see the balance** | Jeffreys Bay 2018: no deposits for 11 months before anyone noticed (TimesLive, verified). Rustenburg: withdrawals discovered after the fact. | Case evidence; no survey found |
| **Disputes over who paid / late payers** | A CPUT thesis on a grocery stokvel found "erosion of mutual trust owing to members failing to honour their obligations to make fixed monthly contributions": https://etd.cput.ac.za/bitstream/20.500.11838/2900/1/Mabika_Shingirirayi_214336662.pdf (search snippet, not fetched) | Weak / qualitative |
| Low or no interest | **Not found** as a measured complaint. | — |

---

## 4. Regulation

**Banks Act: stokvels are carved out of "the business of a bank" (deposit-taking).**
- Designation Notice 1176 of 2006 (common-bond groups), under para (cc) of the definition of
  "the business of a bank" in the Banks Act 94 of 1990. Acts Online:
  https://www.acts.co.za/Banks/n1176_3__conditions (partly paywalled). Conditions as summarised
  from the page (not quoted verbatim):
  - The group must be a member of, or affiliated to, **NASASA** or another self-regulatory body the
    Registrar of Banks approves in writing.
  - Members must have a **common bond**, and the activity is limited to members.
  - Members may not withdraw their full contributions at any time on demand.
  - Benefits may not be provided only as loans.
  - Two tiers: subscriptions **never more than R3 m**, and **R3 m to R30 m**. The larger tier needs
    audited annual financial statements (within 120 days of year-end), copied to members and NASASA.
- Amendments: GN 404 of 2012 (Gazette 35368, scanned PDF, text not extractable):
  https://www.gov.za/sites/default/files/gcis_document/201409/35368gon404.pdf. GN 620 of 2014 (Gazette 37903, 15 Aug 2014):
  https://www.gov.za/sites/default/files/gcis_document/201409/37903gon620.pdf. NASASA's site cites Gazette 37903 as the basis
  for its status as approved self-regulatory body. NASASA's site also calls itself a co-operative financial
  institution under s40C(1) of the Co-operative Banks Act.
- **Implications for us:** (1) The exemption depends on the stokvel's NASASA affiliation, yet
  NASASA's own site counts about 125 000 groups against the 800 000 it says exist. Most
  stokvels are probably outside the letter of the exemption (inference, not a finding).
  (2) If *we* hold or pool members' money, we are not a common-bond group, and that looks like
  deposit-taking (the business of a bank). The design answer is that the money is held in the
  **stokvel's own account, controlled by its members' keys**. We never take custody. Get this checked by a lawyer.
- The Prudential Authority (SARB) now administers the Banks Act. I did not confirm whether
  Notice 1176 has been replaced since 2014. **Not verified as current.**

**FSCA and FAIS.**
- FAIS exemption for burial societies and stokvels (2013, Board Notice 43): https://lawlibrary.org.za/akn/za/act/bn/2013/43/eng@2013-04-02
  It covers assistance-policy services to members (search snippet, not fetched).
- A "stokvel" that offers financial services to non-members, or promises investment returns, needs FSP
  authorisation (FSCA on UAS, 2023, verified above).
- Crypto assets were declared a financial product under FAIS on 19 Oct 2022. Anyone giving
  *intermediary services or advice* on crypto (including custody, "administration, safe custody, trading
  on behalf of a client") must be FSCA-licensed.

**SARB/FSCA Joint Communication on crypto assets for domestic payments (signed around 21 May 2026, reported 28–29 May 2026).**
https://www.resbank.co.za/content/dam/sarb/what-we-do/payments-and-settlements/regulation-oversight-and-supervision/designation-notices/280526%20Joint%20Communication_Crypto%20assets%20for%20domestic%20payment%20purposes.pdf
- Crypto assets, *including stablecoins*, "are neither money as defined in the NPS Act nor funds and
  are therefore not legal tender". For now they are outside the NPS Act.
- SARB is "unlikely to consider foreign currency-pegged stablecoins as payment instruments for
  domestic transactions" (dollarisation risk). It is open to testing **rand-pegged stablecoins** in the
  IFWG sandbox. Unbacked crypto is "not well-suited" as a store of value.
- Intermediaries facilitating crypto payment-type activity need FAIS licensing. Purely peer-to-peer
  transactions on decentralised protocols need no FSP authorisation ("equivalent to... transacting in
  cash").
- **Implications for holding stokvel savings on XRPL:**
  1. Holding a *USD* stablecoin (e.g. RLUSD) as the stokvel's savings runs against SARB's stated
     dollarisation concern and carries FX exposure for members saving in rand. Holding XRP means
     price volatility, which SARB flags directly. The safest framing is "XRPL as the control and audit
     layer"; the value instrument is rand (a ZAR stablecoin, which is still a sandbox question), or rand in a
     bank with the ledger as the mandate and audit trail.
  2. If Gcina (or the agent) holds keys or moves funds, that is "safe custody / administration" of a crypto
     asset, so FSP licensing is needed. A design where the members' multi-sign quorum holds the keys
     and Gcina never signs alone keeps us closer to the non-custodial, peer-to-peer reading. That is an
     argument to put to a lawyer, not a conclusion.
  3. Exchange control and FIC (FICA) on-/off-ramps: the members must use a licensed CASP to convert
     rand. **Not researched in depth here**; see 04-regulation-and-rails.md.
- FIC relevance: CASPs are accountable institutions under FICA (from the 2022 amendments to Schedule 1).
  **Not re-verified in this pass.** Stokvels themselves are not accountable institutions (not verified).

---

## 5. For the stage

### Three headline stats, ranked by credibility
1. **"About 1 in 4 South African adults (23%) belonged to a stokvel, in a survey of 3 750 people."**
   African Response 2014, via The Herald: https://www.theherald.co.za/amp/business/2014-05-15-sa-stokvels-worth-around-r25-billion/
   (sampled survey, verified; but 12 years old).
2. **"NASASA, the national stokvel body, estimates 11 million South Africans save about R50 billion a year
   through 800 000 stokvels."** Ipsos 2024 citing NASASA: https://www.ipsos.com/en-za/stokvels-remain-untapped-human-banks-south-africa ;
   NASASA chair 2025: https://www.ewn.co.za/more-than-11-million-south-africans-are-members-of-stokvels-nasasa
   (widely used, but a self-reported industry estimate with no published method; say "estimates").
3. **"In March 2025 two signatories on a North West stokvel's bank account were charged with fraud over
   R600 000 withdrawn without the other members knowing."** Citizen: https://www.citizen.co.za/news/south-africa/crime/r600k-disappears-from-stokvels-bank-account
   (police-sourced case, verified; one case, not a rate).
   *Alternative #3 for "why now":* "Five days ago, armed men robbed 16 Limpopo stokvel members of
   R30 000 at their year-end meeting." https://www.timeslive.co.za/news/south-africa/2026-11-09-stokvel-group-robbed-at-gunpoint-during-year-end-gathering/

### 30-second problem statement
> Around eleven million South Africans save together in stokvels, roughly R50 billion a year by
> the national association's estimate, and it all runs on trust in one person: the treasurer. When
> that trust breaks, there is no safety net. Last year in the North West, two signatories on a
> stokvel's account were charged over R600 000 that left without the members knowing. Every
> December, police beg stokvels to stop carrying cash, and this week armed men robbed a Limpopo group at its
> year-end meeting. Banks ask every signatory for paperwork, and still can't stop two of them from emptying
> the account. Gcina keeps the books like a tireless treasurer, but the money can only move when
> the committee agrees, and only in line with the stokvel's own constitution.

---

## Gaps / not found
- No prevalence statistic for theft or mismanagement in stokvels.
- No BDO stokvel study. No 2024/25 OMSIM stokvel membership figure verified. FinScope does not
  break out stokvels in the 2015 brochure. FinScope 2024 not checked.
- The 2011 African Response figures (811 830 / 11.4 m / R44 bn) are unverified (IOL 403).
- No survey quantifying "low or no interest" or "members can't see the balance" as reasons.
- Whether Banks Act Notice 1176 (as amended 2012/2014) is still the current instrument under the
  Prudential Authority: not confirmed.
