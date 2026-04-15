"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorStatePanel } from "@/components/shared/error-state-panel";
import { useReportsQuery } from "@/lib/hooks/use-support-queries";

export default function ReportsPage() {
  const reports = useReportsQuery();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Export center for HTML briefs, PDFs, Slack digests, and PR summaries — audit-friendly by design.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm">
            Export last 7 days
          </Button>
          <Button type="button" size="sm">
            New export bundle
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Artifacts</CardTitle>
          <CardDescription className="text-xs">Immutable references to generated outputs.</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : reports.isError ? (
            <ErrorStatePanel title="Unable to load reports" description="Verify API connectivity and credentials." />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.data?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell className="font-mono text-xs">{report.kind}</TableCell>
                      <TableCell className="font-mono text-xs">{report.incidentId}</TableCell>
                      <TableCell className="tabular-nums text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" disabled={!report.href}>
                          <Download className="size-4" />
                          <span className="ml-2">Download</span>
                        </Button>
                      </TableCell>
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
