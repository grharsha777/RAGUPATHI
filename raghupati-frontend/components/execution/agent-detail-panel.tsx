"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Crown, Map, ShieldAlert, Search, Code2,
  FlaskConical, Wrench, Rocket, MessageSquare, GitMerge,
  CheckCircle2, XCircle, Loader2, Clock, Bot, X, Zap,
} from "lucide-react";
import { AGENT_DEFINITIONS, AGENT_ORDER, getAgentDef } from "@/lib/constants/agents";
import { useExecutionStore, type AgentRun, type AgentStatus } from "@/lib/stores/execution-store";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Crown, Map, ShieldAlert, Search, Code2,
  FlaskConical, Wrench, Rocket, MessageSquare, GitMerge,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-zinc-500",
  running: "text-blue-400",
  complete: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-zinc-600",
  idle: "text-zinc-600",
};

type AgentDetailPanelProps = {
  agents: AgentRun[];
  selectedAgent: string | null;
  onSelectAgent: (name: string | null) => void;
};

export function AgentDetailPanel({ agents, selectedAgent, onSelectAgent }: AgentDetailPanelProps) {
  const selectedData = useMemo(() => {
    if (!selectedAgent) return null;
    return agents.find((a) => a.agent_name === selectedAgent) ?? null;
  }, [selectedAgent, agents]);

  const selectedDef = selectedAgent ? getAgentDef(selectedAgent) : null;
  const Icon = selectedDef ? ICON_MAP[selectedDef.icon] || Bot : Bot;

  let output = selectedData?.output ?? null;
  if (typeof output === "string") {
    try { output = JSON.parse(output); } catch { output = { raw: output }; }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Agent quick-select rail */}
      <div className="shrink-0 border-b border-white/[0.04] p-2">
        <div className="grid grid-cols-6 gap-1">
          {AGENT_ORDER.map((name) => {
            const def = getAgentDef(name);
            if (!def) return null;
            const agent = agents.find((a) => a.agent_name === name);
            const status: AgentStatus = agent?.status || "pending";
            const isSelected = selectedAgent === name;
            const AgIcon = ICON_MAP[def.icon] || Bot;

            return (
              <button
                key={name}
                onClick={() => onSelectAgent(isSelected ? null : name)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div
                  className="size-6 rounded-md flex items-center justify-center relative"
                  style={{ backgroundColor: `${def.color}12`, border: `1px solid ${def.color}25` }}
                >
                  <AgIcon className="size-3" style={{ color: def.color }} />
                  {status === "running" && (
                    <motion.div
                      className="absolute inset-0 rounded-md"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      style={{ border: `1px dashed ${def.color}40` }}
                    />
                  )}
                </div>
                <span className="text-[7px] font-medium text-zinc-500 truncate w-full text-center">
                  {def.displayName.slice(0, 5)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected agent detail */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {selectedData && selectedDef ? (
          <motion.div
            key={selectedAgent}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="size-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedDef.color}15`, border: `1px solid ${selectedDef.color}30` }}
                >
                  <Icon className="size-5" style={{ color: selectedDef.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{selectedDef.displayName}</h3>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{selectedDef.role}</p>
                </div>
              </div>
              <button onClick={() => onSelectAgent(null)} className="p-1 rounded hover:bg-white/5">
                <X className="size-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Tier badge */}
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider ${
                selectedDef.tier === "supervisor" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                selectedDef.tier === "commander" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                selectedDef.tier === "operative" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
              }`}>
                {selectedDef.tier}
              </span>
              <span className="text-[9px] font-mono text-zinc-600">{selectedDef.model}</span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-zinc-500 leading-relaxed">{selectedDef.description}</p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Status" value={selectedData.status} colorClass={STATUS_COLORS[selectedData.status] || "text-zinc-400"} />
              <StatCard label="Duration" value={selectedData.duration_ms ? `${selectedData.duration_ms}ms` : "—"} mono />
              <StatCard label="Model" value={selectedData.model_used || selectedDef.model} mono small />
              <StatCard label="Tokens" value={selectedData.tokens_used?.toLocaleString() || "—"} mono />
            </div>

            {/* Goals */}
            <div>
              <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Goals</p>
              <div className="flex flex-wrap gap-1">
                {selectedDef.goals.map((g) => (
                  <span key={g} className="rounded-md bg-white/[0.03] border border-white/[0.04] px-1.5 py-0.5 text-[9px] text-zinc-500">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Permissions</p>
              <div className="flex flex-wrap gap-1">
                {selectedDef.permissions.map((p) => (
                  <span key={p} className="rounded-md bg-amber-500/[0.04] border border-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400/60">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Error */}
            {selectedData.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
                <p className="text-[9px] font-semibold text-red-400 mb-1 flex items-center gap-1">
                  <XCircle className="size-3" /> Error
                </p>
                <p className="text-[10px] font-mono text-red-400/80 leading-relaxed">{selectedData.error}</p>
              </div>
            )}

            {/* Output */}
            {output && selectedData.status !== "running" && (
              <div>
                <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Output</p>
                <div className="rounded-lg bg-black/40 border border-white/[0.04] p-3 overflow-y-auto max-h-56">
                  <pre className="text-[10px] font-mono leading-relaxed text-emerald-400/70 whitespace-pre-wrap">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Timestamps */}
            {selectedData.started_at && (
              <div className="text-[8px] font-mono text-zinc-600 space-y-0.5">
                <div>Started: {new Date(selectedData.started_at).toLocaleString()}</div>
                {selectedData.completed_at && (
                  <div>Completed: {new Date(selectedData.completed_at).toLocaleString()}</div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <Bot className="size-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Select an agent to inspect</p>
              <p className="text-[9px] text-zinc-700 mt-1">Click any node in the workflow graph</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, colorClass, mono, small }: {
  label: string; value: string; colorClass?: string; mono?: boolean; small?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
      <p className="text-[8px] text-zinc-600 mb-0.5">{label}</p>
      <p className={`text-[11px] font-semibold capitalize ${colorClass || "text-zinc-300"} ${mono ? "font-mono" : ""} ${small ? "text-[9px]" : ""}`}>
        {value}
      </p>
    </div>
  );
}
