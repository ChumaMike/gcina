"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  gateConfigured,
  issueSession,
  passcodeMatches,
  safeNext,
} from "@/lib/session";

export type LoginState = { error?: string };

// Throttle guesses: per-IP lockout with a growing delay, plus a global cap.
// In-memory, so it's per server instance; the strong-passcode rule in session.ts is the
// main defence, this just makes online guessing slow.
type Bucket = { fails: number; until: number };
const g = globalThis as unknown as { __gcinaLogin?: { ip: Map<string, Bucket>; global: number[] } };
const state = (g.__gcinaLogin ??= { ip: new Map(), global: [] });
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_FAILS = 30;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const passcode = String(form.get("passcode") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));
  if (!gateConfigured()) {
    return { error: "This dashboard isn't set up with a passcode yet, so it stays locked." };
  }

  const ip = await clientIp();
  const now = Date.now();
  state.global = state.global.filter((t) => now - t < GLOBAL_WINDOW_MS);
  const b = state.ip.get(ip) ?? { fails: 0, until: 0 };
  if (b.until > now || state.global.length >= GLOBAL_MAX_FAILS) {
    const wait = Math.max(1, Math.ceil(((b.until > now ? b.until : now + GLOBAL_WINDOW_MS) - now) / 1000));
    return { error: `Too many tries. Please wait ${wait} seconds and try again.` };
  }

  if (passcode.length > 200 || !(await passcodeMatches(passcode))) {
    b.fails += 1;
    // 3 free tries, then 5 s, 10 s, 20 s … capped at 15 min
    if (b.fails >= 3) b.until = now + Math.min(15 * 60_000, 5_000 * 2 ** (b.fails - 3));
    state.ip.set(ip, b);
    state.global.push(now);
    if (state.ip.size > 5000) state.ip.clear();
    await new Promise((r) => setTimeout(r, 400));
    return { error: "That passcode isn't right. Try again." };
  }
  state.ip.delete(ip);

  const token = await issueSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(next);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
