import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/types/domain";

const map: Record<Severity, NonNullable<ComponentProps<typeof Badge>["variant"]>> = {
  LOW: "severityLow",
  MEDIUM: "severityMedium",
  HIGH: "severityHigh",
  CRITICAL: "severityCritical",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge variant={map[severity]} className="tabular-nums">
      {severity.toLowerCase()}
    </Badge>
  );
}
