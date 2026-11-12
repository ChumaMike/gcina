# Gcina: rehearsal and pre-pitch checklist

The live setup is: the **web app** at https://gcina.vercel.app, the **policy co-signer** at https://gcina-policy.vercel.app
(its Postgres store is the "demo state"), **one agent watcher** (C's) pointed at the deployed policy, and the
**XRPL Testnet** accounts in [addresses.md](addresses.md). `localhost:8787` is for development only, so nobody demos against it.

The ledger (payments, signer list) is never reset. Only the policy store is reset.

---

## 1. Reset the demo state (deployed store)

**Who:** the driver, logged in as the **owner** (not judge mode: the judge's login has no reset).
**When:** before each rehearsal, and once more about 10 minutes before the pitch. Never during the pitch.

1. **Check that nothing is settling.** On **Invoices**, no invoice may show *processing*, and the watcher terminal must
   be idle (its last line is a finished payment or "nothing to do"). Why: the reset also wipes the
   "payment still settling" records that stop a double payment. If something is processing, wait 1–2 minutes
   (the payment either lands or expires on the ledger), then check again.
2. **Press Invoices → Reset demo.** The toast says "Demo reset. Ready for inv-001."
   Backup from a terminal: `cd agent && pnpm inbox reset` (it reads `POLICY_URL` from `agent/.env` and the operator token
   from `agent/.env.operator-sim`; check `POLICY_URL` is the vercel.app one first).
3. **Check the result:** Invoices is empty, Approvals has nothing waiting, and Limits shows **$50 per payment, $120 a day, ask a person
   above $30**, with today's spend at $0.00. Suppliers shows **Mzansi Catering** and **Khaya Print & Stationery**, both approved.
4. Leave the watcher running. After the reset it has nothing to do until the next "inv-00x arrives".

## 2. After every rehearsal that fires the agent: re-hire it

Demo 5 (`pnpm fire-agent`) removes the agent's key from the account on the ledger. Until it is re-hired, **every
payment fails**, so the next rehearsal (or the pitch) breaks.

1. **Who:** the driver, **off stage**, straight after the run. **Where:** `cd ledger && pnpm rehire-agent`.
2. **Expect:** `✅ RE-HIRED … tesSUCCESS`, an explorer link, and `signer list now: rhGCP…(1), rpTQQ…(1), rHZiT…(2), quorum 2`.
3. **Check** the signer list (section 3, check 2). If `rehire-agent` fails, run it once more. If it fails again,
   `pnpm setup-testnet` in `ledger/` also restores the signer list (see the note in check 3).
4. You don't need to reset the store for this. The fire/rehire only changes the ledger.

## 3. Pre-pitch checks (about 15 minutes before, all read-only)

| # | Check | How | Good looks like |
|---|---|---|---|
| 1 | Policy is up | open https://gcina-policy.vercel.app/health | `{"ok":true,"network":"testnet","agentAccount":"rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq","currency":"RLUSD"}` |
| 2 | Signer list: quorum 2, weights 1/1/2 | dashboard **Home** or **How it works** → "See it on the public ledger" card, or the [explorer](https://testnet.xrpl.org/accounts/rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq) (Signer list) | quorum **2**: agent `rhGCPJehSfK2jAMeamzhdYmRa4J5wx6C4e` **1**, policy `rpTQQLzeE227r4TeQ39Z5FyTfE1ucR7gbF` **1**, owner `rHZiTGS4XvH8UP3YUZziYYVGR4PMC2mqVT` **2**. If the agent is missing → it was fired: run section 2 |
| 3 | Agent has money for about 10 payments | `GET /balances` (owner token), or the explorer link above | **RLUSD ≥ $350** and **XRP ≥ 20** (see below) |
| 4 | Agent watcher is running | C's watcher terminal (`cd agent && pnpm agent watch`) | the banner shows `https://gcina-policy.vercel.app`, RLUSD, and it is polling with no red errors. There is exactly **one** watcher: a second one would race the first |
| 5 | Store is clean | section 1, step 3 | empty invoices, default limits |

**Why $350 RLUSD:** the demo pays inv-001 ($20) and, after you approve it, inv-003 ($45), which is $65 a run. Ten payments of
that mix comes to about $325. XRP only pays fees (fractions of a cent each) and the account reserve, so 20 XRP is plenty.

**Balances on 12 Nov, 20:45 SAST:** AGENT_ACCOUNT **$145 RLUSD / 89 XRP** (about 4 payments: **top it up before the pitch**);
TREASURY **$250 RLUSD / 455 XRP**.

**Top up (writes to the ledger, so only with Chuma's OK):**

```sh
cd ledger
AGENT_RLUSD_FLOAT=350 pnpm setup-testnet   # moves (350 − agent balance) RLUSD from TREASURY to the agent
```

- It is idempotent: it keeps every address, seed and token, and changes only what is short. It also restores the signer list if the
  agent was fired.
- It keeps the existing `POLICY_URL` in `agent/.env` and `web/.env.local` (fixed 12 Nov; before that it reset them to localhost).
- If TREASURY runs low, `pnpm buy-rlusd --target 300` buys more through the testnet AMM.
- Afterwards, re-check 2 and 3.

## 4. If something goes wrong on stage

- A payment shows **"still on its way" / unknown:** don't press anything again. The policy will not sign a second
  payment for that invoice until the first one lands or expires, so a double payment is impossible. Narrate it and move on.
- **Policy /health is down:** the agent refuses to pay (it fails closed). Show the tested hashes in [demo-evidence.md](demo-evidence.md).
- **fire-agent is slow or fails:** say the line anyway and show the tested fire/rehire hashes from README (EAAEDFA2… / 49922785…).
