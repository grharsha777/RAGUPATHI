"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Pause, Play, Square, Maximize2, Minimize2,
  PanelLeftClose, PanelLeftOpen, ChevronUp, ChevronDown,
  Radio, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  Loader2, Shield, Zap, Eye, Check, X, FileCode,
} from "lucide-react";
import { useExecutionStore } from "@/lib/stores/execution-store";
import { useScanSSE } from "@/hooks/useScanSSE";
import { AGENT_DEFINITIONS, SCAN_STAGES } from "@/lib/constants/agents";
import { WorkflowCanvas } from "@/components/execution/workflow-canvas";
import { AgentDetailPanel } from "@/components/execution/agent-detail-panel";
import { LogPanel } from "@/components/execution/log-panel";
import { GitHubLiveMonitor } from "@/components/execution/github-live-monitor";
import { ScanStageProgress } from "@/components/execution/scan-stage-progress";
import { PatchDiffViewer } from "@/components/execution/patch-diff-viewer";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  // Connect SSE
  useScanSSE(runId);

  const {
    scanRun,
    scanStage,
    agents,
    selectedAgent,
    isPaused,
    isEmergencyStopped,
    isFullscreen,
    leftPanelCollapsed,
    bottomPanelExpanded,
    rightPanelTab,
    sseConnected,
    executionMode,
    pendingApproval,
    approvalAction,
    selectAgent,
    togglePause,
    emergencyStop,
    setFullscreen,
    toggleLeftPanel,
    toggleBottomPanel,
    setRightPanelTab,
    addLog,
    approveAction,
    rejectAction,
  } = useExecutionStore();

  const [approving, setApproving] = useState(false);

  // Auto-enter fullscreen on mount
  useEffect(() => {
    setFullscreen(true);
    addLog({ level: "info", source: "system", message: `Execution environment initialized for run ${runId?.slice(0, 8)}` });
    return () => { setFullscreen(false); };
  }, [addLog, runId, setFullscreen]);

  // Detect when manual approval is needed (Dasharatha completes without pushing)
  useEffect(() => {
    const dasharatha = agents.find((a) => a.agent_name === "dasharatha");
    if (
      executionMode === "manual" &&
      dasharatha?.status === "complete" &&
      dasharatha?.output?.push_result?.reason === "manual_mode_requires_approval" &&
      !pendingApproval
    ) {
      useExecutionStore.getState().setPendingApproval(true, "push");
      addLog({ level: "warn", source: "system", message: "Manual approval required: patches are ready but not pushed. Review patches and approve." });
    }
  }, [agents, executionMode, pendingApproval, addLog]);

  const activeAgents = useMemo(() => agents.filter((a) => a.status === "running"), [agents]);
  const completedAgents = useMemo(() => agents.filter((a) => a.status === "complete"), [agents]);
  const failedAgents = useMemo(() => agents.filter((a) => a.status === "failed"), [agents]);

  const scanStatus = scanRun?.status || "pending";
  const isRunning = scanStatus === "running" || scanStatus === "pending";
  const isComplete = scanStatus === "complete";
  const isFailed = scanStatus === "failed";

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`${API_BASE}/scan/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push_and_pr" }),
      });
      if (res.ok) {
        approveAction();
        addLog({ level: "success", source: "system", message: "Push approved! Patches will be pushed to GitHub." });
      } else {
        const data = await res.json().catch(() => ({}));
        addLog({ level: "error", source: "system", message: `Approval failed: ${data.detail || res.statusText}` });
      }
    } catch (err) {
      addLog({ level: "error", source: "system", message: `Approval request failed: ${err}` });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* ── Top Command Bar ──────────────────────────────────────── */}
      <motion.header
        className="flex items-center justify-between h-12 px-4 border-b border-white/[0.06] bg-[#0c0c0f]/90 backdrop-blur-xl shrink-0 z-30"
        initial={{ y: -48 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/scan")}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="size-4 text-zinc-400" />
          </button>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <Shield className="size-4 text-amber-500" />
            <span className="text-sm font-semibold tracking-tight">
              {scanRun?.repo_full_name || "Loading..."}
            </span>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Scan stage indicator */}
          <ScanStageProgress currentStage={scanStage} />

          <div className="h-5 w-px bg-white/10" />

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            isRunning ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
            isComplete ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
            isFailed ? "bg-red-500/10 text-red-400 border border-red-500/20" :
            "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
          }`}>
            {isRunning && <Loader2 className="size-3 animate-spin" />}
            {isComplete && <CheckCircle2 className="size-3" />}
            {isFailed && <AlertTriangle className="size-3" />}
            {scanStatus}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Execution mode */}
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
            {(["manual", "auto", "dry-run", "restricted"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => useExecutionStore.getState().setExecutionMode(mode)}
                className={`px-2 py-1 rounded-md text-[9px] font-medium tracking-wide uppercase transition-all ${
                  executionMode === mode
                    ? mode === "auto"
                      ? "bg-amber-500/15 text-amber-400"
                      : mode === "dry-run"
                      ? "bg-blue-500/15 text-blue-400"
                      : mode === "restricted"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-white/10 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {mode === "dry-run" ? "DRY" : mode.slice(0, 4)}
              </button>
            ))}
          </div>

          {/* SSE indicator */}
          <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-mono ${
            sseConnected ? "text-emerald-400" : "text-red-400"
          }`}>
            {sseConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {sseConnected ? "LIVE" : "OFFLINE"}
          </div>

          {/* Agent counts */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
            <span className="text-emerald-400">{completedAgents.length}</span>
            <span>/</span>
            <span>{agents.length}</span>
            {activeAgents.length > 0 && (
              <span className="text-blue-400 ml-1">({activeAgents.length} active)</span>
            )}
            {failedAgents.length > 0 && (
              <span className="text-red-400 ml-1">({failedAgents.length} failed)</span>
            )}
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Controls */}
          <button
            onClick={togglePause}
            disabled={isEmergencyStopped}
            className={`p-1.5 rounded-lg transition-colors ${
              isPaused ? "bg-amber-500/10 text-amber-400" : "hover:bg-white/5 text-zinc-400"
            } disabled:opacity-30`}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>

          <button
            onClick={emergencyStop}
            className={`p-1.5 rounded-lg transition-colors ${
              isEmergencyStopped ? "bg-red-500/20 text-red-400" : "hover:bg-red-500/10 text-zinc-400"
            }`}
            title="Emergency Stop"
          >
            <Square className="size-4" />
          </button>

          {isEmergencyStopped && (
            <span className="text-[9px] font-semibold text-red-400 uppercase tracking-wider animate-pulse">
              STOPPED
            </span>
          )}

          <button
            onClick={() => setFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </motion.header>

      {/* ── Manual Approval Banner ─────────────────────────────────── */}
      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 border-b border-amber-500/20 bg-amber-500/5 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">
                    Manual Approval Required
                  </p>
                  <p className="text-[11px] text-amber-400/70">
                    Patches are ready but not pushed. Review patches in the &quot;Patches&quot; tab, then approve or reject.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { rejectAction(); addLog({ level: "info", source: "system", message: "Push rejected by user" }); }}
                  className="h-7 px-3 rounded-md border border-red-500/20 bg-red-500/10 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                >
                  <X className="size-3" /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="h-7 px-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {approving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Approve & Push
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Collapsible Workflow Graph */}
        <AnimatePresence initial={false}>
          {!leftPanelCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Workflow Map
                </span>
                <button onClick={toggleLeftPanel} className="p-1 rounded hover:bg-white/5">
                  <PanelLeftClose className="size-3.5 text-zinc-500" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <WorkflowCanvas
                  agents={agents}
                  runId={runId}
                  selectedAgent={selectedAgent}
                  onSelectAgent={selectAgent}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left panel toggle when collapsed */}
        {leftPanelCollapsed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={toggleLeftPanel}
            className="w-8 shrink-0 flex items-center justify-center border-r border-white/[0.06] hover:bg-white/[0.02] transition-colors"
          >
            <PanelLeftOpen className="size-3.5 text-zinc-500" />
          </motion.button>
        )}

        {/* CENTER: Primary Orchestration Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <WorkflowCanvas
              agents={agents}
              runId={runId}
              selectedAgent={selectedAgent}
              onSelectAgent={selectAgent}
              isMainCanvas
            />
          </div>

          {/* BOTTOM: Expandable GitHub Live Monitor */}
          <div className="shrink-0 border-t border-white/[0.06]">
            <button
              onClick={toggleBottomPanel}
              className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Radio className="size-3 text-emerald-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  GitHub Live Monitor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-zinc-600">
                  {useExecutionStore.getState().githubEvents.length} events
                </span>
                {bottomPanelExpanded ? (
                  <ChevronDown className="size-3.5 text-zinc-500" />
                ) : (
                  <ChevronUp className="size-3.5 text-zinc-500" />
                )}
              </div>
            </button>
            <AnimatePresence>
              {bottomPanelExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 200 }}
                  exit={{ height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <GitHubLiveMonitor repo={scanRun?.repo_full_name || ""} prUrl={scanRun?.pr_url} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: Agent Detail + Logs + Patches */}
        <motion.div
          className="w-[380px] shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
        >
          {/* Tab switcher — now 3 tabs */}
          <div className="flex items-center border-b border-white/[0.04] shrink-0">
            <button
              onClick={() => setRightPanelTab("agent")}
              className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                rightPanelTab === "agent"
                  ? "text-zinc-100 border-b-2 border-amber-500/60"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Agent
            </button>
            <button
              onClick={() => setRightPanelTab("patches")}
              className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                rightPanelTab === "patches"
                  ? "text-zinc-100 border-b-2 border-indigo-500/60"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Patches
            </button>
            <button
              onClick={() => setRightPanelTab("logs")}
              className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                rightPanelTab === "logs"
                  ? "text-zinc-100 border-b-2 border-blue-500/60"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Logs
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {rightPanelTab === "agent" ? (
              <AgentDetailPanel
                agents={agents}
                selectedAgent={selectedAgent}
                onSelectAgent={selectAgent}
              />
            ) : rightPanelTab === "patches" ? (
              <PatchDiffViewer runId={runId} visible={rightPanelTab === "patches"} />
            ) : (
              <LogPanel />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
