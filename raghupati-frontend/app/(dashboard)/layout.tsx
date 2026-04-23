import type { ReactNode } from "react";

import { DashboardShell } from "@/components/app-shell/dashboard-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}
