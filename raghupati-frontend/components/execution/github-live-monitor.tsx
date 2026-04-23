"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch, GitCommit, GitPullRequest, GitMerge, CheckCircle2,
  XCircle, Loader2, ExternalLink, Activity, FileCode, Eye,
} from "lucide-react";
import { useExecutionStore, type GitHubEvent } from "@/lib/stores/execution-store";

const EVENT_ICONS: Record<string, any> = {
  commit: GitCommit,
  push: GitBranch,
  pr: GitPullRequest,
  branch: GitMerge,
  check: Activity,
  diff: FileCode,
  review: Eye,
};

const STATUS_STYLES: Record<string, { color: string; icon?: any }> = {
  success: { color: "text-emerald-400" },
  failure: { color: "text-red-400" },
  running: { color: "text-blue-400" },
  pending: { color: "text-amber-400" },
};

type GitHubLiveMonitorProps = {
  repo: string;
  prUrl?: string | null;
};

export function GitHubLiveMonitor({ repo, prUrl }: GitHubLiveMonitorProps) {
  const githubEvents = useExecutionStore((s) => s.githubEvents);
  const [repoData, setRepoData] = useState<any>(null);
  const [lastFetched, setLastFetched] = useState<string>("");
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const scanStatus = useExecutionStore((s) => s.scanRun?.status);

  useEffect(() => {
    if (!repo || !repo.includes("/")) return;

    const [owner, name] = repo.split("/");
    const url = `${apiBase}/github/monitor/${owner}/${name}`;

    // Initial fetch
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setRepoData(data);
          setLastFetched(new Date().toLocaleTimeString());
        }
      })
      .catch(() => null);

    // Poll every 15s while scan is running
    const interval = setInterval(() => {
      if (scanStatus === "complete" || scanStatus === "failed") {
        clearInterval(interval);
        return;
      }
      fetch(url)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setRepoData(data);
            setLastFetched(new Date().toLocaleTimeString());
          }
        })
        .catch(() => null);
    }, 15000);

    return () => clearInterval(interval);
  }, [repo, apiBase, scanStatus]);

  return (
    <div className="h-full flex gap-4 px-4 py-2 overflow-hidden">
      {/* Left: Live event stream */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
            Event Stream
          </span>
          <span className="text-[8px] font-mono text-zinc-700">
            {githubEvents.length} events
          </span>
          {lastFetched && (
            <span className="text-[7px] font-mono text-zinc-700">
              updated {lastFetched}
            </span>
          )}
        </div>

        {githubEvents.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[9px] text-zinc-700">No GitHub events yet. Events will appear as agents interact with the repository.</p>
          </div>
        ) : (
          <AnimatePresence>
            {githubEvents.slice(-20).reverse().map((event) => (
              <GitHubEventCard key={event.id} event={event} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Right: Repo state summary */}
      <div className="w-[280px] shrink-0 space-y-2 overflow-y-auto">
        {/* Branches */}
        <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-2.5">
          <h4 className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <GitBranch className="size-3" /> Branches
          </h4>
          <div className="space-y-0.5">
            {repoData?.branches?.slice(0, 4).map((b: any) => (
              <div key={b.name} className="flex items-center justify-between text-[9px]">
                <span className="font-mono text-zinc-400">{b.name}</span>
                <div className="flex items-center gap-1.5">
                  {b.is_default && <span className="text-amber-400 font-medium">default</span>}
                  {b.protected && <span className="text-red-400">protected</span>}
                </div>
              </div>
            )) || <span className="text-[9px] text-zinc-700">No branch data</span>}
          </div>
        </div>

        {/* Recent commits */}
        <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-2.5">
          <h4 className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <GitCommit className="size-3" /> Recent Commits
          </h4>
          <div className="space-y-0.5">
            {repoData?.recent_commits?.slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="text-[9px] flex items-center gap-2">
                <span className="font-mono text-zinc-600">{c.sha?.slice(0, 7)}</span>
                <span className="text-zinc-400 truncate">{c.message?.split("\n")[0]}</span>
              </div>
            )) || <span className="text-[9px] text-zinc-700">No commit data</span>}
          </div>
        </div>

        {/* PR link */}
        {prUrl && (
          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5">
            <h4 className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <GitPullRequest className="size-3" /> Security Patch PR
            </h4>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-emerald-400/70 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="size-3" /> Open in GitHub
            </a>
          </div>
        )}

        {/* Workflow runs */}
        <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-2.5">
          <h4 className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Activity className="size-3" /> CI Checks
          </h4>
          <div className="space-y-0.5">
            {repoData?.workflow_runs?.slice(0, 3).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between text-[9px]">
                <span className="text-zinc-400 truncate">{w.name}</span>
                <span className={w.conclusion === "success" ? "text-emerald-400" : w.conclusion === "failure" ? "text-red-400" : "text-zinc-500"}>
                  {w.conclusion || w.status}
                </span>
              </div>
            )) || <span className="text-[9px] text-zinc-700">No CI data</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function GitHubEventCard({ event }: { event: GitHubEvent }) {
  const Icon = EVENT_ICONS[event.type] || GitBranch;
  const statusStyle = STATUS_STYLES[event.status || ""] || { color: "text-zinc-500" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-md bg-white/[0.01] border border-white/[0.03] px-2.5 py-1.5"
    >
      <Icon className={`size-3 shrink-0 ${statusStyle.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium text-zinc-300 truncate">{event.summary}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] font-mono text-zinc-600">{event.actor}</span>
          {event.detail && (
            <span className="text-[8px] font-mono text-zinc-700 truncate">{event.detail.slice(0, 40)}</span>
          )}
        </div>
      </div>
      <span className={`text-[8px] font-semibold uppercase ${statusStyle.color}`}>
        {event.status}
      </span>
      <span className="text-[7px] font-mono text-zinc-700 shrink-0">
        {new Date(event.timestamp).toLocaleTimeString()}
      </span>
    </motion.div>
  );
}
