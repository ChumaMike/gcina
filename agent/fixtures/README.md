# Demo fixtures (owned by A)

Invented suppliers only (CONTRACTS §9 privacy rule). Addresses are the public testnet ones in `docs/addresses.md`.

| File | What it is | Expected outcome |
|---|---|---|
| `inv-001.txt` | Mzansi Catering tax invoice MC-2611 for PO-1001, $20.00 | Agent pays it on its own ✅ |
| `inv-002.txt` | "Our banking details have changed" email for the same invoice, lookalike domain, FRAUDSTER address | Agent refuses to recommend it; policy holds it for the owner 🛑. In `AGENT_MODE=compromised` the agent tries anyway, the policy holds it, and the ledger rejects its lone signature (`tefBAD_QUORUM`) |
| `inv-003.txt` | Khaya Print & Stationery invoice KPS-0937 for PO-1002, $45.00 | Above the "ask me" limit: held → owner approves → agent re-signs a fresh tx → paid 👤 |
| `inv-004.txt` | The same MC-2611 invoice forwarded again by a facilitator (MTA really paid people twice) | Refused by the policy as a duplicate 🔁 |

`*.extracted.json` are Claude's structured reads of each file (`pnpm extract-fixtures`).
