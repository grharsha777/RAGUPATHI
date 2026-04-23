"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, AlertTriangle, Copy, Eye, EyeOff, Loader2,
  Upload, Check, X as XIcon,
} from "lucide-react";
import { useExecutionStore } from "@/lib/stores/execution-store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Patch = {
  id: string;
  file_path: string;
  diff_text: string;
  original_content: string;
  patched_content: string;
  incident_id: string | null;
  attempt_number: number;
  lint_passed: boolean | null;
  syntax_valid: boolean | null;
  created_at: string;
};

type PatchDiffViewerProps = {
  runId: string;
  visible: boolean;
};

function DiffLine({ type, content }: { type: "add" | "remove" | "context" | "header"; content: string }) {
  const bg =
    type === "add" ? "bg-emerald-500/10" :
    type === "remove" ? "bg-red-500/10" :
    type === "header" ? "bg-blue-500/10" :
    "transparent";
  const text =
    type === "add" ? "text-emerald-400" :
    type === "remove" ? "text-red-400" :
    type === "header" ? "text-blue-400" :
    "text-zinc-400";
  const prefix =
    type === "add" ? "+" :
    type === "remove" ? "-" :
    type === "header" ? "@" :
    " ";

  return (
    <div className={`flex font-mono text-[11px] leading-5 ${bg} ${text} px-2`}>
      <span className="w-4 shrink-0 text-center opacity-50">{prefix}</span>
      <span className="whitespace-pre overflow-x-auto">{content}</span>
    </div>
  );
}

function parseDiff(diffText: string): { type: "add" | "remove" | "context" | "header"; content: string }[] {
  if (!diffText) return [];
  const lines = diffText.split("\n");
  return lines.map((line) => {
    if (line.startsWith("@@")) return { type: "header" as const, content: line };
    if (line.startsWith("+")) return { type: "add" as const, content: line.slice(1) };
    if (line.startsWith("-")) return { type: "remove" as const, content: line.slice(1) };
    return { type: "context" as const, content: line };
  });
}

