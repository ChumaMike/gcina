// A photo or PDF of a bill → plain text, read by the agent service (which holds the model key).
// The text comes back to the supplier to check and send; it is then handled like any typed bill.
import { NextResponse, type NextRequest } from "next/server";
import { ownerOnly } from "@/lib/xero-route";

export const maxDuration = 60;

const AGENT_URL = (process.env.AGENT_URL ?? "https://gcina-agent.vercel.app").replace(/\/$/, "");
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(req: NextRequest) {
  const no = await ownerOnly();
  if (no) return no;
  const secret = (process.env.AGENT_WAKE_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ error: "Reading photos isn't switched on yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { mediaType?: unknown; data?: unknown };
  if (typeof b.data !== "string" || typeof b.mediaType !== "string" || !TYPES.has(b.mediaType) || b.data.length > 4_300_000) {
    return NextResponse.json({ error: "Send a photo or PDF under 3 MB." }, { status: 400 });
  }
  try {
    const res = await fetch(`${AGENT_URL}/read-document`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-gcina-wake": secret },
      body: JSON.stringify({ mediaType: b.mediaType, data: b.data }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    if (!res.ok || !j.text) return NextResponse.json({ error: j.error ?? "Couldn't read that document." }, { status: res.status === 422 ? 422 : 502 });
    return NextResponse.json({ text: j.text }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The reader took too long. Try again, or a smaller photo." }, { status: 504 });
  }
}
