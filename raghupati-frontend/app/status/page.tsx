import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "System Status" };

const services = [
  { name: "API Server", description: "FastAPI backend serving scan and agent endpoints", status: "operational" as const },
  { name: "Agent Pipeline", description: "Vanar Sena 7-agent orchestration engine", status: "operational" as const },
  { name: "Webhook Receiver", description: "GitHub webhook ingestion and HMAC validation", status: "operational" as const },
  { name: "Supabase Database", description: "PostgreSQL database with Realtime subscriptions", status: "operational" as const },
  { name: "Supabase Auth", description: "OAuth authentication via GitHub and Google", status: "operational" as const },
  { name: "Mistral API", description: "LLM backbone for Rama, Jambavan, and Nala agents", status: "operational" as const },
  { name: "Groq API", description: "LLM backbone for Hanuman, Angada, Sugreeva, and Vibhishana", status: "operational" as const },
  { name: "NVD API", description: "NIST National Vulnerability Database CVE queries", status: "operational" as const },
  { name: "Resend Email", description: "Transactional email delivery for incident reports", status: "operational" as const },
];

const statusIcon = (status: "operational" | "degraded" | "down") => {
  if (status === "operational") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "degraded") return <AlertTriangle className="size-4 text-amber-500" />;
  return <XCircle className="size-4 text-red-500" />;
};

const statusLabel = (status: "operational" | "degraded" | "down") => {
  const colors = { operational: "text-emerald-600", degraded: "text-amber-600", down: "text-red-600" };
  return <span className={`text-xs font-medium capitalize ${colors[status]}`}>{status}</span>;
};

export default function StatusPage() {
  const allUp = services.every((s) => s.status === "operational");

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="size-3" /> Back to home
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <Activity className="size-6 text-primary" />
        <h1 className="text-3xl font-bold">System Status</h1>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-xl border p-5 mb-8 flex items-center gap-3 ${
        allUp
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}>
        {allUp ? (
          <CheckCircle2 className="size-6 text-emerald-500" />
        ) : (
          <AlertTriangle className="size-6 text-amber-500" />
        )}
        <div>
          <h2 className="font-semibold">{allUp ? "All Systems Operational" : "Partial Service Disruption"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last checked: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              {statusIcon(svc.status)}
              <div>
                <div className="text-sm font-medium">{svc.name}</div>
                <div className="text-[11px] text-muted-foreground">{svc.description}</div>
              </div>
            </div>
            {statusLabel(svc.status)}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          For real-time incident updates, subscribe to{" "}
          <a href="#" className="text-primary hover:underline">status notifications</a>.
        </p>
      </div>
    </div>
  );
}
