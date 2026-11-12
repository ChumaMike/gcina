# Gcina: finish line (definition of done)

**Chuma's decision, 12 Nov: we are building Gcina. No pivot.** Stokvels and cross-border are roadmap lines only.
Every tab works down this list until every box is ticked. Order matters; the clock doesn't.

## What "finished" looks like (the demo, end to end, on XRPL Testnet)
1. The owner opens the **deployed** dashboard on a phone, enters the passcode, and sees balances in **RLUSD**.
2. Clicks **"inv-001 arrives"** → within seconds the feed shows the agent's reasoning ("Matches PO-1001, registered address, under your limit") → **Paid ✓** with an explorer link to a validated RLUSD payment.
3. Clicks **"inv-002 arrives"** (fake "our banking details changed") → the agent flags it → **Held**, shown as old vs new address in Approvals.
4. Runs the agent in **compromised mode** on the fake invoice → the policy refuses to co-sign **and** the agent's lone signature is rejected by the ledger: **`tefBAD_QUORUM`** appears in the feed (no explorer link, because no money moved).
5. Clicks **"inv-003 arrives"** (over the "ask me" limit) → Held → the owner approves on the phone → the agent re-signs → **Paid ✓**.
6. Clicks **"inv-004 arrives"** (the same payment again) → **Refused: "looks like a repeat of inv-001"** (the MTA story).
7. Changes a limit live on the Limits screen → the next payment obeys it.
8. The repo has a README a judge understands in 2 minutes, a ≤ 3-min demo video, and 5 slides (3 stage + 2 backup).

## Done list per tab
**L · Ledger & Policy**
- [ ] `buy-rlusd.ts`: XRP→RLUSD via the testnet AMM, about 250 RLUSD in TREASURY, float to AGENT_ACCOUNT; swap tx hash in demo-evidence.md (balances were still 0 at 17:41).
- [ ] Policy: duplicate rule = same invoice OR same payee + amount + reference; `approvedAt` + `COOLING_OFF_MINUTES` (0 in the demo); W's gaps (spentToday, operator GET /invoices, balances shape).
- [ ] Policy on Postgres + deployed to Vercel (sgdataint account; ask Chuma first). Hand the URL to A and W.

**A · Agent**
- [ ] Fix the security-review finding: never re-sign after a "could not be reached" result unless the policy confirms the first proposal was **not** submitted (no possible double pay).
- [ ] Live run of all 4 fixtures + the compromised beat **in RLUSD** against the running policy; hashes in demo-evidence.md.
- [ ] Runs against the **deployed** policy URL; `pnpm agent watch` is the demo command.

**W · Web**
- [ ] Live data (USE_MOCK off) against the policy; MTA supplier names.
- [ ] Changed-address approval: old vs new side by side + "I confirmed with the supplier on a number I already had" checkbox + confirm sheet.
- [ ] Feed "quiet when normal"; `tefBAD_QUORUM` shown clearly as "Ledger refused: agent alone".
- [ ] Deployed on Vercel (sgdataint); phone + desktop screenshots of every demo beat into docs/pitch/screens/.

**R · Research**
- [ ] Final verdict (00-verdict.md) on Gcina only; verify the Deloitte 54% or drop it; a final "never say" list.

**P · Pitch**
- [ ] Wording rule (accepted): "even if it's fooled or hacked, it **still can't pay on its own**". The ledger enforces the two-key rule; the policy enforces payees, limits and duplicates.
- [ ] README final with real tx links; 5 slides; 5-min script; video script; Q&A.
- [ ] The AMM line goes in only once L's swap hash is in demo-evidence.md.

**C · Coordinator**
- [ ] Secret scan → create the public GitHub repo → push (Chuma says when).
- [ ] Full rehearsal of the 8 steps above on the deployed stack; record the video with Chuma.

## Not doing (scope cut)
Stokvel pivot, cross-border build, Credentials/x402, Xero/Sage import, real ZAR off-ramp: these are **roadmap words only**.
