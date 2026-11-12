import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_ACCOUNT, SIGNER_ROLES, type SignerProof } from "@/lib/addresses";
import { SESSION_COOKIE, sessionRole } from "@/lib/session";

// Reads the agent account's signer list straight from a public XRPL Testnet node, so the
// dashboard shows what the LEDGER enforces, not what our own services say.
const RPC = process.env.XRPL_RPC_URL || "https://s.altnet.rippletest.net:51234";
const LSF_DISABLE_MASTER = 0x00100000;

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!(await sessionRole(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method: "account_info",
        params: [{ account: AGENT_ACCOUNT, signer_lists: true, ledger_index: "validated" }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json()) as { result?: Record<string, unknown> };
    const r = j.result ?? {};
    if (r.status !== "success") throw new Error(String(r.error_message ?? r.error ?? "The ledger didn't answer."));
    const data = (r.account_data ?? {}) as Record<string, unknown>;
    // API v2 puts signer_lists on the result; v1 inside account_data.
    const lists = (r.signer_lists ?? data.signer_lists ?? []) as { SignerQuorum?: number; PreviousTxnID?: string; SignerEntries?: { SignerEntry: { Account: string; SignerWeight: number } }[] }[];
    const list = lists[0];
    const body: SignerProof = {
      account: AGENT_ACCOUNT,
      masterDisabled: ((Number(data.Flags) || 0) & LSF_DISABLE_MASTER) !== 0,
      quorum: list?.SignerQuorum ?? null,
      signers: (list?.SignerEntries ?? []).map(({ SignerEntry: s }) => ({ address: s.Account, weight: s.SignerWeight, ...SIGNER_ROLES[s.Account] })),
      changedBy: list?.PreviousTxnID,
      ledgerIndex: typeof r.ledger_index === "number" ? r.ledger_index : undefined,
      checkedAt: new Date().toISOString(),
    };
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: `Couldn't read the XRP Ledger just now: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
