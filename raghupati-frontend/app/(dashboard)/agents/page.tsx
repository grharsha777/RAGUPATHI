"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Loader2, Bot, Cpu, Shield, Zap, Eye, Search, Code2,
  CheckCircle2, GitBranch, Radio, Activity,
} from "lucide-react";

import { useVanarAgents } from "@/hooks/useVanarAgents";
import { AgentDetailSheet } from "@/components/agents/agent-detail-sheet";
import { LiveStatusBadge } from "@/components/shared/live-status-badge";

// ── Agent detail data for the detail sheet ──
// ── Agent detail data for the detail sheet ──
const AGENT_DETAILS: Record<string, {
  description: string;
  capabilities: string[];
  antiHallucination: string;
}> = {
  hanuman: {
    description: "Monitors GitHub repositories 24/7 via webhooks. Analyzes every push, PR, and dependency change in real time. Triggers the pipeline when threats are detected.",
    capabilities: ["Webhook monitoring", "Commit analysis", "Dependency tracking", "Pipeline triggering", "Repo recheck on CI failure"],
    antiHallucination: "Only reports data from actual GitHub API responses. Never invents commits, branches, or vulnerability signals.",
  },
  rama: {
    description: "The commander agent that classifies severity and orchestrates the entire pipeline. Acts as the single escalation authority for all sub-agents.",
    capabilities: ["Severity classification", "Pipeline orchestration", "Escalation authority", "Agent delegation", "Priority assignment"],
    antiHallucination: "Classifies only based on evidence from Hanuman and Sita. Never fabricates severity levels or CVE references.",
  },
  lakshmana: {
    description: "Maps the complete project structure, traces data flows, and builds a knowledge graph for accurate patch targeting. Feeds file tree data to Nala.",
    capabilities: ["Codebase mapping", "Data flow tracing", "Risk area identification", "File tree generation", "Dependency graph analysis"],
    antiHallucination: "Only references file paths from the actual repository tree. Never invents data flows or imagines file structures.",
  },
  sita: {
    description: "Deep vulnerability scanning combining NVD/OSV databases with code-level analysis. Produces evidence-backed severity assessments with confidence scores.",
    capabilities: ["NVD/OSV cross-reference", "Code-level CVE analysis", "Confidence scoring", "Vulnerability triage", "Evidence collection"],
    antiHallucination: "Only reports CVEs from NVD/OSV data. Never fabricates CVE IDs, invents vulnerability paths, or guesses severity without evidence.",
  },
  jambavan: {
    description: "Security research analyst that cross-references vulnerabilities with web research for fix strategies. Provides remediation context to Nala.",
    capabilities: ["Web research", "Fix strategy synthesis", "Remediation context", "Patch approach recommendation", "Security advisory lookup"],
    antiHallucination: "Only cites verified security advisories and documented fix strategies. Never fabricates research findings.",
  },
  nala: {
    description: "Elite patch engineer with 10-rule anti-hallucination system. Generates complete, production-grade code — never placeholders, never ellipsis, never descriptions instead of code.",
    capabilities: ["Production-grade patch generation", "Anti-hallucination guardrails (10 rules)", "Retry with CI failure context", "Full file content output", "Diff generation"],
    antiHallucination: "10 Absolute Rules: No ellipsis, no placeholders, no invented imports/APIs, no hallucinated CVEs, full file content required, must compile, must preserve functionality, must fix the vulnerability, must follow existing style, no repeated mistakes on retry.",
  },
  sugreeva: {
    description: "Runs CI pipeline against every patch via GitHub Actions. Failed patches trigger the Hanuman recheck loop with structured feedback.",
    capabilities: ["CI/CD validation", "GitHub Actions integration", "Test execution", "Failure reporting", "Retry signal generation"],
    antiHallucination: "Reports only actual CI results from GitHub Actions API. Never fabricates test outcomes or CI statuses.",
  },
  bharata: {
    description: "Code quality guardian that reviews patches for dead code, naming conventions, and pattern improvements alongside security fixes.",
    capabilities: ["Code quality review", "Dead code detection", "Naming convention enforcement", "Pattern improvement", "Refactoring suggestions"],
    antiHallucination: "Only suggests refactors for files present in the provided data. Never recommends changes to non-existent modules.",
  },
  shatrughna: {
    description: "Deployment readiness assessment agent. Validates that patches won't break production environments and checks compatibility.",
    capabilities: ["Deployment readiness", "Compatibility checking", "Environment validation", "Rollback planning", "Risk assessment"],
    antiHallucination: "Only assesses deployment readiness based on actual CI results and provided codebase data. Never fabricates deployment conditions.",
  },
  dasharatha: {
    description: "Manages branch creation, commits, and push operations via GitHub API. Supports both manual approval and autonomous execution modes.",
    capabilities: ["Branch management", "Commit creation", "PR creation", "Manual/autonomous mode", "GitHub API integration"],
    antiHallucination: "Only pushes verified patches from Supabase. Never invents file changes or creates PRs without approved patches.",
  },
  vibhishana: {
    description: "Routes alerts to Slack, Discord, and email with severity-aware formatting. Creates PRs with full evidence trails and remediation context.",
    capabilities: ["Slack notifications", "Discord alerts", "Email delivery", "PR description generation", "Evidence trail formatting"],
    antiHallucination: "Only sends notifications for real events from the pipeline. Never fabricates incident reports or alert content.",
  },
};

