# BuilderBase submission (copy-paste)

Deadline: **Fri 13 Nov 2026, 23:59 SAST** (internal target 22:00). Chuma clicks submit. Every teammate must have
applied and been accepted individually on BuilderBase.

| Field | Paste this |
|---|---|
| Project title | Gcina: the agent pays, the ledger keeps |
| Track | Agentic Finance (Ripple / XRPL) |
| Tagline | An AI payments clerk for South African small businesses that can't pay on its own, even when it's fooled. |
| GitHub repo | https://github.com/ChumaMike/gcina |
| Live demo (testnet) | https://gcina.vercel.app (passcode: give it in the private notes field only, never in the public description) |
| Demo video (≤ 3 min) | **[YouTube unlisted or Drive "anyone with the link" — add when uploaded]** |
| Team | Chuma Meyiswa (founder) · Dalindyebo Mdledle (developer) — **roles TBC by Chuma** |

## Short description (about 120 words)

Small businesses pay twice: by mistake, when the same bill is paid again, and by fraud, when a fake "our banking
details have changed" email is paid and the real supplier is still owed (Supreme Court of Appeal, 2025). AI agents
could take this admin off their hands, but an agent can be fooled by that same email.

Gcina is an AI accounts-payable agent that reads invoices, matches them to orders and pays suppliers in RLUSD on the
XRP Ledger. Its account needs two signatures: the agent holds one vote, an independent policy co-signer holds one
and enforces the owner's limits, approved suppliers and the repeat check, and the owner's offline key holds two. On
testnet, the agent alone is refused by the ledger (tefBAD_QUORUM); agent plus policy pays (tesSUCCESS).

## How it uses XRPL + RLUSD (one paragraph)

Multi-sign SignerList (quorum 2, master key disabled) as the spending control; RLUSD Payments with the invoice
number in a memo; RLUSD bought on XRPL's native AMM; every result on the public testnet explorer. Evidence:
docs/demo-evidence.md in the repo.

## Disclosure

Built during Node Engine. We used AI coding tools (Claude) and the Claude API inside the agent; the README lists
the open-source libraries.
