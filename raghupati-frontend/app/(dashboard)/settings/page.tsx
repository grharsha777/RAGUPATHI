"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Github,
  MessageSquare,
  Mail,
  Bell,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Zap,
  Database,
  Globe,
  Bot,
  Cpu,
} from "lucide-react";

import { ThemeCustomizer } from "@/components/theme/theme-customizer";

type TokenVerification = {
  status: "idle" | "verifying" | "verified" | "failed";
  username?: string;
  avatar?: string;
  publicRepos?: number;
  privateRepos?: number;
  rateLimitRemaining?: number;
  error?: string;
};

type HealthStatus = {
  status: string;
  agents: Record<string, { provider: string; ok: boolean; error?: string }>;
  config?: { models?: Record<string, string> };
};

type NotificationConfig = {
  slackWebhook: string;
  discordWebhook: string;
  resendApiKey: string;
  alertEmail: string;
};

export default function SettingsPage() {
  // GitHub token state
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenVerification, setTokenVerification] = useState<TokenVerification>({ status: "idle" });
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("github_pat");
    if (savedToken) {
      setGithubToken(savedToken);
      verifyGithubToken(savedToken);
    }
  }, []);

  // Notification config state
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
    slackWebhook: "",
    discordWebhook: "",
    resendApiKey: "",
    alertEmail: "",
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("raghupati_notif_config");
    if (savedConfig) {
      try { setNotifConfig(JSON.parse(savedConfig)); } catch (e) {}
    }
  }, []);
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [slackResult, setSlackResult] = useState<string | null>(null);
  const [discordResult, setDiscordResult] = useState<string | null>(null);

  // Backend health
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/health`, { cache: "no-store" });
      if (res.ok) setHealth(await res.json());
    } catch (e) {
      console.error("Health check failed:", e);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // ── GitHub Token Verification ────────────────────────────────
  const verifyGithubToken = async (tokenToVerify?: string) => {
    const token = typeof tokenToVerify === "string" ? tokenToVerify : githubToken;
    if (!token || token.length < 10) return;

    setTokenVerification({ status: "verifying" });

    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (res.status === 200) {
        const data = await res.json();
        // Also check rate limit
        const rateLimitRes = await fetch("https://api.github.com/rate_limit", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rateData = rateLimitRes.ok ? await rateLimitRes.json() : null;
        const remaining = rateData?.resources?.core?.remaining;

        setTokenVerification({
          status: "verified",
          username: data.login,
          avatar: data.avatar_url,
          publicRepos: data.public_repos,
          privateRepos: data.total_private_repos || data.owned_private_repos || 0,
          rateLimitRemaining: remaining,
        });
      } else if (res.status === 401 || res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        setTokenVerification({
          status: "failed",
          error: errorData.message || `Invalid token — HTTP ${res.status}. Check scopes and expiration.`,
        });
      } else {
        setTokenVerification({
          status: "failed",
          error: `Unexpected response: HTTP ${res.status}`,
        });
      }
    } catch (err: any) {
      setTokenVerification({
        status: "failed",
        error: `Network error: ${err.message}`,
      });
    }
  };

  const saveGithubToken = async () => {
    if (tokenVerification.status !== "verified") return;
    setSavingToken(true);
    try {
      localStorage.setItem("github_pat", githubToken);
      await new Promise((r) => setTimeout(r, 500));
      setSavingToken(false);
    } catch (err) {
      console.error("Token save failed:", err);
      setSavingToken(false);
    }
  };

  const saveNotifConfig = async () => {
    setSavingConfig(true);
    try {
      localStorage.setItem("raghupati_notif_config", JSON.stringify(notifConfig));
      await new Promise((r) => setTimeout(r, 400));
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Notification Tests ───────────────────────────────────────
  const testSlackWebhook = async () => {
    if (!notifConfig.slackWebhook) return;
    setTestingSlack(true);
    setSlackResult(null);
    try {
      const res = await fetch(notifConfig.slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "🛡️ RAGHUPATHI test message — your Slack webhook is working!",
          username: "RAGHUPATHI",
          icon_emoji: ":shield:",
        }),
      });
      setSlackResult(res.ok ? "✅ Slack webhook working!" : `❌ Failed: HTTP ${res.status}`);
    } catch (err: any) {
      setSlackResult(`❌ Error: ${err.message}`);
    } finally {
      setTestingSlack(false);
    }
  };

  const testDiscordWebhook = async () => {
    if (!notifConfig.discordWebhook) return;
    setTestingDiscord(true);
    setDiscordResult(null);
    try {
      const res = await fetch(notifConfig.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "RAGHUPATHI",
          embeds: [{
            title: "🛡️ Test Message",
            description: "Your Discord webhook is connected to RAGHUPATHI!",
            color: 0x7C3AED,
          }],
        }),
      });
      setDiscordResult(res.ok || res.status === 204 ? "✅ Discord webhook working!" : `❌ Failed: HTTP ${res.status}`);
    } catch (err: any) {
      setDiscordResult(`❌ Error: ${err.message}`);
    } finally {
      setTestingDiscord(false);
    }
  };

  const StatusIcon = ({ up }: { up?: boolean | null }) => {
    if (up === true) return <CheckCircle2 className="size-4 text-emerald-500" />;
    if (up === false) return <XCircle className="size-4 text-red-500" />;
    return <div className="size-4 rounded-full border-2 border-dashed border-zinc-600" />;
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl h-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage integrations, API keys, and notification channels.
        </p>
      </div>

      {/* ── GitHub Personal Access Token ──────────────────────── */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-card shadow-sm">
            <Github className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">GitHub Personal Access Token</h2>
            <p className="text-xs text-muted-foreground">Required for repository scanning and PR creation</p>
          </div>
          {tokenVerification.status === "verified" && (
            <div className="ml-auto flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Connected as @{tokenVerification.username}
              </span>
            </div>
          )}
        </div>

        {/* Token input */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={githubToken}
              onChange={(e) => {
                setGithubToken(e.target.value);
                setTokenVerification({ status: "idle" });
              }}
              placeholder="ghp_xxxx... or github_pat_xxxx..."
              className="w-full h-11 rounded-xl border bg-muted/30 px-4 pr-24 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="absolute right-2 top-1.5 flex gap-1">
              <button
                onClick={() => setShowToken(!showToken)}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {/* Required scopes */}
          <div className="flex flex-wrap gap-2">
            {["repo", "workflow", "read:org", "write:packages"].map((scope) => (
              <span key={scope} className="rounded-md border bg-muted/20 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                {scope}
              </span>
            ))}
            <span className="text-[11px] text-muted-foreground self-center ml-1">← Required scopes</span>
          </div>

          {/* Verify button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => verifyGithubToken()}
              disabled={!githubToken || githubToken.length < 10 || tokenVerification.status === "verifying"}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {tokenVerification.status === "verifying" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Shield className="size-4" />
              )}
              Verify Token
            </button>
            {tokenVerification.status === "verified" && (
              <button
                onClick={saveGithubToken}
                disabled={savingToken}
                className="h-9 rounded-lg border bg-emerald-500/10 border-emerald-500/20 px-4 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
              >
                {savingToken ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save to Vault
              </button>
            )}
          </div>

          {/* Verification result */}
          {tokenVerification.status === "verified" && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {tokenVerification.avatar && (
                  <img src={tokenVerification.avatar} alt="" className="size-10 rounded-full border" />
                )}
                <div>
                  <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                    @{tokenVerification.username}
                  </div>
                  <div className="text-xs text-muted-foreground">Token verified successfully</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card/50 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums">{tokenVerification.publicRepos}</div>
                  <div className="text-[10px] text-muted-foreground">Public repos</div>
                </div>
                <div className="rounded-lg border bg-card/50 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums">{tokenVerification.privateRepos}</div>
                  <div className="text-[10px] text-muted-foreground">Private repos</div>
                </div>
                <div className="rounded-lg border bg-card/50 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums">{tokenVerification.rateLimitRemaining ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground">Rate limit left</div>
                </div>
              </div>
            </div>
          )}

          {tokenVerification.status === "failed" && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-red-700 dark:text-red-400">Token verification failed</div>
                <div className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{tokenVerification.error}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Notification Channels ─────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-card shadow-sm">
            <Bell className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Notification Channels</h2>
            <p className="text-xs text-muted-foreground">Configure where security alerts are sent</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Slack */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4 text-[#4A154B]" />
              Slack Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={notifConfig.slackWebhook}
                onChange={(e) => setNotifConfig({ ...notifConfig, slackWebhook: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 h-10 rounded-xl border bg-muted/30 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={testSlackWebhook}
                disabled={!notifConfig.slackWebhook || testingSlack}
                className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {testingSlack ? <Loader2 className="size-4 animate-spin" /> : "Test"}
              </button>
            </div>
            {slackResult && <p className="text-xs">{slackResult}</p>}
          </div>

          {/* Discord */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4 text-[#5865F2]" />
              Discord Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={notifConfig.discordWebhook}
                onChange={(e) => setNotifConfig({ ...notifConfig, discordWebhook: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 h-10 rounded-xl border bg-muted/30 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={testDiscordWebhook}
                disabled={!notifConfig.discordWebhook || testingDiscord}
                className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {testingDiscord ? <Loader2 className="size-4 animate-spin" /> : "Test"}
              </button>
            </div>
            {discordResult && <p className="text-xs">{discordResult}</p>}
          </div>

          {/* Resend */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              Resend API Key
            </label>
            <input
              type="password"
              value={notifConfig.resendApiKey}
              onChange={(e) => setNotifConfig({ ...notifConfig, resendApiKey: e.target.value })}
              placeholder="re_xxxx..."
              className="w-full h-10 rounded-xl border bg-muted/30 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Alert Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              Alert Email Address
            </label>
            <input
              type="email"
              value={notifConfig.alertEmail}
              onChange={(e) => setNotifConfig({ ...notifConfig, alertEmail: e.target.value })}
              placeholder="security-team@company.com"
              className="w-full h-10 rounded-xl border bg-muted/30 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-[11px] text-muted-foreground">
              Incident reports and critical alerts will be sent to this address via Resend.
            </p>
          </div>
          
          <div className="pt-2 flex justify-end">
             <button
                onClick={saveNotifConfig}
                disabled={savingConfig}
                className="h-10 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {savingConfig ? <Loader2 className="size-4 animate-spin" /> : "Save Configuration"}
              </button>
          </div>
        </div>
      </div>

      {/* ── Backend Infrastructure Health ─────────────────────── */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-card shadow-sm">
              <Shield className="size-5 text-teal-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Backend Infrastructure</h2>
              <p className="text-xs text-muted-foreground">Real-time service connectivity</p>
            </div>
            {health && (
              <span className={`ml-3 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                health.status === "ok" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                health.status === "degraded" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                "bg-red-500/10 border-red-500/20 text-red-500"
              }`}>{health.status}</span>
            )}
          </div>
          <button
            onClick={checkHealth}
            disabled={healthLoading}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            title="Refresh Health Status"
            aria-label="Refresh Health Status"
          >
            <RefreshCw className={`size-4 text-muted-foreground ${healthLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "Mistral AI", key: "rama_mistral", desc: "Rama · Jambavan · Nala · Lakshmana · Bharata", icon: Sparkles },
            { name: "Groq LPU", key: "groq_family", desc: "Hanuman · Sita · Sugreeva · Shatrughna · Dasharatha · Vibhishana", icon: Zap },
            { name: "Supabase", key: "supabase_db", desc: "Database · Realtime · Auth", icon: Database },
            { name: "NVD API", key: "angada_nvd", desc: "CVE Database · Vulnerability Intel", icon: Shield },
            { name: "Tavily", key: "jambavan_tavily", desc: "Web Research · Fix Strategies", icon: Globe },
            { name: "Discord", key: "vibhishana_discord", desc: "Alert Channel · Webhooks", icon: MessageSquare },
            { name: "Resend", key: "vibhishana_resend", desc: "Email Delivery · Incident Reports", icon: Mail },
            { name: "Ollama", key: "ollama_local", desc: "Local Fallback · Offline Mode", icon: Bot },
          ].map((svc) => {
            const Icon = svc.icon;
            const agentData = health?.agents?.[svc.key];
            const isUp = agentData?.ok;
            return (
              <div key={svc.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                isUp ? "bg-emerald-500/[0.03] border-emerald-500/10" :
                isUp === false ? "bg-red-500/[0.03] border-red-500/10" :
                "bg-muted/10 border-border"
              }`}>
                <Icon className={`size-4 shrink-0 ${
                  isUp ? "text-emerald-500" : isUp === false ? "text-red-500" : "text-zinc-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{svc.name}</span>
                    <StatusIcon up={isUp} />
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{svc.desc}</div>
                  {isUp === false && agentData?.error && (
                    <div className="text-[9px] text-red-400/70 truncate mt-0.5">{agentData.error}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent Models */}
        {health?.config?.models && (
          <div className="mt-6 pt-5 border-t border-border/50">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Cpu className="size-4 text-violet-500" />
              Agent Model Configuration
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(health.config.models).map(([agent, model]) => (
                <div key={agent} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/5">
                  <Bot className="size-3 text-zinc-500" />
                  <span className="text-[11px] font-mono text-zinc-400 capitalize">{agent}</span>
                  <span className="ml-auto text-[10px] font-mono text-zinc-500 truncate max-w-[120px]">{model}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Theme Customization */}
      <ThemeCustomizer />
    </div>
  );
}
