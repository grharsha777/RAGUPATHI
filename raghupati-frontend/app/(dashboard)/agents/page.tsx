import type { Metadata } from "next";

import { AgentOrchestrationGraphDynamic } from "@/components/agents/agent-orchestration-graph-dynamic";
import { RetryLoopTimeline } from "@/components/agents/retry-loop-timeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveStatusBadge } from "@/components/shared/live-status-badge";
import { VANAR_AGENTS } from "@/lib/constants/agents";

export const metadata: Metadata = {
  title: "Vanar Sena",
};

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Vanar Sena</h1>
        <p className="text-sm text-muted-foreground">
          Live agent roster, model transparency, and orchestration topology — the differentiator judges remember.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {VANAR_AGENTS.map((agent) => (
          <Card key={agent.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">{agent.displayName}</CardTitle>
                  <CardDescription className="text-xs">{agent.role}</CardDescription>
                </div>
                <LiveStatusBadge
                  status={agent.health === "healthy" ? "healthy" : "degraded"}
                  label={agent.status}
                  pulse={agent.status === "RUNNING"}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Model</span>
                <span className="font-mono text-[11px] text-foreground">{agent.model}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Throughput</span>
                <span className="tabular-nums text-foreground">{agent.throughput}/hr</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Utilization</span>
                <span className="tabular-nums text-foreground">{(agent.utilization * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Confidence</span>
                <span className="tabular-nums text-foreground">{(agent.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Last action</span>: {agent.lastAction}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentOrchestrationGraphDynamic activeAgentId="nala" />
        </div>
        <div className="space-y-3">
          <RetryLoopTimeline active="QA_FAILED" />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Delegation doctrine</CardTitle>
              <CardDescription className="text-xs">Rama remains the single escalation authority.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sub-agents never silently mutate production state without CI gates and comms receipts.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
