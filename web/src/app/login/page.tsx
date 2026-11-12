import { Wordmark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Gcina" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-left [&_.text-2xl]:text-3xl">
            <Wordmark className="[&_svg]:size-14" />
          </h1>
        </div>
        <LoginForm next={typeof next === "string" ? next : "/"} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Demo on the XRP Ledger Testnet. No real money moves.
        </p>
      </div>
    </main>
  );
}
