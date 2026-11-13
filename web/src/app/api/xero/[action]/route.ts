// Owner-only Xero routes, one file: /api/xero/connect, callback, bills, import, sync, disconnect.
import { after, NextResponse, type NextRequest } from "next/server";
import { wakeAgentThenSync } from "@/lib/agent-wake";
import { authorizeUrl, billsView, disconnect, finishConnect, importBill, syncPaid, xeroConfigured, XeroError } from "@/lib/xero";
import { ownerOnly, xeroFail } from "@/lib/xero-route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATE_COOKIE = "gcina_xero_state";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/xero/[action]">) {
  const no = await ownerOnly();
  if (no) return no;
  const { action } = await ctx.params;
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/xero/callback`;

  if (action === "connect") {
    if (!xeroConfigured()) return NextResponse.redirect(`${origin}/invoices?xero=not-set-up`);
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    const res = NextResponse.redirect(authorizeUrl(state, redirectUri));
    res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", path: "/api/xero", maxAge: 600 });
    return res;
  }

  if (action === "callback") {
    const back = (q: string) => {
      const res = NextResponse.redirect(`${origin}/invoices?${q}`);
      res.cookies.set(STATE_COOKIE, "", { path: "/api/xero", maxAge: 0 });
      return res;
    };
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const expected = req.cookies.get(STATE_COOKIE)?.value;
    if (!code || !state || !expected || state !== expected) return back("xero=cancelled");
    try {
      await finishConnect(code, redirectUri);
      return back("xero=connected");
    } catch (e) {
      if (!(e instanceof XeroError)) console.error("[xero] connect:", e instanceof Error ? e.message : e);
      return back(`xero=failed&why=${encodeURIComponent(e instanceof XeroError ? e.message : "Xero sign-in didn't finish.")}`);
    }
  }

  if (action === "bills") {
    try {
      return NextResponse.json(await billsView(), { headers: { "cache-control": "no-store" } });
    } catch (e) {
      return xeroFail(e);
    }
  }
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/xero/[action]">) {
  const no = await ownerOnly();
  if (no) return no;
  const { action } = await ctx.params;
  const origin = req.nextUrl.origin;
  try {
    if (action === "import") {
      const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
      const rec = await importBill(id);
      after(() => wakeAgentThenSync(origin));
      return NextResponse.json(rec, { status: 201 });
    }
    if (action === "sync") return NextResponse.json(await syncPaid(origin));
    if (action === "disconnect") {
      await disconnect();
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return xeroFail(e);
  }
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
