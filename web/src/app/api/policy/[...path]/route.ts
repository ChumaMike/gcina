// Browser → this route → policy service. Adds OPERATOR_TOKEN server-side and only
// forwards the operator endpoints the dashboard actually uses (CONTRACTS §3).
import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";
import { wakeAgentThenSync } from "@/lib/agent-wake";
import { callPolicy } from "@/lib/policy-client";
import { SESSION_COOKIE, sessionRole } from "@/lib/session";

const ALLOWED: [string, RegExp][] = [
  ["GET", /^\/health$/],
  ["GET", /^\/policy$/],
  ["PUT", /^\/policy$/],
  ["GET", /^\/suppliers$/],
  ["POST", /^\/suppliers$/],
  ["PATCH", /^\/suppliers\/[\w-]+$/],
  ["GET", /^\/purchase-orders$/],
  ["GET", /^\/invoices$/],
  ["POST", /^\/invoices$/],
  ["GET", /^\/approvals$/],
  ["POST", /^\/approvals\/[\w-]+\/(approve|reject)$/],
  ["GET", /^\/audit$/],
  ["GET", /^\/balances$/],
  ["POST", /^\/admin\/reset$/],
];

// Judge mode (server-enforced): reads, plus approve/reject. No limits, pause, suppliers, invoices or reset.
const JUDGE_ALLOWED: [string, RegExp][] = [
  ...ALLOWED.filter(([m]) => m === "GET"),
  ["POST", /^\/approvals\/[\w-]+\/(approve|reject)$/],
];

const QUERY_KEYS = new Set(["status", "limit"]);

// A new bill or an owner approval wakes the hosted agent (lib/agent-wake.ts).
export const maxDuration = 60;
const WAKES_AGENT = /^\/(invoices|approvals\/[\w-]+\/approve)$/;

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const jar = await cookies();
  const role = await sessionRole(jar.get(SESSION_COOKIE)?.value);
  if (!role) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const { path } = await ctx.params;
  const pathname = "/" + path.map(encodeURIComponent).join("/");
  if (!ALLOWED.some(([m, re]) => m === req.method && re.test(pathname))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 404 });
  }
  if (role === "judge" && !JUDGE_ALLOWED.some(([m, re]) => m === req.method && re.test(pathname))) {
    return NextResponse.json({ error: "Judges can only approve or reject payments." }, { status: 403 });
  }
  const qs = new URLSearchParams();
  req.nextUrl.searchParams.forEach((v, k) => QUERY_KEYS.has(k) && qs.set(k, v));
  const target = pathname + (qs.size ? `?${qs}` : "");

  let body: unknown;
  if (req.method !== "GET") {
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Bad request." }, { status: 400 });
      }
    } else {
      body = {};
    }
  }
  // The audit trail says who decided; a judge can't claim to be the owner.
  if (role === "judge" && /\/(approve|reject)$/.test(pathname)) body = { decidedBy: "A judge (demo)" };
  const res = await callPolicy(req.method, target, body);
  if (req.method === "POST" && res.status < 300 && WAKES_AGENT.test(pathname)) {
    const origin = req.nextUrl.origin;
    after(() => wakeAgentThenSync(origin));
  }
  return NextResponse.json(res.body, { status: res.status, headers: { "Cache-Control": "no-store" } });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH };
