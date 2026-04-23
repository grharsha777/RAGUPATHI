"use client";

import { useEffect, useRef, useCallback } from "react";
import { useExecutionStore } from "@/lib/stores/execution-store";
import { SCAN_STAGES, type ScanStage } from "@/lib/constants/agents";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function mapStageToScanStage(stage: string | null | undefined): ScanStage {
  if (!stage) return "idle";
  const stageMap: Record<string, ScanStage> = {
    hanuman: "validating",
    rama: "analyzing",
    lakshmana: "indexing",
    angada_jambavan: "analyzing",
    sita: "analyzing",
    jambavan: "planning",
    nala: "execution",
    sugreeva: "review",
    bharata: "execution",
    shatrughna: "review",
    vibhishana: "push_pr",
    dasharatha: "push_pr",
    completed: "completed",
  };
  return stageMap[stage] ?? "execution";
}

export function useScanSSE(runId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  const {
    setScanRun,
    setScanStage,
    setScanStageProgress,
    updateAgent,
    addLog,
    addGitHubEvent,
    setSseConnected,
    reset,
  } = useExecutionStore();

  const connect = useCallback(() => {
    if (!runId) return;

    // Prevent multiple concurrent connections
    if (isConnectingRef.current) {
      console.warn("[useScanSSE] Connection already in progress, skipping");
      return;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isConnectingRef.current = true;
    const es = new EventSource(`${API_BASE}/events/scan/${runId}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      isConnectingRef.current = false;
      setSseConnected(true);
      addLog({ level: "info", source: "system", message: "SSE connection established" });
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // ── Scan stage update ──────────────────────────────────
        if (data.event === "scan_stage") {
          const stage = mapStageToScanStage(data.stage);
          setScanStage(stage);
          setScanStageProgress(0);
          addLog({
            level: "info",
            source: "pipeline",
            message: `Scan stage: ${data.stage || "unknown"} → ${stage}`,
            meta: { status: data.status, stage: data.stage },
          });

          // Update scan run status
          const currentScan = useExecutionStore.getState().scanRun;
          if (currentScan) {
            setScanRun({ ...currentScan, status: data.status, stage } as any);
          }
        }

        // ── Scan complete ──────────────────────────────────────
        if (data.event === "scan_complete") {
          setScanStage("completed");
          setScanStageProgress(100);
          addLog({ level: "success", source: "pipeline", message: "Scan completed" });
          setSseConnected(false);
          // Fetch final state
          fetchScanDetail(runId);
          return;
        }

        // ── Agent status update (new explicit event type) ──────
        if (data.event === "agent_status" && data.agent_name) {
          updateAgent(data.agent_name, {
            status: data.status,
            output: data.output,
            error: data.error,
            duration_ms: data.duration_ms,
            updated_at: data.updated_at,
          });

          const level = data.status === "failed" ? "error" : data.status === "complete" ? "success" : "info";
          addLog({
            level,
            source: data.agent_name,
            message: `Agent ${data.agent_name}: ${data.status}${data.error ? ` — ${data.error}` : ""}`,
            meta: { duration_ms: data.duration_ms },
          });

          // Derive GitHub events from real agent outputs (not fabricated)
          if (data.agent_name === "dasharatha" && data.status === "complete" && data.output) {
            try {
              const output = typeof data.output === "string" ? JSON.parse(data.output) : data.output;
              if (output.push_result?.pushed) {
                for (const c of (output.commits || [])) {
                  addGitHubEvent({ type: "commit", actor: "dasharatha", summary: c.message || `Commit: ${c.file_path}`, detail: c.sha, status: "success" });
                }
                addGitHubEvent({ type: "branch", actor: "dasharatha", summary: `Branch created: ${output.branch}`, detail: output.branch, status: "success" });
              } else if (output.push_result?.reason) {
                addGitHubEvent({ type: "commit", actor: "dasharatha", summary: `Push skipped: ${output.push_result.reason}`, status: "pending" });
              }
            } catch (err) {
              console.error("[useScanSSE] Failed to parse dasharatha output:", err, data.output);
              addLog({ level: "warn", source: "system", message: "Failed to parse dasharatha GitHub event data" });
            }
          }
          if (data.agent_name === "vibhishana" && data.status === "complete" && data.output) {
            try {
              const output = typeof data.output === "string" ? JSON.parse(data.output) : data.output;
              if (output.pr_url) {
                addGitHubEvent({ type: "pr", actor: "vibhishana", summary: "Pull request created", detail: output.pr_url, url: output.pr_url, status: "success" });
              }
            } catch (err) {
              console.error("[useScanSSE] Failed to parse vibhishana output:", err, data.output);
              addLog({ level: "warn", source: "system", message: "Failed to parse vibhishana PR data" });
            }
          }
          if (data.agent_name === "nala" && data.status === "complete" && data.output) {
            try {
              const output = typeof data.output === "string" ? JSON.parse(data.output) : data.output;
              const patchCount = output.patches?.length || 0;
              addGitHubEvent({ type: "diff", actor: "nala", summary: `${patchCount} patches generated`, status: "success" });
            } catch (err) {
              console.error("[useScanSSE] Failed to parse nala output:", err, data.output);
              addLog({ level: "warn", source: "system", message: "Failed to parse nala patch data" });
            }
          }
          if (data.agent_name === "sugreeva" && data.status === "running") {
            addGitHubEvent({ type: "check", actor: "sugreeva", summary: "CI validation running", status: "running" });
          }
          if (data.agent_name === "sugreeva" && data.status === "complete" && data.output) {
            try {
              const output = typeof data.output === "string" ? JSON.parse(data.output) : data.output;
              const conclusion = output.conclusion || output.ci_status || "unknown";
              addGitHubEvent({ type: "check", actor: "sugreeva", summary: `CI result: ${conclusion}`, status: conclusion === "success" ? "success" : "failure" });
            } catch (err) {
              console.error("[useScanSSE] Failed to parse sugreeva output:", err, data.output);
              addLog({ level: "warn", source: "system", message: "Failed to parse sugreeva CI data" });
            }
          }
        }

        // ── Real log event from backend ────────────────────────
        if (data.event === "log_event") {
          addLog({
            level: data.level || "info",
            source: data.agent_name || data.source || "pipeline",
            message: data.message || "",
            meta: data.meta ? (typeof data.meta === "string" ? JSON.parse(data.meta) : data.meta) : undefined,
          });
        }

        // ── Heartbeat ──────────────────────────────────────────
        if (data.event === "heartbeat") {
          // Connection alive, no action needed
        }

        // ── Legacy: bare agent_name events (backward compat) ──
        if (!data.event && data.agent_name) {
          updateAgent(data.agent_name, {
            status: data.status,
            output: data.output,
            error: data.error,
            duration_ms: data.duration_ms,
            updated_at: data.updated_at,
          });

          const level = data.status === "failed" ? "error" : data.status === "complete" ? "success" : "info";
          addLog({
            level,
            source: data.agent_name,
            message: `Agent ${data.agent_name}: ${data.status}${data.error ? ` — ${data.error}` : ""}`,
            meta: { duration_ms: data.duration_ms },
          });
        }
      } catch (err) {
        console.error("[useScanSSE] Failed to parse SSE message:", err, event.data);
        addLog({
          level: "error",
          source: "system",
          message: `SSE parse error: ${err instanceof Error ? err.message : String(err)}`,
          meta: { rawData: String(event.data).substring(0, 200) }
        });
      }
    };

    es.onerror = () => {
      isConnectingRef.current = false;
      setSseConnected(false);
      addLog({ level: "warn", source: "system", message: "SSE connection lost, reconnecting in 3s..." });
      
      // Close the connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Clear any existing reconnect timeout before setting a new one
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, 3000);
    };
  }, [runId, setSseConnected, addLog, addGitHubEvent, setScanStage, setScanStageProgress, updateAgent, setScanRun]);

  const fetchScanDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/scans/${id}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.scan_run) {
        const sr = data.scan_run;
        setScanRun({
          id: sr.id,
          repo_full_name: sr.repo_full_name,
          trigger_type: sr.trigger_type,
          status: sr.status,
          stage: mapStageToScanStage(sr.stage),
          started_at: sr.started_at,
          completed_at: sr.completed_at,
          vulnerabilities_found: sr.vulnerabilities_found || 0,
          patches_generated: sr.patches_generated || 0,
          pr_url: sr.pr_url,
          error_message: sr.error_message || null,
        });
        if (sr.status === "complete" || sr.status === "failed") {
          setScanStage(sr.status === "complete" ? "completed" : "idle");
          setScanStageProgress(100);
        }
      }

      if (data.agents) {
        const store = useExecutionStore.getState();
        store.setAgents(data.agents);
      }
    } catch {
      // Silently fail
    }
  }, [setScanRun, setScanStage, setScanStageProgress]);

  useEffect(() => {
    if (!runId) return;

    // Initial fetch
    fetchScanDetail(runId);
    // Connect SSE
    connect();

    return () => {
      // Cleanup: close connection and clear timeouts
      isConnectingRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      setSseConnected(false);
    };
  }, [runId, connect, fetchScanDetail, setSseConnected]);

  // Also poll for scan status as backup
  useEffect(() => {
    if (!runId) return;
    const interval = setInterval(() => {
      fetchScanDetail(runId);
    }, 10000);
    return () => clearInterval(interval);
  }, [runId, fetchScanDetail]);
}
