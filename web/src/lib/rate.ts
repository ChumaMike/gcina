import "server-only";

// Indicative rand value of one RLUSD, from VALR's public RLUSD/ZAR market (no account needed).
// It is a display aid only: what settles on the ledger is RLUSD, and no rands move.
export type ZarRate = {
  /** Rands for one RLUSD. */
  rate: number;
  source: "valr" | "fixed";
  /** When VALR last updated the quote (ISO), or when we fell back. */
  at: string;
};

export const FIXED_RATE = 18;
const URL = "https://api.valr.com/v1/public/RLUSDZAR/marketsummary";

export async function getZarRate(): Promise<ZarRate> {
  try {
    const res = await fetch(URL, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { markPrice?: string; bidPrice?: string; askPrice?: string; created?: string };
    const bid = Number(j.bidPrice);
    const ask = Number(j.askPrice);
    const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : Number(j.markPrice);
    // Sanity bounds: a wild number is worse than the fixed fallback.
    if (!Number.isFinite(mid) || mid < 10 || mid > 40) throw new Error("out of range");
    return { rate: Math.round(mid * 1000) / 1000, source: "valr", at: j.created ?? new Date().toISOString() };
  } catch {
    return { rate: FIXED_RATE, source: "fixed", at: new Date().toISOString() };
  }
}
