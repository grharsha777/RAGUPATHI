"use client";

import { GitBranch, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorStatePanel } from "@/components/shared/error-state-panel";
import { LiveStatusBadge } from "@/components/shared/live-status-badge";
import { useRepositoriesQuery } from "@/lib/hooks/use-support-queries";

export default function RepositoriesPage() {
  const repos = useRepositoriesQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Repositories</h1>
        <p className="text-sm text-muted-foreground">
          Webhook posture, dependency risk, and CI health — the operational perimeter for autonomous remediation.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monitored</CardTitle>
            <CardDescription className="text-xs">Active webhook ingest</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {repos.isLoading ? "—" : repos.data?.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Branch protection</CardTitle>
            <CardDescription className="text-xs">Enforced on default branches</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {repos.isLoading ? "—" : repos.data?.filter((r) => r.branchProtection).length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CI health</CardTitle>
            <CardDescription className="text-xs">Passing workflows</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {repos.isLoading ? "—" : repos.data?.filter((r) => r.ciHealth === "passing").length ?? 0}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Inventory</CardTitle>
          <CardDescription className="text-xs">
            Dense enterprise table layout with sticky headers for scan-heavy reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repos.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : repos.isError ? (
            <ErrorStatePanel title="Unable to load repositories" description="Verify API connectivity and credentials." />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Dependencies</TableHead>
                    <TableHead>CI</TableHead>
                    <TableHead>Open issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repos.data?.map((repo) => (
                    <TableRow key={repo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GitBranch className="size-4 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{repo.fullName}</div>
                            <div className="truncate text-xs text-muted-foreground">{repo.defaultBranch}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LiveStatusBadge
                          status={repo.webhookStatus === "active" ? "healthy" : "degraded"}
                          label={repo.webhookStatus}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">{repo.riskScore}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="size-4" aria-hidden />
                          {repo.dependencyHealth}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{repo.ciHealth}</TableCell>
                      <TableCell className="tabular-nums">{repo.openIssues}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
