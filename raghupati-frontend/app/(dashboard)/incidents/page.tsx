"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { IncidentPreviewDrawer } from "@/components/incidents/incident-preview-drawer";
import { IncidentTable } from "@/components/incidents/incident-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorStatePanel } from "@/components/shared/error-state-panel";
import { useIncidentsQuery } from "@/lib/hooks/use-incidents";
import type { Incident } from "@/lib/types/domain";
import { supabase } from "@/lib/supabase/client";

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const incidents = useIncidentsQuery();
  const [preview, setPreview] = useState<Incident | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        // Invalidate and refetch immediately when Supabase detects a change
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Incidents</h1>
        <p className="text-sm text-muted-foreground">
          High-density triage with enterprise table ergonomics — sticky headers, keyboard-friendly row actions, and
          preview-on-click.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Backlog</CardTitle>
          <CardDescription className="text-xs">
            Filter and sort are client-side for responsiveness; server-backed search lands behind the same hooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : incidents.isError ? (
            <ErrorStatePanel
              title="Unable to load incidents"
              description="Check API availability and credentials."
            />
          ) : (
            <IncidentTable
              data={incidents.data ?? []}
              onPreview={(row) => {
                setPreview(row);
                setOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <IncidentPreviewDrawer incident={preview} open={open} onOpenChange={setOpen} />
    </div>
  );
}
