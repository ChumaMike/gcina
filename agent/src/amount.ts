// Copied from ledger/src/amount.ts (CONTRACTS §1: no imports across folders). Keep in sync by hand.
// Currency-agnostic money for Gcina (CONTRACTS §2).
// API shape: { currency: "RLUSD" | "XRP", value: string }
//   XRP   -> value is integer drops
//   RLUSD -> value is a decimal string with at most 2 decimals; maths in integer cents (bigint). Never floats.

export type Currency = "RLUSD" | "XRP";
export type Amount = { currency: Currency; value: string };

export const RLUSD_TESTNET_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
/** "RLUSD" is 5 chars, so the ledger uses the 160-bit hex currency code. */
export const RLUSD_HEX = "524C555344000000000000000000000000000000";

export type LedgerAmount = string | { currency: string; issuer: string; value: string };

/** Integer minor units: drops for XRP, cents for RLUSD. Throws on anything malformed. */
export function toMinor(a: Amount): bigint {
  if (a.currency === "XRP") {
    if (!/^\d+$/.test(a.value)) throw new Error(`XRP amount must be integer drops, got "${a.value}"`);
    return BigInt(a.value);
  }
  if (a.currency === "RLUSD") {
    const m = a.value.match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!m) throw new Error(`RLUSD amount must be a decimal with at most 2 places, got "${a.value}"`);
    return BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0"));
  }
  throw new Error(`Unsupported currency ${(a as Amount).currency}`);
}

export function fromMinor(currency: Currency, minor: bigint): Amount {
  if (minor < 0n) throw new Error("negative amount");
  if (currency === "XRP") return { currency, value: minor.toString() };
  const cents = (minor % 100n).toString().padStart(2, "0");
  return { currency, value: `${minor / 100n}.${cents}` };
}

export function toLedgerAmount(a: Amount, issuer = RLUSD_TESTNET_ISSUER): LedgerAmount {
  toMinor(a); // validate
  if (a.currency === "XRP") return a.value;
  return { currency: RLUSD_HEX, issuer, value: a.value };
}

/**
 * Parses a ledger Amount back into our Amount. Returns null for anything that is not
 * exactly XRP or RLUSD from the expected issuer, or that has more precision than cents.
 */
export function fromLedgerAmount(l: unknown, issuer = RLUSD_TESTNET_ISSUER): Amount | null {
  if (typeof l === "string") return /^\d+$/.test(l) ? { currency: "XRP", value: l } : null;
  if (!l || typeof l !== "object") return null;
  const o = l as { currency?: string; issuer?: string; value?: string };
  const isRlusd = o.currency === RLUSD_HEX || o.currency === "RLUSD";
  if (!isRlusd || o.issuer !== issuer || typeof o.value !== "string") return null;
  const cents = decimalToCents(o.value);
  return cents === null ? null : fromMinor("RLUSD", cents);
}

/** Exact decimal (incl. exponent forms the codec may emit) to cents; null if sub-cent or negative. */
function decimalToCents(v: string): bigint | null {
  const m = v.trim().match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
  if (!m) return null;
  let digits = m[1] + (m[2] ?? "");
  let scale = (m[2] ?? "").length - Number(m[3] ?? 0); // value = digits * 10^-scale
  // cents = digits * 10^(2 - scale)
  const shift = 2 - scale;
  if (shift >= 0) return BigInt(digits) * 10n ** BigInt(shift);
  const cut = -shift;
  digits = digits.padStart(cut + 1, "0");
  const tail = digits.slice(-cut);
  if (/[^0]/.test(tail)) return null; // sub-cent precision: refuse
  return BigInt(digits.slice(0, -cut));
}

export function sameAmount(a: Amount, b: Amount): boolean {
  return a.currency === b.currency && toMinor(a) === toMinor(b);
}

export function formatAmount(a: Amount): string {
  if (a.currency === "XRP") {
    const d = toMinor(a);
    const frac = (d % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
    return `${d / 1_000_000n}${frac ? `.${frac}` : ""} XRP`;
  }
  return `$ ${fromMinor("RLUSD", toMinor(a)).value} RLUSD`;
}

/** Indicative rand value at the fixed demo rate (CONTRACTS §2), formatted "R 1 234.56". RLUSD only. */
export const ZAR_PER_USD = 18n;
export function indicativeZar(a: Amount): string | null {
  if (a.currency !== "RLUSD") return null;
  const cents = toMinor(a) * ZAR_PER_USD;
  const rands = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R ${rands}.${(cents % 100n).toString().padStart(2, "0")}`;
}
