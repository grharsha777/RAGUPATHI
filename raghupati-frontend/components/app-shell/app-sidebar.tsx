"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ClipboardList,
  Gauge,
  GitBranch,
  LayoutDashboard,
  PanelLeft,
  Plug,
  ScrollText,
  Settings,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/lib/store/ui-store";

const nav = [
  { href: "/dashboard", label: "Mission control", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: Shield },
  { href: "/agents", label: "Vanar Sena", icon: Bot },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        className={cn(
          "relative hidden border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl lg:flex lg:flex-col",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative size-10 overflow-hidden rounded-md border border-border/70 bg-card shadow-surface-1">
            <Image src="/brand/raghupati-mark.svg" alt="" width={40} height={40} priority />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">RAGHUPATI</div>
              <div className="truncate text-2xs text-muted-foreground">DevSecOps Guardian</div>
            </div>
          ) : null}
        </div>
        <Separator />
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-1" aria-label="Primary">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const link = (
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-surface-1"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{link}</div>;
            })}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-3">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <div className="rounded-md border border-border/70 bg-card/60 p-2 text-muted-foreground">
              <Gauge className="size-4" aria-hidden />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-2xs font-semibold text-foreground">Operational posture</div>
                <div className="truncate text-2xs text-muted-foreground">Live control plane</div>
              </div>
            ) : null}
          </div>
          <div className={cn("mt-3", collapsed && "flex justify-center")}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => useUiStore.getState().toggleSidebar()}
            >
              <PanelLeft className="size-4" />
              {!collapsed ? <span className="ml-2">Toggle sidebar</span> : null}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
