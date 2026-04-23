"use client";

import React, { useMemo, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  LineChart,
  Shield,
  Search,
  Code2,
  Bot,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";

// Types
export type AgentStatus = "pending" | "running" | "complete" | "failed" | "skipped";

export type AgentData = {
  name: string;
  displayName: string;
  role: string;
  model: string;
  status: AgentStatus;
  output: any;
  duration_ms?: number;
  icon: any;
  color: string;
  onSelect?: (id: string) => void;
  selected?: boolean;
};

// Config for agents
const AGENT_CONFIG: Record<string, { displayName: string; role: string; model: string; icon: any; color: string }> = {
  hanuman: { displayName: "Hanuman", role: "Watcher", model: "LLaMA 4 Scout", icon: Eye, color: "#3B82F6" },
  rama: { displayName: "Rama", role: "Commander", model: "Mistral Large", icon: LineChart, color: "#F59E0B" },
  angada: { displayName: "Angada", role: "Security", model: "Mixtral 8x7B", icon: Shield, color: "#EF4444" },
  jambavan: { displayName: "Jambavan", role: "Analyst", model: "Mistral Medium", icon: Search, color: "#8B5CF6" },
  nala: { displayName: "Nala", role: "Patch", model: "Codestral", icon: Code2, color: "#6366F1" },
  sugreeva: { displayName: "Sugreeva", role: "QA", model: "LLaMA 4 Scout", icon: Bot, color: "#10B981" },
  vibhishana: { displayName: "Vibhishana", role: "Comms", model: "LLaMA 3 8B", icon: MessageSquare, color: "#F97316" },
};

// ── Custom Node ─────────────────────────────────────────────────────────────
const CustomAgentNode = ({ data, id }: { data: AgentData; id: string }) => {
  const Icon = data.icon;
  const isRunning = data.status === "running";
  const isComplete = data.status === "complete";
  const isFailed = data.status === "failed";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      onClick={() => data.onSelect?.(id)}
      className={`relative min-w-[220px] cursor-pointer rounded-2xl border bg-card/60 p-4 shadow-xl backdrop-blur-xl transition-all
        ${data.selected ? `border-[${data.color}] shadow-[0_0_20px_${data.color}30]` : "border-border/50 hover:border-primary/50"}
      `}
      style={
        data.selected
          ? { borderColor: data.color, boxShadow: `0 0 20px ${data.color}30` }
          : {}
      }
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground/30 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-muted-foreground/30 !border-2 !border-background" />

      {/* Glow effect when running */}
      {isRunning && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 -z-10 rounded-2xl blur-xl"
          style={{ backgroundColor: data.color }}
        />
      )}

      <div className="flex items-center gap-4">
        <div
          className="flex size-12 items-center justify-center rounded-xl relative"
          style={{ backgroundColor: `${data.color}15`, border: `1px solid ${data.color}40` }} // NOSONAR
        >
          <Icon className="size-6 shadow-sm" style={{ color: data.color }} />
          {isRunning && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-xl"
              style={{ border: `2px dashed ${data.color}`, opacity: 0.5 }}
            />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-foreground">{data.displayName}</h3>
            {isRunning && <Loader2 className="size-3.5 animate-spin" style={{ color: data.color }} />}
            {isComplete && <CheckCircle2 className="size-3.5 text-emerald-500" />}
            {isFailed && <XCircle className="size-3.5 text-red-500" />}
            {data.status === "pending" && <Clock className="size-3.5 text-muted-foreground" />}
          </div>
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase mt-0.5">
            {data.role}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/80 font-mono">{data.model}</span>
            {data.duration_ms && (
              <span className="text-[9px] font-mono font-medium" style={{ color: data.color }} // NOSONAR
              >
                {data.duration_ms}ms
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Mini output preview if complete */}
      <AnimatePresence>
        {data.output && !isRunning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-3 overflow-hidden rounded-lg bg-black/40 p-2 text-[9px] font-mono text-muted-foreground leading-relaxed border border-white/5"
          >
            <div className="line-clamp-2">
              {data.output?.summary
                ? String(data.output.summary)
                : "{ ...payload received }"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const nodeTypes = {
  agentNode: CustomAgentNode,
};

// ── Graph Props ─────────────────────────────────────────────────────────────
type VanarSenaPipelineProps = {
  agents: any[];
  runId: string | null;
  onSelectAgent: (agentName: string | null) => void;
  selectedAgent: string | null;
};

// ── Main UI Component ───────────────────────────────────────────────────────
function PipelineCanvas({ agents, runId, onSelectAgent, selectedAgent }: VanarSenaPipelineProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Generate Nodes natively matching the DAG structure
    const initialNodes: Node[] = [
      { id: "hanuman", position: { x: 400, y: 50 }, type: "agentNode", data: {} },
      { id: "rama", position: { x: 400, y: 200 }, type: "agentNode", data: {} },
      { id: "angada", position: { x: 200, y: 350 }, type: "agentNode", data: {} },
      { id: "jambavan", position: { x: 600, y: 350 }, type: "agentNode", data: {} },
      { id: "nala", position: { x: 400, y: 500 }, type: "agentNode", data: {} },
      { id: "sugreeva", position: { x: 400, y: 650 }, type: "agentNode", data: {} },
      { id: "vibhishana", position: { x: 700, y: 650 }, type: "agentNode", data: {} },
    ];

    const mappedNodes = initialNodes.map((node) => {
      const config = AGENT_CONFIG[node.id];
      const realData = agents.find((a) => a.agent_name === node.id);
      
      const nodeData: AgentData = {
        name: node.id,
        ...config,
        status: realData?.status || "pending",
        output: realData?.output ? (typeof realData.output === "string" ? JSON.parse(realData.output) : realData.output) : null,
        duration_ms: realData?.duration_ms,
        onSelect: (id) => onSelectAgent(selectedAgent === id ? null : id),
        selected: selectedAgent === node.id,
      };

      return { ...node, data: nodeData };
    });

    setNodes(mappedNodes);

    // Generate Directed Edges
    const rawEdges = [
      ["hanuman", "rama"],
      ["rama", "angada"],
      ["rama", "jambavan"],
      ["angada", "nala"],
      ["jambavan", "nala"],
      ["nala", "sugreeva"],
      ["sugreeva", "vibhishana"],
    ];

    const mappedEdges: Edge[] = rawEdges.map(([source, target]) => {
      const sourceData = mappedNodes.find((n) => n.id === source)?.data;
      const isFlowing = sourceData?.status === "running" || sourceData?.status === "complete";
      
      return {
        id: `e-${source}-${target}`,
        source,
        target,
        animated: isFlowing,
        type: "smoothstep",
        style: {
          stroke: isFlowing ? sourceData?.color || "#ffffff" : "#374151",
          strokeWidth: isFlowing ? 2 : 1,
          opacity: isFlowing ? 0.8 : 0.4,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isFlowing ? sourceData?.color || "#ffffff" : "#374151",
        },
      };
    });

    setEdges(mappedEdges);
  }, [agents, selectedAgent, onSelectAgent, setNodes, setEdges]);

  return (
    <div className="h-[600px] w-full rounded-2xl border border-white/5 bg-[#0a0a0d] shadow-2xl relative overflow-hidden">
      {/* Grid Pattern Background overlay for premium tech feel */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="z-10"
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Controls className="!bg-black/50 !border-white/10 !fill-white" />
        <Background gap={24} size={1} color="#ffffff05" />
      </ReactFlow>
      
      {/* Top HUD */}
      <div className="absolute top-4 left-6 z-20 pointer-events-none flex items-center justify-between right-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-primary/20 text-primary p-1 rounded">
              <Bot className="size-4" />
            </span>
            Vanar Sena Orchestrator
          </h2>
          <p className="text-xs text-white/50 font-mono mt-1 tracking-widest uppercase">
            Autonomic Remediation Mesh
          </p>
        </div>
        {runId && (
          <div className="bg-black/60 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
            <span className="flex size-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono text-white/70">SESSION: {runId.slice(0,8)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function VanarSenaPipeline(props: Omit<VanarSenaPipelineProps, "onSelectAgent" | "selectedAgent"> & { runId?: string | null }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const selectedData = useMemo(() => {
    if (!selectedAgent) return null;
    const data = props.agents.find(a => a.agent_name === selectedAgent);
    if (!data) return { name: selectedAgent, status: "pending", output: null, duration_ms: undefined };
    return {
      name: selectedAgent,
      ...AGENT_CONFIG[selectedAgent],
      status: data.status,
      output: data.output ? (typeof data.output === "string" ? JSON.parse(data.output) : data.output) : null,
      duration_ms: data.duration_ms,
    };
  }, [selectedAgent, props.agents]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      <div className="flex-1">
        <ReactFlowProvider>
          <PipelineCanvas
            {...props}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
        </ReactFlowProvider>
      </div>

      {/* Animated Detail Panel */}
      <AnimatePresence>
        {selectedAgent && selectedData && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 380 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            className="shrink-0 rounded-2xl border border-white/10 bg-[#0c0c10] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${(selectedData as any).color}20` }} // NOSONAR
                >
                  {React.createElement((selectedData as any).icon || Bot, { className: "size-5", style: { color: (selectedData as any).color } })}
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{(selectedData as any).displayName}</h3>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">{(selectedData as any).role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} title="Close" aria-label="Close" className="p-1.5 rounded-md hover:bg-white/10 text-white/50 transition-colors">
                <XCircle className="size-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-white/40 mb-1">Status</p>
                  <p className={`text-xs font-semibold capitalize ${
                    selectedData.status === "running" ? "text-blue-400" :
                    selectedData.status === "complete" ? "text-emerald-400" :
                    selectedData.status === "failed" ? "text-red-400" : "text-white/60"
                  }`}>{selectedData.status}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-white/40 mb-1">Execution Time</p>
                  <p className="text-xs font-mono text-white/80">{(selectedData as any).duration_ms ? `${(selectedData as any).duration_ms}ms` : "—"}</p>
                </div>
              </div>

              {selectedData.output && selectedData.status !== "running" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-white/70 flex items-center gap-1.5">
                    <Code2 className="size-3" /> Execution Payload
                  </p>
                  <div className="bg-black/50 rounded-xl p-4 border border-white/5 overflow-x-auto">
                    <pre className="text-[11px] font-mono leading-relaxed text-[#a9dc76]">
                      {JSON.stringify(selectedData.output, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
