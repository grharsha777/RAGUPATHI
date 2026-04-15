"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SeverityBadge } from "@/components/shared/severity-badge";
import type { Incident } from "@/lib/types/domain";

type IncidentPreviewDrawerProps = {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IncidentPreviewDrawer({ incident, open, onOpenChange }: IncidentPreviewDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="pr-8">Incident preview</SheetTitle>
          <SheetDescription>Fast scan before you commit to full forensic review.</SheetDescription>
        </SheetHeader>
        {incident ? (
          <div className="mt-4 space-y-4 px-1">
            <div>
              <div className="text-sm font-semibold leading-snug">{incident.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{incident.repoFullName}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={incident.severity} />
              <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 font-mono text-2xs uppercase text-muted-foreground">
                {incident.status}
              </span>
            </div>
            <Separator />
            <p className="text-sm leading-relaxed text-muted-foreground">{incident.description}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" asChild>
                <Link href={`/incidents/${incident.id}`}>Open full dossier</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
