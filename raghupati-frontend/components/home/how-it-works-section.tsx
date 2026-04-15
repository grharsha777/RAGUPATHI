"use client";

import {
  ArrowDown,
  CheckCircle2,
  Eye,
  GitPullRequest,
  MessageSquare,
  Search,
  Shield,
  Wrench,
} from "lucide-react";

import { ScrollReveal } from "@/components/shared/scroll-reveal";

const steps = [
  {
    step: 1,
    icon: Eye,
    title: "Detect",
    description:
      "Hanuman intercepts GitHub webhooks in real time. Every push, PR, and dependency change triggers analysis.",
    color: "border-blue-500/30 bg-blue-500/8 text-blue-600",
  },
  {
    step: 2,
    icon: Search,
    title: "Analyze",
    description:
      "Angada and Jambavan cross-reference NVD, OSV databases, and live web research for evidence-backed assessment.",
    color: "border-amber-500/30 bg-amber-500/8 text-amber-600",
  },
  {
    step: 3,
    icon: Shield,
    title: "Triage",
    description:
      "Rama scores severity, prioritizes incidents, and delegates to specialized agents based on vulnerability type.",
    color: "border-rose-500/30 bg-rose-500/8 text-rose-600",
  },
  {
    step: 4,
    icon: Wrench,
    title: "Patch",
    description:
      "Nala generates minimal, targeted code patches. Each patch is contextual to your codebase structure.",
    color: "border-primary/30 bg-primary/8 text-primary",
  },
  {
    step: 5,
    icon: CheckCircle2,
    title: "Validate",
    description:
      "Sugreeva runs your CI pipeline against the patch. Failed patches enter a retry loop with structured feedback.",
    color: "border-emerald-500/30 bg-emerald-500/8 text-emerald-600",
  },
  {
    step: 6,
    icon: GitPullRequest,
    title: "Ship",
    description:
      "Verified patches are opened as PRs with full audit trails. Vibhishana sends alerts to Slack and email.",
    color: "border-violet-500/30 bg-violet-500/8 text-violet-600",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-t border-border/30 bg-muted/10 py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-5">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Shield className="size-3" />
            Workflow
          </div>
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            From push to PR in{" "}
            <span className="text-gradient">29 minutes</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            A fully autonomous pipeline — no human in the loop until you review
            the pull request.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-14 max-w-3xl">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={step.title} delay={i * 0.06}>
                <div className="relative flex gap-5 pb-8">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-[18px] top-10 h-full w-px bg-gradient-to-b from-border to-transparent" />
                  )}

                  {/* Step number + icon */}
                  <div
                    className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl border ${step.color}`}
                  >
                    <Icon className="size-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 pb-4 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Step {step.step}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
