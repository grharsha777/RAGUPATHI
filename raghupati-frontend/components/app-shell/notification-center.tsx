"use client";

import { Bell, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUiStore } from "@/lib/store/ui-store";

const items = [
  {
    id: "n1",
    title: "CI gate failed — context packaged for retry",
    body: "Sugreeva captured unit test failures and returned structured evidence to Rama.",
    time: "2m ago",
  },
  {
    id: "n2",
    title: "Slack alert delivered",
    body: "Vibhishana posted a severitized update to #sec-ops with PR link.",
    time: "6m ago",
  },
  {
    id: "n3",
    title: "Dependency graph expanded",
    body: "Angada correlated NVD + OSV signals for lodash chain reachability.",
    time: "18m ago",
  },
];

export function NotificationCenter() {
  const open = useUiStore((s) => s.notificationsOpen);
  const setOpen = useUiStore((s) => s.setNotificationsOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent showClose className="max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-4" aria-hidden />
            Notifications
          </SheetTitle>
          <SheetDescription>High-signal operational events across the Vanar Sena pipeline.</SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        <ScrollArea className="h-[calc(100dvh-180px)] pr-3">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/70 bg-card/60 p-3 shadow-surface-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold leading-snug">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.body}</div>
                  </div>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-state-healthy" aria-hidden />
                </div>
                <div className="mt-2 text-2xs text-muted-foreground">{item.time}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Mark reviewed
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
