import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/components/data-provider";
import { RoleProvider } from "@/components/role";
import { SaslPreview } from "@/components/sasl-preview";
import { SESSION_COOKIE, sessionRole } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already let this request in; the role only decides which controls show.
  const role = (await sessionRole((await cookies()).get(SESSION_COOKIE)?.value)) ?? "owner";
  return (
    <RoleProvider role={role}>
    <DataProvider>
      <AppShell mock={process.env.USE_MOCK === "1"}>{children}</AppShell>
      <SaslPreview />
    </DataProvider>
    </RoleProvider>
  );
}
