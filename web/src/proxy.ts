import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionRole } from "@/lib/session";

// What a judge session may open. Everything else redirects to Approvals (pages) or 403s (APIs).
// The policy proxy route enforces the same thing again per call, so this is not the only check.
const JUDGE_PAGES = /^\/(?:approvals|how-it-works)?\/?$/;
const JUDGE_APIS = /^\/api\/(?:policy\/|ledger\/agent$)/;

// Optimistic gate: every page and API call needs the passcode cookie.
// The API route re-checks it, so this isn't the only line of defence.
export async function proxy(req: NextRequest) {
  const role = await sessionRole(req.cookies.get(SESSION_COOKIE)?.value);
  const p = req.nextUrl.pathname;
  if (role === "owner") return NextResponse.next();
  if (role === "judge") {
    if (p.startsWith("/api/")) {
      return JUDGE_APIS.test(p) ? NextResponse.next() : NextResponse.json({ error: "Judges can only approve or reject payments." }, { status: 403 });
    }
    if (JUDGE_PAGES.test(p)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/approvals";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = req.nextUrl.pathname === "/" ? "" : `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|robots.txt).*)"],
};
