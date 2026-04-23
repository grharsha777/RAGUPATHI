"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
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
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Crown, Map, ShieldAlert, Search, Code2,
  FlaskConical, Wrench, Rocket, MessageSquare, GitMerge,
  CheckCircle2, XCircle, Loader2, Clock, AlertTriangle,
} from "lucide-react";
import { AGENT_DEFINITIONS, AGENT_EDGES, getAgentDef } from "@/lib/constants/agents";
import type { AgentStatus, AgentRun } from "@/lib/stores/execution-store";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Crown, Map, ShieldAlert, Search, Code2,
  FlaskConical, Wrench, Rocket, MessageSquare, GitMerge,
};

type AgentData = {
  name: string;
  displayName: string;
  role: string;
  tier: string;
  model: string;
  status: AgentStatus;
  output: any;
  duration_ms?: number;
  color: string;
  icon: string;
  confidence?: number;
  onSelect?: (id: string) => void;
  selected?: boolean;
};

// ── OPTIMIZED: Memoized Custom Agent Node to prevent unnecessary re-renders ──
const AgentNode = React.memo(({ data, id }: { data: AgentData; id: string }) => {
  const Icon = ICON_MAP[data.icon] || ShieldCheck;
  const isRunning = data.status === "running";
  const isComplete = data.status === "complete";
  const isFailed = data.status === "failed";
  const isPending = data.status === "pending";

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => data.onSelect?.(id)}
      className={`relative cursor-pointer rounded-xl border backdrop-blur-xl transition-all duration-300 select-none
        ${data.selected ? "ring-1" : ""}
        ${isRunning ? "bg-[#0f0f14]" : "bg-[#0c0c10]/80"}
      `}
      style={{
        width: data.tier === "supervisor" ? 200 : data.tier === "commander" ? 190 : 170,
        borderColor: data.selected ? `${data.color}60` : "rgba(255,255,255,0.06)",
        boxShadow: isRunning
          ? `0 0 24px ${data.color}15, 0 0 48px ${data.color}08`
          : isFailed
          ? "0 0 16px rgba(239,68,68,0.1)"
          : "none",
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full" />

      {/* Animated glow halo for running agents */}
      {isRunning && (
        <motion.div
          className="absolute -inset-1 rounded-xl -z-10"
          animate={{
            boxShadow: [
              `0 0 12px ${data.color}20`,
              `0 0 28px ${data.color}30`,
              `0 0 12px ${data.color}20`,
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="p-3">
        <div className="flex items-center gap-2.5">
          {/* Icon with status ring */}
          <div className="relative">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: data.tier === "supervisor" ? 40 : 34,
                height: data.tier === "supervisor" ? 40 : 34,
                backgroundColor: `${data.color}12`,
                border: `1px solid ${data.color}30`,
              }}
            >
              <Icon className="size-4" style={{ color: data.color }} />
            </div>

            {/* Progress ring for running agents */}
            {isRunning && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{
                  border: `1.5px dashed ${data.color}50`,
                  borderRadius: "8px",
                }}
              />
            )}

            {/* Status dot */}
            <div
              className={`absolute -top-0.5 -right-0.5 size-2 rounded-full border border-[#0c0c10] ${
                isRunning ? "bg-blue-400 animate-pulse" :
                isComplete ? "bg-emerald-400" :
                isFailed ? "bg-red-400" :
                "bg-zinc-600"
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-100 truncate">{data.displayName}</h3>
              {isRunning && <Loader2 className="size-3 animate-spin" style={{ color: data.color }} />}
              {isComplete && <CheckCircle2 className="size-3 text-emerald-400" />}
              {isFailed && <XCircle className="size-3 text-red-400" />}
              {isPending && <Clock className="size-3 text-zinc-600" />}
            </div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium truncate">
              {data.role.split(" & ")[0]}
            </p>
          </div>
        </div>

        {/* Mini output preview */}
        <AnimatePresence>
          {data.output && !isRunning && data.output.summary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 overflow-hidden"
            >
              <div className="rounded-md bg-black/30 border border-white/[0.04] px-2 py-1.5 text-[9px] font-mono text-zinc-500 leading-relaxed line-clamp-2">
                {String(data.output.summary)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duration */}
        {data.duration_ms && (
          <div className="mt-1.5 flex items-center justify-between text-[9px]">
            <span className="font-mono text-zinc-600">{data.model.split("-")[0]}</span>
            <span className="font-mono tabular-nums" style={{ color: `${data.color}90` }}>
              {data.duration_ms >= 1000 ? `${(data.duration_ms / 1000).toFixed(1)}s` : `${data.duration_ms}ms`}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// Add display name for debugging
AgentNode.displayName = 'AgentNode';

const nodeTypes = { agentNode: AgentNode };

// ── Node positions ─────────────────────────────────────────────────
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  hanuman:     { x: 300, y: 0 },
  rama:        { x: 300, y: 140 },
  lakshmana:   { x: 100, y: 280 },
  sita:        { x: 300, y: 280 },
  jambavan:    { x: 500, y: 280 },
  nala:        { x: 200, y: 420 },
  bharata:     { x: 400, y: 420 },
  sugreeva:    { x: 100, y: 560 },
  shatrughna:  { x: 300, y: 560 },
  dasharatha:  { x: 500, y: 560 },
  vibhishana:  { x: 300, y: 700 },
};

type WorkflowCanvasProps = {
  agents: AgentRun[];
  runId: string;
  selectedAgent: string | null;
  onSelectAgent: (name: string | null) => void;
  isMainCanvas?: boolean;
};

function CanvasInner({ agents, runId, selectedAgent, onSelectAgent, isMainCanvas }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // OPTIMIZED: Memoize agent map creation
  const agentMap = useMemo(() => {
    const map: Record<string, AgentRun> = {};
    agents.forEach((a) => { map[a.agent_name] = a; });
    return map;
  }, [agents]);

  // OPTIMIZED: Memoize node calculations - only recalculate when dependencies change
  const mappedNodes = useMemo(() => {
    return Object.entries(NODE_POSITIONS).flatMap(([id, pos]): Node[] => {
      const def = getAgentDef(id);
      if (!def) return [];
      const agentData = agentMap[id];
      let output = agentData?.output ?? null;
      if (typeof output === "string") {
        try { output = JSON.parse(output); } catch { /* keep */ }
      }

      return [{
        id,
        position: isMainCanvas ? { x: pos.x * 1.5, y: pos.y * 1.5 } : pos,
        type: "agentNode",
        data: {
          name: id,
          displayName: def.displayName,
          role: def.role,
          tier: def.tier,
          model: def.model,
          status: agentData?.status || "pending",
          output,
          duration_ms: agentData?.duration_ms ?? undefined,
          color: def.color,
          icon: def.icon,
          onSelect: (nodeId: string) => onSelectAgent(selectedAgent === nodeId ? null : nodeId),
          selected: selectedAgent === id,
        } satisfies AgentData,
      }];
    });
  }, [agentMap, selectedAgent, onSelectAgent, isMainCanvas]);

  // OPTIMIZED: Memoize edge calculations - only recalculate when agent statuses change
  const mappedEdges = useMemo(() => {
    return AGENT_EDGES.map(([source, target]) => {
      const sourceDef = getAgentDef(source);
      const sourceData = agentMap[source];
      const isFlowing = sourceData?.status === "running" || sourceData?.status === "complete";
      const isFailed = sourceData?.status === "failed";

      return {
        id: `e-${source}-${target}`,
        source,
        target,
        animated: isFlowing && !isFailed,
        type: "smoothstep",
        style: {
          stroke: isFailed ? "#ef4444" : isFlowing ? (sourceDef?.color || "#fff") : "rgba(255,255,255,0.08)",
          strokeWidth: isFlowing ? 2 : 1,
          opacity: isFlowing ? 0.6 : 0.3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isFailed ? "#ef4444" : isFlowing ? (sourceDef?.color || "#fff") : "rgba(255,255,255,0.15)",
          width: 12,
          height: 12,
        },
      };
    });
  }, [agentMap]);

  // Update nodes and edges when memoized values change
  useEffect(() => {
    setNodes(mappedNodes);
    setEdges(mappedEdges);
  }, [mappedNodes, mappedEdges, setNodes, setEdges]);

  return (
    <div className={`w-full h-full relative overflow-hidden ${isMainCanvas ? "bg-[#09090b]" : "bg-[#0a0a0d]"}`}>
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="z-10"
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className="!bg-black/60 !border-white/10 !rounded-lg !shadow-xl [&>button]:!bg-black/40 [&>button]:!border-white/10 [&>button]:!fill-zinc-400 [&>button:hover]:!bg-white/10"
          showInteractive={false}
        />
        <Background gap={20} size={0.5} color="rgba(255,255,255,0.02)" />
      </ReactFlow>

      {/* HUD overlay for main canvas */}
      {isMainCanvas && (
        <div className="absolute top-3 left-4 z-20 pointer-events-none">
          <h2 className="text-sm font-bold tracking-tight text-zinc-200 flex items-center gap-2">
            <span className="bg-amber-500/15 text-amber-400 p-1 rounded">
              <ShieldCheck className="size-3.5" />
            </span>
            Vanar Sena Mission Control
          </h2>
          <p className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase mt-0.5">
            Autonomous Remediation Mesh
          </p>
        </div>
      )}

      {/* Session indicator */}
      {isMainCanvas && runId && (
        <div className="absolute top-3 right-4 z-20 pointer-events-none">
          <div className="bg-black/60 border border-white/[0.06] px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              RUN {runId.slice(0, 8)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
