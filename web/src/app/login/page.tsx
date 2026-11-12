import { KeyRound, Landmark, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { Wordmark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Gcina" };

const POINTS = [
  { icon: ShieldCheck, text: "Your AI clerk reads, checks and pays supplier bills" },
  { icon: KeyRound, text: "It can never pay alone: every payment needs two signatures" },
  { icon: Landmark, text: "The XRP Ledger enforces it, in public" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Photo side */}
      <section className="relative isolate flex min-h-[38dvh] flex-col justify-end overflow-hidden p-5 text-white sm:p-8 lg:min-h-dvh lg:p-12">
        <Image
          src="/photos/owner-counter.jpg"
          alt="A shop owner sitting at the counter of her store, smiling"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="-z-20 object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-deep via-brand-deep/55 to-brand-deep/10" />
        <Wordmark onDark tagline={false} className="absolute top-5 left-5 sm:top-8 sm:left-8 lg:top-12 lg:left-12" />
        <div className="reveal max-w-xl">
          <p className="text-3xl leading-[1.1] font-bold tracking-tight sm:text-4xl lg:text-5xl">
            The agent pays.
            <br />
            <span className="text-gold">The ledger keeps.</span>
          </p>
          <ul className="mt-5 hidden flex-col gap-2.5 text-[0.95rem] sm:flex">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                  <p.icon className="size-4" aria-hidden="true" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sign-in side */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="reveal w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 mb-6 text-muted-foreground">Sign in to see what your agent has been doing.</p>
          <LoginForm next={typeof next === "string" ? next : "/"} />
          <p className="mt-6 text-sm text-muted-foreground">
            Demo on the XRP Ledger Testnet. No real money moves.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Photo:{" "}
            <a className="underline" href="https://unsplash.com/photos/EOkN2pRjFsg" target="_blank" rel="noreferrer">
              Unsplash
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
