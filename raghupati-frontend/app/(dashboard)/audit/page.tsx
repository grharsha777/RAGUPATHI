"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorStatePanel } from "@/components/shared/error-state-panel";
import { useAuditQuery } from "@/lib/hooks/use-support-queries";

export default function AuditPage() {
  const audit = useAuditQuery();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const data = audit.data ?? [];
    if (!query.trim()) {
      return data;
    }
    const q = query.toLowerCase();
    return data.filter(
      (row) =>
        row.id.toLowerCase().includes(q) ||
        row.traceId.toLowerCase().includes(q) ||
        (row.incidentId ?? "").toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.actor.toLowerCase().includes(q),
    );
  }, [audit.data, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Audit</h1>
          <p className="text-sm text-muted-foreground">
            Immutable, filterable, export-ready event log — every agent action is attributable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trace ID, actor…" className="md:w-80" />
          <Button type="button" variant="outline" size="sm">
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Event stream</CardTitle>
          <CardDescription className="text-xs">Compliance-ready retention hooks land behind the same API contract.</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : audit.isError ? (
            <ErrorStatePanel title="Unable to load audit log" description="Verify API connectivity and credentials." />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Trace</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="tabular-nums text-xs text-muted-foreground">
                        {new Date(row.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.traceId}</TableCell>
                      <TableCell className="font-mono text-xs">{row.incidentId ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.actor}</TableCell>
                      <TableCell className="text-xs">{row.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.resource}</TableCell>
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
