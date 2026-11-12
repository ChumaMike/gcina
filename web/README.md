# Gcina web: operator dashboard

The owner's control panel: set the agent's limits, approve suppliers, approve held
payments and watch every step, with each payment linked to the XRPL Testnet explorer.

```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                      # http://localhost:3000
```

- `USE_MOCK=1` runs on an in-memory mock (`src/lib/mock.ts`) that plays agent, policy and ledger.
- The browser only talks to `/api/policy/*` (`src/app/api/policy/[...path]/route.ts`), which checks
  the passcode session, allow-lists operator endpoints and adds `OPERATOR_TOKEN` server-side.
- Amounts follow CONTRACTS §2: `Amount = { currency: "RLUSD" | "XRP", value }`, shown as
  `$ 20.00 RLUSD` with an indicative rand value (`ZAR_PER_USD = 18`).
