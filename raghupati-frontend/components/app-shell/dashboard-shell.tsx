import type { ReactNode } from "react";

import { CommandPalette } from "@/components/app-shell/command-palette";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { TopCommandBar } from "@/components/app-shell/top-command-bar";
import { NotificationCenter } from "@/components/app-shell/notification-center";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-dvh w-full bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopCommandBar />
        <div className="border-b border-border/60 bg-background/40 px-4 py-2">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3">
            <Breadcrumbs />
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground">
                prod
              </span>
              <span aria-hidden className="text-border">
                |
              </span>
              <span className="tabular-nums">heartbeat: live</span>
            </div>
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6">{children}</main>
      </div>
      <CommandPalette />
      <NotificationCenter />
    </div>
  );
}
