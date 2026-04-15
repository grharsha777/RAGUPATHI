"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type AgentOrchestrationGraphProps = {
  activeAgentId?: string;
};

export function AgentOrchestrationGraph({ activeAgentId = "rama" }: AgentOrchestrationGraphProps) {
  const nodes: Node[] = useMemo(
    () => [
      {
        id: "rama",
        position: { x: 360, y: 20 },
        data: { label: "Rama — Commander" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
          boxShadow: "var(--shadow-1)",
        },
      },
      {
        id: "hanuman",
        position: { x: 40, y: 170 },
        data: { label: "Hanuman — Watcher" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
        },
      },
      {
        id: "angada",
        position: { x: 300, y: 170 },
        data: { label: "Angada — Security" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
        },
      },
      {
        id: "jambavan",
        position: { x: 560, y: 170 },
        data: { label: "Jambavan — Analyst" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
        },
      },
      {
        id: "nala",
        position: { x: 180, y: 330 },
        data: { label: "Nala — Patch" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
        },
      },
      {
        id: "sugreeva",
        position: { x: 420, y: 330 },
        data: { label: "Sugreeva — QA" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
        },
      },
      {
        id: "vibhishana",
        position: { x: 300, y: 480 },
        data: { label: "Vibhishana — Comms" },
        style: {
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: 10,
          width: 200,
          fontSize: 12,
        },
      },
    ],
    [],
  );

  const edges: Edge[] = useMemo(
    () => [
      { id: "e1", source: "rama", target: "hanuman", animated: true },
      { id: "e2", source: "rama", target: "angada", animated: true },
      { id: "e3", source: "rama", target: "jambavan", animated: true },
      { id: "e4", source: "angada", target: "nala", animated: true },
      { id: "e5", source: "jambavan", target: "nala", animated: true },
      { id: "e6", source: "nala", target: "sugreeva", animated: true },
      { id: "e7", source: "sugreeva", target: "vibhishana", animated: true },
      { id: "e8", source: "hanuman", target: "angada" },
    ],
    [],
  );

  const highlighted = useMemo(() => new Set([activeAgentId]), [activeAgentId]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Orchestration graph</CardTitle>
        <CardDescription className="text-xs">
          Commander delegation, cross-agent handoffs, and CI-gated remediation paths.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[520px] w-full">
          <ReactFlow
            nodes={nodes.map((node) => ({
              ...node,
              style: {
                ...node.style,
                outline: highlighted.has(node.id) ? "2px solid hsl(var(--primary))" : undefined,
              },
            }))}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap
              className="!bg-card/90"
              maskColor="hsl(var(--background) / 0.65)"
              nodeStrokeColor={() => "hsl(var(--border))"}
            />
            <Controls className="!bg-card/90 !border-border" />
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="hsl(var(--border))" />
          </ReactFlow>
        </div>
        <div className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
          Active node: <span className={cn("font-mono text-foreground")}>{activeAgentId}</span>
        </div>
      </CardContent>
    </Card>
  );
}
