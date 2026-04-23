"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity, GitBranch, GitCommitHorizontal, GitPullRequest,
  Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle,
  Clock, AlertTriangle, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BranchInfo = {
  name: string;
  is_default: boolean;
  protected: boolean;
  last_commit_sha: string | null;
};

type CommitInfo = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string | null;
};

type PRInfo = {
  number: number;
  title: string;
  state: string;
  head_branch: string;
  base_branch: string;
  html_url: string;
  mergeable: boolean | null;
  created_at: string | null;
};

type WorkflowRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string | null;
  created_at: string | null;
};

type MonitorData = {
  repo: string;
  branches: BranchInfo[];
  recent_commits: CommitInfo[];
  open_prs: PRInfo[];
  workflow_runs: WorkflowRun[];
  fetched_at: string;
};

export default function GitHubMonitorPage() {
  const [repoInput, setRepoInput] = useState("");
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const fetchMonitor = useCallback(async (repo: string) => {
    if (!repo || !repo.includes("/")) {
      setError("Enter a valid owner/repo name.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [owner, name] = repo.split("/");
      const res = await fetch(`${apiBase}/github/monitor/${owner}/${name}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMonitorData(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch GitHub data.");
      setMonitorData(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">GitHub Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Real-time branches, commits, pull requests, and CI status from GitHub.
        </p>
      </div>

      {/* Repo input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchMonitor(repoInput)}
            placeholder="owner/repo (e.g. facebook/react)"
            className="h-9 w-full rounded-lg border border-border/50 bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => fetchMonitor(repoInput)}
          disabled={loading}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
          Load
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="size-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {monitorData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Branches */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="size-4 text-primary" /> Branches
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{monitorData.branches.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-64 overflow-y-auto">
              {monitorData.branches.length === 0 ? (
                <p className="text-xs text-muted-foreground">No branches found.</p>
              ) : (
                monitorData.branches.map((b) => (
                  <div key={b.name} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <GitBranch className="size-3 text-muted-foreground" />
                      <span className="font-mono">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.is_default && <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">default</span>}
                      {b.protected && <span className="text-[9px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">protected</span>}
                      {b.last_commit_sha && <span className="font-mono text-muted-foreground text-[10px]">{b.last_commit_sha}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Commits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitCommitHorizontal className="size-4 text-primary" /> Recent Commits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {monitorData.recent_commits.length === 0 ? (
                <p className="text-xs text-muted-foreground">No commits found.</p>
              ) : (
                monitorData.recent_commits.map((c, i) => (
                  <div key={i} className="text-xs py-1 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground shrink-0">{c.sha}</span>
                      <span className="truncate">{c.message?.split("\n")[0]}</span>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-0.5 hover:text-primary">
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {c.author} • {c.date ? new Date(c.date).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Open PRs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitPullRequest className="size-4 text-emerald-500" /> Open Pull Requests
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">{monitorData.open_prs.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {monitorData.open_prs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open PRs.</p>
              ) : (
                monitorData.open_prs.map((p) => (
                  <a
                    key={p.number}
                    href={p.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs py-1.5 border-b border-border/30 last:border-0 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GitPullRequest className="size-3 text-emerald-500 shrink-0" />
                      <span className="font-semibold">#{p.number}</span>
                      <span className="truncate">{p.title}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                      {p.head_branch} → {p.base_branch}
                      {p.created_at && ` • ${new Date(p.created_at).toLocaleDateString()}`}
                    </div>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          {/* CI Workflows */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="size-4 text-blue-500" /> Workflow Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {monitorData.workflow_runs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No workflow runs found.</p>
              ) : (
                monitorData.workflow_runs.map((w) => {
                  const isSuccess = w.conclusion === "success";
                  const isFail = w.conclusion === "failure";
                  const isPending = !w.conclusion && w.status !== "completed";
                  return (
                    <div key={w.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {isSuccess ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> :
                         isFail ? <XCircle className="size-3.5 text-red-500 shrink-0" /> :
                         isPending ? <Loader2 className="size-3.5 text-blue-500 animate-spin shrink-0" /> :
                         <Clock className="size-3.5 text-muted-foreground shrink-0" />}
                        <span className="truncate">{w.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={isSuccess ? "text-emerald-500" : isFail ? "text-red-500" : "text-muted-foreground"}>
                          {w.conclusion || w.status}
                        </span>
                        {w.html_url && (
                          <a href={w.html_url} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:text-primary">
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!monitorData && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Activity className="size-10 mb-3 opacity-30" />
          <p className="text-sm">Enter a repository to monitor.</p>
          <p className="text-xs mt-1">e.g. facebook/react or your-org/your-repo</p>
        </div>
      )}
    </div>
  );
}
