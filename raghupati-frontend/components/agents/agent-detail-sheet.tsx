"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, Bot, Clock, Zap, Shield, Globe, Server,
  CheckCircle2, XCircle, Loader2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useState } from "react";

type AgentDetail = {
  id: string;
  name: string;
  role: string;
  description: string;
  model: string;
  provider: string;
  capabilities: string[];
  antiHallucination: string;
  status: string;
  durationMs: number | null;
  tokensUsed: number | null;
  error: string | null;
  lastAction: string | null;
};

type AgentDetailSheetProps = {
  agent: AgentDetail | null;
  open: boolean;
  onClose: () => void;
  onToggleLocal: (agentId: string, useLocal: boolean) => void;
};

export function AgentDetailSheet({ agent, open, onClose, onToggleLocal }: AgentDetailSheetProps) {
  const [useLocal, setUseLocal] = useState(false);

  if (!agent) return null;

  const handleToggleLocal = () => {
    const next = !useLocal;
    setUseLocal(next);
    onToggleLocal(agent.id, next);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0c0c14] border-l border-white/[0.06] overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${
                    agent.status === "running" ? "bg-blue-500/10 border border-blue-500/20" :
                    agent.status === "complete" ? "bg-emerald-500/10 border border-emerald-500/20" :
                    agent.status === "failed" ? "bg-red-500/10 border border-red-500/20" :
                    "bg-zinc-500/10 border border-zinc-500/20"
                  }`}>
                    <Bot className={`size-5 ${
                      agent.status === "running" ? "text-blue-400" :
                      agent.status === "complete" ? "text-emerald-400" :
                      agent.status === "failed" ? "text-red-400" :
                      "text-zinc-400"
                    }`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{agent.name}</h2>
                    <p className="text-xs text-zinc-400">{agent.role}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
                  <X className="size-4" />
                </button>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${
                  agent.status === "running" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                  agent.status === "complete" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                  agent.status === "failed" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                  "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                }`}>
                  {agent.status}
                </span>
                {agent.durationMs && (
                  <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <Clock className="size-3" /> {agent.durationMs}ms
                  </span>
                )}
                {agent.tokensUsed && (
                  <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <Zap className="size-3" /> {agent.tokensUsed} tokens
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <Globe className="size-3" /> Overview
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{agent.description}</p>
              </div>

              {/* Model & Provider */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                    <Cpu className="size-3" /> Model
                  </div>
                  <div className="text-xs font-mono text-white">{useLocal ? "ollama (local)" : agent.model}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                    <Server className="size-3" /> Provider
                  </div>
                  <div className="text-xs text-white">{useLocal ? "Ollama" : agent.provider}</div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <Shield className="size-3" /> Capabilities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="text-[10px] px-2 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-zinc-400">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Anti-Hallucination Guardrails */}
              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-4">
                <h3 className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                  <Shield className="size-3" /> Anti-Hallucination Guardrails
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{agent.antiHallucination}</p>
              </div>

              {/* Use Locally (Ollama) toggle */}
              <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-violet-400 flex items-center gap-2">
                      <ToggleRight className="size-3" /> Use Locally (Ollama)
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Route this agent through your local Ollama instance instead of cloud APIs.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleLocal}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useLocal ? "bg-violet-500" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                        useLocal ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {useLocal && (
                  <div className="mt-3 text-[10px] text-zinc-500 border-t border-violet-500/10 pt-2">
                    Ensure Ollama is running locally with a compatible model loaded. The agent will use <span className="font-mono text-zinc-400">http://localhost:11434</span> for inference.
                  </div>
                )}
              </div>

              {/* Last action / Error */}
              {agent.lastAction && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] text-zinc-500 mb-1">Last action</div>
                  <div className="text-xs text-zinc-300">{agent.lastAction}</div>
                </div>
              )}
              {agent.error && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-3">
                  <div className="text-[10px] text-red-400 mb-1">Error</div>
                  <div className="text-xs text-red-300 font-mono">{agent.error}</div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
