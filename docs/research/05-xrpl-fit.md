# 05: XRPL fit and fact-check of CONTRACTS.md sections 2–4

Checked 2026-11-12 against xrpl.org docs, rippled `develop` source, the **installed** xrpl.js
(`xrpl@5.3.0`, the version in `ledger/package.json`; current npm latest is also 5.3.0, so this is
not v4.x), and read-only RPC calls (`server_info`, `feature`) to testnet and mainnet public servers.
No transactions were sent.

Live values (server_info, 2026-11-12, rippled 3.4.1 on both networks):

| | Testnet | Mainnet |
|---|---|---|
| Base reserve | 1 XRP | 1 XRP |
| Owner reserve (per object) | 0.2 XRP | 0.2 XRP |
| Base fee | 10 drops (0.00001 XRP) | 10 drops |

---

## Corrections to CONTRACTS.md

## C0. RLUSD addendum (added 16:05 after the contract switched to RLUSD at 15:58)

The corrections below were checked against the XRP-drops version of the contract. With RLUSD (an issued token) as the payment currency:
- **Amount shape on the ledger:** `{ currency: "524C555344000000000000000000000000000000", issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV", value: "20" }` (testnet). "RLUSD" has 5 characters, so the ledger needs the 40-hex code; the plain string "RLUSD" is invalid. The API type `{currency:"RLUSD", value}` is ours; translate it at the ledger edge. Source: https://docs.ripple.com/products/stablecoin/developer-resources/rlusd-on-the-xrpl
- **Rule 2 must reject `tfPartialPayment` (0x00020000).** With a partial payment the ledger may deliver far less than `Amount`. That's the classic XRPL integration bug: https://xrpl.org/docs/concepts/payment-types/partial-payments. Also reject `SendMax`, `Paths` and `DeliverMin` (no cross-currency path that spends XRP or other assets). Check the issuer **and** currency code exactly, not just the value.
- **Record `meta.delivered_amount`**, not `Amount`, as what the supplier received (same partial-payments page).
- **Trust lines:** every receiving account needs an RLUSD trust line, or the payment fails `tecPATH_DRY`. The FRAUDSTER attempt fails earlier (`tefBAD_QUORUM`) whether or not it has one.
- C4's "Amount is a drop string" becomes "Amount is exactly the RLUSD object above"; the Fee cap stays. C12 (faucet 100 XRP) now only matters for fees and reserves; each trust line adds a 0.2 XRP owner reserve.
- **Honest pitch note:** RLUSD's issuer can freeze or claw back (it is a regulated stablecoin; R has not re-verified the clawback flag or the charter wording against a fetched source, so check before saying it on stage). That's normal for a stablecoin, and a judge may ask. Say "the issuer is regulated (NYDFS trust charter); our quorum controls *our* account, the issuer controls the token".


Severity key: **blocks demo** = teammates will hit an error or the demo claim is false ·
**wrong in pitch** = works, but what we'd say is inaccurate or a security hole a judge could find ·
**cosmetic** = wording.

