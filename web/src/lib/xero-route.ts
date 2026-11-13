import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionRole } from "./session";
import { XeroError } from "./xero";

/** Xero routes are for the owner only: a judge session gets 403. Returns a response to send, or null to carry on. */
export async function ownerOnly(): Promise<NextResponse | null> {
  const role = await sessionRole((await cookies()).get(SESSION_COOKIE)?.value);
  if (!role) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can use the Xero connection." }, { status: 403 });
  return null;
}

export function xeroFail(e: unknown): NextResponse {
  const known = e instanceof XeroError;
  if (!known) console.error("[xero]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: known ? e.message : "Something went wrong talking to Xero." }, { status: known ? 400 : 502 });
}
