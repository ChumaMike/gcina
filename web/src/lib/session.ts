// Demo passcode gate. The cookie holds a signed, expiring token: `${issuedAt}.${nonce}.${sig}`.
// It never contains the passcode. Uses Web Crypto so it runs in proxy.ts and route handlers.
// Revoking every session = change SESSION_SECRET or DASHBOARD_PASSCODE (both are in the signature).

export const SESSION_COOKIE = "gcina_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 h: one demo day

const MIN_PASSCODE = 12;
const isProd = () => process.env.NODE_ENV === "production";

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

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  const c = config();
  if (!c || !cookie) return false;
  const [iat, nonce, sig] = cookie.split(".");
  if (!iat || !nonce || !sig || !/^\d+$/.test(iat)) return false;
  const age = Math.floor(Date.now() / 1000) - Number(iat);
  if (age < -60 || age > SESSION_MAX_AGE) return false;
  return safeEqual(sig, await hmac(c.secret, payload(c.pass, iat, nonce)));
}

export async function passcodeMatches(input: string): Promise<boolean> {
  const c = config();
  if (!c) return false;
  // Compare HMACs so timing never leaks the passcode or its length.
  return safeEqual(await hmac(c.secret, `pc:${input}`), await hmac(c.secret, `pc:${c.pass}`));
}

/** Only same-origin relative paths; everything else falls back to "/". */
export function safeNext(next: string): string {
  if (!next || /[\\\u0000-\u001f]/.test(next)) return "/";
  try {
    const u = new URL(next, "http://gcina.local");
    if (u.origin !== "http://gcina.local") return "/";
    return u.pathname + u.search;
  } catch {
    return "/";
  }
}
