"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Command } from "cmdk";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUiStore } from "@/lib/store/ui-store";

const items = [
  { label: "Mission control", href: "/dashboard" },
  { label: "Incidents", href: "/incidents" },
  { label: "Vanar Sena agents", href: "/agents" },
  { label: "Repositories", href: "/repositories" },
  { label: "Reports", href: "/reports" },
  { label: "Audit log", href: "/audit" },
  { label: "Settings", href: "/settings" },
];

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showClose={false} className="max-w-xl overflow-hidden p-0">
        <Command className="rounded-lg border border-border/60 bg-popover text-popover-foreground shadow-surface-2">
          <div className="border-b border-border/70 px-3 py-2">
            <Command.Input
              placeholder="Jump anywhere, run actions, search entities…"
              className="flex h-10 w-full rounded-md bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[min(60vh,420px)] overflow-auto p-2">
            <Command.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">
              No matches. Try a different query.
            </Command.Empty>
            <Command.Group heading="Navigate" className="px-1 py-1 text-2xs font-semibold uppercase text-muted-foreground">
              {items.map((item) => (
                <Command.Item
                  key={item.href}
                  value={item.label}
                  className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm aria-selected:bg-muted"
                  onSelect={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="border-t border-border/70 px-3 py-2 text-2xs text-muted-foreground">
            Tip: use arrow keys, Enter to navigate, Esc to close.
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
