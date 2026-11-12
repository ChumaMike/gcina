import type { Amount, Currency } from "./types";

// CONTRACTS §2: fixed demo rates, always labelled "indicative".
export const ZAR_PER_USD = 18;
export const ZAR_PER_XRP = 40;
const DROPS_PER_XRP = 1_000_000n;

/** Amount → integer minor units (RLUSD cents, XRP drops). Never floats. */
export function toMinor(a: Amount): bigint {
  if (a.currency === "XRP") return BigInt(a.value || "0");
  const [whole, frac = ""] = (a.value || "0").trim().split(".");
  const cents = (frac + "00").slice(0, 2);
  const neg = whole.startsWith("-");
  const n = BigInt(whole.replace("-", "") || "0") * 100n + BigInt(cents);
  return neg ? -n : n;
}

export function fromMinor(currency: Currency, minor: bigint): Amount {
  if (currency === "XRP") return { currency, value: minor.toString() };
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const value = `${neg ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
  return { currency, value };
}

/** Group thousands with a space, SA style: 1 234 567. */
function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function fixed2(minorHundredths: bigint): string {
  const neg = minorHundredths < 0n;
  const abs = neg ? -minorHundredths : minorHundredths;
  return `${neg ? "-" : ""}${group((abs / 100n).toString())}.${(abs % 100n).toString().padStart(2, "0")}`;
}

/** "$ 20.00 RLUSD" or "20 XRP" */
export function formatAmount(a: Amount): string {
  if (a.currency === "RLUSD") return `$ ${fixed2(toMinor(a))} RLUSD`;
  const drops = toMinor(a);
  const whole = drops / DROPS_PER_XRP;
  const rem = drops % DROPS_PER_XRP;
  const frac = rem === 0n ? "" : "." + rem.toString().padStart(6, "0").replace(/0+$/, "");
  return `${group(whole.toString())}${frac} XRP`;
}

/** Short form for tight spaces: "$20.00" / "20 XRP". */
export function formatShort(a: Amount): string {
  return a.currency === "RLUSD" ? `$${fixed2(toMinor(a))}` : formatAmount(a);
}

/** Indicative rand value in cents. */
export function zarCents(a: Amount): bigint {
  if (a.currency === "RLUSD") return toMinor(a) * BigInt(ZAR_PER_USD);
  return (toMinor(a) * BigInt(ZAR_PER_XRP) * 100n) / DROPS_PER_XRP;
}

/** "R 1 234.56" */
export function formatZar(a: Amount): string {
  return `R ${fixed2(zarCents(a))}`;
}

/** Parse what an owner types ("20", "20.5", "1 200,50") into an Amount. Null if invalid. */
export function parseInput(currency: Currency, input: string): Amount | null {
  const clean = input.replace(/\s/g, "").replace(",", ".").replace(/^\$/, "");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  if (currency === "RLUSD") {
    const [w, f = ""] = clean.split(".");
    return { currency, value: `${BigInt(w)}.${(f + "00").slice(0, 2)}` };
  }
  const [w, f = ""] = clean.split(".");
  const drops = BigInt(w) * DROPS_PER_XRP + BigInt((f + "000000").slice(0, 6));
  return { currency, value: drops.toString() };
}

/** Editable plain number for an input box: "20.00" / "20". */
export function toInput(a: Amount): string {
  if (a.currency === "RLUSD") return fromMinor("RLUSD", toMinor(a)).value;
  return formatAmount(a).replace(" XRP", "").replace(/\s/g, "");
}

export function percent(part: Amount, whole: Amount): number {
  const w = toMinor(whole);
  if (w <= 0n) return 0;
  return Math.min(100, Number((toMinor(part) * 10000n) / w) / 100);
}

export const EXPLORER = "https://testnet.xrpl.org";
export const txUrl = (hash: string) => `${EXPLORER}/transactions/${hash}`;
export const accountUrl = (addr: string) => `${EXPLORER}/accounts/${addr}`;
export const shortAddr = (addr: string) =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
