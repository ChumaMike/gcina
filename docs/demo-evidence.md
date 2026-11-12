
## Quorum proof — 2026/11/12, 15:59:50 SAST (`ledger/scripts/prove-quorum.ts`)

AGENT_ACCOUNT `rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq` (master disabled, SignerList quorum 2) → SUPPLIER_A `rfhJ9sf6ELqiii5nBP15upCegibK8REhii`, 1 XRP each.

| Attempt | Signers (weight) | Ledger result | Hash |
|---|---|---|---|
| (a) Agent alone | AGENT_SIGNER (1) < quorum 2 | **tefBAD_QUORUM** — rejected by the ledger, never included in a ledger | `79A57839BCE0F1A221ED6DEB676D538F1AD73E7C7FAED88BD476E937547AD1A4` (not on ledger) |
| (b) Account's own master key | disabled | **tefMASTER_DISABLED** — rejected | `532C27957E918EF7F3AD345BB8F2BB62E6D05AEBC20218DD614E86E859BA78EC` (not on ledger) |
| (c) Agent + policy co-signer | AGENT_SIGNER (1) + POLICY_SIGNER (1) = 2 | **tesSUCCESS**, validated | [0139C0167EB5ECF95F9008CE986A1161883C063D036C104371A8325692C1DE22](https://testnet.xrpl.org/transactions/0139C0167EB5ECF95F9008CE986A1161883C063D036C104371A8325692C1DE22) |

`tef*` results are final rejections at submit time: the transaction never enters a ledger and no fee is charged,
so (a) and (b) have no explorer page. That is the point — the money cannot move.

## Treasury buys RLUSD on XRPL's native AMM — 2026/11/12, 18:00:28 SAST (`ledger/scripts/buy-rlusd.ts`)

TREASURY [`rK8V7hu4LjNpHyLZwqRxL2NUFKvdqzRQMD`](https://testnet.xrpl.org/accounts/rK8V7hu4LjNpHyLZwqRxL2NUFKvdqzRQMD) swapped **3283.185217 XRP → $ 250.00 RLUSD**
through the XRP/RLUSD AMM pool [`rPn7kHwycXzS5XNj167CnKwC2t82yAAdNW`](https://testnet.xrpl.org/accounts/rPn7kHwycXzS5XNj167CnKwC2t82yAAdNW) (testnet RLUSD issuer `rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV`, pool fee 50.1 bps).
Immediate-or-cancel OfferCreate capped at quote + 2%: [8191857E5B56…](https://testnet.xrpl.org/transactions/8191857E5B562F5E1E6008E3AF55DFE07572729878DF750ACC81C4DA8689F4C8) · **tesSUCCESS**.
