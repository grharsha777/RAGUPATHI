"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Eye, LineChart, Shield, Search, Code2, Bot, MessageSquare,
  X, Plus, ChevronRight, Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react";

type AgentStatus = "pending" | "running" | "complete" | "failed" | "skipped";

type AgentNode = {
  name: string;
  displayName: string;
  role: string;
  model: string;
  status: AgentStatus;
  output: any;
  duration_ms?: number;
  icon: any;
  color: string;
};

type WorkflowGraphProps = {
  runId: string | null;
  agents?: any[];
};

const AGENT_CONFIG: Record<string, { displayName: string; role: string; model: string; icon: any; color: string }> = {
  hanuman: { displayName: "Hanuman", role: "Watcher", model: "LLaMA 4 Scout", icon: Eye, color: "#3B82F6" },
  rama: { displayName: "Rama", role: "Commander", model: "Mistral Large", icon: LineChart, color: "#F59E0B" },
  angada: { displayName: "Angada", role: "Security", model: "Mixtral 8x7B", icon: Shield, color: "#EF4444" },
  jambavan: { displayName: "Jambavan", role: "Analyst", model: "Mistral Medium", icon: Search, color: "#8B5CF6" },
  nala: { displayName: "Nala", role: "Patch", model: "Codestral", icon: Code2, color: "#6366F1" },
  sugreeva: { displayName: "Sugreeva", role: "QA", model: "LLaMA 4 Scout", icon: Bot, color: "#10B981" },
  vibhishana: { displayName: "Vibhishana", role: "Comms", model: "LLaMA 3 8B", icon: MessageSquare, color: "#F97316" },
};

const AGENT_ORDER = ["hanuman", "rama", "angada", "jambavan", "nala", "sugreeva", "vibhishana"];

// Edges define data flow between agents
const EDGES: [string, string][] = [
  ["hanuman", "rama"],
  ["rama", "angada"],
  ["rama", "jambavan"],
  ["angada", "nala"],
  ["jambavan", "nala"],
  ["nala", "sugreeva"],
  ["sugreeva", "vibhishana"],
];

const STATUS_COLORS: Record<AgentStatus, string> = {
  pending: "#6B7280",
  running: "#3B82F6",
  complete: "#10B981",
  failed: "#EF4444",
  skipped: "#9CA3AF",
};

