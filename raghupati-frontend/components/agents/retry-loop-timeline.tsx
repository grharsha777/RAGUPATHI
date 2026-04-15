"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RetryState } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const ORDER: RetryState[] = [
  "PATCH_GENERATED",
  "QA_RUNNING",
  "QA_FAILED",
  "RETRY_PATCH",
  "MAX_RETRIES",
  "QA_PASSED",
];

type RetryLoopTimelineProps = {
  active: RetryState;
};

export function RetryLoopTimeline({ active }: RetryLoopTimelineProps) {
  const reduceMotion = useReducedMotion();
  const idx = ORDER.indexOf(active);
  const activeIndex = idx === -1 ? 0 : idx;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">LangGraph retry loop</CardTitle>
        <CardDescription className="text-xs">
          The self-correction engine transitions on real CI evidence — not simulated state.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />
          {ORDER.map((state, index) => {
            const done = index < activeIndex;
            const current = index === activeIndex;
            return (
              <div key={state} className="relative flex gap-3 pb-4 last:pb-0">
                <div className="relative z-10 mt-0.5">
                  <motion.div
                    className={cn(
                      "size-3 rounded-full border",
                      done && "bg-emerald-500/25 border-emerald-500/40",
                      current && "bg-primary/30 border-primary/60 shadow-surface-1",
                      !done && !current && "bg-muted/40 border-border",
                    )}
                    animate={reduceMotion || !current ? undefined : { scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-mono text-xs">{state}</div>
                    {current ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-primary">
                        active
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {state === "QA_FAILED"
                      ? "Failure context is packaged for Nala with logs + failing job names."
                      : state === "RETRY_PATCH"
                        ? "Rama re-delegates with structured constraints and CI excerpts."
                        : state === "MAX_RETRIES"
                          ? "Escalation to humans via urgent Slack with full dossier."
                          : "Deterministic transition based on GitHub Actions + graph state."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
