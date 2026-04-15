import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
        warn: "border-transparent bg-amber-500/15 text-amber-900 dark:text-amber-100",
        danger: "border-transparent bg-red-500/15 text-red-900 dark:text-red-100",
        severityLow: "border-transparent bg-severity-low/15 text-severity-low-fg",
        severityMedium: "border-transparent bg-severity-medium/15 text-severity-medium-fg",
        severityHigh: "border-transparent bg-severity-high/15 text-severity-high-fg",
        severityCritical: "border-transparent bg-severity-critical/15 text-severity-critical-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
