import "server-only";
// The only place OPERATOR_TOKEN is read. It never leaves the server.
import { mockRequest } from "./mock";

export const mockEnabled = () => process.env.USE_MOCK === "1";

export type UpstreamResult = { status: number; body: unknown };

export async function callPolicy(method: string, path: string, body?: unknown): Promise<UpstreamResult> {
  if (mockEnabled()) return mockRequest(method, path, body);

  const base = process.env.POLICY_URL;
  const token = process.env.OPERATOR_TOKEN;
  if (!base || !token) {
    return { status: 500, body: { error: "The dashboard isn't connected yet (POLICY_URL or OPERATOR_TOKEN missing)." } };
  }
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { error: text.slice(0, 300) };
    }
    return { status: res.status, body: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 502, body: { error: `Can't reach the policy service right now (${msg}).` } };
  }
}
