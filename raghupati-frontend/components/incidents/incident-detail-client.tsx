"use client";

import Link from "next/link";
import { useMemo } from "react";

import { RetryLoopTimeline } from "@/components/agents/retry-loop-timeline";
import { PatchDiffViewer } from "@/components/incidents/patch-diff-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorStatePanel } from "@/components/shared/error-state-panel";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncidentQuery } from "@/lib/hooks/use-incidents";
import type { RetryState } from "@/lib/types/domain";

type IncidentDetailClientProps = {
  incidentId: string;
};

export function IncidentDetailClient({ incidentId }: IncidentDetailClientProps) {
  const detail = useIncidentQuery(incidentId);

  const activeRetry: RetryState = useMemo(() => {
    const last = detail.data?.retryHistory.at(-1)?.state;
    return last ?? "QA_RUNNING";
  }, [detail.data?.retryHistory]);

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <ErrorStatePanel
        title="Incident unavailable"
        description="The incident could not be loaded. Verify the identifier and API connectivity."
      />
    );
  }

  const incident = detail.data;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{incident.title}</h1>
              <SeverityBadge severity={incident.severity} />
              <Badge variant="outline" className="font-mono text-2xs uppercase">
                confidence {(incident.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{incident.repoFullName}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/incidents">Back to backlog</Link>
            </Button>
            {incident.pr?.htmlUrl ? (
              <Button type="button" size="sm" asChild>
                <a href={incident.pr.htmlUrl} target="_blank" rel="noreferrer">
                  Open PR #{incident.pr.number}
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <Tabs defaultValue="analysis">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="patch">Patch</TabsTrigger>
            <TabsTrigger value="qa">QA</TabsTrigger>
            <TabsTrigger value="comms">Comms</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Executive summary</CardTitle>
                <CardDescription className="text-xs">
                  Calibrated for leadership review — still anchored to technical evidence.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">{incident.rootCause}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Explainability</CardTitle>
                <CardDescription className="text-xs">Why automation chose this remediation path.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">{incident.explainability}</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="evidence" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vulnerable packages</CardTitle>
                <CardDescription className="text-xs">Transitive reachability considered in graph expansion.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="list-disc space-y-2 pl-5">
                  {incident.vulnerablePackages.map((pkg) => (
                    <li key={pkg} className="font-mono text-xs">
                      {pkg}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Files</CardTitle>
                <CardDescription className="text-xs">Primary touchpoints for patch validation.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="list-disc space-y-2 pl-5">
                  {incident.vulnerableFiles.map((file) => (
                    <li key={file} className="font-mono text-xs">
                      {file}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="patch" className="space-y-3">
            {incident.patch ? (
              <PatchDiffViewer
                filePath={incident.patch.filePath}
                original={incident.patch.originalContent}
                patched={incident.patch.patchedContent}
              />
            ) : (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">No patch artifact available yet.</CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="qa" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CI gate</CardTitle>
                <CardDescription className="text-xs">GitHub Actions evidence captured for retries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Conclusion</span>
                  <span className="font-mono text-xs">{incident.ci?.conclusion ?? "unknown"}</span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">{incident.ci?.logsExcerpt}</div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="comms" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Delivery status</CardTitle>
                <CardDescription className="text-xs">Slack + email + PR artifacts.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Slack</span>
                  <span className="font-mono text-xs">{incident.slackDelivered ? "delivered" : "pending"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-mono text-xs">{incident.emailDelivered ? "delivered" : "pending"}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-4 lg:col-span-5">
        <RetryLoopTimeline active={activeRetry} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline</CardTitle>
            <CardDescription className="text-xs">Immutable ordering for audit and replay.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incident.timeline.map((event) => (
              <div key={event.id} className="rounded-md border border-border/70 bg-card/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate font-mono text-2xs text-muted-foreground">{event.agentId ?? "system"}</div>
                  <div className="text-2xs text-muted-foreground tabular-nums">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 text-sm">{event.message}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Human escalation</CardTitle>
            <CardDescription className="text-xs">Required when MAX_RETRIES is reached or confidence collapses.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Escalations are routed with full CI logs, patch attempts, and commander rationale — never silent failure.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