### C1. Single-signed attempt with the agent key returns `tefBAD_AUTH`, and `tefBAD_QUORUM` only applies to the multi-signed blob
- **Contract (§4):** "a direct submit with only the agent's signature fails on the ledger (`tefBAD_QUORUM`, or the equivalent the ledger returns)".
- **Actually true:** it depends on *how* the agent signs.
  - Multi-sign form (`wallet.sign(tx, true)`, one `Signers` entry, weight 1 < quorum 2) gives **`tefBAD_QUORUM`**: "The transaction was multi-signed, but the total weights of all included signatures did not meet the quorum." This is the `weightSum < SignerQuorum` branch in rippled `Transactor::checkMultiSign`.
  - Single-sign form (`wallet.sign(tx)` with AGENT_SIGNER's key, `Account = AGENT_ACCOUNT`) gives **`tefBAD_AUTH`**. Current rippled `checkSingleSign` returns `tefBAD_AUTH` for "any other key". The docs also list `tefBAD_AUTH_MASTER` ("does not match the master key, but no regular key"), which older servers return. Accept either.
  - Signing with AGENT_ACCOUNT's own (disabled) master key gives **`tefMASTER_DISABLED`**.
  - Sources: https://xrpl.org/docs/references/protocol/transactions/transaction-results/tef-codes · https://github.com/XRPLF/rippled/blob/develop/src/libxrpl/tx/Transactor.cpp (`checkSingleSign`, `checkMultiSign`).
- **Fix:** in §4, say "submit the agent-only multi-sign blob, which returns `tefBAD_QUORUM`". Optionally also show the single-sign attempt (`tefBAD_AUTH`) as a second proof.
- **Severity:** cosmetic (the expected code is already right for the multi-sign blob), but name the exact code so the demo script matches.

### C2. A `tef` failure is never "recorded on the ledger": no ledger entry, no explorer page, no fee
- **Contract (§4/§5 demo plan):** the failed attempt "fails on the ledger … with the result recorded in audit". The pitch plan says it "is recorded" on-chain.
- **Actually true:** "Transactions with `tef` codes are not applied to ledgers and cannot cause any changes to the XRP Ledger state" (tef-codes page). "No transaction with any other result [than tes/tec] is included in a ledger" (https://xrpl.org/docs/concepts/transactions/finality-of-results). The transaction cost "is only debited … after a transaction is included in a validated ledger". A final failure that is not relayed costs nothing (https://xrpl.org/docs/concepts/transactions/transaction-cost). So the hash returned by `submit` will show **"not found" on testnet.xrpl.org**, the sequence number is not consumed, and no XRP is burnt.
- **Fix:**
  1. Contract wording: "rejected by the XRPL validators' signature check (`tefBAD_QUORUM`). The rejection is returned by the network at submit time and recorded in **our** audit log. It never reaches a ledger, so it has no explorer page and costs no fee."
  2. `Decision.explorerUrl` must be **omitted** for `tef/tem/tel` results. `ledger/src/xrpl.ts submitAndWait` currently builds an explorer URL for them, and that link 404s on stage.
  3. For the demo, log the raw `submit` response: `engine_result`, `engine_result_message`, `applied: false`, `tx_json.hash`. Show it in the dashboard. On-chain proof of the rule is the **SignerList itself** (account page shows quorum 2, master disabled) plus the successful co-signed payments showing two `Signers`.
- **Severity:** **wrong in pitch** (and a broken explorer link would **block the demo** if clicked live).

### C3. Do not use `client.submitAndWait` for the agent-only attempt
- **Actually true:** xrpl.js 5.3.0 `submitAndWait` throws only on `tem*`. For `tef*` it keeps polling until `LastLedgerSequence` passes (~20 ledgers, about 60–100 s), then throws "latest ledger sequence … is greater than LastLedgerSequence". Source: installed `xrpl/src/client/index.ts` and `src/sugar/submit.ts` (`waitForFinalTransactionOutcome`).
- **Fix:** use `client.submit(blob)` and read `result.engine_result`. Our `ledger/src/xrpl.ts submitAndWait` already returns early on `tef|tem|tel`, so the agent and policy must use **that helper**, not the xrpl.js one.
- **Severity:** **blocks demo** (a 90-second hang on stage) if someone uses the library call.

### C4. Rule 2 must also cap `Fee` and reject extra fields, because the policy otherwise co-signs a fee-burn
- **Contract (§3 rule 2):** checks TransactionType, Account, Destination, Amount and memo only.
- **Actually true:** the agent chooses `Fee`, and the fee is destroyed from AGENT_ACCOUNT. A compromised agent can send a proposal to an approved supplier for 1 drop with `Fee: "50000000"` (50 XRP). That passes rules 2–6, and agent + policy (weight 2) meet the quorum. `client.maxFeeXRP` (default 2 XRP) only limits xrpl.js autofill. It does not limit a hand-built tx. Fee formula: "10 drops × (1 + Number of Signatures Provided)" (https://xrpl.org/docs/concepts/transactions/transaction-cost).
- **Fix:** add to rule 2 that `Fee` ≤ a constant (e.g. 1 000 drops; normal value is 30). Also require: `Amount` is a drop **string** (not an IOU object); no `SendMax`, `Paths`, `DeliverMin`; `Flags` is 0 or absent; `LastLedgerSequence` present and ≤ current + 30; no `TicketSequence` unless we adopt tickets; `DestinationTag` equals the supplier's registered tag (if any).
- **Severity:** **wrong in pitch** (it is a real way round "limits the agent cannot get around"). A judge reading the code could find it.

### C5. Agent + policy together meet the quorum for *any* transaction type, so rule 2's "must be `Payment`" is load-bearing
- **Actually true:** a multi-signed transaction that meets the quorum can do anything the master key could, apart from re-disabling the master key. That includes `SignerListSet` (rewrite the signer list), `SetRegularKey`, `AccountSet ClearFlag asfDisableMaster` (re-enable master), `AccountDelete` and `DelegateSet`. Sources: "You can disable asfDisableMaster (that is, re-enable the master key pair) using a regular key pair or multi-signature" (https://xrpl.org/docs/references/protocol/transactions/types/accountset); https://xrpl.org/docs/concepts/accounts/cryptographic-keys.
- **Fix:** keep "TransactionType must be `Payment`" as the **first** hard check in rule 2 and add a test for it. Say in the contract that the policy service will never co-sign a non-Payment. The operator (weight 2) alone can still change the signer list. That is the intended human override.
- **Severity:** **wrong in pitch** if omitted. The rule is already there, so this only asks that it be called out and tested.

### C6. Disabling the master key: allowed, order matters, and there are two lockout traps
- **Actually true:**
  - `asfDisableMaster` "Can only be enabled if the account has configured another way to sign transactions, such as a Regular Key or a Signer List". It must be **signed with the master key**: "You cannot use a regular key pair or a multi-signature" (AccountSet page). So the order is: fund, then `SignerListSet` (master-signed), then `AccountSet SetFlag=4` (master-signed). `ledger/scripts/setup-testnet.ts` already does this in that order.
  - **Trap 1:** after the master is disabled with no regular key, you cannot delete the signer list (`tecNO_ALTERNATIVE_KEY`). You can still **replace** it with a multi-signed `SignerListSet` (https://xrpl.org/docs/references/protocol/transactions/types/signerlistset).
  - **Trap 2:** if the OPERATOR_SIGNER seed is lost *and* the policy key is lost, AGENT_ACCOUNT is frozen for good. Any funds above the float are unrecoverable. For testnet that is harmless. For production, store the operator key offline with a backup.
  - Signers do not need to be funded accounts. rippled `checkMultiSign`: "Phantom accounts are always allowed as multi-signers". The common-fields page: "For an unfunded account, it must be the Master Key". The setup script's key-only signers are fine.
- **Fix:** none to the contract. Optionally add one line: "Changing the signer list later needs a multi-signed `SignerListSet` (operator key alone suffices)."
- **Severity:** cosmetic.

### C7. SignerList `quorum 2: agent 1, policy 1, operator 2` is valid. Its reserve is 0.2 XRP.
- **Actually true:** quorum must be ≤ the sum of weights (4), otherwise `temBAD_QUORUM`. The list allows 1–32 signers (ExpandedSignerList, enabled 2022-10-13, now retired in code so always on). Lists created after MultiSignReserve (2019) carry `lsfOneOwnerCount` and cost **one** owner reserve. The live owner reserve is **0.2 XRP** on testnet and mainnet, and the base reserve is **1 XRP**. So AGENT_ACCOUNT locks **1.2 XRP**. Sources: https://xrpl.org/docs/references/protocol/transactions/types/signerlistset · https://xrpl.org/docs/concepts/accounts/reserves · live `server_info`.
- **Fix:** none. Optional pitch line: "the whole guard-rail costs 0.2 XRP of reserve".
- **Severity:** none.

### C8. `client.autofill(tx, 2)` exists and sets Fee = base × (1 + 2) = 30 drops. Keep `2` even though the agent signs first.
- **Actually true:** `Client.autofill(transaction, signersCount?, …)` exists in xrpl.js 5.3.0. `calculateFeePerTransactionType` adds `netFee × signersCount` to the base ("BaseFee × (1 + Number of Signatures Provided)"). It is load-scaled and capped at `maxFeeXRP`. The Fee is part of what every signer signs, so it must cover the **final** number of signatures (agent + policy = 2). With only 1 signature on the agent-only blob, a fee of 30 is still ≥ the 20 required, so the `tef` result really is the quorum check and not a fee error. On the operator-only path (1 signature) the fee is 10 drops too high, which is harmless.
- **Fix:** none. Optionally note "xrpl.js 5.3.0" instead of implying v4.
- **Severity:** none.

### C9. Co-signing mechanics: the policy must strip `Signers` before signing, and both must sign the identical autofilled tx
- **Actually true (installed xrpl.js 5.3.0 source):**
  - `wallet.sign(tx, true)` **throws** if the input already has `Signers` or `TxnSignature` ("txJSON must not contain "TxnSignature" or "Signers" properties"). So the policy must `decode(agentBlob)`, delete `Signers`, then `policyWallet.sign(unsigned, true)`.
  - `multisign([agentBlob, policyBlob])` requires every blob to have `SigningPubKey: ""` and non-empty `Signers`. It checks that the transactions are **identical apart from `Signers`** (same Fee, Sequence, LastLedgerSequence, Memos). It then **sorts** `Signers` by account ID, which the protocol requires ("ordered by signer address value, lowest first", https://xrpl.org/docs/concepts/accounts/multi-signing).
  - The policy must **never re-autofill**. It signs exactly the decoded fields.
- **Fix:** add one sentence under rule 8: "Policy decodes the agent blob, removes `Signers`, signs the remaining fields unchanged with `sign(tx, true)`, then `multisign([agentBlob, policyBlob])`."
- **Severity:** **blocks demo** if the policy builder tries to sign the decoded blob directly (it throws).

### C10. Held blobs expire in about 1–1.5 minutes. Proposals must be built *after* the Claude call. Sequence numbers collide if built in parallel.
- **Actually true:**
  - autofill sets `LastLedgerSequence = latest validated ledger + 20` (`LEDGER_OFFSET = 20` in installed `src/sugar/autofill.ts`). At 3–5 s per ledger (https://xrpl.org/about/) that is about **60–100 s** from autofill to expiry. Once a validated ledger passes it, the result is final `tefMAX_LEDGER` (finality-of-results page).
  - autofill sets `Sequence` from `account_info`. Two proposals autofilled before either is submitted get the **same** Sequence. The second one to submit fails with `tefPAST_SEQ` ("sequence number … lower than the current sequence number"). If a proposal skips ahead, it gets `terPRE_SEQ`.
  - A `tef` or held proposal does **not** consume the Sequence, so the next autofill reuses it. That is correct, as long as nothing old is ever resubmitted.
- **Fix:** in §4: "the agent processes invoices **one at a time** and autofills immediately before signing (after the Claude extraction), then POSTs at once". The policy should treat `tefPAST_SEQ` / `tefMAX_LEDGER` as "stale, agent must re-propose" and not as fraud. Production idea: Tickets (`TicketCreate`, up to 250 per account, 0.2 XRP reserve each) let multi-signed payments complete out of order (https://xrpl.org/docs/concepts/accounts/tickets). Do not adopt them for the hackathon.
- **Severity:** **blocks demo** if the agent batch-autofills all four fixtures and then proposes them.

### C11. Memos: hex fields, 1 KB limit. The current encoding is fine.
- **Actually true:** `MemoData`, `MemoType`, `MemoFormat` are hex blobs. `MemoType`/`MemoFormat` should use URL-safe characters (`application/json` is fine). The whole `Memos` field must be ≤ **1 KB** serialized (https://xrpl.org/docs/references/protocol/transactions/common-fields). `{"invoiceId":"inv-001","app":"gcina"}` is about 40 bytes.
- **Fix:** none. Keep invoice IDs short. Do not put the invoice text or reasoning in the memo.
- **Severity:** none.

### C12. The testnet faucet gives 100 XRP per call by default, not 1000
- **Actually true:** the XRPL testnet faucet default was lowered to **100 XRP** (maximum 1 000 per request) in the 2024 testnet reset (https://xrpl.org/blog/2024/testnet-reset). The xrpl.js JSDoc still says "default amount will be 1000". That comment is stale. `fundWallet(w, { amount: "1000" })` requests more. xrpl.org's faucet page does not state the amount, so confirm with the `balance` that `fundWallet` returns.
- **Do the demo amounts fit?** AGENT_ACCOUNT is faucet-funded (≈100 XRP), minus 1.2 XRP locked, leaving ≈98.8 XRP spendable. The four fixtures pay 20 + 45 = **65 XRP** (inv-002 and inv-004 pay nothing), plus about 30 drops per payment. That fits **one** full run. A second run needs a top-up (setup script re-run → float target 90). **The daily max of 120 XRP can never be reached with a ~99 XRP float**, so do not show "daily limit hit" unless you top up first. Daily-limit tests in the policy unit tests are fine.
- **Fix:** §2 note: "faucet gives 100 XRP per call; one full demo run spends 65 XRP; re-run `pnpm setup` between rehearsals to top up."
- **Severity:** **blocks demo** on the second rehearsal if no one tops up.

### C13. Paying FRAUDSTER: no `tecNO_DST_INSUF_XRP` risk
- **Actually true:** an XRP Payment to a non-existent address creates it if Amount ≥ base reserve (1 XRP). Otherwise it fails `tecNO_DST_INSUF_XRP`. FRAUDSTER is faucet-funded anyway, and the demo amount is ≥ 20 XRP. In the compromised path the tx dies at signature check (`tef`) before any destination check, so the destination state does not matter (https://xrpl.org/docs/references/protocol/transactions/types/payment).
- **Fix:** none.
- **Severity:** none.

### C14. Minor policy-ordering point (not XRPL, found while checking)
- Rule 6 (duplicate → reject) runs after rules 3–5. If the daily total were exhausted, inv-004 would come back `held_for_human` instead of `rejected`. Move the duplicate check to right after rule 2.
- **Severity:** cosmetic.

---

## Why XRPL (feature by feature)

| Feature | What it is | Relevance to Gcina | Verdict |
|---|---|---|---|
| **Native multi-sign SignerList** (https://xrpl.org/docs/concepts/accounts/multi-signing) | Account-level list of up to 32 signers with weights and a quorum, checked by every validator before a tx can apply. Retired amendment, so always on. | This is the core: the agent's key (weight 1) is cryptographically insufficient. It is not a smart contract we wrote or could get wrong. | **Use in demo** (already built) |
| **Master key disable** (https://xrpl.org/docs/concepts/accounts/cryptographic-keys) | `asfDisableMaster` makes the account's own key useless. Only the signer list or a regular key can sign. | Removes the "someone has the account seed" bypass. The agent account has no single key. | **Use in demo** |
| **Fees / finality** (https://xrpl.org/docs/concepts/transactions/transaction-cost, https://xrpl.org/about/) | 10-drop reference cost (0.00001 XRP). Multi-signed costs base × (1 + signers), i.e. 30 drops. Consensus every 3–5 s, and a validated result is final. | A two-key-protected supplier payment costs about R 0.001 and settles in seconds. Compare that with EFT batch timing for SMEs. | **Use in pitch** |
| **Payment Channels** (https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelcreate, …/paymentchannelclaim) | Source locks XRP for **one fixed Destination**. Claims are signed off-ledger by a key named in `PublicKey` (any key). Only the destination redeems, and never more than the channel `Amount`. | **Moves "approved destination + total cap" on-ledger.** Operator opens one channel per approved supplier, funded to that supplier's monthly budget, with the **agent key as the claim key**. Even a fully compromised agent can only pay the channel's own supplier, up to the cap. FRAUDSTER cannot redeem. Limits: there is no per-day cap, the supplier must redeem claims (an integration burden), and XRP only. | **Production idea** (strong pitch line) |
| **Escrow** (https://xrpl.org/docs/concepts/payment-types/escrow) | Time- or condition-locked payment to a fixed destination. TokenEscrow (IOUs/MPT) enabled 2026-02-12. | Could hold an approved-but-not-yet-due invoice until its due date (`FinishAfter`). It does not limit the agent. | **Production idea** (pay-on-due-date) |
| **Checks** (https://xrpl.org/docs/concepts/payment-types/checks) | Sender writes a Check to a fixed Destination with `SendMax`. The recipient cashes it. | "Cheque-style" supplier payments the supplier must accept, which is familiar to SA SMEs. Destination-locked like a channel, but still needs our quorum to write. | Production idea / not needed |
| **DepositAuth / DepositPreauth** (https://xrpl.org/docs/concepts/accounts/depositauth) | Restricts **incoming** payments to preauthorised senders or credentials. | It does **not** restrict who *we* pay. On the *supplier* side it could stop strangers paying them, which does not help us. Could protect AGENT_ACCOUNT from unsolicited deposits (not a threat we have). | **Not relevant** to the outgoing-payment risk |
| **Credentials (XLS-70)** | On-ledger attestations issued by an issuer to a subject. Usable with DepositPreauth. | **Enabled on mainnet 2025-09-04** (known-amendments page; live `feature` shows enabled on testnet and mainnet). Production idea: a KYB provider or bank issues a "verified supplier bank account" credential, and the policy only approves destinations holding it. That still runs in the policy service, because a Payment's *sender* cannot require a credential of the *destination*. | **Production idea** |
| **Permissioned Domains** | Credential-gated domains, used for the Permissioned DEX (enabled 2026-02-18). | **Enabled on mainnet 2026-02-04.** Scoped to DEX and lending access, not plain Payments. | **Not relevant** now |
| **Permission Delegation (`DelegateSet`)** (https://xrpl.org/docs/concepts/accounts/permission-delegation, https://xrpl.org/docs/references/protocol/data-types/permission-values) | An account grants another account the right to send specific tx types (Payment is delegable). Up to 10 permissions per delegate. **No amount or destination limits** ("the set of granular permissions is hard-coded"). | Original `PermissionDelegation` was removed in 2.6.1. **`PermissionDelegationV1_1` shows `enabled: true` on both testnet and mainnet in a live `feature` query today.** The xrpl.org snapshot of 2026-09-16 still said "open for voting", so treat the exact date as unverified. Could give the agent its *own* account that may send Payments for the business, but it adds no spending limit, so multi-sign stays the better guard-rail. | **Mention only** ("we chose multi-sign over delegation because delegation has no spend limits") |
| **RLUSD** (https://docs.ripple.com/products/stablecoin/developer-resources/rlusd-on-the-xrpl) | Ripple's USD stablecoin, issued natively on XRPL. Mainnet issuer `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`. **Testnet issuer `rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV`**, currency hex `524C555344000000000000000000000000000000`, faucet https://tryrlusd.com/ after a trust line. | Suppliers want rand or dollar value, not XRP volatility. RLUSD is the honest production rail. The multi-sign design is identical for IOU payments, but the policy's rule 2 must then accept the `{currency, issuer, value}` Amount shape. | **Stretch** (as the contract says). **Pitch:** "production settles in RLUSD". |
| **x402 on XRPL** (https://xrpl.org/docs/agents/agentic-payments-x402) | HTTP-402 pay-per-request. On XRPL the payer presigns a Payment and the facilitator verifies it and returns a receipt. **Facilitators are run by T54** (`xrpl-facilitator-testnet.t54.ai` for development only, `xrpl-facilitator-mainnet.t54.ai`). Reference library `x402-xrpl` (Python). XRP and RLUSD. | Machine-to-machine API payments, not supplier invoices. Not our use case. The docs' own warning ("a remote server is choosing a field of a transaction your agent signs") is the same problem Gcina solves. | **Not relevant** for the demo. Useful as a "the ecosystem agrees agents need guard-rails" line. |
| **Official XRPL MCP server / agent toolkit** | xrpl.org has an agents docs section (the x402 page above). The MCP servers found (`RomThpt/mcp-xrpl`, `lgcarrier/xrpl-mcp-server`, `tamago-labs/xrpl-mcp`, `xrpl-agent-wallet-mcp`) are **community** projects. I found no Ripple-official MCP server. | Not needed. Our agent calls our own policy API. | **Not relevant**. Do not claim an official toolkit. |

---

## What the ledger does and does NOT enforce

**The ledger enforces (validators check this on every transaction; we cannot bypass it in code):**
1. AGENT_ACCOUNT's own key is disabled (`tefMASTER_DISABLED`).
2. Any transaction from AGENT_ACCOUNT needs signatures with total weight ≥ 2 from the listed keys. The agent key alone (weight 1) is rejected before the tx can reach a ledger (`tefBAD_QUORUM` / `tefBAD_AUTH`).
3. Signatures are bound to the exact tx: changing Destination, Amount, Fee or Sequence after the policy signs invalidates the signature.
4. Each signed tx is single-use (Sequence) and time-boxed (`LastLedgerSequence` ≈ 60–100 s).
5. Changing the rules (signer list, regular key, re-enabling master) also needs the quorum. In practice that means the operator key, because the policy refuses to co-sign non-Payments.

**The ledger does NOT enforce (these live in the independent policy co-signer, which the track rules allow as "an independent service"):**
- **Destination allowlist** ("approved suppliers only"). There is no native outgoing-destination allowlist for Payments.
- **Per-payment max, daily max, "human above X"**. There is no native spend limit or velocity rule on outgoing Payments.
- **Duplicate-invoice detection**, PO matching, and pause.
- **Fee sanity** (see C4). The ledger accepts any Fee the signers agreed to.

**On-ledger primitives that could move more of the rule set on-ledger (production roadmap):**
- **Payment channel per approved supplier** (agent key = claim key): on-ledger destination lock + on-ledger total cap per supplier. This is the strongest option.
- **Checks or Escrow per invoice**: destination-locked, but they still need our quorum to create, so they do not limit the agent more than the policy does.
- **Credentials (XLS-70)**: on-ledger proof that a destination is a verified supplier. The policy still has to check it, since the sender cannot require it natively.
- **DepositAuth**: inbound only. It does not help limit outgoing payments.
- **Permission Delegation**: grants tx types, with no amounts or destinations, so it adds no limit.
- **Smart Escrows / programmability (XLS-100)**: still "In Development" in rippled (`Supported::No`). Do not cite it as available.

---

## Pitch one-liners (honest)

1. "The agent's key is weight 1 on a quorum of 2, so the XRP Ledger's own validators refuse any payment it signs alone. We don't ask the ledger to trust our code; we ask it to count signatures."
2. "Who may be paid, how much and how often is checked by an independent co-signer the agent can't reconfigure. The ledger guarantees that co-signer can't be skipped."
3. "The blocked fraud attempt never touches a ledger and costs nothing. The network rejects it at the door (`tefBAD_QUORUM`), and we log that rejection."
