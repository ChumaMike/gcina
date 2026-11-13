// Public payment receipt. No sign-in, and nothing from our own services: every fact on this page
// is read from a public XRP Ledger Testnet node, so a supplier can check it against any explorer.
import { BadgeCheck, CircleAlert, ExternalLink, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { Wordmark } from "@/components/logo";
import { AGENT_ACCOUNT, SIGNER_ROLES } from "@/lib/addresses";
import { accountUrl, formatAmount, formatZar, setZarRate, shortAddr, txUrl } from "@/lib/money";
import { getZarRate } from "@/lib/rate";
import type { Amount } from "@/lib/types";

export const metadata: Metadata = { title: "Payment receipt" };

const RPC = process.env.XRPL_RPC_URL || "https://s.altnet.rippletest.net:51234";
const RLUSD_HEX = "524C555344000000000000000000000000000000";
const RIPPLE_EPOCH = 946_684_800;

type Tx = {
  Account?: string;
  Destination?: string;
  TransactionType?: string;
  Fee?: string;
  Memos?: { Memo: { MemoData?: string } }[];
  Signers?: { Signer: { Account: string } }[];
  date?: number;
  ledger_index?: number;
  validated?: boolean;
  meta?: { TransactionResult?: string; delivered_amount?: string | { currency: string; value: string } };
  error?: string;
};

const SIGNER_PLAIN: Record<string, string> = {
  agent: "The AI agent",
  policy: "The owner's rules (independent co-signer)",
  owner: "The owner",
};

async function load(hash: string): Promise<Tx | null> {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "tx", params: [{ transaction: hash }] }),
      // A validated transaction never changes, so it is safe to keep.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    return ((await res.json()) as { result?: Tx }).result ?? null;
  } catch {
    return null;
  }
}

function billNumber(tx: Tx): string | null {
  for (const m of tx.Memos ?? []) {
    try {
      const j = JSON.parse(Buffer.from(m.Memo.MemoData ?? "", "hex").toString("utf8")) as { invoiceId?: unknown };
      if (typeof j.invoiceId === "string" && /^[\w.-]{1,40}$/.test(j.invoiceId)) return j.invoiceId;
    } catch {
      // not our memo
    }
  }
  return null;
}

function delivered(tx: Tx): Amount | null {
  const d = tx.meta?.delivered_amount;
  if (!d) return null;
  if (typeof d === "string") return { currency: "XRP", value: d };
  if (d.currency !== RLUSD_HEX && d.currency !== "RLUSD") return null;
  const [w, f = ""] = d.value.split(".");
  return { currency: "RLUSD", value: `${w}.${(f + "00").slice(0, 2)}` };
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <Frame>
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-6 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-muted-foreground">{text}</p>
        </div>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-muted/40 px-4 py-8 sm:py-14">
      <Wordmark tagline={false} />
      <section className="mt-6 w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg sm:p-7">{children}</section>
      <p className="mt-5 max-w-md text-center text-xs text-muted-foreground">
        Gcina is a demo on the XRP Ledger Testnet. No real money moved. This page shows only what is public on the ledger.
      </p>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

export default async function ReceiptPage({ params }: PageProps<"/r/[hash]">) {
  const { hash: raw } = await params;
  const hash = raw.toUpperCase();
  if (!/^[A-F0-9]{64}$/.test(hash)) {
    return <Problem title="This isn't a payment reference" text="Check the link and try again." />;
  }
  const tx = await load(hash);
  if (!tx) return <Problem title="Couldn't reach the XRP Ledger" text="Please try again in a minute." />;
  if (tx.error || tx.TransactionType !== "Payment" || tx.Account !== AGENT_ACCOUNT) {
    return <Problem title="Not a Gcina payment" text="The ledger has no payment from a Gcina account with this reference." />;
  }
  const amount = delivered(tx);
  if (!tx.validated || tx.meta?.TransactionResult !== "tesSUCCESS" || !amount) {
    return <Problem title="This payment did not go through" text="The ledger did not settle this transaction, so nothing was paid." />;
  }

  const rate = await getZarRate();
  setZarRate(rate.rate);
  const bill = billNumber(tx);
  const signers = (tx.Signers ?? []).map((s) => s.Signer.Account);
  const when = tx.date
    ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date((tx.date + RIPPLE_EPOCH) * 1000))
    : null;

  return (
    <Frame>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok">
        <BadgeCheck className="size-4" aria-hidden="true" /> Paid and settled
      </p>
      <h1 className="mt-4 text-4xl font-bold tabular-nums tracking-tight">{formatAmount(amount)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        About {formatZar(amount)} at today&rsquo;s {rate.source === "valr" ? "VALR market price" : "indicative rate"} (R {rate.rate.toFixed(2)} per RLUSD).
      </p>

      <dl className="mt-5 divide-y border-y">
        {bill && <Row label="Bill">{bill}</Row>}
        <Row label="Paid to">
          <a className="font-mono text-primary underline-offset-4 hover:underline" href={accountUrl(tx.Destination ?? "")} target="_blank" rel="noreferrer">
            {shortAddr(tx.Destination ?? "")}
          </a>
        </Row>
        {when && <Row label="Settled">{when}</Row>}
        {tx.ledger_index && <Row label="Ledger number">{tx.ledger_index.toLocaleString("en-ZA")}</Row>}
        {tx.Fee && <Row label="Network fee">{(Number(tx.Fee) / 1_000_000).toFixed(6)} XRP</Row>}
      </dl>

      <h2 className="mt-5 text-sm font-semibold">Signed by {signers.length} separate keys</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {signers.map((a) => (
          <li key={a} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
            <KeyRound className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-medium">{SIGNER_PLAIN[SIGNER_ROLES[a]?.role ?? ""] ?? "Another signer"}</span>
              <span className="block font-mono text-xs text-muted-foreground">{shortAddr(a)}</span>
            </span>
            <BadgeCheck className="size-4 shrink-0 text-ok" aria-hidden="true" />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        The ledger only accepts a payment from this account when two keys sign it. The AI agent holds one.
      </p>

      <a
        href={txUrl(hash)}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Check it yourself on the XRP Ledger <ExternalLink className="size-4" aria-hidden="true" />
      </a>
      <p className="mt-3 font-mono text-[0.68rem] break-all text-muted-foreground">Reference: {hash}</p>
    </Frame>
  );
}
