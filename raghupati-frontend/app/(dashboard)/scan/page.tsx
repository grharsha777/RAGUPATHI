"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, Shield, CheckCircle2, XCircle, Clock,
  GitBranch, ExternalLink, RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ScanRun = {
  id: string;
  repo_full_name: string;
  trigger_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  vulnerabilities_found: number;
  patches_generated: number;
  pr_url: string | null;
  created_at: string;
};

export default function ScanHistoryPage() {
  const [scans, setScans] = useState<ScanRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const router = useRouter();

  const fetchScans = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const res = await fetch(`${apiBase}/scans?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      } else {
        // Fallback to Supabase direct
        const { data, error } = await supabase
          .from("scan_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data) setScans(data as ScanRun[]);
      }
    } catch (err) {
      // Fallback to Supabase direct
      try {
        const { data, error } = await supabase
          .from("scan_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data) setScans(data as ScanRun[]);
      } catch (err2) {
        console.warn("[ScanHistory] fetch failed:", err2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();

    const channel = supabase
      ?.channel("scan_history")
      ?.on("postgres_changes", { event: "*", schema: "public", table: "scan_runs" }, () => {
        fetchScans();
      })
      ?.subscribe();

    return () => {
      if (channel) supabase?.removeChannel(channel);
    };
  }, []);

  const filtered = filter === "all" ? scans : scans.filter((s) => s.status === filter);

  const statusIcon = (status: string) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="size-4 text-emerald-500" />;
      case "running": case "pending": return <Loader2 className="size-4 text-blue-500 animate-spin" />;
      case "failed": return <XCircle className="size-4 text-red-500" />;
      default: return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Scan History</h1>
          <p className="text-sm text-muted-foreground">All scan executions with real-time status from Supabase.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 rounded-md border border-border/50 bg-card px-2 text-xs"
          >
            <option value="all">All statuses</option>
            <option value="running">Running</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <button onClick={fetchScans} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <RefreshCw className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground">
          {scans.length === 0 ? (
            <>
              <Shield className="size-10 mb-3 opacity-30" />
              <p>No scans yet.</p>
              <p className="text-xs mt-1">Trigger a scan from a repository page to get started.</p>
              <button
                onClick={() => router.push("/repositories")}
                className="mt-4 text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Repositories
              </button>
            </>
          ) : (
            "No scans match the filter."
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((scan) => (
            <button
              key={scan.id}
              onClick={() => router.push(scan.status === "running" || scan.status === "pending" ? `/execution/${scan.id}` : `/scan/${scan.id}`)}
              className="w-full rounded-xl border bg-card p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
            >
              {statusIcon(scan.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold truncate">{scan.repo_full_name}</span>
                  <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {scan.trigger_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{scan.id.slice(0, 8)}</span>
                  {scan.started_at && <span>{new Date(scan.started_at).toLocaleString()}</span>}
                  {scan.completed_at && (
                    <span>• Completed: {new Date(scan.completed_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="text-center">
                  <div className="text-orange-400 font-semibold tabular-nums">{scan.vulnerabilities_found}</div>
                  <div className="text-[9px] text-muted-foreground">Vulns</div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-semibold tabular-nums">{scan.patches_generated}</div>
                  <div className="text-[9px] text-muted-foreground">Patches</div>
                </div>
                {scan.pr_url && (
                  <a
                    href={scan.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-md hover:bg-muted/30"
                  >
                    <ExternalLink className="size-3.5 text-primary" />
                  </a>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
