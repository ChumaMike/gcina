// Browser → this route → policy service. Adds OPERATOR_TOKEN server-side and only
// forwards the operator endpoints the dashboard actually uses (CONTRACTS §3).
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { callPolicy } from "@/lib/policy-client";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

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

const QUERY_KEYS = new Set(["status", "limit"]);

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const { path } = await ctx.params;
  const pathname = "/" + path.map(encodeURIComponent).join("/");
  if (!ALLOWED.some(([m, re]) => m === req.method && re.test(pathname))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 404 });
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
  const res = await callPolicy(req.method, target, body);
  return NextResponse.json(res.body, { status: res.status, headers: { "Cache-Control": "no-store" } });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH };
