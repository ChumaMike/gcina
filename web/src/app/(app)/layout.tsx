import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/components/data-provider";
import { RateProvider } from "@/components/rate";
import { PrefsProvider } from "@/components/a11y/prefs";
import { RoleProvider } from "@/components/role";
import { SaslPreview } from "@/components/sasl-preview";
import { getZarRate } from "@/lib/rate";
import { SESSION_COOKIE, sessionRole } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already let this request in; the role only decides which controls show.
  const role = (await sessionRole((await cookies()).get(SESSION_COOKIE)?.value)) ?? "owner";
  const rate = await getZarRate();
  return (
    <RateProvider rate={rate}>
    <RoleProvider role={role}>
    <PrefsProvider>
    <DataProvider>
      <AppShell mock={process.env.USE_MOCK === "1"}>{children}</AppShell>
      <SaslPreview />
    </DataProvider>
    </PrefsProvider>
    </RoleProvider>
    </RateProvider>
  );
}
