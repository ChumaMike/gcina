// Demo passcode gate. The cookie holds a signed, expiring token: `${issuedAt}.${nonce}.${sig}`.
// It never contains the passcode. Uses Web Crypto so it runs in proxy.ts and route handlers.
// Revoking every session = change SESSION_SECRET or DASHBOARD_PASSCODE (both are in the signature).
//
// Judge mode: a second passcode (JUDGE_PASSCODE) gives a "judge" session, cookie `j.${iat}.${nonce}.${sig}`,
// signed over the judge passcode. It only works until JUDGE_EXPIRES_AT (default Sat 14 Nov 2026 18:00 SAST),
// and the policy proxy lets it do nothing but read and approve/reject held payments.

export const SESSION_COOKIE = "gcina_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 h: one demo day

const MIN_PASSCODE = 12;
const isProd = () => process.env.NODE_ENV === "production";

export type Role = "owner" | "judge";

/** When judge access ends for good, whatever the cookie says. */
export function judgeExpiresAt(): number {
  const t = Date.parse(process.env.JUDGE_EXPIRES_AT ?? "2026-11-14T18:00:00+02:00");
  return Number.isFinite(t) ? t : 0;
}

/** Null = judge mode is off (unset, too short, same as the owner passcode, or past its end date). */
function judgeConfig(): { secret: string; pass: string } | null {
  const c = config();
  const pass = process.env.JUDGE_PASSCODE ?? "";
  if (!c || pass.length < MIN_PASSCODE || pass === c.pass || Date.now() >= judgeExpiresAt()) return null;
  return { secret: c.secret, pass };
}

export const judgeEnabled = () => judgeConfig() !== null;

/** The judge passcode itself, for the owner-only /judge QR page. Server-only callers. */
export const judgePasscode = () => judgeConfig()?.pass ?? null;

/** Null = the gate is misconfigured and must stay locked. */
function config(): { secret: string; pass: string } | null {
  const pass = process.env.DASHBOARD_PASSCODE ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  if (!pass) return null;
  if (isProd()) {
    // In production the signing key must be separate from the passcode and the passcode strong.
    if (secret.length < 32 || secret === pass || pass.length < MIN_PASSCODE) return null;
    return { secret, pass };
  }
  return { secret: secret || pass, pass };
}

export function gateConfigured(): boolean {
  return config() !== null;
}

async function hmac(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const payload = (pass: string, iat: string, nonce: string) => `gcina-operator:v2:${iat}:${nonce}:${pass}`;

export async function issueSession(): Promise<string | null> {
  const c = config();
  if (!c) return null;
  const iat = Math.floor(Date.now() / 1000).toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${iat}.${nonce}.${await hmac(c.secret, payload(c.pass, iat, nonce))}`;
}

const judgePayload = (pass: string, iat: string, nonce: string) => `gcina-judge:v1:${iat}:${nonce}:${pass}`;

export async function issueJudgeSession(): Promise<string | null> {
  const c = judgeConfig();
  if (!c) return null;
  const iat = Math.floor(Date.now() / 1000).toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `j.${iat}.${nonce}.${await hmac(c.secret, judgePayload(c.pass, iat, nonce))}`;
}

/** Seconds a fresh judge cookie should live: 12 h, but never past the judge end date. */
export const judgeMaxAge = () => Math.max(0, Math.min(SESSION_MAX_AGE, Math.floor((judgeExpiresAt() - Date.now()) / 1000)));

const fresh = (iat: string | undefined) => {
  if (!iat || !/^\d+$/.test(iat)) return false;
  const age = Math.floor(Date.now() / 1000) - Number(iat);
  return age >= -60 && age <= SESSION_MAX_AGE;
};

/** Who this cookie belongs to, or null if it is not a valid, unexpired session. */
export async function sessionRole(cookie: string | undefined): Promise<Role | null> {
  const c = config();
  if (!c || !cookie) return null;
  const parts = cookie.split(".");
  if (parts.length === 4 && parts[0] === "j") {
    const j = judgeConfig(); // null after the end date, so every judge cookie dies with it
    const [, iat, nonce, sig] = parts;
    if (!j || !nonce || !sig || !fresh(iat)) return null;
    return safeEqual(sig, await hmac(j.secret, judgePayload(j.pass, iat, nonce))) ? "judge" : null;
  }
  const [iat, nonce, sig] = parts;
  if (parts.length !== 3 || !nonce || !sig || !fresh(iat)) return null;
  return safeEqual(sig, await hmac(c.secret, payload(c.pass, iat, nonce))) ? "owner" : null;
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  return (await sessionRole(cookie)) !== null;
}

export async function passcodeMatches(input: string): Promise<boolean> {
  return (await passcodeRole(input)) === "owner";
}

/** Which passcode this is, if any. Both are always compared, as HMACs, so timing leaks nothing. */
export async function passcodeRole(input: string): Promise<Role | null> {
  const c = config();
  if (!c) return null;
  const j = judgeConfig();
  const mine = await hmac(c.secret, `pc:${input}`);
  const owner = safeEqual(mine, await hmac(c.secret, `pc:${c.pass}`));
  const judge = safeEqual(mine, await hmac(c.secret, `pc:${j?.pass ?? "\u0000no-judge"}`)) && j !== null;
  return owner ? "owner" : judge ? "judge" : null;
}

/** Only same-origin relative paths; everything else falls back to "/". */
export function safeNext(next: string): string {
  if (!next || /[\\\u0000-\u001f]/.test(next)) return "/";
  try {
    const u = new URL(next, "http://gcina.local");
    if (u.origin !== "http://gcina.local") return "/";
    // Normalisation can turn "/.//evil.com" into "//evil.com", so re-check the result.
    const out = u.pathname + u.search;
    return out.startsWith("/") && !out.startsWith("//") && !/[\\\u0000-\u001f]/.test(out) ? out : "/";
  } catch {
    return "/";
  }
}
