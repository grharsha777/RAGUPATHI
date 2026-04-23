"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play, StopCircle, RefreshCw, ChevronDown, Shield, Code2,
  CheckCircle2, XCircle, Clock, Loader2, GitBranch, GitPullRequest,
  AlertTriangle, Eye, FileCode, Zap, ArrowLeft, ExternalLink,
  Filter, Search, Bot, MessageSquare, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENT_DEFINITIONS, AGENT_ORDER, AGENT_EDGES, getAgentDef } from "@/lib/constants/agents";
import { VanarSenaPipeline } from "@/components/agents/VanarSenaPipeline";

// ── Types ──────────────────────────────────────────────────────────
type AgentStatus = "pending" | "running" | "complete" | "failed" | "skipped" | "idle";

type AgentRun = {
  id: string;
  run_id: string;
  agent_name: string;
  status: AgentStatus;
  started_at: string | null;
  completed_at: string | null;
  output: any;
  error: string | null;
  duration_ms: number | null;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
  updated_at: string;
};

type Finding = {
  id: string;
  title: string;
  severity: string;
  confidence: number;
  category: string;
  path: string;
  line: number | null;
  evidence: string;
  impact: string;
  remediation: string;
  patchable: boolean;
  source: string;
  cve_id: string | null;
  cvss_score: number | null;
  package_name: string | null;
};

type Patch = {
  id: string;
  file_path: string;
  diff_text: string;
  original_content: string;
  patched_content: string;
  incident_id: string | null;
};

type ScanRun = {
  id: string;
  repo_full_name: string;
  trigger_type: string;
  status: string;
  stage?: string | null;
  started_at: string | null;
  completed_at: string | null;
  vulnerabilities_found: number;
  patches_generated: number;
  pr_url: string | null;
  error_message?: string | null;
};

// ── Severity helpers ────────────────────────────────────────────────
const SEV_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  LOW: "bg-green-500/10 text-green-500 border-green-500/20",
  INFO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const STATUS_ICONS: Record<AgentStatus, any> = {
  pending: Clock,
  running: Loader2,
  complete: CheckCircle2,
  failed: XCircle,
  skipped: Clock,
  idle: Clock,
};