const AGENT_POSITIONS: Record<string, { x: number; y: number }> = {
  hanuman: { x: 200, y: 0 },
  rama: { x: 200, y: 100 },
  lakshmana: { x: 0, y: 200 },
  sita: { x: 200, y: 200 },
  jambavan: { x: 400, y: 200 },
  nala: { x: 200, y: 300 },
  sugreeva: { x: 200, y: 400 },
  bharata: { x: 0, y: 500 },
  shatrughna: { x: 400, y: 500 },
  dasharatha: { x: 200, y: 600 },
  vibhishana: { x: 200, y: 700 },
};

const AGENT_COLORS: Record<string, string> = {
  hanuman: "border-blue-500/20",
  rama: "border-violet-500/20",
  lakshmana: "border-cyan-500/20",
  sita: "border-amber-500/20",
  jambavan: "border-indigo-500/20",
  nala: "border-emerald-500/20",
  sugreeva: "border-rose-500/20",
  bharata: "border-teal-500/20",
  shatrughna: "border-orange-500/20",
  dasharatha: "border-pink-500/20",
  vibhishana: "border-sky-500/20",
};

// ── ReactFlow custom node ──
type AgentNodeData = {
  label: string;
  role: string;
  status: string;
  color: string;
  onClick: () => void;
};

