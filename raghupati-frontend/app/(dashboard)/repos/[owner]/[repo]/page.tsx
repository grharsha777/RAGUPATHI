"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GitBranch, Star, GitFork, AlertCircle, Calendar, Code2,
  Shield, ShieldCheck, Play, Loader2, CheckCircle2, ExternalLink,
  Zap, Eye,
} from "lucide-react";
import { VanarSenaPipeline } from "@/components/agents/VanarSenaPipeline";

type RepoMeta = {
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  pushed_at: string;
  html_url: string;
  private: boolean;
  owner: { avatar_url: string; login: string };
};

type ScanState = {
  status: "idle" | "starting" | "running" | "complete" | "error";
  runId: string | null;
  error: string | null;
};

export default function RepoAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState>({ status: "idle", runId: null, error: null });
  const [agents, setAgents] = useState<any[]>([]);
  const [nalaMode, setNalaMode] = useState<"manual" | "autonomous">("manual");

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  // Fetch repo metadata from GitHub
  useEffect(() => {
    if (!owner || !repo) return;
    const fetchMeta = async () => {
      setMetaLoading(true);
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        const data = await res.json();
        setRepoMeta(data);
      } catch (err: any) {
        setMetaError(err.message);
      } finally {
        setMetaLoading(false);
      }
    };
    fetchMeta();
  }, [owner, repo]);

  // Trigger scan and navigate to full-screen execution page
  const startScan = async () => {
    setScan({ status: "starting", runId: null, error: null });
    setAgents([]);
    try {
      const res = await fetch(`${apiBase}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: `${owner}/${repo}`,
          nala_mode: nalaMode,
          scan_profile: "full",
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const data = await res.json();
      // Navigate to the full-screen mission control execution page
      router.push(`/execution/${data.run_id}`);
    } catch (err: any) {
      setScan({ status: "error", runId: null, error: `Backend unreachable: ${err.message}. Start backend with: .venv\Scripts\python.exe -m uvicorn main:app --port 8000` });
    }
  };

  // Poll agent status when scan is running
  useEffect(() => {
    if (scan.status !== "running") return;
    if (!scan.runId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`${apiBase}/scan/status/${scan.runId}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setAgents(data.agents || []);
            const allDone = (data.agents || []).every(
              (a: any) => a.status === "complete" || a.status === "failed" || a.status === "skipped"
            );
            if (allDone && data.agents?.length >= 7) {
              setScan((prev) => ({ ...prev, status: "complete" }));
            }
          }
        }
      } catch (err) {
        console.error("Status poll error:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [scan.status, scan.runId, apiBase]);

  // Count vulnerabilities from Angada output
  const angadaAgent = agents.find((a: any) => a.agent_name === "angada");
  const vulnCount = angadaAgent?.output
    ? (typeof angadaAgent.output === "string" ? JSON.parse(angadaAgent.output) : angadaAgent.output).vulnerabilities_found || 0
    : null;

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <GitBranch className="size-4" />
            <span>Repositories</span>
            <span>/</span>
            <span className="text-foreground font-medium">{owner}/{repo}</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">Repository Analysis</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card p-1">
            <button
              onClick={() => setNalaMode("manual")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                nalaMode === "manual" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="size-3 inline mr-1" />Manual Review
            </button>
            <button
              onClick={() => setNalaMode("autonomous")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                nalaMode === "autonomous" ? "bg-emerald-500/10 text-emerald-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="size-3 inline mr-1" />Autonomous
            </button>
          </div>
          <button
            onClick={startScan}
            disabled={scan.status === "starting" || scan.status === "running"}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground
                       hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {scan.status === "starting" || scan.status === "running" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {scan.status === "running" ? "Scanning..." : "Scan Now"}
          </button>
        </div>
      </div>

      {/* Repo metadata */}
      {metaLoading ? (
        <div className="rounded-xl border bg-card p-6 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-3" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      ) : metaError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-red-500" />
          <span className="text-sm">Failed to load repository: {metaError}</span>
        </div>
      ) : repoMeta ? (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <img src={repoMeta.owner.avatar_url} alt="" className="size-10 rounded-full border" />
            <div>
              <a href={repoMeta.html_url} target="_blank" rel="noopener noreferrer"
                 className="text-lg font-semibold hover:underline flex items-center gap-1.5">
                {repoMeta.full_name}
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
              <p className="text-xs text-muted-foreground">{repoMeta.description || "No description"}</p>
            </div>
            {repoMeta.private && (
              <span className="ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-medium">Private</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { icon: Code2, label: repoMeta.language || "—", title: "Language" },
              { icon: Star, label: repoMeta.stargazers_count.toLocaleString(), title: "Stars" },
              { icon: GitFork, label: repoMeta.forks_count.toLocaleString(), title: "Forks" },
              { icon: AlertCircle, label: repoMeta.open_issues_count.toLocaleString(), title: "Issues" },
              { icon: GitBranch, label: repoMeta.default_branch, title: "Branch" },
              { icon: Calendar, label: new Date(repoMeta.pushed_at).toLocaleDateString(), title: "Last push" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-1.5 text-muted-foreground">
                <item.icon className="size-3.5" />
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Scan error */}
      {scan.error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-red-500" />
          <span className="text-sm">Scan failed: {scan.error}</span>
        </div>
      )}

      {/* Workflow visualization */}
      {(scan.status === "running" || scan.status === "complete" || agents.length > 0) && (
        <div className="rounded-xl border bg-card p-5">
          <VanarSenaPipeline runId={scan.runId} agents={agents} />
        </div>
      )}

      {/* Clean scan result */}
      {scan.status === "complete" && vulnCount === 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="size-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Clean scan — no CVEs detected</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              as of {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Vulnerability results from Angada */}
      {scan.status === "complete" && vulnCount && vulnCount > 0 && (() => {
        const output = typeof angadaAgent.output === "string"
          ? JSON.parse(angadaAgent.output) : angadaAgent.output;
        const vulns = output.vulnerabilities || [];
        return (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="size-4 text-red-500" />
              Vulnerabilities Found ({vulnCount})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">CVE ID</th>
                    <th className="pb-2 pr-4 font-medium">Package</th>
                    <th className="pb-2 pr-4 font-medium">CVSS</th>
                    <th className="pb-2 pr-4 font-medium">Severity</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {vulns.slice(0, 20).map((v: any, i: number) => {
                    const sevColors: Record<string, string> = {
                      CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
                      HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
                      MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                      LOW: "bg-green-500/10 text-green-500 border-green-500/20",
                    };
                    return (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 pr-4 font-mono">{v.cve_id || "—"}</td>
                        <td className="py-2 pr-4">{v.package || "—"}</td>
                        <td className="py-2 pr-4 tabular-nums">{v.cvss_score || "—"}</td>
                        <td className="py-2 pr-4">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sevColors[v.severity] || ""}`}>
                            {v.severity || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground max-w-xs truncate">{v.description || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
