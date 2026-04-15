"use client";

import {
  AlertTriangle,
  Bot,
  Code2,
  Eye,
  GitPullRequest,
  LineChart,
  MessageSquare,
  Search,
  Shield,
} from "lucide-react";

import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/shared/scroll-reveal";

const features = [
  {
    icon: Eye,
    title: "Autonomous Detection",
    description:
      "Hanuman watches your GitHub repos 24/7 via webhooks. Every push, PR, and dependency change is analyzed in real time.",
    accent: "text-blue-600 bg-blue-500/8 border-blue-500/15",
  },
  {
    icon: Search,
    title: "Deep Vulnerability Analysis",
    description:
      "Angada cross-references NVD, OSV, and Jambavan's web research to produce evidence-backed severity assessments.",
    accent: "text-amber-600 bg-amber-500/8 border-amber-500/15",
  },
  {
    icon: Code2,
    title: "AI-Powered Patching",
    description:
      "Nala generates targeted, minimal patches using Codestral with full context of your codebase structure.",
    accent: "text-primary bg-primary/8 border-primary/15",
  },
  {
    icon: Shield,
    title: "Automated QA Validation",
    description:
      "Sugreeva runs your CI pipeline against every patch. Failed patches are retried with structured feedback loops.",
    accent: "text-emerald-600 bg-emerald-500/8 border-emerald-500/15",
  },
  {
    icon: GitPullRequest,
    title: "One-Click Remediation",
    description:
      "Verified patches are shipped as PRs with full evidence trails, confidence scores, and remediation context.",
    accent: "text-violet-600 bg-violet-500/8 border-violet-500/15",
  },
  {
    icon: MessageSquare,
    title: "Smart Notifications",
    description:
      "Vibhishana routes alerts to Slack and email with severity-aware formatting. Critical signals are never lost.",
    accent: "text-rose-600 bg-rose-500/8 border-rose-500/15",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Bot className="size-3" />
            Platform capabilities
          </div>
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Enterprise security,{" "}
            <span className="text-gradient">fully autonomous</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Seven specialized AI agents work in concert to detect, analyze,
            patch, validate, and deliver security fixes — without human
            intervention.
          </p>
        </ScrollReveal>

        <StaggerContainer className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.title}>
                <div className="card-interactive group rounded-xl border border-border/50 bg-card/50 p-6 shadow-surface-1">
                  <div
                    className={`inline-flex rounded-lg border p-2.5 ${feature.accent}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
