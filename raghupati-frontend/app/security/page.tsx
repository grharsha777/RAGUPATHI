import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Server, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  const practices = [
    {
      icon: Lock,
      title: "Encryption at Rest & in Transit",
      description: "All data is encrypted with AES-256-GCM at rest and transmitted over TLS 1.3. GitHub tokens are encrypted server-side and never stored in browser storage.",
    },
    {
      icon: Server,
      title: "Backend-Only Token Access",
      description: "After initial submission, tokens are never sent to the browser. All GitHub API calls are proxied through authenticated backend sessions.",
    },
    {
      icon: Shield,
      title: "Row-Level Security (RLS)",
      description: "Supabase RLS policies ensure that users can only access their own data. No cross-tenant data access is possible, even with a valid API key.",
    },
    {
      icon: RefreshCw,
      title: "Token Rotation & Revocation",
      description: "Tokens can be rotated or revoked at any time from the Settings page. We recommend using fine-grained PATs with minimum required scopes.",
    },
  ];

  const audits = [
    "OWASP Top 10 coverage in all agent scanning logic",
    "Dependency scanning via NVD and OSV public databases",
    "LLM prompt injection safeguards in all agent system prompts",
    "Structured output validation — agents return JSON, never raw HTML",
    "Rate limiting on all API endpoints (120 req/min per source)",
    "HMAC-SHA256 signature validation on all GitHub webhook payloads",
    "Audit logging for all token operations and scan triggers",
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="size-3" /> Back to home
      </Link>
      <div className="flex items-center gap-3 mb-3">
        <Shield className="size-6 text-primary" />
        <h1 className="text-3xl font-bold">Security</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">
        How RAGHUPATHI protects your code, credentials, and infrastructure.
      </p>

      <div className="grid gap-4 md:grid-cols-2 mb-12">
        {practices.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-5 space-y-2">
            <p.icon className="size-5 text-primary" />
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Security Practices</h2>
        <div className="space-y-2">
          {audits.map((item) => (
            <div key={item} className="flex items-start gap-2.5 py-1">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
        <h3 className="text-sm font-semibold">Responsible Disclosure</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          If you discover a security vulnerability in RAGHUPATHI, please report it to{" "}
          <a href="mailto:security@raghupathi.dev" className="text-primary hover:underline">security@raghupathi.dev</a>.
          We will acknowledge reports within 24 hours and aim to resolve confirmed vulnerabilities within 72 hours.
        </p>
      </div>
    </div>
  );
}
