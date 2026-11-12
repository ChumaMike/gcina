# Gcina — shared contracts (every tab reads this first)

*Gcina* (isiZulu/isiXhosa: "keep, protect"). **The agent pays. The ledger keeps.**

An accounts-payable agent for South African small businesses. It reads supplier invoices, matches them
to orders and pays suppliers on the XRP Ledger, inside limits the agent cannot change and cannot
get around, even if it is fooled by a fake "new banking details" invoice.

Hackathon: W3Node Node Engine 2026, **Agentic Finance track (Ripple)**. Final submission is
**Fri 13 Nov 23:59 SAST** (public repo + README + demo video ≤ 3 min). Internal target:
**everything working on XRPL Testnet by Thu 12 Nov 23:00.**

Track MVP (all three are mandatory, so every tab protects them):
1. At least one XRPL Testnet transaction executed **autonomously by the agent**.
2. Limits enforced **somewhere the agent doesn't control**: ours are on-ledger multi-sign quorum + an independent policy co-signer service.
3. A **human operator sets/changes limits outside the agent**: the web dashboard → policy service, with an operator token the agent never has.

Rubric (90): Product 30 · Technical 30 (deployed on testnet = top band) · Business 30 (African problem, named customer, GTM).
Rule: **new code only**. Nothing copied from Skhokho or any earlier project.

---

## 1. Repo layout and ownership (a tab edits only its own folders)

| Path | Owner tab | What |
|---|---|---|
| `ledger/` | L — Ledger & Policy | xrpl.js helpers + testnet setup scripts |
| `policy/` | L — Ledger & Policy | Policy co-signer HTTP service (Hono, port **8787**) |
| `agent/` | A — Agent | The AP agent (Node + Claude API), CLI/worker |
| `web/` | W — Web & Deploy | Next.js operator dashboard (port **3000**) |
| `docs/research/` | R — Research | evidence, customer, competitors, regulation |
| `docs/pitch/`, `README.md` | P — Pitch & Demo | pitch, video script, final README |
| `CONTRACTS.md`, `docs/tabs/`, `docs/status.md` | Coordinator | contracts and status |

Each folder is its **own npm package with its own `node_modules`** (no workspace, so tabs never race on installs).
Use **pnpm**. TypeScript everywhere, run with `tsx`. Node 24.
Commit **only your own paths**: `git add <your-folder>` then `git commit`. If `index.lock` exists, wait 5 s and retry; never delete it.
Branch: work on `main` (disjoint folders). **Never push**; the coordinator pushes when Chuma says so.
To change this file, ask the coordinator in `docs/status.md` (append a line under "Contract change requests").

## 2. XRPL setup (testnet only, never mainnet)

- Network: `wss://s.altnet.rippletest.net:51233`; explorer `https://testnet.xrpl.org/transactions/<hash>`.
- Accounts are created by `ledger/scripts/setup-testnet.ts` through the faucet (`client.fundWallet()`):

| Name | Role |
|---|---|
| `TREASURY` | Business main account (operator). Funds the agent account's float. |
| `AGENT_ACCOUNT` | The account the agent pays from. **Master key disabled.** SignerList quorum **2**: `AGENT_SIGNER` weight 1, `POLICY_SIGNER` weight 1, `OPERATOR_SIGNER` weight 2 (offline recovery / override only). |
| `AGENT_SIGNER` | Key held by the agent process only. |
| `POLICY_SIGNER` | Key held by the policy service only. |
| `OPERATOR_SIGNER` | Human recovery key. Never loaded by agent or policy. |
| `SUPPLIER_A` "Mzansi Meat Supplies", `SUPPLIER_B` "Khaya Packaging" | Legit suppliers (approved). |
| `FRAUDSTER` | The "new banking details" address. Never approved. |

