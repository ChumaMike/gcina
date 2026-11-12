# Gcina policy co-signer

The agent can't spend from its own account: on XRPL Testnet, `AGENT_ACCOUNT` has its master key disabled and a SignerList with **quorum 2**
(agent 1 · policy 1 · operator 2). This service holds the **policy** key. It co-signs an agent payment only if the payment stays inside
the limits a person set. Otherwise it holds the payment for a person to decide, or refuses it.

```
pnpm install
pnpm start          # http://localhost:8787   (pnpm dev = watch mode)
pnpm test           # node --test, 39 cases: every rule passes + fails, auth, money, SAST day
```

Env (`policy/.env`, written by `ledger: pnpm setup-testnet`, gitignored): `POLICY_SIGNER_SEED`, `OPERATOR_TOKEN`, `AGENT_TOKEN`,
`AGENT_ACCOUNT_ADDRESS`, `AGENT_SIGNER_ADDRESS`, `TREASURY_ADDRESS`, `SUPPLIER_A_ADDRESS`, `SUPPLIER_B_ADDRESS`, `PAYMENT_CURRENCY` (`RLUSD` | `XRP`),
`RLUSD_ISSUER`, `XRPL_WSS`, `PORT`. Optional: `WEB_ORIGIN` (comma list, CORS), `STORE_PATH`, `MAX_FEE_DROPS` (1000), `MAX_LEDGER_WINDOW` (40).
The process **refuses to start** if `AGENT_SIGNER_SEED`, `OPERATOR_SIGNER_SEED` or `AGENT_ACCOUNT_SEED` is in its environment.

## Money
`Amount = { currency: "RLUSD" | "XRP", value: string }`. RLUSD values are decimals with at most 2 places (`"20.00"`) and the maths runs on integer cents.
XRP values are drops (`"20000000"`). There are no floats anywhere. Limits are set in `PAYMENT_CURRENCY`, and a payment in the other currency is held.

## Co-sign rules (in order; every outcome has a reason a person can read)
1. Paused → **rejected**. An invoice that isn't on record → **rejected**.
2. The signed blob must be exactly the proposal: a `Payment` from `AGENT_ACCOUNT` to `destination` for `amount` (cents-exact, the expected RLUSD issuer), with the invoice memo, `Flags` 0 (no partial payments), no `SendMax`/`DeliverMin`/`Paths`, a fee ≤ 1000 drops and a `LastLedgerSequence` within 40 ledgers. It must carry exactly one valid multi-sign signature, the agent's. Otherwise → **rejected** ("The signed transaction doesn't match the proposal: …").
6. *(moved up per C14)* Already-paid invoice id, already-paid PO, or identical invoice text → **rejected** as a duplicate.
7. `approvalId` given → it must be approved, unused, and for the same invoice, destination and amount. Then rules 3–5 are waived and the payment is co-signed. A bad approval → **rejected**.
3. Destination isn't the approved, registered address of that supplier → **held** ("Possible changed-banking-details fraud.").
4. Above the per-payment max, or today's (SAST) total would pass the daily max → **held**.
5. Above `requireHumanAbove` → **held**. (Rules 3–5 collect every reason that applies.)
8. Otherwise the policy signs the agent's **exact** tx (Signers stripped, never re-autofilled), runs `multisign()`, submits, waits for validation, then marks the invoice and PO paid.

When a payment is held, an `Approval` is queued and the invoice goes to `held`. Once a person approves it, the agent re-signs a **fresh** tx with the `approvalId`, because held blobs expire.
If the ledger refuses a co-signed tx (for example `tecPATH_DRY`), the decision is `rejected` with the `ledgerResult` attached, and nothing is marked paid.
`explorerUrl` is only set for validated transactions. `tef*` results never reach a ledger, so they have no explorer page.

