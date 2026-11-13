import { NextResponse } from "next/server";
import { getZarRate } from "@/lib/rate";

export async function GET() {
  return NextResponse.json(await getZarRate(), { headers: { "cache-control": "no-store" } });
}