const StatusBadge = ({ status }: { status: AgentStatus }) => {
  const colors: Record<AgentStatus, string> = {
    pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    complete: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
    skipped: "bg-gray-400/10 text-gray-400 border-gray-400/20",
  };
  const icons: Record<AgentStatus, any> = {
    pending: Clock,
    running: Loader2,
    complete: CheckCircle2,
    failed: XCircle,
    skipped: Clock,
  };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${colors[status]}`}>
      <Icon className={`size-3 ${status === "running" ? "animate-spin" : ""}`} />
      {status}
    </span>
  );
};

export function WorkflowGraph({ runId, agents = [] }: WorkflowGraphProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Build agent nodes from real data
  const agentNodes: Record<string, AgentNode> = {};
  for (const name of AGENT_ORDER) {
    const config = AGENT_CONFIG[name];
    const realData = agents.find((a: any) => a.agent_name === name);
    agentNodes[name] = {
      name,
      ...config,
      status: realData?.status || "pending",
      output: realData?.output ? (typeof realData.output === "string" ? JSON.parse(realData.output) : realData.output) : null,
      duration_ms: realData?.duration_ms,
    };
  }

  const selectedNode = selectedAgent ? agentNodes[selectedAgent] : null;

  // ── SVG Graph Layout ────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Vanar Sena Pipeline</h3>
        {AGENT_ORDER.map((name, i) => {
          const node = agentNodes[name];
          const Icon = node.icon;
          return (
            <div key={name}>
              <button
                onClick={() => setSelectedAgent(selectedAgent === name ? null : name)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${node.color}15`, border: `1px solid ${node.color}30` }}>
                  <Icon className="size-4" style={{ color: node.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{node.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{node.role}</span>
                  </div>
                  {node.duration_ms && <span className="text-[10px] text-muted-foreground">{node.duration_ms}ms</span>}
                </div>
                <StatusBadge status={node.status} />
              </button>
              {selectedAgent === name && node.output && (
                <div className="mt-2 ml-12 p-3 rounded-lg border bg-muted/20 text-xs font-mono overflow-auto max-h-48">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(node.output, null, 2)}</pre>
                </div>
              )}
              {i < AGENT_ORDER.length - 1 && (
                <div className="flex justify-center py-1">
                  <ChevronRight className="size-4 text-muted-foreground rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop SVG layout
  const W = 900, H = 500;
  const positions: Record<string, { x: number; y: number }> = {
    hanuman:    { x: 100, y: 60 },
    rama:       { x: 100, y: 180 },
    angada:     { x: 350, y: 100 },
    jambavan:   { x: 350, y: 260 },
    nala:       { x: 560, y: 180 },
    sugreeva:   { x: 560, y: 340 },
    vibhishana: { x: 780, y: 260 },
  };
  const NW = 140, NH = 80;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Vanar Sena Pipeline</h3>
        {runId && <span className="text-[10px] font-mono text-muted-foreground">run: {runId.slice(0, 8)}</span>}
      </div>

      <div className="flex gap-4">
        {/* SVG Canvas */}
        <div className="flex-1 rounded-xl border bg-card/50 overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-h-[400px]">
            <defs>
              <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#6B7280" />
              </marker>
            </defs>

            {/* Edges */}
            {EDGES.map(([from, to]) => {
              const fp = positions[from];
              const tp = positions[to];
              const x1 = fp.x + NW / 2;
              const y1 = fp.y + NH / 2;
              const x2 = tp.x + NW / 2;
              const y2 = tp.y + NH / 2;
              // Adjust to connect at edges
              const fromStatus = agentNodes[from].status;
              const isFlowing = fromStatus === "running";

              return (
                <g key={`${from}-${to}`}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isFlowing ? STATUS_COLORS.running : "#374151"}
                    strokeWidth={isFlowing ? 2 : 1.5}
                    strokeDasharray={isFlowing ? "8 4" : "none"}
                    markerEnd="url(#arrow)"
                    opacity={0.6}
                  >
                    {isFlowing && (
                      <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
                    )}
                  </line>
                </g>
              );
            })}

            {/* Agent Nodes */}
            {AGENT_ORDER.map((name) => {
              const node = agentNodes[name];
              const pos = positions[name];
              const Icon = node.icon;
              const isSelected = selectedAgent === name;

              return (
                <g
                  key={name}
                  className="cursor-pointer"
                  onClick={() => setSelectedAgent(isSelected ? null : name)}
                >
                  {/* Node background */}
                  <rect
                    x={pos.x} y={pos.y}
                    width={NW} height={NH}
                    rx={12} ry={12}
                    fill={isSelected ? `${node.color}15` : "var(--card, #1a1a2e)"}
                    stroke={isSelected ? node.color : STATUS_COLORS[node.status]}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />

                  {/* Status indicator dot */}
                  <circle
                    cx={pos.x + NW - 12} cy={pos.y + 12}
                    r={5}
                    fill={STATUS_COLORS[node.status]}
                  >
                    {node.status === "running" && (
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                    )}
                  </circle>

                  {/* Agent name */}
                  <text x={pos.x + 14} y={pos.y + 24} fill="currentColor" fontSize={13} fontWeight={600} className="fill-foreground">
                    {node.displayName}
                  </text>

                  {/* Role */}
                  <text x={pos.x + 14} y={pos.y + 42} fill="#9CA3AF" fontSize={10}>
                    {node.role} • {node.model}
                  </text>

                  {/* Output preview */}
                  <text x={pos.x + 14} y={pos.y + 60} fill="#6B7280" fontSize={9}>
                    {node.output?.summary
                      ? String(node.output.summary).slice(0, 30) + (String(node.output.summary).length > 30 ? "…" : "")
                      : node.status === "running" ? "Processing..." : node.status === "pending" ? "Waiting..." : ""}
                  </text>

                  {/* Duration */}
                  {node.duration_ms && (
                    <text x={pos.x + 14} y={pos.y + NH - 6} fill="#6B7280" fontSize={9}>
                      {node.duration_ms}ms
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <div className="w-80 rounded-xl border bg-card p-4 space-y-3 overflow-y-auto max-h-[500px] animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <selectedNode.icon className="size-5" style={{ color: selectedNode.color }} />
                <span className="font-semibold">{selectedNode.displayName}</span>
              </div>
              <button onClick={() => setSelectedAgent(null)} title="Close" aria-label="Close" className="p-1 rounded hover:bg-muted/50">
                <X className="size-4" />
              </button>
            </div>
            <StatusBadge status={selectedNode.status} />
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>Role:</strong> {selectedNode.role}</div>
              <div><strong>Model:</strong> {selectedNode.model}</div>
              {selectedNode.duration_ms && <div><strong>Duration:</strong> {selectedNode.duration_ms}ms</div>}
            </div>
            {selectedNode.output && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs font-mono overflow-auto max-h-72">
                <div className="text-[10px] text-muted-foreground mb-2 font-sans font-semibold">Output</div>
                <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(selectedNode.output, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
