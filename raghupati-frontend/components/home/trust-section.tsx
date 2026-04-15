"use client";

import {
  Building2,
  FileCheck,
  Globe,
  Lock,
  Server,
  ShieldCheck,
} from "lucide-react";

import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/shared/scroll-reveal";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "SOC 2 Compliant Architecture",
    description:
      "Designed for enterprise compliance. Immutable audit trails, role-based access, and full incident provenance.",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description:
      "All data in transit uses TLS 1.3. Secrets are never logged, serialized, or exposed to client-side code.",
  },
  {
    icon: Server,
    title: "Your Infrastructure, Your Control",
    description:
      "Self-hosted option available. Your code never leaves your environment. Zero third-party data retention.",
  },
  {
    icon: FileCheck,
    title: "Explainable AI Decisions",
    description:
      "Every agent decision comes with confidence scores, evidence artifacts, and full reasoning traces.",
  },
  {
    icon: Globe,
    title: "Multi-Region Ready",
    description:
      "Deploy across regions for data residency compliance and low-latency operations globally.",
  },
  {
    icon: Building2,
    title: "Enterprise SSO & RBAC",
    description:
      "Google, GitHub, and SAML SSO. Granular permissions per workspace, team, and repository scope.",
  },
];

export function TrustSection() {
  return (
    <section className="border-t border-border/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="size-3" />
            Enterprise trust
          </div>
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Built for teams that{" "}
            <span className="text-gradient">can&apos;t afford mistakes</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Security tooling should be secure itself. We follow the same
            standards we help you enforce.
          </p>
        </ScrollReveal>

        <StaggerContainer className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <StaggerItem key={point.title}>
                <div className="card-interactive rounded-xl border border-border/50 bg-card/50 p-5 shadow-surface-1">
                  <div className="inline-flex rounded-lg border border-emerald-500/15 bg-emerald-500/8 p-2 text-emerald-600">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {point.description}
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
