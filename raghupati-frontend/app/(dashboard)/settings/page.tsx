"use client";

import { useEffect, useState } from "react";
import { Shield, Key, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useGithubToken } from "@/hooks/useGithubToken";
import { env } from "@/env";

type HealthStatus = {
  status: string;
  services: {
    mistral: boolean;
    groq: boolean;
    huggingface: boolean;
    github_webhook: boolean;
    nvd: boolean;
    supabase: boolean;
    slack: boolean;
  };
  agents_ready: number;
};

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { isConfigured: ghConfigured } = useGithubToken();

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/health`);
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const StatusIcon = ({ up }: { up?: boolean }) => {
    if (up) return <CheckCircle2 className="size-4 text-emerald-500" />;
    return <XCircle className="size-4 text-red-500" />;
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl h-full text-white bg-[var(--deep)]">
      <div>
        <h1 className="text-2xl font-bold font-['Syne']">System Integration Vault</h1>
        <p className="text-sm text-slate-400 mt-1">Manage external API keys and verify agent connectivity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
           <div className="flex justify-between items-start mb-6">
             <div className="flex gap-2 items-center">
               <Shield className="size-5 text-teal-500" />
               <h2 className="text-lg font-semibold">Backend Infrastructure</h2>
             </div>
             <button onClick={checkHealth} disabled={loading} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <RefreshCw className={`size-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
             </button>
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                 <div className="flex items-center gap-3">
                   <StatusIcon up={health?.services.supabase} />
                   <div>
                     <div className="text-sm font-semibold">Supabase Admin</div>
                     <div className="text-[10px] text-slate-500">Service Role Key</div>
                   </div>
                 </div>
                 <span className="text-xs font-mono text-slate-400">Configured via DB</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                 <div className="flex items-center gap-3">
                   <StatusIcon up={health?.services.github_webhook} />
                   <div>
                     <div className="text-sm font-semibold">System Webhook</div>
                     <div className="text-[10px] text-slate-500">GitHub HMAC Secret</div>
                   </div>
                 </div>
                 <span className="text-xs font-mono text-slate-400">System Level</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                 <div className="flex items-center gap-3">
                   <StatusIcon up={health?.services.nvd} />
                   <div>
                     <div className="text-sm font-semibold">NIST NVD API</div>
                     <div className="text-[10px] text-slate-500">CVE Vulnerability DB</div>
                   </div>
                 </div>
                 <span className="text-xs font-mono text-slate-400">System Level</span>
              </div>
           </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
           <div className="flex justify-between items-start mb-6">
             <div className="flex gap-2 items-center">
               <Key className="size-5 text-purple-500" />
               <h2 className="text-lg font-semibold">Agent Intelligence</h2>
             </div>
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                 <div className="flex items-center gap-3">
                   <StatusIcon up={health?.services.mistral} />
                   <div>
                     <div className="text-sm font-semibold">Mistral API</div>
                     <div className="text-[10px] text-slate-500">Commander & Patch Agents</div>
                   </div>
                 </div>
                 <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 bg-black/40 rounded">Required</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                 <div className="flex items-center gap-3">
                   <StatusIcon up={health?.services.groq} />
                   <div>
                     <div className="text-sm font-semibold">Groq API</div>
                     <div className="text-[10px] text-slate-500">Watcher & QA Agents</div>
                   </div>
                 </div>
                 <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 bg-black/40 rounded">Required</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                 <div className="flex items-center gap-3">
                   <StatusIcon up={health?.services.huggingface} />
                   <div>
                     <div className="text-sm font-semibold">HuggingFace Fallback</div>
                     <div className="text-[10px] text-slate-500">Inference API</div>
                   </div>
                 </div>
                 <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 bg-black/40 rounded">Optional</span>
              </div>
           </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 mb-10">
           <div className="flex items-center gap-2 mb-4">
             <Shield className="size-5 text-emerald-500" />
             <h2 className="text-lg font-semibold">User Endpoints</h2>
           </div>
           <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div>
                <div className="font-semibold text-emerald-400">GitHub Personal Access Token</div>
                <div className="text-xs text-slate-400">Used by agents to create PRs on your behalf</div>
              </div>
              <div className="flex items-center gap-2">
                 {ghConfigured ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="size-4" /> Active & Stored securely</span>
                 ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="size-4" /> Missing configurations</span>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
