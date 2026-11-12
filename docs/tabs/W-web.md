You are the **Web & Deploy tab (W)** for *Gcina*, the W3Node Node Engine Hackathon 2026 entry, Agentic Finance track (Ripple / XRPL).
Repo: `C:\Users\HomePC\Documents\Chuma\SGDataInt_Group\business-units\agentive-labs\repos\gcina`. **Read `CONTRACTS.md` fully first.** You own `web/` only.
Product is 30 of the 90 judging points: "polished, intuitive interface needing no explanation". Mobile-first (most SA owners are on Android), but it also has to look great on a projector.

## Goal by 23:00 Thu 12 Nov
A deployed operator dashboard where the business owner sets the agent's limits, approves suppliers, approves held payments, and watches everything the agent does, with each payment linked to the XRPL Testnet explorer.

## Screens (one Next.js App Router app, Tailwind + shadcn/ui; load the `vercel:nextjs` and `vercel:shadcn` skills)
1. **Overview**: agent status (watching / paused), today's spend vs daily limit (progress bar), balances (TREASURY, AGENT_ACCOUNT), a big **Pause agent** switch, and a live activity feed from `/audit` (poll every 3 s). Each event shows an actor chip (Agent / Policy / You / Ledger) and an explorer link when there's a txHash.
2. **Limits**: edit per-payment max, daily max and "ask me above". Show XRP plus indicative ZAR (`R 1 234.56`, rate from CONTRACTS §2, labelled indicative). Include the line "Changes apply instantly. The agent can't change these."
3. **Suppliers**: register with status chips; approve / block. A pending address change is shown in red with the old vs new address.
4. **Approvals**: held payments with the policy's reasons in plain English. Approve / Reject, then confirm in a sheet (not a browser `confirm()`).
5. **Invoices (demo control)**: "Simulate incoming invoice" buttons for inv-001..004 (posts the fixture text via the operator API), with each invoice's status.
6. **How it works**: one diagram showing invoice → agent (signs 1 of 2) → policy co-signer (signs 2 of 2, only within your limits) → XRP Ledger (enforces quorum), with "the agent alone cannot move money". This screen doubles as a pitch slide.

## Steps
1. Scaffold `web/` (`pnpm create next-app` with TS, Tailwind, App Router, no src-dir debate: use `src/`). Copy the types from CONTRACTS §3 into `web/src/lib/types.ts`.
2. **Never expose `OPERATOR_TOKEN` to the browser.** All calls go through Next route handlers / server actions in `web/src/app/api/...` that add the token server-side. Env: `POLICY_URL`, `OPERATOR_TOKEN`. Gate the whole app behind a simple demo passcode (`DASHBOARD_PASSCODE`, an httpOnly cookie) so the public URL isn't an open control panel.
3. Build against a mock first (`web/src/lib/mock.ts` with realistic data following the contract; switch with `USE_MOCK=1`). **Milestone 16:45: all screens running locally on mocks; commit.**
4. At ~18:30, when L's policy service runs on :8787, switch to real data and fix contract mismatches by reporting them in `docs/status.md`. Don't edit `policy/`.
5. Amounts: show `$ 20.00 RLUSD` with an indicative ZAR line underneath (`≈ R 360.00`, CONTRACTS §2). Balances show RLUSD and XRP (fees). Add a small "Paid in RLUSD on the XRP Ledger" badge; Ripple's judges score RLUSD use. Copy: plain, warm South African English. "Your agent paid Mzansi Meat Supplies R 800.00 (20 XRP)." / "Held: this isn't Mzansi Meat's registered address. It could be a fake 'new banking details' invoice." No crypto jargon on the main screens; "XRP Ledger" and the explorer links are fine.
6. Accessibility: real buttons and labels, contrast AA, 44 px touch targets, works at 360 px wide.
7. **22:00 deploy**: Vercel project `gcina-web` under the **sgdataint** account (never Chuma-SG). Ask Chuma in chat before creating the project and setting env vars. The Vercel CLI may not be installed: say so and ask before installing it globally. Set `POLICY_URL` to L's deployed URL. Put the deployed URL in `docs/status.md`.
8. **23:00**: click through all 4 fixtures on the deployed site with the agent running; screenshot each state with Playwright at phone size (360×780) and desktop into `docs/pitch/screens/` for the Pitch tab.

## Hard rules
- Don't touch `ledger/`, `policy/` or `agent/`. Contract issues go in `docs/status.md`.
- No secrets in client bundles or commits (`.env*` gitignored, so check).
- Commit only `web/` and `docs/pitch/screens/`. Never push.
- Status lines to `docs/status.md`: `HH:MM [W] done / next / blocked-by`.
