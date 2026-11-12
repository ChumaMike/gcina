"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, passcodeMatches, sessionToken } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const passcode = String(form.get("passcode") ?? "");
  const next = String(form.get("next") ?? "/");
  if (!process.env.DASHBOARD_PASSCODE) {
    return { error: "This dashboard has no passcode set yet, so it stays locked." };
  }
  if (!(await passcodeMatches(passcode))) {
    return { error: "That passcode isn't right. Try again." };
  }
  const token = await sessionToken();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
