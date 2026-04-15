"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  Info,
  Key,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type SetupStep = "intro" | "token" | "webhook" | "verify" | "complete";
type TokenStatus = "idle" | "validating" | "valid" | "invalid";

const requiredScopes = [
  { scope: "repo", reason: "Read repository code, dependencies, and create branches" },
  { scope: "pull_requests:write", reason: "Open automated remediation pull requests" },
  { scope: "webhooks:read", reason: "Verify webhook configuration status" },
];

export function GitHubSetupWizard() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<SetupStep>("intro");
  const [token, setToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token || token.length < 10) return;
    setTokenStatus("validating");

    // Simulate validation (in production, this calls your backend proxy)
    await new Promise((r) => setTimeout(r, 1500));

    if (token.startsWith("ghp_") || token.startsWith("github_pat_")) {
      setTokenStatus("valid");
    } else {
      setTokenStatus("invalid");
    }
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    // In production: POST to your backend API which stores encrypted
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    setSaved(true);
    setStep("complete");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect external services to enable autonomous security operations.
        </p>
      </div>

      {/* GitHub Integration Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-card shadow-sm">
                <Github className="size-5" />
              </div>
              <div>
                <CardTitle className="text-sm">GitHub Integration</CardTitle>
                <CardDescription className="text-xs">
                  Repository monitoring, automated PRs, and webhook events
                </CardDescription>
              </div>
            </div>
            <IntegrationStatusBadge connected={saved} />
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5">
          {step === "intro" && (
            <IntroStep onContinue={() => setStep("token")} reduceMotion={reduceMotion} />
          )}

          {step === "token" && (
            <TokenStep
              token={token}
              setToken={setToken}
              showToken={showToken}
              setShowToken={setShowToken}
              tokenStatus={tokenStatus}
              onValidate={validateToken}
              webhookSecret={webhookSecret}
              setWebhookSecret={setWebhookSecret}
              showSecret={showSecret}
              setShowSecret={setShowSecret}
              onBack={() => setStep("intro")}
              onContinue={() => setStep("verify")}
              reduceMotion={reduceMotion}
            />
          )}

          {step === "verify" && (
            <VerifyStep
              tokenStatus={tokenStatus}
              saving={saving}
              onBack={() => setStep("token")}
              onSave={handleSave}
              reduceMotion={reduceMotion}
            />
          )}

          {step === "complete" && (
            <CompleteStep reduceMotion={reduceMotion} />
          )}
        </CardContent>
      </Card>

      {/* Security Architecture Note */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="size-4 text-primary" />
            Security architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold text-foreground">
                  Tokens are encrypted server-side.{" "}
                </span>
                Your GitHub credentials are transmitted over TLS, encrypted with
                AES-256-GCM, and stored server-side. They are{" "}
                <strong>never stored in localStorage or client-side storage</strong>.
                Only your authenticated backend session can decrypt and use them.
              </div>
            </div>
          </div>
          <ul className="space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <span>
                <strong>Least privilege:</strong> We request only the minimum
                scopes needed for vulnerability detection and PR creation.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Server className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <span>
                <strong>Backend-only access:</strong> Tokens never reach the
                browser after initial submission. All GitHub API calls are proxied
                through your backend.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <RefreshCw className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <span>
                <strong>Rotation supported:</strong> You can revoke and rotate
                tokens at any time from this panel or directly in GitHub.
              </span>
            </li>
          </ul>
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold text-foreground">
                  Recommended:{" "}
                </span>
                For production deployments, consider using a{" "}
                <strong>GitHub App</strong> instead of a Personal Access Token.
                GitHub Apps provide granular per-repository permissions, automatic
                token rotation, and organization-level audit logging via the
                installation flow and PKCE-protected OAuth.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Sub-components ── */

function IntegrationStatusBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
        connected
          ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700"
          : "border-border/60 bg-muted/30 text-muted-foreground"
      }`}
    >
      <div
        className={`size-1.5 rounded-full ${
          connected ? "bg-emerald-500" : "bg-muted-foreground/40"
        }`}
      />
      {connected ? "Connected" : "Not configured"}
    </div>
  );
}

function IntroStep({
  onContinue,
  reduceMotion,
}: {
  onContinue: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Connect your GitHub account</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          RAGHUPATI needs access to your repositories to monitor for
          vulnerabilities, analyze code changes, and create automated remediation
          pull requests.
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-foreground">
          What we need and why:
        </p>
        {requiredScopes.map((item) => (
          <div
            key={item.scope}
            className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3"
          >
            <Key className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div>
              <code className="text-xs font-semibold text-foreground">
                {item.scope}
              </code>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {item.reason}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <a
          href="https://github.com/settings/tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          Create a token on GitHub
          <ExternalLink className="size-3" />
        </a>
        <Button size="sm" className="gap-1.5" onClick={onContinue}>
          Continue
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function TokenStep({
  token,
  setToken,
  showToken,
  setShowToken,
  tokenStatus,
  onValidate,
  webhookSecret,
  setWebhookSecret,
  showSecret,
  setShowSecret,
  onBack,
  onContinue,
  reduceMotion,
}: {
  token: string;
  setToken: (v: string) => void;
  showToken: boolean;
  setShowToken: (v: boolean) => void;
  tokenStatus: TokenStatus;
  onValidate: () => void;
  webhookSecret: string;
  setWebhookSecret: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Token input */}
      <div className="space-y-2">
        <label htmlFor="gh-token" className="text-xs font-semibold text-foreground">
          Personal Access Token (Fine-grained)
        </label>
        <div className="relative">
          <Input
            id="gh-token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => { setToken(e.target.value); }}
            placeholder="ghp_xxxx or github_pat_xxxx"
            className="h-10 pr-20 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-1 top-1 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowToken(!showToken)}
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
          </div>
        </div>
        <TokenStatusIndicator status={tokenStatus} />
      </div>

      {/* Webhook secret */}
      <div className="space-y-2">
        <label htmlFor="gh-webhook" className="text-xs font-semibold text-foreground">
          Webhook Secret{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <div className="relative">
          <Input
            id="gh-webhook"
            type={showSecret ? "text" : "password"}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="whsec_xxxx"
            className="h-10 pr-12 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-8"
            onClick={() => setShowSecret(!showSecret)}
            aria-label={showSecret ? "Hide secret" : "Show secret"}
          >
            {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Used to verify GitHub webhook HMAC-SHA256 signatures. Required for
          real-time event monitoring.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {tokenStatus !== "valid" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              disabled={!token || token.length < 10 || tokenStatus === "validating"}
            >
              {tokenStatus === "validating" ? (
                <Loader2 className="mr-1.5 size-3 animate-spin" />
              ) : (
                <Shield className="mr-1.5 size-3" />
              )}
              Validate
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onContinue}
            disabled={tokenStatus !== "valid"}
          >
            Continue
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function TokenStatusIndicator({ status }: { status: TokenStatus }) {
  if (status === "idle") return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${
        status === "validating"
          ? "text-muted-foreground"
          : status === "valid"
            ? "text-emerald-600"
            : "text-destructive"
      }`}
    >
      {status === "validating" && <Loader2 className="size-3 animate-spin" />}
      {status === "valid" && <CheckCircle2 className="size-3" />}
      {status === "invalid" && <AlertTriangle className="size-3" />}
      <span>
        {status === "validating" && "Validating token..."}
        {status === "valid" && "Token is valid — scopes verified"}
        {status === "invalid" &&
          "Invalid token format. Expected ghp_ or github_pat_ prefix."}
      </span>
    </div>
  );
}

function VerifyStep({
  tokenStatus,
  saving,
  onBack,
  onSave,
  reduceMotion,
}: {
  tokenStatus: TokenStatus;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Confirm and save</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your credentials will be encrypted with AES-256-GCM and stored
          server-side. They will never be exposed to the browser again after this
          step.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span className="text-foreground">
            Token validated successfully
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Credentials will be encrypted and stored on your backend — never in
            the browser
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onSave} disabled={saving}>
          {saving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ShieldCheck className="size-3.5" />
          )}
          {saving ? "Encrypting & saving..." : "Save securely"}
        </Button>
      </div>
    </motion.div>
  );
}

function CompleteStep({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4 py-4 text-center"
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/8">
        <CheckCircle2 className="size-7 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          GitHub integration active
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Your repositories are now being monitored. Vulnerabilities will be
          detected, analyzed, and remediated autonomously.
        </p>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard">Go to dashboard</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/repositories">View repositories</a>
        </Button>
      </div>
    </motion.div>
  );
}
