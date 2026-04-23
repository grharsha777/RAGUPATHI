"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { useIncidents } from "@/hooks/useIncidents";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { supabase } from "@/lib/supabase/client";
import {
  ShieldAlert, CheckCircle2, Activity, ShieldCheck, AlertCircle,
  XCircle, RefreshCw, Zap, Bot, GitBranch, Clock, Flame,
  TrendingUp, TrendingDown, Radio, ChevronRight, Terminal
} from "lucide-react";

type ScanRun = {
  id: string;
  repo_full_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  vulnerabilities_found: number;
  patches_generated: number;
  pr_url: string | null;
};

// ── OPTIMIZED: CSS-based counter animation (faster than RAF) ──
function CountUp({ target, duration = 800, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isInView) return;
    
    // Cancel any existing animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    let start = 0;
    const end = target;
    const range = end - start;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + range * easeOut));
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isInView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Memoized counter to prevent unnecessary re-renders
const MemoizedCountUp = React.memo(CountUp);

const PROVIDER_LABELS: Record<string, { name: string; desc: string }> = {
  rama_mistral: { name: "Mistral AI", desc: "Rama · Jambavan · Nala · Lakshmana · Bharata" },
  groq_family: { name: "Groq LPU", desc: "Hanuman · Sita · Sugreeva · Shatrughna · Dasharatha · Vibhishana" },
  supabase_db: { name: "Supabase", desc: "Database & Realtime" },
  angada_nvd: { name: "NVD API", desc: "CVE Database" },
  jambavan_tavily: { name: "Tavily", desc: "Web Research" },
  vibhishana_discord: { name: "Discord", desc: "Alert Channel" },
  vibhishana_resend: { name: "Resend", desc: "Email Delivery" },
  ollama_local: { name: "Ollama", desc: "Local Fallback" },
};

