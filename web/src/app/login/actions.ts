"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  gateConfigured,
  issueJudgeSession,
  issueSession,
  judgeMaxAge,
  passcodeRole,
  safeNext,
} from "@/lib/session";

export type LoginState = { error?: string };

// Throttle guesses: per-IP lockout with a growing delay, plus a global slow-down.
// In-memory, so it's per server instance; the strong-passcode rule in session.ts is the
// main defence, this just makes online guessing slow. The global counter only adds delay
// and never blocks, so nobody can lock the owner out (e.g. during a live demo).
type Bucket = { fails: number; until: number };
const g = globalThis as unknown as { __gcinaLogin?: { ip: Map<string, Bucket>; global: number[] } };
type ThrottleState = { ip: Map<string, Bucket>; global: number[] };
const state: ThrottleState = (g.__gcinaLogin ??= { ip: new Map<string, Bucket>(), global: [] as number[] });
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_SLOW_AFTER = 30;
const MAX_TRACKED_IPS = 5000;

// On Vercel, x-real-ip / x-forwarded-for are set by the edge and overwrite anything the
// client sends, so they're trustworthy there. Locally they're whatever curl says, which is fine.
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function recordFail(ip: string, b: Bucket, now: number) {
  b.fails += 1;
  // 3 free tries, then 5 s, 10 s, 20 s … capped at 15 min
  if (b.fails >= 3) b.until = now + Math.min(15 * 60_000, 5_000 * 2 ** (b.fails - 3));
  state.ip.delete(ip); // re-insert so Map order = least recently failed first
  state.ip.set(ip, b);
  while (state.ip.size > MAX_TRACKED_IPS) {
    // Evict the oldest entry that isn't currently locked out; never wipe everyone's lockout.
    let evicted = false;
    for (const [k, v] of state.ip) {
      if (v.until <= now) {
        state.ip.delete(k);
        evicted = true;
        break;
      }
    }
    if (!evicted) state.ip.delete(state.ip.keys().next().value!);
  }
  state.global.push(now);
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
  if (b.until > now) {
    const wait = Math.max(1, Math.ceil((b.until - now) / 1000));
    return { error: `Too many tries. Please wait ${wait} seconds and try again.` };
  }
  // Under a global burst of failures, everyone waits a little longer, but no one is blocked.
  const busy = state.global.length >= GLOBAL_SLOW_AFTER;
  await new Promise((r) => setTimeout(r, busy ? 2000 : 0));

  const role = passcode.length > 200 ? null : await passcodeRole(passcode);
  if (!role) {
    recordFail(ip, b, now);
    await new Promise((r) => setTimeout(r, 400));
    return { error: "That passcode isn't right. Try again." };
  }
  state.ip.delete(ip);

  const token = role === "judge" ? await issueJudgeSession() : await issueSession();
  if (!token) return { error: "Judge access has ended. Thank you for trying Gcina." };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: role === "judge" ? judgeMaxAge() : SESSION_MAX_AGE,
  });
  // A judge always lands on the one thing they can do.
  redirect(role === "judge" ? "/approvals" : next);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
