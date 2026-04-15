import { cn } from "@/lib/utils/cn";

type LiveStatus = "healthy" | "degraded" | "offline";

const styles: Record<LiveStatus, string> = {
  healthy: "bg-state-healthy/15 text-emerald-950 dark:text-emerald-50 border-emerald-500/30",
  degraded: "bg-state-warning/15 text-amber-950 dark:text-amber-50 border-amber-500/30",
  offline: "bg-muted text-muted-foreground border-border",
};

export function LiveStatusBadge({
  status,
  label,
  pulse = false,
}: {
  status: LiveStatus;
  label: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          status === "healthy" && "bg-state-healthy",
          status === "degraded" && "bg-state-warning",
          status === "offline" && "bg-muted-foreground",
          pulse && status !== "offline" && "animate-pulse-soft",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
