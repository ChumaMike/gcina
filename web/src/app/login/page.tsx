import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Gcina" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="size-14" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Gcina</h1>
          <p className="mt-1 text-muted-foreground">The agent pays. The ledger keeps.</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : "/"} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Demo on the XRP Ledger Testnet. No real money moves.
        </p>
      </div>
    </main>
  );
}
