
## Quorum proof — 2026/11/12, 15:59:50 SAST (`ledger/scripts/prove-quorum.ts`)

AGENT_ACCOUNT `rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq` (master disabled, SignerList quorum 2) → SUPPLIER_A `rfhJ9sf6ELqiii5nBP15upCegibK8REhii`, 1 XRP each.

| Attempt | Signers (weight) | Ledger result | Hash |
|---|---|---|---|
| (a) Agent alone | AGENT_SIGNER (1) < quorum 2 | **tefBAD_QUORUM** — rejected by the ledger, never included in a ledger | `79A57839BCE0F1A221ED6DEB676D538F1AD73E7C7FAED88BD476E937547AD1A4` (not on ledger) |
| (b) Account's own master key | disabled | **tefMASTER_DISABLED** — rejected | `532C27957E918EF7F3AD345BB8F2BB62E6D05AEBC20218DD614E86E859BA78EC` (not on ledger) |
| (c) Agent + policy co-signer | AGENT_SIGNER (1) + POLICY_SIGNER (1) = 2 | **tesSUCCESS**, validated | [0139C0167EB5ECF95F9008CE986A1161883C063D036C104371A8325692C1DE22](https://testnet.xrpl.org/transactions/0139C0167EB5ECF95F9008CE986A1161883C063D036C104371A8325692C1DE22) |

`tef*` results are final rejections at submit time: the transaction never enters a ledger and no fee is charged,
so (a) and (b) have no explorer page. That is the point — the money cannot move.
