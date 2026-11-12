# Gcina: the guide

*Plain-English notes on what the hackathon is, what we're building, why, and how it all fits. Read this before the pitch.*

---

## 1. The hackathon

**Node Engine Hackathon 2026**, run by **W3Node** (Saint Rock Media) alongside the W3Node Conference.
- Built virtually 2–11 Nov, then in person at **Park View, 5 Armadale St, Woodstock, Cape Town**, 12–14 Nov.
- Theme: *"Build what moves Africa's money"*: payments, stablecoins, AI agents that move money, real-world assets.
- Up to **$10K** in prizes, 4 tracks, teams of 1–4. Percy Maphologela (W3Node) confirmed we can still submit and be judged.

**Our track: Agentic Finance, sponsored by Ripple.**
- Prize: **$2,500 + a fast track into Ripple's UDAX Cape Town accelerator** (run with UCT).
- The challenge, in Ripple's words: *"Would your CFO sign off? Build a working product where an AI agent moves money on behalf of a business and the XRP Ledger enforces the rules it plays by."*
- The MVP **must** have:
  1. At least one XRPL Testnet transaction the agent made **on its own**.
  2. Limits enforced **somewhere the agent doesn't control**.
  3. A way for a **human to set or change the limits**, outside the agent.

**Key dates**
| When | What |
|---|---|
| **Fri 13 Nov, 23:59 SAST** | Submit on BuilderBase: title + **public GitHub repo with README** + **demo video ≤ 3 min** |
| **Sat 14 Nov** | Pitch at Park View: **5 min + 3 min Q&A**, live demo. At least one of us must be there |

**How we're scored (90 points)**
| | Points | What gets top marks |
|---|---|---|
| Product | 30 | Polished, needs no explanation, smooth flows, accessible |
| Technical | 30 | Clean code, **deployed on testnet**, no critical bugs |
| Business | 30 | A real **African** problem, real users, business model, go-to-market, works with local infrastructure |
| Ripple's lens | – | **Meaningful use of the XRP Ledger and RLUSD** |

**Rules to remember:** new work only (disclose open-source/AI help in the README), never commit keys or seed phrases, testnet only, and this project can't also be entered into another hackathon.

---

## 2. The problem

Small businesses pay many small payees: suppliers, contractors, learners. Two things go wrong:

1. **They pay the wrong person.** A fake *"our banking details have changed"* invoice or email redirects the money. South Africa's **Supreme Court of Appeal** has ruled (e.g. *Hawarden*, 2024, R5.5m; *Intengo Imoto*, 2025) that if you pay a hacked invoice, **you still owe the real supplier. You pay twice.** All four big banks warn customers about exactly this.
2. **They pay the same person twice.** First-hand: Chuma worked in admin at **MTA (Meyiswa Training Academy, Soweto)** from 2022 to 2024. Learners were paid from the facilitator's attendance register, approved by the owner, and **sometimes the same person got paid twice.**

AI agents can now do the paying. But nobody should hand an AI the bank account unless **something it can't control** stops it from going wrong.

**Honesty notes (never get caught out):**
- There's **no official SA total** for invoice fraud. The R2.4bn SABRIC figure is *all* digital banking crime. Never call it invoice fraud.
- MTA is Chuma's brother's business, so it's our **design partner**, not independent proof. Say so if asked.
- MTA's double payments are real. MTA never had a changed-banking-details fraud that we know of, so we don't claim one.

---

## 3. What Gcina is

*Gcina* = "keep, protect" (isiZulu/isiXhosa). **The agent pays. The ledger keeps.**

