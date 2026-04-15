"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const labelFor = (segment: string): string => {
  if (segment === "dashboard") return "Mission control";
  if (segment === "incidents") return "Incidents";
  if (segment === "agents") return "Vanar Sena";
  if (segment === "repositories") return "Repositories";
  if (segment === "reports") return "Reports";
  if (segment === "audit") return "Audit";
  if (segment === "settings") return "Settings";
  return segment;
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return { href, label: labelFor(segment), isLast: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground">
        RAGHUPATI
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="size-3 text-border" aria-hidden />
          {crumb.isLast ? (
            <span className={cn("font-semibold text-foreground")}>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
