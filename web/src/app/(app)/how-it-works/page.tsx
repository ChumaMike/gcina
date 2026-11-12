import { ArrowDown, ArrowRight, Bot, FileText, Landmark, ShieldCheck } from "lucide-react";
import { RlusdBadge } from "@/components/bits";
import { accountUrl, txUrl } from "@/lib/money";
import { LedgerProofCard } from "@/components/ledger-proof";
import { cn } from "@/lib/utils";

export const metadata = { title: "How it works" };

// Public facts from docs/addresses.md (committed, no secrets).
const AGENT_ACCOUNT = "rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq";
const SIGNER_LIST_TX = "BD09D89B09C4F40CEC53D62671300E0D8499D3B0268018E77852429B93BC2186";

const STEPS = [
  { icon: FileText, title: "Invoice arrives", body: "From a supplier, by email or upload.", cls: "bg-muted text-foreground", ring: "ring-border" },
  { icon: Bot, title: "Agent signs 1 of 2", body: "Reads it, matches the order, proposes a payment.", cls: "bg-agent-soft text-agent", ring: "ring-agent/30" },
  { icon: ShieldCheck, title: "Policy signs 2 of 2", body: "Only within your limits, to approved suppliers.", cls: "bg-info-soft text-info", ring: "ring-info/30" },
  { icon: Landmark, title: "XRP Ledger checks", body: "Needs both signatures, or it refuses the payment.", cls: "bg-ok-soft text-ok", ring: "ring-ok/30" },
];

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-3">
        <RlusdBadge className="self-start" />
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          The agent alone cannot move money.
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground sm:text-xl">
          Every payment needs two signatures. The agent holds one. Your limits hold the other. The XRP Ledger itself enforces it.
        </p>
      </header>

      <ol className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:gap-2" aria-label="How a payment happens">
        {STEPS.map((s, i) => (
          <li key={s.title} className="contents">
            <div className={cn("flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm ring-1 lg:flex-col lg:items-start lg:p-6", s.ring)}>
              <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl lg:size-16", s.cls)}>
                <s.icon className="size-7 lg:size-8" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step {i + 1}</p>
                <p className="text-lg font-semibold lg:text-xl">{s.title}</p>
                <p className="text-muted-foreground lg:mt-1 lg:text-base">{s.body}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex items-center justify-center text-muted-foreground" aria-hidden="true">
                <ArrowDown className="size-6 lg:hidden" />
                <ArrowRight className="hidden size-7 lg:block" />
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 md:grid-cols-3">
        <Fact title="Agent fooled?" tone="danger">
          A fake “new banking details” invoice tricks the agent. The policy sees the address isn&apos;t approved and holds it for you.
        </Fact>
        <Fact title="Agent hacked?" tone="danger">
          It tries to pay on its own. 1 signature is less than the 2 needed, so the XRP Ledger refuses it (<span className="font-mono">tefBAD_QUORUM</span>).
        </Fact>
        <Fact title="You stay in charge" tone="ok">
          Only you set limits and approve suppliers, from this dashboard. The agent has no way to change them.
        </Fact>
      </div>

      <LedgerProofCard />

      <p className="text-sm text-muted-foreground">
        Check it yourself on the XRP Ledger Testnet:{" "}
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={accountUrl(AGENT_ACCOUNT)} target="_blank" rel="noreferrer">
          the agent&apos;s account
        </a>{" "}
        (master key disabled) and its{" "}
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={txUrl(SIGNER_LIST_TX)} target="_blank" rel="noreferrer">
          2-of-2 signing rule
        </a>
        .
      </p>
    </div>
  );
}

function Fact({ title, tone, children }: { title: string; tone: "ok" | "danger"; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl p-5", tone === "ok" ? "bg-ok-soft" : "bg-danger-soft")}>
      <p className={cn("text-lg font-semibold", tone === "ok" ? "text-ok" : "text-danger")}>{title}</p>
      <p className="mt-1 text-foreground/90">{children}</p>
    </div>
  );
}
