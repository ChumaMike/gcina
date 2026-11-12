# Gcina agent (`agent/`)

The accounts-payable agent. Claude reads each supplier invoice; the agent checks it against the books
(approved supplier, registered payment address, open order for the same amount, already paid?, the owner's limits),
then **half-signs** an XRPL Payment and asks the policy co-signer. Its key has weight 1; the account needs 2.

## Setup
```
cd agent
pnpm install            # agent/ has its own pnpm-workspace.yaml, so the monorepo lockfile is never touched
```
- `agent/.env` (gitignored): `POLICY_URL`, `AGENT_TOKEN`, `AGENT_SIGNER_SEED`, `AGENT_ACCOUNT_ADDRESS`, `PAYMENT_CURRENCY`, `RLUSD_ISSUER`, `ANTHROPIC_API_KEY`, `AGENT_MODEL`.
- `agent/.env.operator-sim` (gitignored, one line `OPERATOR_TOKEN=…`): used **only** by the inbox simulator.
  The agent refuses to start if `OPERATOR_TOKEN` is in its own environment.

## Commands
| Command | What it does |
|---|---|
| `pnpm agent once` | Handle every new invoice, then every owner-approved hold, then stop |
| `pnpm agent watch` | Same, every 5 s (pairs with the dashboard's "invoice arrived" button) |
| `pnpm agent once --compromised` | The fooled agent (same as `AGENT_MODE=compromised`): obeys the document, then tries to go around the policy |
| add `--evidence` | Also append a results table to `docs/demo-evidence.md` |
| `pnpm inbox reset` | Demo reset on the policy service (plays the operator, not the agent) |
| `pnpm inbox inv-001` | "An invoice arrived": posts a fixture |
| `pnpm inbox inv-002=inv-002b` | Re-sends a fixture under a new id (a held invoice can't be re-posted under its own id) |
| `pnpm extract-fixtures` | Offline: Claude reads every fixture, writes `fixtures/*.extracted.json` |

## Demo run (4 fixtures + the compromised beat)
```
pnpm inbox reset
pnpm inbox inv-001 && pnpm agent once        # ✅ paid on its own, explorer link printed
pnpm inbox inv-002 && pnpm agent once        # 🛑 agent says "do NOT pay"; policy HOLDS it for the owner → reject it on the dashboard
pnpm inbox inv-002=inv-002b && pnpm agent once --compromised
                                             # fooled agent pays the new address → policy holds → agent submits alone → ⛔ tefBAD_QUORUM
pnpm inbox inv-003 && pnpm agent once        # 👤 above the ask-me limit → HELD → approve on the dashboard, then:
pnpm agent once                              # ✅ fresh tx with the approvalId → paid
pnpm inbox inv-004 && pnpm agent once        # 🔁 same bill again → policy REFUSES (order PO-1001 already paid)
```
With `pnpm agent watch` running in its own terminal, only the `pnpm inbox …` lines (or the dashboard button) are needed.

## How the agent decides (src/decide.ts)
It only half-signs when it wants a payment made, **or** when a policy rule is certain to stop it and the stop is the point:
changed address → rule 3 hold for the owner; above the limit → rule 5 hold; order already paid → rule 6 refusal on record.
Anything that fails on the order itself (no order, wrong amount, unknown supplier) it stops itself, unsigned,
because the policy doesn't check orders.
