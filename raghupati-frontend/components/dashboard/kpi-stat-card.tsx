"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type KpiStatCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: { label: string; positive?: boolean };
  className?: string;
};

export function KpiStatCard({ title, value, hint, icon: Icon, trend, className }: KpiStatCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
          {hint ? <p className="mt-1 text-2xs text-muted-foreground/80">{hint}</p> : null}
        </div>
        <div className="rounded-md border border-border/70 bg-muted/30 p-2 text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          className="text-2xl font-semibold tabular-nums tracking-tight"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {value}
        </motion.div>
        {trend ? (
          <p
            className={cn(
              "mt-2 text-2xs font-medium",
              trend.positive === false ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300",
            )}
          >
            {trend.label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
