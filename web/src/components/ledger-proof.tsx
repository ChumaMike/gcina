"use client";

import { CheckCircle2, ExternalLink, KeyRound, RefreshCw, ShieldCheck, UserX } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { ErrorNote } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENT_ACCOUNT, type SignerProof } from "@/lib/addresses";
import { accountUrl, txUrl } from "@/lib/money";
import { cn } from "@/lib/utils";

/** A small QR code of a public-ledger link, so anyone in the room can check it on their own phone. */
export function LedgerQr({ url, label, size = 72, className }: { url: string; label: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(null));
    return () => {
      live = false;
    };
  }, [url]);
  if (!svg) return <span className={cn("inline-block shrink-0 rounded-md bg-muted", className)} style={{ width: size, height: size }} aria-hidden="true" />;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-block shrink-0 rounded-md border border-border bg-white p-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL, nothing to optimise */}
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt={`QR code: ${label} (opens in a new tab)`} className="size-full" />
    </a>
  );
}

export const TxQr = ({ hash, size }: { hash: string; size?: number }) => <LedgerQr url={txUrl(hash)} label="scan to see this payment on the public XRP Ledger" size={size} />;

const ORDER = ["agent", "policy", "owner", ""];
const ROLE_ICON = { agent: KeyRound, policy: ShieldCheck, owner: KeyRound } as const;

/** "See it on the public ledger": the agent account's signer list, read live from XRPL Testnet. */
export function LedgerProofCard() {
  const [proof, setProof] = useState<SignerProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ledger/agent", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? `Something went wrong (${res.status}).`);
      setProof(j as SignerProof);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // Initial read of an external system (the ledger) on mount, then every 30 s.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const agentOn = proof?.signers.some((s) => s.role === "agent");
  const owner = proof?.signers.find((s) => s.role === "owner");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">See it on the public ledger</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Who can move money from the agent&apos;s account. Read live from the XRP Ledger, not from our servers.</p>
        </div>
        <Button variant="outline" size="icon" className="size-11 shrink-0" onClick={load} disabled={busy} aria-label="Check the ledger again">
          <RefreshCw className={cn("size-5", busy && "animate-spin")} aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorNote message={error ?? undefined} />
        {!proof && !error && <Skeleton className="h-40 w-full" />}
        {proof && (
          <>
            <ul className="flex flex-col gap-2">
              {[...proof.signers].sort((x, y) => ORDER.indexOf(x.role ?? "") - ORDER.indexOf(y.role ?? "")).map((s) => {
                const Icon = (s.role && ROLE_ICON[s.role]) || KeyRound;
                return (
                  <li key={s.address} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.label ?? "Unknown key"}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">{s.address}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-semibold tabular-nums">
                      {s.weight} {s.weight === 1 ? "vote" : "votes"}
                    </span>
                  </li>
                );
              })}
              {!agentOn && (
                <li className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger-soft p-3 font-medium text-danger">
                  <UserX className="size-5 shrink-0" aria-hidden="true" /> The agent is fired: its key is no longer on the list.
                </li>
              )}
            </ul>
            <p className="flex items-start gap-2 rounded-xl bg-ok-soft p-3 text-[0.95rem] font-medium text-ok">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                A payment needs {proof.quorum ?? "?"} votes. {agentOn ? "The agent has 1, so it can never pay alone; your rules must sign too." : ""}
                {owner ? ` You hold ${owner.weight}, so you can always act without it.` : ""}
                {proof.masterDisabled ? " The account's master key is switched off." : " Warning: the master key is still on."}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <LedgerQr url={accountUrl(AGENT_ACCOUNT)} label="scan to open the agent's account on the public XRP Ledger" size={88} />
              <div className="flex flex-col gap-1 text-sm">
                <a href={accountUrl(AGENT_ACCOUNT)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
                  Open the agent&apos;s account on testnet.xrpl.org <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                {proof.changedBy && (
                  <a href={txUrl(proof.changedBy)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-muted-foreground underline-offset-4 hover:underline">
                    Last change to this list: {proof.changedBy.slice(0, 8)}… <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                <span className="text-xs text-muted-foreground">
                  Checked {new Date(proof.checkedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  {proof.ledgerIndex ? ` · ledger #${proof.ledgerIndex.toLocaleString("en-ZA")}` : ""}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
