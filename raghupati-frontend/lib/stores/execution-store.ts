"use client";

import { create } from "zustand";
import { AGENT_DEFINITIONS, SCAN_STAGES, type ScanStage } from "@/lib/constants/agents";

// ── Types ──────────────────────────────────────────────────────────
export type AgentStatus = "pending" | "running" | "complete" | "failed" | "skipped" | "idle";

export type AgentRun = {
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

export type ScanRun = {
  id: string;
  repo_full_name: string;
  trigger_type: string;
  status: "idle" | "pending" | "running" | "complete" | "failed";
  stage: ScanStage | null;
  started_at: string | null;
  completed_at: string | null;
  vulnerabilities_found: number;
  patches_generated: number;
  pr_url: string | null;
  error_message: string | null;
};

export type LogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug" | "success";
  source: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type GitHubEvent = {
  id: string;
  timestamp: string;
  type: "commit" | "push" | "pr" | "branch" | "check" | "diff" | "review";
  actor: string;
  summary: string;
  detail?: string;
  url?: string;
  status?: "pending" | "success" | "failure" | "running";
};

export type ExecutionMode = "auto" | "restricted" | "dry-run" | "manual";

export type ExecutionState = {
  // Scan state
  scanRun: ScanRun | null;
  scanStage: ScanStage;
  scanStageProgress: number; // 0-100 within current stage

  // Agent state - OPTIMIZED: Use Map for O(1) lookups
  agents: AgentRun[];
  agentsMap: Map<string, AgentRun>; // agent_name -> AgentRun for fast lookups
  selectedAgent: string | null;

  // Logs
  logs: LogEntry[];

  // GitHub events
  githubEvents: GitHubEvent[];

  // Execution control
  executionMode: ExecutionMode;
  isPaused: boolean;
  isEmergencyStopped: boolean;

  // UI state
  isFullscreen: boolean;
  leftPanelCollapsed: boolean;
  bottomPanelExpanded: boolean;
  rightPanelTab: "agent" | "logs" | "patches";

  // Approval state (for manual mode)
  pendingApproval: boolean;
  approvalAction: "push" | "pr" | null;

  // SSE connection
  sseConnected: boolean;
  lastHeartbeat: string | null;

  // Actions
  setScanRun: (scan: ScanRun | null) => void;
  setScanStage: (stage: ScanStage) => void;
  setScanStageProgress: (progress: number) => void;
  setAgents: (agents: AgentRun[]) => void;
  updateAgent: (agentName: string, update: Partial<AgentRun>) => void;
  batchUpdateAgents: (updates: Array<{ agentName: string; update: Partial<AgentRun> }>) => void;
  selectAgent: (name: string | null) => void;
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  addGitHubEvent: (event: Omit<GitHubEvent, "id" | "timestamp">) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  togglePause: () => void;
  emergencyStop: () => void;
  setFullscreen: (fs: boolean) => void;
  toggleLeftPanel: () => void;
  toggleBottomPanel: () => void;
  setRightPanelTab: (tab: "agent" | "logs" | "patches") => void;
  setPendingApproval: (pending: boolean, action?: "push" | "pr" | null) => void;
  approveAction: () => void;
  rejectAction: () => void;
  setSseConnected: (connected: boolean) => void;
  reset: () => void;
};

const initialState = {
  scanRun: null as ScanRun | null,
  scanStage: "idle" as ScanStage,
  scanStageProgress: 0,
  agents: [] as AgentRun[],
  agentsMap: new Map<string, AgentRun>(),
  selectedAgent: null as string | null,
  logs: [] as LogEntry[],
  githubEvents: [] as GitHubEvent[],
  executionMode: "manual" as ExecutionMode,
  isPaused: false,
  isEmergencyStopped: false,
  isFullscreen: false,
  leftPanelCollapsed: false,
  bottomPanelExpanded: false,
  rightPanelTab: "agent" as "agent" | "logs" | "patches",
  pendingApproval: false,
  approvalAction: null as "push" | "pr" | null,
  sseConnected: false,
  lastHeartbeat: null as string | null,
};

let logCounter = 0;
let ghCounter = 0;

export const useExecutionStore = create<ExecutionState>((set) => ({
  ...initialState,

  setScanRun: (scan) => set({ scanRun: scan }),
  setScanStage: (stage) => set({ scanStage: stage }),
  setScanStageProgress: (progress) => set({ scanStageProgress: progress }),

  // OPTIMIZED: Build Map alongside array for O(1) lookups
  setAgents: (agents) => {
    const agentsMap = new Map<string, AgentRun>();
    agents.forEach((agent) => agentsMap.set(agent.agent_name, agent));
    set({ agents, agentsMap });
  },

  // OPTIMIZED: O(1) update using Map, only update changed properties
  updateAgent: (agentName, update) =>
    set((state) => {
      const existingAgent = state.agentsMap.get(agentName);
      if (!existingAgent) return state; // No change if agent not found

      // Create updated agent with only changed properties
      const updatedAgent = { ...existingAgent, ...update };
      
      // Update both array and map
      const newAgentsMap = new Map(state.agentsMap);
      newAgentsMap.set(agentName, updatedAgent);
      
      const newAgents = state.agents.map((a) =>
        a.agent_name === agentName ? updatedAgent : a
      );

      return { agents: newAgents, agentsMap: newAgentsMap };
    }),

  // OPTIMIZED: Batch update multiple agents in one operation
  batchUpdateAgents: (updates) =>
    set((state) => {
      const newAgentsMap = new Map(state.agentsMap);
      const updatedNames = new Set<string>();

      // Apply all updates to map
      updates.forEach(({ agentName, update }) => {
        const existingAgent = newAgentsMap.get(agentName);
        if (existingAgent) {
          newAgentsMap.set(agentName, { ...existingAgent, ...update });
          updatedNames.add(agentName);
        }
      });

      // Update array only for changed agents
      const newAgents = state.agents.map((a) =>
        updatedNames.has(a.agent_name) ? newAgentsMap.get(a.agent_name)! : a
      );

      return { agents: newAgents, agentsMap: newAgentsMap };
    }),

  selectAgent: (name) => set({ selectedAgent: name }),

  addLog: (entry) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-499), // Keep max 500 logs
        { ...entry, id: `log-${++logCounter}`, timestamp: new Date().toISOString() },
      ],
    })),

  addGitHubEvent: (event) =>
    set((state) => ({
      githubEvents: [
        ...state.githubEvents.slice(-199), // Keep max 200 events
        { ...event, id: `gh-${++ghCounter}`, timestamp: new Date().toISOString() },
      ],
    })),

  setExecutionMode: (mode) => set({ executionMode: mode }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  emergencyStop: () => set({ isEmergencyStopped: true, isPaused: true }),

  setFullscreen: (fs) => set({ isFullscreen: fs }),
  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleBottomPanel: () => set((state) => ({ bottomPanelExpanded: !state.bottomPanelExpanded })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  setPendingApproval: (pending, action) => set({ pendingApproval: pending, approvalAction: action ?? null }),
  approveAction: () => set({ pendingApproval: false, approvalAction: null }),
  rejectAction: () => set({ pendingApproval: false, approvalAction: null }),

  setSseConnected: (connected) =>
    set({ sseConnected: connected, lastHeartbeat: connected ? new Date().toISOString() : null }),

  reset: () => set(initialState),
}));