## Routes (curl)
```bash
U=http://localhost:8787
OP="Authorization: Bearer $OPERATOR_TOKEN"   # dashboard
AG="Authorization: Bearer $AGENT_TOKEN"      # agent
J="Content-Type: application/json"

curl $U/health                                                     # public: { ok, network, agentAccount, currency }

curl -H "$OP" $U/policy                                            # operator (agent may read)
curl -X PUT -H "$OP" -H "$J" $U/policy -d '{"perPaymentMax":{"currency":"RLUSD","value":"50.00"},"dailyMax":{"currency":"RLUSD","value":"120.00"},"requireHumanAbove":{"currency":"RLUSD","value":"30.00"},"paused":false,"updatedBy":"Chuma"}'

curl -H "$AG" $U/suppliers                                         # operator + agent
curl -X POST -H "$OP" -H "$J" $U/suppliers -d '{"name":"New Supplier","xrplAddress":"r...","status":"pending"}'
curl -X PATCH -H "$OP" -H "$J" $U/suppliers/sup-a -d '{"status":"approved"}'   # changing xrplAddress resets to pending

curl -H "$AG" $U/purchase-orders                                   # operator + agent
curl -X POST -H "$OP" -H "$J" $U/purchase-orders -d '{"poNumber":"PO-1003","supplierId":"sup-a","amount":{"currency":"RLUSD","value":"12.50"},"description":"Chicken"}'

curl -X POST -H "$OP" -H "$J" $U/invoices -d '{"id":"inv-001","supplierName":"Mzansi Meat Supplies","rawText":"...","poNumber":"PO-1001"}'
curl -H "$AG" "$U/invoices?status=new"                             # operator + agent
curl -X PATCH -H "$AG" -H "$J" $U/invoices/inv-001 -d '{"status":"processing","poNumber":"PO-1001"}'  # agent: new|processing|rejected only

curl -X POST -H "$AG" -H "$J" $U/proposals -d '{"invoiceId":"inv-001","supplierId":"sup-a","destination":"r...","amount":{"currency":"RLUSD","value":"20.00"},"reasoning":"Matches PO-1001","agentSignedTxBlob":"12000..."}'
#   → Decision { proposalId, decision: cosigned_submitted|held_for_human|rejected, reasons[], txHash?, ledgerResult?, explorerUrl? }
curl -H "$OP" $U/proposals                                         # operator: history, newest first

curl -H "$OP" "$U/approvals?status=pending"                        # operator: human queue
curl -X POST -H "$OP" -H "$J" $U/approvals/apr-123/approve -d '{"decidedBy":"Chuma"}'
curl -X POST -H "$OP" -H "$J" $U/approvals/apr-123/reject  -d '{"decidedBy":"Chuma"}'
curl -H "$AG" "$U/approvals?status=approved"                       # agent: approved + not yet used → re-propose with approvalId

curl -H "$OP" "$U/audit?limit=50"                                  # operator: newest first
curl -H "$OP" $U/balances                                          # { TREASURY:{address,xrp,rlusd}, AGENT_ACCOUNT:{...}, currency }  (xrp in XRP, not drops)
curl -X POST -H "$OP" $U/admin/reset                               # demo reset: seed data back, ledger history untouched
```
Without a token you get 401. The agent token gets **403** on every operator route (policy, suppliers, POs, invoices POST, approvals, audit, balances, reset).

## How the agent signs (see `ledger/scripts/smoke-policy.ts`, a working stand-in agent)
```ts
const tx = await client.autofill({ TransactionType: "Payment", Account: AGENT_ACCOUNT, Destination, Amount, Flags: 0, Memos: [memo] }, 2); // 2 signers
const { tx_blob } = agentSignerWallet.sign(tx, true);   // multisign = true
// POST /proposals with agentSignedTxBlob: tx_blob. Autofill right before signing (LastLedgerSequence ≈ 60–100 s), one invoice at a time.
```
RLUSD `Amount` on the ledger is `{ currency: "524C555344000000000000000000000000000000", issuer: RLUSD_ISSUER, value: "20.00" }`.
