import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/components/data-provider";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider>
      <AppShell mock={process.env.USE_MOCK === "1"}>{children}</AppShell>
    </DataProvider>
  );
}