// ── Main Page Component ────────────────────────────────────────────
export default function AdvancedScanPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  const [scanRun, setScanRun] = useState<ScanRun | null>(null);
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [patchFilter, setPatchFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"findings" | "patches" | "validation" | "github">("findings");

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  // Fetch scan detail
  const fetchDetail = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`${apiBase}/scans/${runId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScanRun(data.scan_run || null);
      setAgents(data.agents || []);
      // Map incidents to findings
      setFindings(
        (data.incidents || []).map((inc: any) => ({
          id: inc.id,
          title: inc.title || "Unknown",
          severity: inc.severity || "medium",
          confidence: inc.patch_confidence || 0,
          category: inc.cve_id ? "CVE" : "dependency",
          path: inc.package_name || "",
          line: null,
          evidence: inc.description || "",
          impact: inc.cvss_score ? `CVSS ${inc.cvss_score}` : "",
          remediation: "",
          patchable: inc.status !== "escalated",
          source: "angada",
          cve_id: inc.cve_id,
          cvss_score: inc.cvss_score,
          package_name: inc.package_name,
        }))
      );
      setPatches(data.patches || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [runId, apiBase]);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 5000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  // SSE subscription for real-time updates
  useEffect(() => {
    if (!runId) return;
    const eventSource = new EventSource(`${apiBase}/events/scan/${runId}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "scan_complete") {
          fetchDetail();
        } else if (data.agent_name) {
          setAgents((prev) =>
            prev.map((a) =>
              a.agent_name === data.agent_name
                ? { ...a, status: data.status, output: data.output, error: data.error, duration_ms: data.duration_ms, updated_at: data.updated_at }
                : a
            )
          );
        }
      } catch {}
    };
    return () => eventSource.close();
  }, [runId, apiBase, fetchDetail]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    let result = findings;
    if (sevFilter !== "all") result = result.filter((f) => f.severity.toLowerCase() === sevFilter.toLowerCase());
    if (patchFilter === "patchable") result = result.filter((f) => f.patchable);
    else if (patchFilter === "non-patchable") result = result.filter((f) => !f.patchable);
    return result;
  }, [findings, sevFilter, patchFilter]);

  // Scan status
  const scanStatus = scanRun?.status || "pending";
  const isRunning = scanStatus === "running" || scanStatus === "pending";
  const allDone = agents.length > 0 && agents.every((a) => ["complete", "failed", "skipped"].includes(a.status));

  // Selected agent data
  const selectedAgentData = useMemo(() => {
    if (!selectedAgent) return null;
    return agents.find((a) => a.agent_name === selectedAgent) || null;
  }, [selectedAgent, agents]);

  const selectedDef = selectedAgent ? getAgentDef(selectedAgent) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading scan run...</span>
        </div>
      </div>
    );
  }

  if (error && !scanRun) {
    const isNotFound = error.includes("404");
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex items-start gap-4 max-w-lg">
          <AlertTriangle className="size-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-500">
              {isNotFound ? "Scan not found" : "Failed to load scan"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isNotFound 
                ? `Scan run "${runId.slice(0, 8)}..." does not exist. It may have been deleted or the ID is incorrect.` 
                : error}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button 
                onClick={() => router.push("/repositories")} 
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Repositories
              </button>
              <button 
                onClick={() => router.push("/scan")} 
                className="text-xs px-3 py-1.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors"
              >
                Scan History
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="text-xs underline text-muted-foreground hover:text-foreground"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)] overflow-hidden">
      {/* ── Command Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft className="size-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Scan Execution</h1>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                isRunning ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                scanStatus === "complete" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                scanStatus === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-muted/30 text-muted-foreground border-border"
              }`}>
                {isRunning && <Loader2 className="size-3 inline animate-spin mr-1" />}
                {scanStatus}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{scanRun?.repo_full_name || "—"}</span>
              <span>•</span>
              <span>Run: {runId.slice(0, 8)}</span>
              <span>•</span>
              <span>{scanRun?.trigger_type || "manual"}</span>
              {scanRun?.stage && scanRun.stage !== "idle" && (
                <>
                  <span>•</span>
                  <span className="text-blue-500">Stage: {scanRun.stage}</span>
                </>
              )}
              {scanRun?.started_at && (
                <>
                  <span>•</span>
                  <span>Started: {new Date(scanRun.started_at).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={() => router.push(`/execution/${runId}`)}
              className="h-7 rounded-md bg-primary/10 px-3 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
            >
              <Zap className="size-3" /> Mission Control
            </button>
          )}
          <button onClick={fetchDetail} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title="Refresh">
            <RefreshCw className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Error banner for failed scans */}
      {scanRun?.error_message && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-center gap-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-500">Scan Failed</p>
            <p className="text-[11px] text-red-400/80 font-mono">{scanRun.error_message}</p>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ──────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">
        {/* LEFT: Orchestration Canvas + Agent Rail */}
        <div className="col-span-12 xl:col-span-5 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Orchestration Graph */}
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card">
            <VanarSenaPipeline runId={runId} agents={agents} />
          </div>

          {/* Agent Rail — compact horizontal strip */}
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="size-3.5 text-primary" />
              <h3 className="text-xs font-semibold">Vanar Sena Agents</h3>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {agents.filter((a) => a.status === "complete").length}/{agents.length || 7} complete
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {AGENT_ORDER.map((name) => {
                const def = getAgentDef(name);
                const agent = agents.find((a) => a.agent_name === name);
                const status: AgentStatus = agent?.status || "pending";
                const Icon = STATUS_ICONS[status];
                const isSelected = selectedAgent === name;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedAgent(isSelected ? null : name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center ${
                      isSelected ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
                    }`}
                  >
                    <div
                      className="size-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${def?.color || "#666"}15`, border: `1px solid ${def?.color || "#666"}40` }}
                    >
                      <Icon
                        className={`size-3.5 ${status === "running" ? "animate-spin" : ""}`}
                        style={{ color: def?.color || "#666" }}
                      />
                    </div>
                    <span className="text-[9px] font-medium truncate w-full">{def?.displayName || name}</span>
                    <span className={`text-[8px] font-mono capitalize ${
                      status === "complete" ? "text-emerald-500" :
                      status === "running" ? "text-blue-500" :
                      status === "failed" ? "text-red-500" : "text-muted-foreground"
                    }`}>{status}</span>
                    {agent?.duration_ms && (
                      <span className="text-[8px] font-mono text-muted-foreground">{agent.duration_ms}ms</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER: Findings / Patches / Validation / GitHub */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-border/50 pb-1">
            {[
              { id: "findings" as const, label: "Findings", icon: Shield, count: findings.length },
              { id: "patches" as const, label: "Patches", icon: Code2, count: patches.length },
              { id: "validation" as const, label: "Validation", icon: CheckCircle2, count: null },
              { id: "github" as const, label: "GitHub", icon: GitBranch, count: null },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
                {tab.count !== null && (
                  <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] tabular-nums">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === "findings" && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={sevFilter}
                    onChange={(e) => setSevFilter(e.target.value)}
                    className="h-7 rounded-md border border-border/50 bg-card px-2 text-xs"
                  >
                    <option value="all">All severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={patchFilter}
                    onChange={(e) => setPatchFilter(e.target.value)}
                    className="h-7 rounded-md border border-border/50 bg-card px-2 text-xs"
                  >
                    <option value="all">All</option>
                    <option value="patchable">Patchable</option>
                    <option value="non-patchable">Non-patchable</option>
                  </select>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">{filteredFindings.length} results</span>
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                    {findings.length === 0 ? "No findings yet — scan may still be running." : "No findings match filters."}
                  </div>
                ) : (
                  filteredFindings.map((f) => (
                    <div key={f.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{f.title}</div>
                          {f.cve_id && <span className="text-[10px] font-mono text-muted-foreground">{f.cve_id}</span>}
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${SEV_COLORS[f.severity] || SEV_COLORS.medium}`}>
                          {f.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {f.package_name && <span className="font-mono">{f.package_name}</span>}
                        {f.cvss_score && <span>CVSS: {f.cvss_score}</span>}
                        <span className={f.patchable ? "text-emerald-500" : "text-amber-500"}>
                          {f.patchable ? "Patchable" : "Non-patchable"}
                        </span>
                      </div>
                      {f.evidence && (
                        <div className="rounded-md bg-black/30 p-2 text-[10px] font-mono text-muted-foreground leading-relaxed max-h-20 overflow-y-auto">
                          {f.evidence}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "patches" && (
              <div className="space-y-3">
                {patches.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                    No patches generated yet.
                  </div>
                ) : (
                  patches.map((p) => (
                    <div key={p.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="size-3.5 text-primary" />
                        <span className="text-sm font-mono font-semibold">{p.file_path}</span>
                      </div>
                      {p.diff_text && (
                        <div className="rounded-md bg-black/30 p-3 text-[10px] font-mono leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-emerald-400/80">{p.diff_text.slice(0, 2000)}</pre>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button className="h-7 rounded-md bg-primary/10 px-3 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors">
                          Review Patch
                        </button>
                        <button className="h-7 rounded-md bg-emerald-500/10 px-3 text-[10px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                          Approve & Push
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "validation" && (
              <div className="space-y-3">
                {(() => {
                  const sugreeva = agents.find((a) => a.agent_name === "sugreeva");
                  const output = sugreeva?.output ? (typeof sugreeva.output === "string" ? JSON.parse(sugreeva.output) : sugreeva.output) : null;
                  return (
                    <>
                      <ValidationCard label="Test Status" status={output ? (output.conclusion === "success" ? "pass" : output.conclusion === "failure" ? "fail" : "pending") : "waiting"} />
                      <ValidationCard label="Build Status" status={output ? (output.conclusion === "success" ? "pass" : "pending") : "waiting"} />
                      <ValidationCard label="Lint Status" status="waiting" />
                      <ValidationCard label="CI Workflow" status={output?.html_url ? (output.conclusion === "success" ? "pass" : "pending") : "waiting"} url={output?.html_url} />
                    </>
                  );
                })()}
              </div>
            )}

            {activeTab === "github" && (
              <GitHubPanel repo={scanRun?.repo_full_name || ""} prUrl={scanRun?.pr_url} />
            )}
          </div>
        </div>

        {/* RIGHT: Agent Detail Panel */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-4 overflow-hidden min-h-0">
          {selectedAgentData && selectedDef ? (
            <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${selectedDef.color}15`, border: `1px solid ${selectedDef.color}40` }}
                  >
                    <Bot className="size-4" style={{ color: selectedDef.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{selectedDef.displayName}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{selectedDef.role}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="p-1 rounded hover:bg-muted/30">
                  <XCircle className="size-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{selectedDef.description}</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/20 p-2.5 border border-border/30">
                  <p className="text-[9px] text-muted-foreground mb-0.5">Status</p>
                  <p className={`text-xs font-semibold capitalize ${
                    selectedAgentData.status === "running" ? "text-blue-500" :
                    selectedAgentData.status === "complete" ? "text-emerald-500" :
                    selectedAgentData.status === "failed" ? "text-red-500" : "text-muted-foreground"
                  }`}>{selectedAgentData.status}</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-2.5 border border-border/30">
                  <p className="text-[9px] text-muted-foreground mb-0.5">Duration</p>
                  <p className="text-xs font-mono">{selectedAgentData.duration_ms ? `${selectedAgentData.duration_ms}ms` : "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-2.5 border border-border/30">
                  <p className="text-[9px] text-muted-foreground mb-0.5">Model</p>
                  <p className="text-[10px] font-mono">{selectedAgentData.model_used || selectedDef.model}</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-2.5 border border-border/30">
                  <p className="text-[9px] text-muted-foreground mb-0.5">Tokens</p>
                  <p className="text-xs font-mono tabular-nums">{selectedAgentData.tokens_used || "—"}</p>
                </div>
              </div>

              {selectedAgentData.error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] font-semibold text-red-500 mb-1">Error</p>
                  <p className="text-[10px] font-mono text-red-400/80">{selectedAgentData.error}</p>
                </div>
              )}

              {selectedAgentData.output && selectedAgentData.status !== "running" && (() => {
                const output = typeof selectedAgentData.output === "string"
                  ? (() => { try { return JSON.parse(selectedAgentData.output); } catch { return { raw: selectedAgentData.output }; } })()
                  : selectedAgentData.output;
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground">Output</p>
                    <div className="rounded-lg bg-black/30 p-3 border border-white/5 overflow-y-auto max-h-64">
                      <pre className="text-[10px] font-mono leading-relaxed text-emerald-400/80 whitespace-pre-wrap">
                        {JSON.stringify(output, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })()}

              {selectedAgentData.started_at && (
                <div className="text-[9px] text-muted-foreground font-mono">
                  Started: {new Date(selectedAgentData.started_at).toLocaleString()}
                  {selectedAgentData.completed_at && (
                    <> • Completed: {new Date(selectedAgentData.completed_at).toLocaleString()}</>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 rounded-xl border bg-card flex items-center justify-center">
              <div className="text-center p-6">
                <Bot className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Select an agent to inspect</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Click any agent node in the graph or rail</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function ValidationCard({ label, status, url }: { label: string; status: "pass" | "fail" | "pending" | "waiting"; url?: string }) {
  const icon = status === "pass" ? CheckCircle2 : status === "fail" ? XCircle : status === "pending" ? Loader2 : Clock;
  const color = status === "pass" ? "text-emerald-500" : status === "fail" ? "text-red-500" : status === "pending" ? "text-blue-500" : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {React.createElement(icon, { className: `size-4 ${color} ${status === "pending" ? "animate-spin" : ""}` })}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold capitalize ${color}`}>{status}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted/30">
            <ExternalLink className="size-3 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}

function GitHubPanel({ repo, prUrl }: { repo: string; prUrl?: string | null }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    if (!repo || !repo.includes("/")) {
      setLoading(false);
      return;
    }
    const [owner, name] = repo.split("/");
    fetch(`${apiBase}/github/monitor/${owner}/${name}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [repo, apiBase]);

  if (loading) return <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">Loading GitHub data...</div>;
  if (!data) return <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">GitHub integration not connected or repo not accessible.</div>;

  return (
    <div className="space-y-3">
      {/* Branches */}
      <div className="rounded-lg border bg-card p-3">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><GitBranch className="size-3" /> Branches</h4>
        <div className="space-y-1">
          {data.branches?.slice(0, 5).map((b: any) => (
            <div key={b.name} className="flex items-center justify-between text-[10px]">
              <span className="font-mono">{b.name}</span>
              {b.is_default && <span className="text-primary font-medium">default</span>}
              {b.protected && <span className="text-amber-500">protected</span>}
            </div>
          )) || <span className="text-[10px] text-muted-foreground">No branches found</span>}
        </div>
      </div>

      {/* Recent Commits */}
      <div className="rounded-lg border bg-card p-3">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Code2 className="size-3" /> Recent Commits</h4>
        <div className="space-y-1.5">
          {data.recent_commits?.slice(0, 5).map((c: any, i: number) => (
            <div key={i} className="text-[10px]">
              <span className="font-mono text-muted-foreground">{c.sha}</span>
              <span className="ml-2 truncate max-w-[200px] inline-block align-bottom">{c.message?.split("\n")[0]}</span>
            </div>
          )) || <span className="text-[10px] text-muted-foreground">No commits found</span>}
        </div>
      </div>

      {/* Open PRs */}
      <div className="rounded-lg border bg-card p-3">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><GitPullRequest className="size-3" /> Pull Requests</h4>
        {prUrl && (
          <a href={prUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-primary hover:underline mb-2">
            <ExternalLink className="size-3" /> RAGHUPATI Security Patch PR
          </a>
        )}
        <div className="space-y-1">
          {data.open_prs?.slice(0, 5).map((p: any) => (
            <a key={p.number} href={p.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] hover:underline">
              <GitPullRequest className="size-3 text-emerald-500" />
              <span className="truncate">#{p.number} {p.title}</span>
            </a>
          )) || <span className="text-[10px] text-muted-foreground">No open PRs</span>}
        </div>
      </div>

      {/* CI Workflows */}
      <div className="rounded-lg border bg-card p-3">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Activity className="size-3" /> Workflow Runs</h4>
        <div className="space-y-1">
          {data.workflow_runs?.slice(0, 3).map((w: any) => (
            <div key={w.id} className="flex items-center justify-between text-[10px]">
              <span className="truncate max-w-[150px]">{w.name}</span>
              <span className={w.conclusion === "success" ? "text-emerald-500" : w.conclusion === "failure" ? "text-red-500" : "text-muted-foreground"}>
                {w.conclusion || w.status}
              </span>
            </div>
          )) || <span className="text-[10px] text-muted-foreground">No workflow runs found</span>}
        </div>
      </div>
    </div>
  );
}
