"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowUpRight,
  Cpu,
  Gauge,
  GitPullRequest,
  ShieldAlert,
  Timer,
} from "lucide-react";

import { KpiStatCard } from "@/components/dashboard/kpi-stat-card";
const SeverityDonutCard = dynamic(
  () => import("@/components/dashboard/severity-donut-card").then((m) => m.SeverityDonutCard),
  { ssr: false, loading: () => <div className="h-[220px] bg-muted/20 animate-pulse rounded-xl border border-border/70" /> }
);
const ResponseTrendChart = dynamic(
  () => import("@/components/dashboard/response-trend-chart").then((m) => m.ResponseTrendChart),
  { ssr: false, loading: () => <div className="h-[240px] bg-muted/20 animate-pulse rounded-xl border border-border/70" /> }
);
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveStatusBadge } from "@/components/shared/live-status-badge";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { useHealthQuery } from "@/lib/hooks/use-health";
import { useIncidentsQuery } from "@/lib/hooks/use-incidents";
import { useRepositoriesQuery } from "@/lib/hooks/use-support-queries";
import { cn } from "@/lib/utils/cn";
import { supabase } from "@/lib/supabase/client";


export function DashboardClient() {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const incidents = useIncidentsQuery();
  const repos = useRepositoriesQuery();
  const health = useHealthQuery();

  // Unified Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repositories' }, () => {
        queryClient.invalidateQueries({ queryKey: ["repositories"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = incidents.data?.slice(0, 6) ?? [];
  const topRepos = repos.data?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mission control</h1>
          <p className="text-sm text-muted-foreground">
            Live posture across incidents, agents, and delivery channels — optimized for triage speed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveStatusBadge status={health.data?.status === "ok" ? "healthy" : "degraded"} label="control plane" pulse />
          <span className="text-2xs text-muted-foreground tabular-nums">
            updated {health.dataUpdatedAt ? new Date(health.dataUpdatedAt).toLocaleTimeString() : "—"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          title="Mean time to remediate"
          hint="rolling 24h"
          value="29m"
          icon={Timer}
          trend={{ label: "−12% vs prior day", positive: true }}
        />
        <KpiStatCard
          title="Mean time to detect"
          hint="pipeline ingress → commander"
          value="8m"
          icon={Gauge}
          trend={{ label: "stable", positive: true }}
        />
        <KpiStatCard
          title="Autonomous fix rate"
          hint="QA-passed / attempted"
          value="74%"
          icon={Cpu}
          trend={{ label: "+6% after retry tuning", positive: true }}
        />
        <KpiStatCard
          title="Active incidents"
          hint="open + running"
          value={incidents.isLoading ? "—" : String(incidents.data?.filter((i) => i.status === "RUNNING").length ?? 0)}
          icon={ShieldAlert}
          trend={{ label: "queue healthy", positive: true }}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Response trend</CardTitle>
              <CardDescription className="text-xs">MTTR / MTTD — compact operational signal, not vanity metrics.</CardDescription>
            </CardHeader>
            <CardContent className="h-[240px] pt-0">
              <ResponseTrendChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Active incident stream</CardTitle>
                  <CardDescription className="text-xs">Latest commander decisions and delegations.</CardDescription>
                </div>
                <div className="inline-flex items-center gap-2 text-2xs text-muted-foreground">
                  <Activity className="size-3 text-state-running" aria-hidden />
                  live
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[220px] pr-3">
                <div className="space-y-2">
                  {incidents.isLoading
                    ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
                    : rows.map((incident, index) => (
                        <motion.div
                          key={incident.id}
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.03 }}
                          className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-card/50 p-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold leading-snug">{incident.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{incident.repoFullName}</div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <SeverityBadge severity={incident.severity} />
                            <span className="text-2xs text-muted-foreground tabular-nums">
                              {new Date(incident.updatedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <SeverityDonutCard />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Delivery outcomes</CardTitle>
              <CardDescription className="text-xs">PR automation + comms reliability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GitPullRequest className="size-4" aria-hidden />
                  PRs opened (24h)
                </div>
                <div className="font-semibold tabular-nums">18</div>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowUpRight className="size-4" aria-hidden />
                  Slack alerts
                </div>
                <div className="font-semibold tabular-nums">26</div>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4" aria-hidden />
                  Retry loops closed
                </div>
                <div className="font-semibold tabular-nums">9</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Retry loop visibility</CardTitle>
            <CardDescription className="text-xs">
              LangGraph states are tracked end-to-end — failures return structured evidence to Nala.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {["PATCH_GENERATED", "QA_RUNNING", "QA_FAILED", "RETRY_PATCH", "QA_PASSED"].map((state) => (
              <div
                key={state}
                className={cn(
                  "flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2",
                  state === "QA_FAILED" && "border-amber-500/30 bg-amber-500/5",
                  state === "QA_PASSED" && "border-emerald-500/30 bg-emerald-500/5",
                )}
              >
                <span className="font-mono text-xs">{state}</span>
                <span className="text-2xs text-muted-foreground">observed</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monitored repositories</CardTitle>
            <CardDescription className="text-xs">Webhook health + dependency posture snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {repos.isLoading ? (
               Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
            ) : topRepos.length > 0 ? (
              topRepos.map((repo) => (
                <div key={repo.id} className="flex items-center justify-between rounded-md border border-border/70 bg-card/50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{repo.fullName}</div>
                    <div className="text-xs text-muted-foreground">{repo.defaultBranch} · {repo.webhookStatus}</div>
                  </div>
                  <LiveStatusBadge status={repo.webhookStatus === 'active' ? "healthy" : "degraded"} label="ingest" />
                </div>
              ))
            ) : (
              <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground">
                No monitored repositories found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
