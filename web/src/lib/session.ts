// Demo passcode gate. The cookie holds an HMAC, never the passcode itself.
// Uses Web Crypto so the same code runs in proxy.ts and in route handlers.

export const SESSION_COOKIE = "gcina_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // a week covers the hackathon

function secret(): string | null {
  const s = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSCODE;
  return s && s.length > 0 ? s : null;
}

async function hmac(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token bound to the current passcode, so changing the passcode logs everyone out. */
export async function sessionToken(): Promise<string | null> {
  const s = secret();
  const pass = process.env.DASHBOARD_PASSCODE;
  if (!s || !pass) return null;
  return hmac(s, `gcina-operator:${pass}`);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const expected = await sessionToken();
  return expected !== null && safeEqual(cookie, expected);
}

export async function passcodeMatches(input: string): Promise<boolean> {
  const pass = process.env.DASHBOARD_PASSCODE;
  if (!pass) return false;
  // Compare HMACs so the comparison length never leaks the passcode length.
  const s = secret() ?? "";
  return safeEqual(await hmac(s, input), await hmac(s, pass));
}
