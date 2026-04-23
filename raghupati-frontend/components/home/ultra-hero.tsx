"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import ReactFlow, {
  Background,
  BackgroundVariant,
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
  ArrowRight, Zap, Shield, Bot, Eye, Code2, GitBranch,
  Search, CheckCircle2, Radio, Cpu, Globe, Database,
  Sparkles, ChevronRight, Play, Pause,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ── Agent node data for the interactive demo ──
type AgentNodeData = {
  label: string;
  role: string;
  icon: string;
  color: string;
  status: "idle" | "running" | "complete";
};

function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const statusColor =
    data.status === "running" ? "text-blue-400" :
    data.status === "complete" ? "text-emerald-400" :
    "text-zinc-500";
  const statusBg =
    data.status === "running" ? "bg-blue-500/10 border-blue-500/20" :
    data.status === "complete" ? "bg-emerald-500/10 border-emerald-500/20" :
    "bg-zinc-500/10 border-zinc-500/20";

  return (
    <div className={`px-3 py-2 rounded-xl border ${data.color} bg-[#0c0c14]/90 backdrop-blur-sm shadow-2xl min-w-[160px] transition-all duration-500`}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">{data.label}</span>
        <span className={`ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${statusBg} ${statusColor}`}>
          {data.status}
        </span>
      </div>
      <span className="text-[9px] text-zinc-400">{data.role}</span>
      {data.status === "running" && (
        <div className="mt-1.5 h-0.5 rounded-full bg-blue-500/20 overflow-hidden">
          <motion.div
            className="h-full bg-blue-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

// ── Animated workflow demo ──
function WorkflowDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduceMotion = useReducedMotion();

  const agentSequence = useMemo(() => [
    { id: "hanuman", label: "Hanuman", role: "Watcher · Repo Analysis", color: "border-blue-500/30" },
    { id: "rama", label: "Rama", role: "Commander · Severity Classification", color: "border-violet-500/30" },
    { id: "lakshmana", label: "Lakshmana", role: "Mapper · Codebase Structure", color: "border-cyan-500/30" },
    { id: "sita", label: "Sita", role: "Security · Vulnerability Scanning", color: "border-amber-500/30" },
    { id: "jambavan", label: "Jambavan", role: "Analyst · Fix Research", color: "border-indigo-500/30" },
    { id: "nala", label: "Nala", role: "Patch · Code Generation", color: "border-emerald-500/30" },
    { id: "sugreeva", label: "Sugreeva", role: "QA · CI Validation", color: "border-rose-500/30" },
    { id: "bharata", label: "Bharata", role: "Refactor · Code Quality", color: "border-teal-500/30" },
    { id: "shatrughna", label: "Shatrughna", role: "Deploy · Readiness Check", color: "border-orange-500/30" },
    { id: "dasharatha", label: "Dasharatha", role: "GitHub · Push & PR", color: "border-pink-500/30" },
    { id: "vibhishana", label: "Vibhishana", role: "Comms · Notifications", color: "border-sky-500/30" },
  ], []);

  const initialNodes: Node<AgentNodeData>[] = useMemo(() => [
    { id: "hanuman", position: { x: 200, y: 0 }, data: { ...agentSequence[0], icon: "", status: "idle" }, type: "agentNode" },
    { id: "rama", position: { x: 200, y: 90 }, data: { ...agentSequence[1], icon: "", status: "idle" }, type: "agentNode" },
    { id: "lakshmana", position: { x: 0, y: 180 }, data: { ...agentSequence[2], icon: "", status: "idle" }, type: "agentNode" },
    { id: "sita", position: { x: 200, y: 180 }, data: { ...agentSequence[3], icon: "", status: "idle" }, type: "agentNode" },
    { id: "jambavan", position: { x: 400, y: 180 }, data: { ...agentSequence[4], icon: "", status: "idle" }, type: "agentNode" },
    { id: "nala", position: { x: 200, y: 270 }, data: { ...agentSequence[5], icon: "", status: "idle" }, type: "agentNode" },
    { id: "sugreeva", position: { x: 200, y: 360 }, data: { ...agentSequence[6], icon: "", status: "idle" }, type: "agentNode" },
    { id: "bharata", position: { x: 0, y: 450 }, data: { ...agentSequence[7], icon: "", status: "idle" }, type: "agentNode" },
    { id: "shatrughna", position: { x: 400, y: 450 }, data: { ...agentSequence[8], icon: "", status: "idle" }, type: "agentNode" },
    { id: "dasharatha", position: { x: 200, y: 540 }, data: { ...agentSequence[9], icon: "", status: "idle" }, type: "agentNode" },
    { id: "vibhishana", position: { x: 200, y: 630 }, data: { ...agentSequence[10], icon: "", status: "idle" }, type: "agentNode" },
  ], [agentSequence]);

  const initialEdges: Edge[] = useMemo(() => [
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Animate through the pipeline steps
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setStep((prev) => {
        const next = (prev + 1) % (agentSequence.length + 2);
        return next;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [playing, agentSequence.length]);

  // Update node statuses based on current step
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const idx = agentSequence.findIndex((a) => a.id === node.id);
        let status: "idle" | "running" | "complete" = "idle";
        if (step > idx && step <= agentSequence.length) status = "complete";
        if (step === idx + 1) status = "running";
        if (step > agentSequence.length) status = "complete";
        return {
          ...node,
          data: { ...node.data, status },
        };
      })
    );
  }, [step, agentSequence, setNodes]);

  return (
    <div className="relative h-[520px] w-full rounded-2xl border border-white/[0.06] bg-[#08080f] overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.04] bg-[#0c0c14] px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-red-400/70" />
          <div className="size-2.5 rounded-full bg-amber-400/70" />
          <div className="size-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="ml-3 flex-1 rounded-md bg-white/[0.03] px-3 py-1 text-center text-[10px] text-zinc-600 font-mono">
          raghupati.app/execution/demo
        </div>
        <button
          onClick={() => setPlaying(!playing)}
          className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={0.8} color="#1a1a2e" />
      </ReactFlow>

      {/* Step indicator */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {agentSequence.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < step ? "bg-emerald-500/60" :
                i === step - 1 ? "bg-blue-500/60" :
                "bg-white/[0.06]"
              }`}
            />
          ))}
        </div>
        <span className="text-[9px] font-mono text-zinc-600">
          {step > 0 && step <= agentSequence.length
            ? `Step ${step}/${agentSequence.length}: ${agentSequence[step - 1].label}`
            : step > agentSequence.length
            ? "Pipeline complete"
            : "Initializing..."}
        </span>
      </div>
    </div>
  );
}

// ── Tech stack icons ──
const techStack = [
  { name: "Next.js 15", icon: Globe, color: "text-white" },
  { name: "React 19", icon: Code2, color: "text-cyan-400" },
  { name: "FastAPI", icon: Zap, color: "text-emerald-400" },
  { name: "Supabase", icon: Database, color: "text-green-400" },
  { name: "Mistral AI", icon: Sparkles, color: "text-orange-400" },
  { name: "Groq LPU", icon: Cpu, color: "text-violet-400" },
  { name: "Codestral", icon: Code2, color: "text-blue-400" },
  { name: "GitHub API", icon: GitBranch, color: "text-white" },
  { name: "NVD / OSV", icon: Shield, color: "text-amber-400" },
  { name: "Ollama", icon: Bot, color: "text-rose-400" },
  { name: "Framer Motion", icon: Play, color: "text-pink-400" },
  { name: "ReactFlow", icon: Radio, color: "text-sky-400" },
];

// ── Agent showcase cards ──
const agentCards = [
  { id: "hanuman", name: "Hanuman", role: "Watcher", desc: "Monitors GitHub repos 24/7 via webhooks. Analyzes every push, PR, and dependency change in real time.", model: "llama-4-scout", provider: "Groq", color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20" },
  { id: "rama", name: "Rama", role: "Commander", desc: "Classifies severity and orchestrates the entire pipeline. Single escalation authority for all sub-agents.", model: "mistral-large", provider: "Mistral", color: "from-violet-500/20 to-violet-600/5", border: "border-violet-500/20" },
  { id: "lakshmana", name: "Lakshmana", role: "Mapper", desc: "Maps project structure, traces data flows, builds knowledge graph for accurate patch targeting.", model: "mistral-medium", provider: "Mistral", color: "from-cyan-500/20 to-cyan-600/5", border: "border-cyan-500/20" },
  { id: "sita", name: "Sita", role: "Security", desc: "Deep vulnerability scanning combining NVD/OSV with code-level analysis. Evidence-backed assessments only.", model: "mixtral-8x7b", provider: "Groq", color: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/20" },
  { id: "jambavan", name: "Jambavan", role: "Analyst", desc: "Security research analyst. Cross-references vulnerabilities with web research for fix strategies.", model: "mistral-medium", provider: "Mistral", color: "from-indigo-500/20 to-indigo-600/5", border: "border-indigo-500/20" },
  { id: "nala", name: "Nala", role: "Patch", desc: "Elite patch engineer with anti-hallucination guardrails. Generates complete, production-grade code — never placeholders.", model: "codestral-latest", provider: "Mistral", color: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/20" },
  { id: "sugreeva", name: "Sugreeva", role: "QA", desc: "Runs CI pipeline against every patch. Failed patches trigger Hanuman recheck + Nala re-invocation loop.", model: "llama-4-scout", provider: "Groq", color: "from-rose-500/20 to-rose-600/5", border: "border-rose-500/20" },
  { id: "bharata", name: "Bharata", role: "Refactor", desc: "Code quality guardian. Reviews patches for dead code, naming, pattern improvements alongside security fixes.", model: "mistral-medium", provider: "Mistral", color: "from-teal-500/20 to-teal-600/5", border: "border-teal-500/20" },
  { id: "shatrughna", name: "Shatrughna", role: "Deploy", desc: "Deployment readiness assessment. Validates that patches won't break production environments.", model: "llama-4-scout", provider: "Groq", color: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/20" },
  { id: "dasharatha", name: "Dasharatha", role: "GitHub Sync", desc: "Manages branch creation, commits, and push operations. Supports manual approval and autonomous modes.", model: "llama-4-scout", provider: "Groq", color: "from-pink-500/20 to-pink-600/5", border: "border-pink-500/20" },
  { id: "vibhishana", name: "Vibhishana", role: "Comms", desc: "Routes alerts to Slack, Discord, and email with severity-aware formatting. Creates PRs with evidence trails.", model: "llama3-8b", provider: "Groq", color: "from-sky-500/20 to-sky-600/5", border: "border-sky-500/20" },
];

export function UltraHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#050508]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/[0.07] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/[0.07] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ // NOSONAR
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pt-20 pb-8">
        {/* Hero text */}
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5 text-xs font-medium text-violet-300"
          >
            <Zap className="size-3" />
            11-Agent Autonomous DevSecOps — Anti-Hallucination Guardrails
          </motion.div>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl text-white"
          >
            Hunt threats before
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              they hunt you
            </span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg"
          >
            A mission-grade command center with <span className="text-white font-semibold">11 autonomous AI agents</span> that
            detect vulnerabilities, generate <span className="text-emerald-400">verified production-grade patches</span>,
            and ship remediation PRs — with Hanuman recheck loops and anti-hallucination guardrails.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/login">
              <Button size="lg" className="h-12 gap-2 px-8 text-sm font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-500/20">
                Start securing now
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#workflow-demo">
              <Button variant="outline" size="lg" className="h-12 gap-2 px-8 text-sm font-semibold border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Play className="size-4" />
                Watch the pipeline
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-8 md:gap-16"
        >
          {[
            { label: "Agents", value: "11", icon: Bot },
            { label: "Avg MTTR", value: "29m", icon: Zap },
            { label: "Fix Rate", value: "74%", icon: CheckCircle2 },
            { label: "Anti-Hallucination", value: "10 Rules", icon: Shield },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
                  <Icon className="size-4 text-violet-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-[11px] text-zinc-500">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Interactive workflow demo */}
      <div id="workflow-demo" className="relative mx-auto max-w-5xl px-5 mt-8 mb-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <WorkflowDemo />
        </motion.div>
        <p className="text-center text-[11px] text-zinc-600 mt-3">
          Interactive demo — drag nodes, zoom, and watch the 11-agent pipeline execute in real time
        </p>
      </div>

      {/* Tech stack */}
      <div className="border-t border-white/[0.04] py-16">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Enterprise Tech Stack</h2>
            <p className="text-sm text-zinc-500">Built with cutting-edge AI, real-time infrastructure, and production-grade tooling</p>
          </motion.div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {techStack.map((tech, i) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={tech.name}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
                >
                  <Icon className={`size-6 ${tech.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[11px] text-zinc-400 font-medium text-center">{tech.name}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent showcase */}
      <div className="border-t border-white/[0.04] py-16">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center mb-10"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-300">
              <Bot className="size-3" />
              Vanar Sena — 11 Specialized Agents
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Meet the Agent Roster</h2>
            <p className="text-sm text-zinc-500">Each agent has a specific role, dedicated model, and anti-hallucination guardrails</p>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agentCards.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border ${agent.border} bg-gradient-to-br ${agent.color} p-5 hover:scale-[1.02] transition-transform cursor-default`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">{agent.role}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{agent.desc}</p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1"><Cpu className="size-3" /> {agent.model}</span>
                  <span>·</span>
                  <span>{agent.provider}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Built by section */}
      <div className="border-t border-white/[0.04] py-12">
        <div className="mx-auto max-w-7xl px-5 text-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
          >
            <p className="text-sm text-zinc-500">
              Crafted with precision by{" "}
              <span className="font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                G R Harsha
              </span>
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Autonomous DevSecOps · Multi-Agent AI · Anti-Hallucination Engineering
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
