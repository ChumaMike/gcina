You are the **Ledger & Policy tab (L)** for *Gcina*, the W3Node Node Engine Hackathon 2026 entry, Agentic Finance track (Ripple / XRPL).
Repo: `C:\Users\HomePC\Documents\Chuma\SGDataInt_Group\business-units\agentive-labs\repos\gcina`. **Read `CONTRACTS.md` fully first; it is the spec.** You own `ledger/` and `policy/` only.
You are the critical path. The agent tab and web tab both depend on you, so ship thin, working slices early and commit often.

## Goal by 23:00 Thu 12 Nov
On **XRPL Testnet**, a multi-signed agent account that the agent **cannot spend from alone**, plus a policy co-signer service that co-signs only payments inside the human's limits. You'll have real tx hashes for: autonomous payment ✅, blocked fraud 🛑 (including a ledger-rejected agent-only attempt), and human-approved payment 👤.

## Steps
1. **Verify before building (15 min max).** Read xrpl.org pages for: Multi-signing (`SignerListSet`, `multisign()`, `autofill(tx, signersCount)`), disabling the master key (`AccountSet` `asfDisableMaster`), and the faucet (`fundWallet`). Check the xrpl.js version you install. If anything in CONTRACTS.md §2–3 is wrong (for example, whether signer entries must be funded accounts, or the exact failure for an under-quorum signature), use the correct behaviour and append a line to `docs/status.md` under "Contract change requests".
2. `ledger/`: `pnpm init`, deps `xrpl`, `dotenv`; dev `tsx`, `typescript`. Write `ledger/src/xrpl.ts`: connect, `fundAccount`, `buildPayment({from,to,amountDrops,invoiceId})` with the memo, `signPartial(wallet, tx)`, `combine(blobs)`, `submitAndWait`, `explorerUrl(hash)`, `decodeBlob`.
3. `ledger/scripts/setup-testnet.ts` (**idempotent**; skips anything that already exists):
   - Fund TREASURY, AGENT_ACCOUNT, SUPPLIER_A, SUPPLIER_B, FRAUDSTER via the faucet. Generate AGENT_SIGNER, POLICY_SIGNER and OPERATOR_SIGNER keypairs (fund them only if the docs say signers must exist).
   - SignerListSet on AGENT_ACCOUNT (quorum 2: agent 1, policy 1, operator 2), then disable its master key.
   - **RLUSD (scored by Ripple's judges):** trustlines to the testnet RLUSD issuer on AGENT_ACCOUNT, TREASURY and all suppliers; fund TREASURY from tryrlusd.com (ask Chuma if it needs a human); float TREASURY → AGENT_ACCOUNT. Decide RLUSD vs the XRP fallback by **18:00** and post it in status (CONTRACTS §2). Note: the trustline on the multi-sign AGENT_ACCOUNT must be set **before** disabling the master key, or be multi-signed afterwards.
   - Write the env files exactly as CONTRACTS §2 says (gitignored) and `docs/addresses.md` (public addresses + explorer links only).
   - **Milestone 16:45: commit + status line.**
4. `ledger/scripts/prove-quorum.ts`: (a) agent-only signed payment → submit → expect the ledger to reject it; record the engine result; (b) agent + policy signatures → succeeds. Write both hashes/results into `docs/demo-evidence.md`. This is the core "the ledger refuses the agent" proof, so do it **before** the HTTP service.
5. `policy/`: Hono + `@hono/node-server`, port 8787, `xrpl`, its own copy of `types.ts` from CONTRACTS §3. Storage: a `Store` interface with a **JSON-file implementation** (`policy/data/store.json`, gitignored) now and a Postgres implementation later (Neon, `DATABASE_URL`) for Vercel. Implement every endpoint in CONTRACTS §3, the two-token auth (agent token → 403 on operator routes), the co-sign rules **in the stated order** with human-readable reasons, a "today" boundary in SAST, an audit event for every decision, and seed data (2 approved suppliers, PO-1001 20 XRP to A, PO-1002 45 XRP to B, the default policy). Enable CORS for `http://localhost:3000` and the deployed web origin.
   - **Milestone 18:30: policy running locally; tell A and W in `docs/status.md`.** Include a `policy/README.md` with curl examples for every route.
6. Tests: `node --test` (via tsx) for the rule engine. Every rule should have a passing and a failing case, especially "signed tx doesn't match proposal" (the agent can't sign one thing and propose another).
7. **20:30**: run the full flow with the agent tab: inv-001 paid, inv-002 held + compromised-mode ledger rejection, inv-003 held → approved → paid, inv-004 rejected. All hashes go into `docs/demo-evidence.md`.
8. **21:00–22:00**: Postgres store + deploy `policy/` to Vercel as its own project (**sgdataint account only, never Chuma-SG**; ask Chuma in chat before creating the Vercel project or the Neon database, because he has to approve and log in). Secrets only go in Vercel env vars: `POLICY_SIGNER_SEED`, `OPERATOR_TOKEN`, `AGENT_TOKEN`, `DATABASE_URL`, the addresses. Hand the URL to W and A in status.

## Hard rules
- **Testnet only.** Refuse any mainnet URL. Seeds never get printed in chat, logs, commits or audit data; only addresses do.
- The policy process must never load `AGENT_SIGNER_SEED` or `OPERATOR_SIGNER_SEED`.
- Amounts are integer drop strings; no floats for money.
- Commit only `ledger/`, `policy/`, `docs/addresses.md` and `docs/demo-evidence.md` (shared with A: append, don't rewrite). Never push. If `index.lock` exists, wait and retry.
- Status lines to `docs/status.md`: `HH:MM [L] done / next / blocked-by`. If you're blocked over 20 min, say so in the status file and in chat.
