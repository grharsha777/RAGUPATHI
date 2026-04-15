"use client";

import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";

type PatchDiffViewerProps = {
  original: string;
  patched: string;
  filePath: string;
};

function computeLineDiff(original: string, patched: string): Array<{ kind: "same" | "remove" | "add"; text: string }> {
  const a = original.split("\n");
  const b = patched.split("\n");
  const max = Math.max(a.length, b.length);
  const out: Array<{ kind: "same" | "remove" | "add"; text: string }> = [];
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      out.push({ kind: "same", text: left ?? "" });
    } else {
      if (left !== undefined) {
        out.push({ kind: "remove", text: left });
      }
      if (right !== undefined) {
        out.push({ kind: "add", text: right });
      }
    }
  }
  return out;
}

export function PatchDiffViewer({ original, patched, filePath }: PatchDiffViewerProps) {
  const lines = useMemo(() => computeLineDiff(original, patched), [original, patched]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Patch diff</CardTitle>
        <CardDescription className="text-xs font-mono">{filePath}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[320px] rounded-md border border-border/70 bg-background/40">
          <pre className="p-3 text-xs leading-relaxed">
            {lines.map((line, index) => (
              <div
                key={`${index}-${line.kind}`}
                className={cn(
                  "grid grid-cols-[92px_1fr] gap-3 border-b border-border/40 py-1",
                  line.kind === "remove" && "bg-red-500/10",
                  line.kind === "add" && "bg-emerald-500/10",
                )}
              >
                <span className="select-none text-right text-2xs text-muted-foreground tabular-nums">
                  {line.kind === "remove" ? "−" : line.kind === "add" ? "+" : " "}
                  {index + 1}
                </span>
                <code className="whitespace-pre-wrap font-mono text-[11px] text-foreground/90">{line.text}</code>
              </div>
            ))}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