export function DashboardClient() {
  const { incidents, isLoading } = useIncidents();
  const { events } = useAgentEvents();
  const { providers, onlineCount, totalCount, status, isLoading: healthLoading, refresh } = useSystemHealth();
  const [scanRuns, setScanRuns] = useState<ScanRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // OPTIMIZED: Memoized fetch function to prevent recreation on every render
  const fetchScans = useCallback(async () => {
    if (!supabase) return;
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("scan_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (fetchError) throw fetchError;
      if (data) setScanRuns(data as ScanRun[]);
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch scan runs";
      console.error("[DashboardClient] scan_runs fetch failed:", err);
      setError(errorMsg);
    }
  }, []);

  // Fetch real scan runs from Supabase with error handling
  useEffect(() => {
    fetchScans();

    const channel = supabase
      ?.channel("scan_runs_dashboard")
      ?.on("postgres_changes", { event: "*", schema: "public", table: "scan_runs" }, () => {
        fetchScans();
      })
      ?.subscribe();

    return () => {
      if (channel) supabase?.removeChannel(channel);
    };
  }, [fetchScans]);

  // OPTIMIZED: Memoize computed values to prevent recalculation on every render
  const activeIncidents = useMemo(
    () => incidents.filter((i: any) => i.status !== "resolved" && i.status !== "auto_fixed"),
    [incidents]
  );

  const resolvedCount = useMemo(
    () => incidents.filter((i: any) => i.status === "resolved" || i.status === "auto_fixed").length,
    [incidents]
  );

  const avgMttr = useMemo(() => {
    const resolvedIncidents = incidents.filter((i: any) => i.resolved_at && i.created_at);
    return resolvedIncidents.length > 0
      ? Math.round(resolvedIncidents.reduce((sum: number, i: any) => {
          const created = new Date(i.created_at).getTime();
          const resolved = new Date(i.resolved_at).getTime();
          return sum + (resolved - created) / 60000;
        }, 0) / resolvedIncidents.length)
      : null;
  }, [incidents]);

  // OPTIMIZED: Memoize scan metrics
  const scanMetrics = useMemo(() => ({
    totalScans: scanRuns.length,
    completedScans: scanRuns.filter((s) => s.status === "complete").length,
    totalVulnsFound: scanRuns.reduce((sum, s) => sum + (s.vulnerabilities_found || 0), 0),
    totalPatchesGen: scanRuns.reduce((sum, s) => sum + (s.patches_generated || 0), 0),
  }), [scanRuns]);

  const recentScans = useMemo(() => scanRuns.slice(0, 5), [scanRuns]);

  // Retry handler for errors
  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    fetchScans();
  }, [fetchScans]);

  return (
    <div className="flex flex-col gap-6 p-6 h-full text-white bg-[#050508]">
      {/* Header with animated gradient text */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent"
          >
            Mission Control
          </motion.h1>
          <p className="text-xs text-zinc-500 mt-1">Real-time autonomous DevSecOps orchestration</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-medium ${
              status === "ok"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : status === "degraded"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <Radio className={`size-3 ${status === "ok" ? "text-emerald-400" : status === "degraded" ? "text-amber-400" : "text-red-400"} ${status === "running" ? "animate-pulse" : ""}`} />
            {status === "ok" ? "System Nominal" : status === "degraded" ? "Degraded" : "Offline"}
            <span className="text-zinc-600">|</span>
            <span className="font-mono">{onlineCount}/{totalCount || 7} Agents</span>
          </motion.div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Failed to load dashboard data</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs font-medium text-red-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </motion.div>
      )}

      {/* Quick Stats Row with Animated Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Scans", value: scanMetrics.totalScans, icon: GitBranch, color: "from-violet-500/20 to-violet-600/5", border: "border-violet-500/20", iconColor: "text-violet-400" },
          { label: "Vulnerabilities", value: scanMetrics.totalVulnsFound, icon: ShieldAlert, color: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/20", iconColor: "text-orange-400" },
          { label: "Patches Generated", value: scanMetrics.totalPatchesGen, icon: CheckCircle2, color: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/20", iconColor: "text-emerald-400" },
          { label: avgMttr !== null ? "Avg MTTR" : "MTTR", value: avgMttr ?? 0, suffix: avgMttr !== null ? "m" : "", icon: Clock, color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", iconColor: "text-blue-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.color} p-5 backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 mb-1">{stat.label}</p>
                <div className="text-3xl font-bold text-white">
                  <MemoizedCountUp target={stat.value} suffix={stat.suffix} duration={800} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <stat.icon className={`size-5 ${stat.iconColor}`} />
              </div>
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/[0.03] rounded-full blur-2xl" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* LEFT PANEL: Real-time agent activity stream */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4 bg-[#0c0c14] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b border-white/[0.04] bg-[#08080f] flex gap-2 items-center">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Bot className="size-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Live Agent Stream</h2>
            <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-white/[0.03] text-zinc-500 font-mono">{events.length} events</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-zinc-500 gap-2">
                <Terminal className="size-8 opacity-20" />
                <span>No agent activity yet</span>
                <span className="text-[10px]">Trigger a scan to begin</span>
              </div>
            ) : (
              events.slice(0, 15).map((event, idx) => (
                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={event.id}
                  className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wide">{event.agent_name}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      event.status === "complete" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                      event.status === "running" ? "text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse" :
                      event.status === "failed" ? "text-red-400 bg-red-500/10 border-red-500/20" :
                      "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                    }`}>{event.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500 truncate max-w-[200px] group-hover:text-zinc-400 transition-colors">
                      {event.output?.summary || `${event.agent_name} → ${event.status}`}
                    </p>
                    {event.duration_ms && (
                      <span className="text-[10px] text-zinc-600 font-mono">{event.duration_ms}ms</span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* CENTER PANEL: Recent scans + active incidents */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          {/* Recent scans strip */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Recent Scans</h2>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">{recentScans.length} runs</span>
            </div>
            {recentScans.length === 0 ? (
              <div className="text-xs text-zinc-500 py-2">No scans yet</div>
            ) : (
              <div className="space-y-2">
                {recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                    <div className={`size-2 rounded-full ${
                      scan.status === "complete" ? "bg-emerald-400" :
                      scan.status === "running" ? "bg-blue-400 animate-pulse" :
                      "bg-red-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-zinc-300 truncate">{scan.repo_full_name}</div>
                      <div className="text-[9px] text-zinc-600 font-mono">{scan.id.slice(0, 8)} · {scan.status}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {scan.vulnerabilities_found > 0 && <span className="text-orange-400">{scan.vulnerabilities_found}V </span>}
                      {scan.patches_generated > 0 && <span className="text-emerald-400">{scan.patches_generated}P</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Active incidents */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl flex-1 flex flex-col overflow-hidden min-h-0"
          >
            <div className="p-4 border-b border-white/[0.04] flex gap-2 items-center">
              <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <Flame className="size-4 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Active Incidents</h2>
              <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono">{activeIncidents.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-xs text-zinc-500">
                  <RefreshCw className="size-3 animate-spin" /> Loading...
                </div>
              ) : activeIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-zinc-500 gap-2">
                  <ShieldCheck className="size-8 text-emerald-500/20" />
                  <span>All clear — no active incidents</span>
                </div>
              ) : (
                activeIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-zinc-200 truncate pr-4 group-hover:text-white transition-colors">{incident.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border ${
                        incident.severity === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                        incident.severity === "high" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                        "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>{incident.severity}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                      <span>{incident.repo_full_name || incident.repo}</span>
                      <span className="flex items-center gap-1"><AlertCircle className="size-3 text-red-400/60" /> {incident.cve_id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT PANEL: Outcomes + System Health */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
          {/* Outcomes */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl p-5"
          >
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="size-4 text-amber-400" />
              Outcomes Today
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <ShieldAlert className="size-4 text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500">Incidents Handled</div>
                  <div className="text-lg font-bold text-white">{incidents.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500">Autonomous Fixes</div>
                  <div className="text-lg font-bold text-emerald-400">{resolvedCount}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Activity className="size-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500">Human Escalation</div>
                  <div className="text-lg font-bold text-amber-400">{incidents.length - resolvedCount}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* System Health */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl p-5 flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="size-4 text-emerald-400" />
                System Health
              </h2>
              <button onClick={() => refresh()} title="Refresh" aria-label="Refresh" className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                <RefreshCw className={`size-3.5 text-zinc-500 ${healthLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {Object.entries(providers).map(([key, p]) => {
                const label = PROVIDER_LABELS[key] || { name: key, desc: "" };
                return (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className={`size-2 rounded-full ${p.ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-300 font-medium truncate">{label.name}</div>
                      <div className="text-[9px] text-zinc-600 truncate">{label.desc}</div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {p.ok ? (
                        <span className="text-emerald-400">{p.latency_ms}ms</span>
                      ) : (
                        <span className="text-red-400">FAIL</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {Object.keys(providers).length === 0 && !healthLoading && (
                <div className="flex flex-col items-center justify-center h-full text-xs text-zinc-500 gap-2">
                  <XCircle className="size-6 text-red-400/20" />
                  <span>Backend offline</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center gap-2">
              <div className={`size-2 rounded-full animate-pulse ${
                onlineCount === totalCount && totalCount > 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              }`} />
              <span className={`text-xs font-semibold ${
                onlineCount === totalCount && totalCount > 0 ? "text-emerald-400" : "text-amber-400"
              }`}>
                {onlineCount}/{totalCount || 7} Providers Online
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
