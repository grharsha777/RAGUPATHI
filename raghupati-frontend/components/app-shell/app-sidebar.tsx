"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  ClipboardList,
  Gauge,
  GitBranch,
  LayoutDashboard,
  PanelLeft,
  Plug,
  ScrollText,
  Search,
  Settings,
  Shield,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/lib/store/ui-store";

const nav = [
  { href: "/dashboard", label: "Mission control", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: Shield },
  { href: "/scan", label: "Scan History", icon: Search },
  { href: "/agents", label: "Vanar Sena", icon: Bot },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/github", label: "GitHub Monitor", icon: Activity },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 72;

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, sidebarWidth, setSidebarCollapsed, setSidebarWidth } = useUiStore();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing, setSidebarWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const width = sidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        ref={sidebarRef}
        style={{ width }} // NOSONAR
        className={cn(
          "relative hidden lg:flex lg:flex-col bg-[#0c0c14] border-r border-white/[0.06] transition-all duration-200",
          isResizing && "transition-none"
        )}
      >
        {/* Resize handle */}
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 flex items-center justify-center",
            isResizing && "bg-violet-500/20"
          )}
          onMouseDown={startResizing}
        >
          <div className={cn(
            "h-8 w-1 rounded-full transition-colors",
            isResizing ? "bg-violet-400" : "bg-zinc-700/50 group-hover:bg-zinc-600"
          )} />
        </div>

        {/* Brand header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.04]">
          <div className="relative size-10 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center p-1">
            <Image src="/logo.png" alt="Raghupati Logo" width={32} height={32} className="w-full h-full object-contain" />
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold tracking-tight text-white">RAGHUPATI</div>
              <div className="truncate text-[10px] text-zinc-500">DevSecOps Guardian</div>
            </div>
          ) : null}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-zinc-500 hover:text-white transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-1" aria-label="Primary">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const link = (
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    active
                      ? "bg-white/[0.08] text-white border border-white/[0.08] shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    active ? "bg-violet-500/20 text-violet-400" : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                  )}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                  </div>
                  {!sidebarCollapsed ? <span className="truncate font-medium">{item.label}</span> : null}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#0c0c14] border-white/[0.06]">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{link}</div>;
            })}
          </nav>
        </ScrollArea>

        {/* Footer status */}
        <div className="border-t border-white/[0.04] p-3 space-y-3">
          <div className={cn("flex items-center gap-2", sidebarCollapsed && "justify-center")}>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-emerald-400">
              <Gauge className="size-4" aria-hidden />
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-zinc-300">System Nominal</div>
                <div className="truncate text-[10px] text-zinc-600">11 Agents Active</div>
              </div>
            ) : null}
          </div>
          
          {!sidebarCollapsed && (
            <div className="text-[9px] text-zinc-600 text-center">
              Drag edge to resize
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