So: **agent alone = weight 1 < quorum 2, and the ledger itself rejects it.** Only agent + policy co-sign, or a human, can move money.
- The script writes seeds into gitignored env files: `agent/.env` gets `AGENT_SIGNER_SEED`; `policy/.env` gets `POLICY_SIGNER_SEED`; `ledger/.env.testnet` gets all of them. **Public addresses only** go into `docs/addresses.md` (committed).
- Currency: **RLUSD is the payment currency** (Ripple's judges explicitly score "meaningful use of the XRP Ledger **and RLUSD**"). Suppliers are paid in RLUSD, and XRP only pays network fees and reserves.
  - L sets RLUSD trustlines on AGENT_ACCOUNT, TREASURY, SUPPLIER_A, SUPPLIER_B and FRAUDSTER, and funds TREASURY → AGENT_ACCOUNT with testnet RLUSD. Get the **testnet RLUSD issuer address** from docs.ripple.com/products/stablecoin and the tryrlusd.com faucet; if the faucet needs a human or a captcha, ask Chuma in chat to do that step.
  - **Fallback (decide by 18:00 at the latest):** if testnet RLUSD isn't obtainable, pay in XRP, keep the code currency-agnostic, and tell C. The API uses `amount: { currency: "RLUSD" | "XRP", value: string }`. RLUSD values are decimal strings (IOU, never floats in maths; use integer cents internally), XRP values are drops.
  - The UI shows `$ 20.00 RLUSD` plus an indicative ZAR value at a fixed demo rate `ZAR_PER_USD=18` (labelled "indicative"), formatted `R 360.00`. In the contract types below, read `amountDrops: Drops` as `amount: Amount` where `type Amount = { currency: "RLUSD" | "XRP"; value: string }`.
- Every payment gets a Memo `{"invoiceId": "...", "app": "gcina"}` (hex-encoded).

## 3. Policy service API (`policy/`, base `http://localhost:8787`, deployed later on Vercel)

Auth: `Authorization: Bearer <token>`. Two tokens, from env: `OPERATOR_TOKEN` (dashboard) and `AGENT_TOKEN` (agent).
**The agent token can never change policy, suppliers or approvals** (return 403).

Types (copy these exact shapes into your package as `types.ts`, and don't import across folders):

```ts
type Drops = string;                                   // integer string
type Policy = { perPaymentMaxDrops: Drops; dailyMaxDrops: Drops; requireHumanAboveDrops: Drops; paused: boolean; updatedAt: string; updatedBy: string };
type Supplier = { id: string; name: string; xrplAddress: string; status: "approved" | "pending" | "blocked"; createdAt: string };
type Invoice = { id: string; supplierName: string; rawText: string; receivedAt: string; status: "new" | "processing" | "paid" | "held" | "rejected"; poNumber?: string };
type PurchaseOrder = { poNumber: string; supplierId: string; amountDrops: Drops; description: string; status: "open" | "paid" };
type Proposal = { invoiceId: string; supplierId: string | null; destination: string; amountDrops: Drops; reasoning: string; agentSignedTxBlob: string; approvalId?: string };
type Decision = { proposalId: string; decision: "cosigned_submitted" | "held_for_human" | "rejected"; reasons: string[]; txHash?: string; ledgerResult?: string; explorerUrl?: string };
type Approval = { id: string; proposalId: string; invoiceId: string; amountDrops: Drops; destination: string; reasons: string[]; status: "pending" | "approved" | "rejected"; decidedBy?: string; decidedAt?: string };
type AuditEvent = { id: string; at: string; actor: "agent" | "policy" | "operator" | "ledger"; kind: string; message: string; data?: unknown; txHash?: string };
```

| Method & path | Who | Does |
|---|---|---|
| `GET /health` | anyone | `{ ok, network, agentAccount }` |
| `GET /policy` · `PUT /policy` | operator | read / change limits (audit-logged) |
| `GET /suppliers` · `POST /suppliers` · `PATCH /suppliers/:id` | operator (GET also agent) | supplier register; approval of an address is a human act |
| `GET /purchase-orders` · `POST /purchase-orders` | GET operator+agent, POST operator | open POs the agent matches against |
| `POST /invoices` | operator | "an invoice arrived" (the demo button drops a fixture in) |
| `GET /invoices?status=new` · `PATCH /invoices/:id` | agent | agent picks up work, marks `processing` |
| `POST /proposals` | agent | agent submits a **half-signed** payment → returns `Decision` |
| `GET /approvals` · `POST /approvals/:id/approve` · `POST /approvals/:id/reject` | operator | human queue |
| `GET /approvals?status=approved` | agent | approved items the agent re-proposes with `approvalId` |
| `GET /audit` | operator | newest first |
| `GET /balances` | operator | XRP balances of TREASURY / AGENT_ACCOUNT |

### Co-sign rules (policy service, in this order; every failure gets a human-readable reason)
1. `paused` → reject.
2. Decode `agentSignedTxBlob`: must be `Payment`, `Account == AGENT_ACCOUNT`, `Destination == proposal.destination`, `Amount == proposal.amountDrops`, carries the invoice memo. Any mismatch → **reject** ("signed transaction doesn't match proposal").
3. Destination must belong to a supplier with `status: "approved"`. Unknown or changed address → **held_for_human** (reason: "Destination is not the registered address for <supplier>. Possible changed-banking-details fraud.").
4. Amount ≤ `perPaymentMaxDrops`, and today's (SAST) total + amount ≤ `dailyMaxDrops`, else held_for_human.
5. Amount > `requireHumanAboveDrops` → held_for_human.
6. Duplicate invoice already paid → reject.
7. If `approvalId` is present and approved by a human, rules 3–5 are waived for that exact destination + amount.
8. Otherwise the policy co-signs (`wallet.sign(tx, true)`), combines with `multisign()`, submits, waits for validation, records `txHash` + result, marks the invoice `paid`.

Held tx blobs expire (LastLedgerSequence). On approval, the **agent re-signs a fresh tx** with `approvalId`; the policy never stores the agent's key.

## 4. Agent loop (`agent/`)
Poll `GET /invoices?status=new` every 5 s (or run `pnpm agent once`) → Claude extracts structured fields (supplier, amount, PO, banking/XRPL details, "changed details" language) → match PO + supplier register → decide → build Payment with `client.autofill(tx, 2)` (2 signers) → sign with `AGENT_SIGNER` (`multisign=true`) → `POST /proposals` → log the Decision. Also poll approved approvals and re-propose.
**Demo switch:** `AGENT_MODE=compromised` makes the agent obey the fraudulent invoice and try to pay the FRAUDSTER. It must then show: the policy refuses, **and** a direct submit with only the agent's signature fails on the ledger (`tefBAD_QUORUM`, or the equivalent the ledger returns), with the result recorded in audit.

## 5. Demo fixtures (owned by A, in `agent/fixtures/`)
1. `inv-001` Mzansi Meat Supplies, matches PO-1001, under limits → **paid autonomously** ✅
2. `inv-002` "Mzansi Meat Supplies: URGENT, our banking details have changed", same amount, FRAUDSTER address → **held / blocked** 🛑
3. `inv-003` Khaya Packaging, above `requireHumanAboveDrops` → **held → human approves → paid** 👤
4. `inv-004` duplicate of inv-001 → **rejected**

Default demo policy: perPayment 50 RLUSD, daily 120 RLUSD, requireHumanAbove 30 RLUSD. PO-1001 = 20 RLUSD, PO-1002 = 45 RLUSD (same numbers in XRP if we fall back).

## 7. Scoring map: every rubric point has an owner (source: the event page rubric + guide)
| Rubric point | What earns the top band (27–30) | Owner |
|---|---|---|
| **Product 30** | "Polished, intuitive interface needing no explanation, seamless flows, production-ready experience", accessible | W |
| **Technical 30** | "Production-ready code, clean architecture, **fully deployed on testnet**, no critical bugs" | L, A, W |
| **Business 30** | "Critical, well-defined **African** problem, solution tailored to local context, **validated users**, strong commercial potential", GTM, "**integration with local infrastructure**" (ZAR rails: VALR / Yellow Card / Chipper RLUSD, bank-verified supplier onboarding) | R, P |
| **Ripple sponsor lens** | "Meaningful use of the XRP Ledger **and RLUSD**" (multi-sign quorum, master-key disable, RLUSD payments, memos; Credentials / x402 if time) | L, A |
| Track MVP ×3 | autonomous testnet tx · limits the agent can't control · human sets limits | L, A, W |
| Submission | title + **public repo with README** + demo video ≤ 3 min (YouTube/Drive, anyone with link) by Fri 23:59 | P, C |
| Stage | 5-min pitch + 3-min Q&A, live demo, intro < 20 s, 2–3 slides × 4 bullets, video as backup, ≥ 1 member at Park View | P, Chuma |
| Rules | New work only (disclose any open-source/AI help in README); **never commit keys or seeds**; testnet accounts only; Node Engine only (can't be submitted to another hackathon) | everyone |

## 6. Milestones (SAST, Thu 12 Nov)
- **16:45**: L: testnet accounts + SignerList live, `docs/addresses.md` committed. W: dashboard scaffold running against mocks. A: fixtures + Claude extraction working offline. R: evidence pack v1 by 18:30.
- **18:30**: L: policy service running locally with all endpoints + rules. A: agent drives inv-001 through a mock or the real policy.
- **20:30**: ✅ first autonomous testnet payment hash + 🛑 blocked fraud attempt recorded in `docs/demo-evidence.md`.
- **22:00**: W: dashboard on the real policy API; policy + web deployed to Vercel (account **sgdataint**, never Chuma-SG).
- **23:00**: full run of all 4 fixtures on testnet from the deployed dashboard; hashes in `docs/demo-evidence.md`.

Status: append one line to `docs/status.md` at every milestone: `HH:MM [TAB] done / next / blocked-by`.

## 8. Accepted XRPL corrections (from R's fact-check, 16:08; details in docs/research/05-xrpl-fit.md)
- **C1** Names: agent-only multi-sign → `tefBAD_QUORUM`; agent single-sign → `tefBAD_AUTH`; master key → `tefMASTER_DISABLED`.
- **C2** `tef*` results never reach a ledger, so there's no explorer page and no fee. Omit `explorerUrl` for tef/tem/tel; store the raw submit response (`engine_result`, `applied:false`) in audit. The on-chain proof is the SignerList account page + validated 2-signer payments.
- **C3** For the agent-only attempt use `client.submit`, never `submitAndWait` (it hangs on tef).
- **C4** Policy rule 2 also rejects: `Fee` > 1000 drops; any `SendMax` / `Paths` / `DeliverMin`; `Flags` ≠ 0 (especially `tfPartialPayment` 0x00020000); a missing or far-off `LastLedgerSequence`. The RLUSD Amount must be exactly `{currency:"524C555344000000000000000000000000000000", issuer:<testnet RLUSD issuer>, value}`. Read `delivered_amount` from meta, never `Amount`.
- **C5** "TransactionType must be Payment" is the **first** check, with a test (agent + policy together = quorum for SignerListSet / SetRegularKey).
- **C9** Policy signs the agent's **exact** tx with `Signers` stripped; it never re-autofills. `multisign()` needs identical Fee/Sequence/LastLedgerSequence.
- **C10** Autofill right before signing; process invoices **one at a time** (parallel autofill → same Sequence → `tefPAST_SEQ`). A stale blob = re-propose, not fraud.
- **C14** The duplicate check runs right after rule 2.
- **C12** Faucet gives 100 XRP/call, used for fees and reserves only.

## 9. Named customer = MTA (Meyiswa Training Academy), decided by Chuma 16:10
- MTA is a Soweto-based skills-training provider that pays suppliers (venues, catering, printing, transport) and learner stipends for corporate-funded programmes. The money moves from funders → MTA → many small payees, exactly where changed-banking-details fraud bites.
- **Disclosure (always):** MTA is run by Chuma's brother, so it's a connected **design partner**, not independent validation. Say so on stage if asked. Gumede (Kota~tainment) stays the secondary design partner.
- **Privacy:** never put learner names, IDs, bank details or funder contract values in the repo, slides or video. Use invented demo suppliers only (Mzansi Meat → keep for the demo, or rename to an MTA-style supplier such as a catering or venue company; P + A decide together, and A owns fixtures).
