"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { AGENT_DEFINITIONS, type AgentDefinition } from "@/lib/constants/agents";

export type AgentRunRecord = {
  id: string;
  run_id: string;
  agent_name: string;
  status: "pending" | "running" | "complete" | "failed" | "skipped";
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

export type LiveVanarAgent = AgentDefinition & {
  status: "pending" | "running" | "complete" | "failed" | "skipped" | "idle";
  health: "healthy" | "degraded" | "offline";
  lastAction: string | null;
  output: any;
  durationMs: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  tokensUsed: number | null;
  runId: string | null;
};

function mapAgentHealth(status: string): "healthy" | "degraded" | "offline" {
  if (status === "failed") return "degraded";
  if (status === "running" || status === "complete") return "healthy";
  return "offline";
}

function deriveLastAction(agentName: string, status: string, output: any): string | null {
  if (!output) return null;
  if (typeof output === "string") {
    try { output = JSON.parse(output); } catch { return null; }
  }
  return output?.summary || null;
}

export function useVanarAgents(runId?: string | null) {
  const [records, setRecords] = useState<AgentRunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      try {
        let query = supabase
          .from("agent_runs")
          .select("*")
          .order("created_at", { ascending: false });

        if (runId) {
          query = query.eq("run_id", runId);
        } else {
          query = query.limit(110); // Last 10 runs * 11 agents
        }

        const { data, error } = await query;
        if (!error && data) setRecords(data as AgentRunRecord[]);
      } catch (err) {
        console.warn("[useVanarAgents] fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();

    const channel = supabase
      ?.channel("agent_runs_live")
      ?.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_runs" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRecords((prev) => [payload.new as AgentRunRecord, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setRecords((prev) =>
              prev.map((r) =>
                r.id === (payload.new as AgentRunRecord).id
                  ? (payload.new as AgentRunRecord)
                  : r
              )
            );
          }
        }
      )
      ?.subscribe();

    return () => {
      if (channel) supabase?.removeChannel(channel);
    };
  }, [runId]);

  const agents: LiveVanarAgent[] = useMemo(() => {
    return AGENT_DEFINITIONS.map((def) => {
      // Find the latest record for this agent (filtered by runId if provided)
      const agentRecords = records.filter(
        (r) => r.agent_name === def.id && (!runId || r.run_id === runId)
      );
      const latest = agentRecords[0]; // Most recent first

      let output = latest?.output ?? null;
      if (typeof output === "string") {
        try { output = JSON.parse(output); } catch { /* keep as string */ }
      }

      return {
        ...def,
        status: latest?.status || "idle",
        health: latest ? mapAgentHealth(latest.status) : "offline",
        lastAction: latest ? deriveLastAction(def.id, latest.status, output) : null,
        output,
        durationMs: latest?.duration_ms ?? null,
        error: latest?.error ?? null,
        startedAt: latest?.started_at ?? null,
        completedAt: latest?.completed_at ?? null,
        tokensUsed: latest?.tokens_used ?? null,
        runId: latest?.run_id ?? null,
      };
    });
  }, [records, runId]);

  const latestRunId = useMemo(() => {
    if (runId) return runId;
    if (records.length === 0) return null;
    return records[0].run_id;
  }, [records, runId]);

  return { agents, records, loading, latestRunId };
}