function PatchCard({ patch, index }: { patch: Patch; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const [viewMode, setViewMode] = useState<"diff" | "patched" | "original">("diff");
  const [copied, setCopied] = useState(false);

  const diffLines = useMemo(() => parseDiff(patch.diff_text), [patch.diff_text]);
  const additions = diffLines.filter((l) => l.type === "add").length;
  const deletions = diffLines.filter((l) => l.type === "remove").length;

  const handleCopy = () => {
    const text = viewMode === "patched" ? patch.patched_content :
                 viewMode === "original" ? patch.original_content :
                 patch.diff_text;
    navigator.clipboard.writeText(text || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-white/[0.06] rounded-lg overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <FileCode className="size-4 text-indigo-400 shrink-0" />
        <span className="text-xs font-mono text-zinc-200 flex-1 text-left truncate">
          {patch.file_path}
        </span>
        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          <span className="text-emerald-400">+{additions}</span>
          <span className="text-red-400">-{deletions}</span>
          {patch.lint_passed === true && <CheckCircle2 className="size-3 text-emerald-400" />}
          {patch.lint_passed === false && <XCircle className="size-3 text-red-400" />}
          {patch.syntax_valid === true && <CheckCircle2 className="size-3 text-blue-400" />}
          {patch.syntax_valid === false && <AlertTriangle className="size-3 text-amber-400" />}
          {patch.attempt_number > 1 && (
            <span className="text-amber-400">attempt #{patch.attempt_number}</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-3.5 text-zinc-500" />
        ) : (
          <ChevronDown className="size-3.5 text-zinc-500" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            {/* View mode tabs */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-t border-white/[0.04] bg-white/[0.01]">
              {(["diff", "patched", "original"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                    viewMode === mode
                      ? mode === "diff" ? "bg-blue-500/15 text-blue-400" :
                        mode === "patched" ? "bg-emerald-500/15 text-emerald-400" :
                        "bg-zinc-500/15 text-zinc-300"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {mode === "diff" ? "Diff" : mode === "patched" ? "Generated Code" : "Original"}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <CheckCircle2 className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </button>
            </div>

            {/* Code content */}
            <div className="border-t border-white/[0.04] bg-[#0a0a0f] max-h-[400px] overflow-auto">
              {viewMode === "diff" && diffLines.length > 0 && (
                diffLines.map((line, i) => (
                  <DiffLine key={i} type={line.type} content={line.content} />
                ))
              )}
              {viewMode === "diff" && diffLines.length === 0 && (
                <div className="px-3 py-4 text-[11px] text-zinc-600 text-center">
                  No unified diff available. Switch to &quot;Generated Code&quot; tab to see the full patched file.
                </div>
              )}
              {viewMode === "patched" && (
                <pre className="text-[11px] font-mono text-emerald-300/80 whitespace-pre-wrap px-3 py-2 leading-5">
                  {patch.patched_content || "(No patched content available)"}
                </pre>
              )}
              {viewMode === "original" && (
                <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap px-3 py-2 leading-5">
                  {patch.original_content || "(No original content available)"}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PatchDiffViewer({ runId, visible }: PatchDiffViewerProps) {
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const executionMode = useExecutionStore((s) => s.executionMode);
  const pendingApproval = useExecutionStore((s) => s.pendingApproval);
  const approveAction = useExecutionStore((s) => s.approveAction);
  const addLog = useExecutionStore((s) => s.addLog);

  useEffect(() => {
    if (!visible || !runId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/scans/${runId}/patches`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setPatches(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [runId, visible]);

  // Poll for patches while scan is running
  useEffect(() => {
    if (!visible || !runId) return;
    const interval = setInterval(() => {
      fetch(`${API_BASE}/scans/${runId}/patches`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => {
          if (Array.isArray(data) && data.length > patches.length) {
            setPatches(data);
          }
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [runId, visible, patches.length]);

  const handlePush = async () => {
    setPushing(true);
    try {
      const res = await fetch(`${API_BASE}/scan/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push_and_pr" }),
      });
      if (res.ok) {
        approveAction();
        addLog({ level: "success", source: "system", message: "Push approved! Patches pushed to GitHub and PR created." });
      } else {
        const data = await res.json().catch(() => ({}));
        addLog({ level: "error", source: "system", message: `Push failed: ${data.detail || res.statusText}` });
      }
    } catch (err) {
      addLog({ level: "error", source: "system", message: `Push request failed: ${err}` });
    } finally {
      setPushing(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="size-3.5 text-indigo-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Patches & Generated Code
          </span>
          <span className="text-[10px] font-mono text-zinc-600">
            {patches.length} file{patches.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Manual mode: Push to GitHub button */}
      {executionMode === "manual" && patches.length > 0 && (
        <div className="px-3 py-2 border-b border-white/[0.04] bg-emerald-500/[0.03] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                {pendingApproval ? "Ready to Push" : "Patches Generated"}
              </p>
              <p className="text-[9px] text-zinc-500">
                Review the generated code above, then push to GitHub when ready.
              </p>
            </div>
            <button
              onClick={handlePush}
              disabled={pushing || !pendingApproval}
              className={`h-7 px-3 rounded-md text-[10px] font-semibold flex items-center gap-1.5 transition-all ${
                pendingApproval
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
                  : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/10 cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {pushing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              Push to GitHub
            </button>
          </div>
        </div>
      )}

      {/* Autonomous mode indicator */}
      {executionMode === "auto" && patches.length > 0 && (
        <div className="px-3 py-1.5 border-b border-white/[0.04] bg-amber-500/[0.03] shrink-0">
          <p className="text-[9px] text-amber-400/70">
            Autonomous mode: patches will be pushed automatically after QA validation passes.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {loading && patches.length === 0 && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="size-4 text-zinc-500 animate-spin" />
            <span className="text-xs text-zinc-500">Loading patches...</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 p-2">
            Failed to load patches: {error}
          </div>
        )}

        {!loading && !error && patches.length === 0 && (
          <div className="text-xs text-zinc-600 text-center py-8">
            No patches generated yet. Patches appear after Nala completes.
          </div>
        )}

        {patches.map((patch, i) => (
          <PatchCard key={patch.id} patch={patch} index={i} />
        ))}
      </div>
    </div>
  );
}