function AgentFlowNode({ data }: NodeProps<AgentNodeData>) {
  const statusColor =
    data.status === "running" ? "text-blue-400 border-blue-500/30 bg-blue-500/[0.03]" :
    data.status === "complete" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.03]" :
    data.status === "failed" ? "text-red-400 border-red-500/30 bg-red-500/[0.03]" :
    "text-zinc-400 border-zinc-700/30 bg-zinc-800/30";

  return (
    <div
      onClick={data.onClick}
      className={`px-3 py-2 rounded-xl border ${data.color} ${statusColor} backdrop-blur-sm shadow-2xl min-w-[150px] cursor-pointer hover:scale-105 transition-transform`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider">{data.label}</span>
        <span className={`ml-auto text-[7px] font-mono px-1 py-0.5 rounded-full ${
          data.status === "running" ? "bg-blue-500/10 text-blue-400" :
          data.status === "complete" ? "bg-emerald-500/10 text-emerald-400" :
          data.status === "failed" ? "bg-red-500/10 text-red-400" :
          "bg-zinc-700/30 text-zinc-500"
        }`}>{data.status}</span>
      </div>
      <span className="text-[8px] opacity-60">{data.role}</span>
      {data.status === "running" && (
        <div className="mt-1.5 h-0.5 rounded-full bg-blue-500/20 overflow-hidden">
          <motion.div className="h-full bg-blue-400 rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const nodeTypes = { agentFlowNode: AgentFlowNode };

export default function AgentsPage() {
  const { agents, loading } = useVanarAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgent(agentId);
    setSheetOpen(true);
  }, []);

  const handleToggleLocal = useCallback((agentId: string, useLocal: boolean) => {
    console.log(`[AgentsPage] Agent ${agentId} local mode: ${useLocal}`);
    // In production, this would update the backend settings
  }, []);

  const flowNodes: Node<AgentNodeData>[] = useMemo(() =>
    agents.map((agent) => {
      const pos = AGENT_POSITIONS[agent.id] || { x: 100, y: 100 };
      return {
        id: agent.id,
        position: pos,
        data: {
          label: agent.displayName,
          role: agent.role,
          status: agent.status,
          color: AGENT_COLORS[agent.id] || "border-zinc-500/20",
          onClick: () => handleAgentClick(agent.id),
        },
        type: "agentFlowNode",
      };
    }),
    [agents, handleAgentClick]
  );

  const flowEdges: Edge[] = useMemo(() => [
    { id: "e1", source: "hanuman", target: "rama", animated: true, style: { stroke: "#6366f1", strokeWidth: 1.5 } },
    { id: "e2", source: "rama", target: "lakshmana", animated: true, style: { stroke: "#06b6d4", strokeWidth: 1.5 } },
    { id: "e3", source: "rama", target: "sita", animated: true, style: { stroke: "#f59e0b", strokeWidth: 1.5 } },
    { id: "e4", source: "rama", target: "jambavan", animated: true, style: { stroke: "#818cf8", strokeWidth: 1.5 } },
    { id: "e5", source: "sita", target: "nala", animated: true, style: { stroke: "#10b981", strokeWidth: 1.5 } },
    { id: "e6", source: "jambavan", target: "nala", animated: true, style: { stroke: "#10b981", strokeWidth: 1.5 } },
    { id: "e7", source: "nala", target: "sugreeva", animated: true, style: { stroke: "#f43f5e", strokeWidth: 1.5 } },
    { id: "e8", source: "sugreeva", target: "bharata", animated: true, style: { stroke: "#14b8a6", strokeWidth: 1.5 } },
    { id: "e9", source: "sugreeva", target: "shatrughna", animated: true, style: { stroke: "#f97316", strokeWidth: 1.5 } },
    { id: "e10", source: "bharata", target: "dasharatha", animated: true, style: { stroke: "#ec4899", strokeWidth: 1.5 } },
    { id: "e11", source: "shatrughna", target: "dasharatha", animated: true, style: { stroke: "#ec4899", strokeWidth: 1.5 } },
    { id: "e12", source: "dasharatha", target: "vibhishana", animated: true, style: { stroke: "#38bdf8", strokeWidth: 1.5 } },
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes when agent data changes
  useEffect(() => {
    setNodes(flowNodes);
  }, [agents, setNodes, flowNodes]);

  const selectedAgentData = selectedAgent ? agents.find((a) => a.id === selectedAgent) : null;
  const selectedAgentDetails = selectedAgent ? AGENT_DETAILS[selectedAgent] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Vanar Sena</h1>
          <p className="text-sm text-muted-foreground">
            11-agent orchestration topology — real-time status, model transparency, and interactive pipeline graph.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">
            {agents.filter((a) => a.status === "running").length} running · {agents.filter((a) => a.status === "complete").length} complete
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Real-time ReactFlow graph */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#08080f] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.04] bg-[#0c0c14] px-4 py-2.5">
              <Activity className="size-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">Orchestration Graph</span>
              <span className="ml-auto text-[9px] font-mono text-zinc-600">Click any agent for details</span>
            </div>
            <div className="h-[520px] w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                minZoom={0.4}
                maxZoom={1.5}
              >
                <MiniMap
                  className="!bg-[#0c0c14]/90 !border-white/[0.06]"
                  maskColor="rgba(5,5,8,0.65)"
                  nodeStrokeColor={() => "#333"}
                />
                <Controls className="!bg-[#0c0c14]/90 !border-white/[0.06]" />
                <Background variant={BackgroundVariant.Dots} gap={20} size={0.8} color="#1a1a2e" />
              </ReactFlow>
            </div>
          </div>

          {/* Agent cards grid */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent, i) => {
              const details = AGENT_DETAILS[agent.id];
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleAgentClick(agent.id)}
                  className={`rounded-xl border p-4 cursor-pointer hover:scale-[1.02] transition-all ${
                    agentColors[agent.id] || "border-zinc-700/30"
                  } bg-[#0c0c14] hover:bg-[#0e0e18]`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{agent.displayName}</h3>
                      <p className="text-[10px] text-zinc-500">{agent.role}</p>
                    </div>
                    <LiveStatusBadge
                      status={agent.health === "healthy" ? "healthy" : agent.health === "degraded" ? "degraded" : "offline"}
                      label={agent.status}
                      pulse={agent.status === "running"}
                    />
                  </div>
                  {details && (
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-2 line-clamp-2">{details.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                    <span className="flex items-center gap-1"><Cpu className="size-3" /> {agent.model}</span>
                    <span>·</span>
                    <span>{agent.provider}</span>
                    {agent.durationMs !== null && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{agent.durationMs}ms</span>
                      </>
                    )}
                  </div>
                  {agent.error && (
                    <div className="mt-2 text-[9px] font-mono text-red-400/70 truncate">{agent.error}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Agent detail sheet */}
      <AgentDetailSheet
        agent={selectedAgentData && selectedAgentDetails ? {
          id: selectedAgentData.id,
          name: selectedAgentData.displayName,
          role: selectedAgentData.role,
          description: selectedAgentDetails.description,
          model: selectedAgentData.model,
          provider: selectedAgentData.provider,
          capabilities: selectedAgentDetails.capabilities,
          antiHallucination: selectedAgentDetails.antiHallucination,
          status: selectedAgentData.status,
          durationMs: selectedAgentData.durationMs,
          tokensUsed: selectedAgentData.tokensUsed,
          error: selectedAgentData.error,
          lastAction: selectedAgentData.lastAction || "No runs yet",
        } : null}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onToggleLocal={handleToggleLocal}
      />
    </div>
  );
}