An **AI accounts-payable agent** for small businesses. It reads invoices, checks them against orders and approved suppliers, and pays them on the **XRP Ledger** in **RLUSD** (Ripple's US-dollar stablecoin). It works inside limits that **the agent can't change and can't get around**, even if it's tricked.

### How it works: two signatures

```
Invoice arrives
     │
     ▼
AI agent (Claude) ── reads, checks, decides ── signs 1 of 2 ──┐
                                                              ▼
                        Policy service ── your limits ── signs 2 of 2 (only if OK)
                                                              │
                                                              ▼
                     XRP Ledger ── needs BOTH signatures, or it refuses the payment
```

- The agent's XRPL account has its **master key switched off** and needs **2 signatures** (a "multi-sign quorum").
- **The agent holds 1 key.** If it's fooled or hacked and tries to pay alone, **the ledger itself rejects it** (`tefBAD_QUORUM`). We've proven this on testnet.
- **The policy service holds the other key.** It signs only if: the supplier's address is approved, the amount is under your limits, it's not a duplicate, and the transaction is exactly what the agent claimed.
- **The owner (you) holds a recovery key** and sets the limits on the dashboard with a password the agent never has.

### The 4 demo stories
| Invoice | What happens | What it shows |
|---|---|---|
| **inv-001** Mzansi Catering, matches the order | ✅ Paid on its own, live on testnet | The agent works autonomously |
| **inv-002** "Our banking details have changed, pay today" | 🛑 Held. Even a **compromised** agent that tries anyway gets rejected **by the ledger** | The money can't move |
| **inv-003** Khaya Print & Stationery, over the "ask me" limit | 👤 Held → owner approves on their phone → paid | Human in charge |
| **inv-004** The same payment submitted twice | ❌ Refused by the policy | MTA's real problem, fixed |

**Wording rule:** the *policy* refuses duplicates and over-limit payments; the *ledger* refuses the agent acting alone.

### The dashboard screens
Overview (balances, today's spend, live activity, **Pause agent**), Approvals (held payments), Limits (you set the rules), Suppliers (approved addresses), Invoices (demo buttons), How it works (the picture above).

---

## 4. Why XRPL and RLUSD

- **Multi-sign + master key disable are built into the ledger.** No smart contract to audit and no extra code to trust: the network enforces the rule.
- **RLUSD**: a regulated US-dollar stablecoin. Ripple launched it in Africa with VALR, Yellow Card and Chipper Cash (Sept 2025).
- Fast (3–5 s), cheap (fractions of a cent), and **memos** link every payment to its invoice for the audit trail.

**The production path, said honestly:** SA regulators (SARB/FSCA, May 2026) say US-dollar stablecoins are unlikely to be accepted for *domestic* payments. So in real life a **licensed SA crypto exchange (CASP)** settles: RLUSD for dollar invoices (imports), and rands at home. The demo is RLUSD on **testnet**.

---

## 5. The business

- **Who pays:** small businesses with many payees (training academies like MTA, restaurants, small wholesalers). The **channel is bookkeepers and accountants**, who run payments for many clients at once.
- **Price idea:** about **R149–R299 a month** per business. This is our estimate, anchored on Xero SA at R485–R857/month.
- **Rails partner:** a licensed SA exchange (VALR / Yellow Card) for RLUSD and rand settlement.
- **The ask:** Ripple's UDAX accelerator, to get from testnet to a licensed pilot with MTA.

---

## 6. How we're building it (the tabs)

| Tab | Job | Folder |
|---|---|---|
| **C** Coordinator | Decisions, status, contracts, GitHub, submission | `CONTRACTS.md`, `docs/status.md` |
| **R** Research | Evidence, competitors, regulation, verdict | `docs/research/` |
| **L** Ledger & Policy | Testnet accounts, multi-sign, the policy co-signer service | `ledger/`, `policy/` |
| **A** Agent | The AI that reads invoices and proposes payments | `agent/` |
| **W** Web | The owner's dashboard, deployed | `web/` |
| **P** Pitch | Story, 5-min script, video, 5 slides (3 on stage + 2 backup), README | `docs/pitch/`, `README.md` |

- **The spec everyone follows:** `CONTRACTS.md`.
- **Live progress:** `docs/status.md`.
- **Testnet proof:** `docs/demo-evidence.md` and `docs/addresses.md`.

---

## 7. What's left for Chuma
- [ ] Paste the Agent prompt into the Agent tab (it's on your clipboard).
- [ ] Claim testnet RLUSD at tryrlusd.com (steps in chat).
- [ ] Team names and roles, or "solo", for the README.
- [ ] Approve the Vercel (sgdataint account) and Neon setup when the tabs ask.
- [ ] Friday: record the demo video, rehearse the 5-minute pitch, and say "push + submit".
- [ ] Saturday: be at Park View with your laptop, video link and a hotspot.
- [ ] After Saturday: rotate the Anthropic key that was pasted in chat.
