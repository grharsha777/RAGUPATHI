"use client";

import dynamic from "next/dynamic";

export const AgentOrchestrationGraphDynamic = dynamic(
  () => import("./agent-orchestration-graph").then((m) => m.AgentOrchestrationGraph),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-lg border border-border/70 bg-muted/20" />
    ),
  },
);
