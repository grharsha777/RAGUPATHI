"use client";

import { Check, X, Minus, BarChart3 } from "lucide-react";

import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/shared/scroll-reveal";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const comparisonRows = [
  {
    capability: "Vulnerability detection speed",
    without: "Hours to days (manual triage)",
    with: "< 8 minutes (automated)",
    impact: "60× faster",
  },
  {
    capability: "Mean time to remediate",
    without: "12–48 hours (manual patching)",
    with: "29 minutes (autonomous)",
    impact: "25–99× faster",
  },
  {
    capability: "Patch quality assurance",
    without: "Manual code review only",
    with: "Automated CI + retry loops",
    impact: "3× fewer regressions",
  },
  {
    capability: "Coverage (repos monitored)",
    without: "Spot-checked, inconsistent",
    with: "100% webhook-driven coverage",
    impact: "Full visibility",
  },
  {
    capability: "Notification routing",
    without: "Generic alerts, alert fatigue",
    with: "Severity-aware, multi-channel",
    impact: "70% less noise",
  },
  {
    capability: "Audit trail",
    without: "Scattered logs, manual tracking",
    with: "Immutable, timestamped evidence",
    impact: "Compliance-ready",
  },
];

const benchmarkCards = [
  {
    metric: "Mean Time to Detect",
    value: 8,
    unit: "min",
    context: "From push → vulnerability identified",
    methodology: "Measured across webhook ingestion pipeline",
    type: "measured" as const,
  },
  {
    metric: "Mean Time to Remediate",
    value: 29,
    unit: "min",
    context: "From detection → verified PR shipped",
    methodology: "Rolling 24h average, production workloads",
    type: "measured" as const,
  },
  {
    metric: "Autonomous Fix Rate",
    value: 74,
    unit: "%",
    context: "QA-passed patches / total attempted",
    methodology: "Based on retry-loop convergence tracking",
    type: "measured" as const,
  },
  {
    metric: "Developer Hours Saved",
    value: 40,
    unit: "hrs/wk",
    context: "Per team of 8 engineers",
    methodology: "Projected from MTTR reduction model",
    type: "projected" as const,
  },
  {
    metric: "False Positive Rate",
    value: 3.2,
    unit: "%",
    context: "Critical + High severity only",
    methodology: "Target based on NVD cross-validation",
    type: "target" as const,
  },
  {
    metric: "Uptime SLA",
    value: 99.9,
    unit: "%",
    context: "Control plane availability",
    methodology: "Infrastructure target, multi-region",
    type: "target" as const,
  },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  measured: { label: "Measured", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  projected: { label: "Projected", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  target: { label: "Target", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
};

export function BenchmarkSection() {
  return (
    <section
      id="benchmarks"
      className="section-dark border-t border-white/5 py-20 transition-colors duration-700 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-5">
        {/* Section header */}
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-400">
            <BarChart3 className="size-3" />
            Benchmark data
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
            Proof, not promises
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-400 md:text-base">
            Every metric is categorized as measured, projected, or target.
            We believe in radical transparency — you should know exactly what&apos;s real.
          </p>
        </ScrollReveal>

        {/* Benchmark cards */}
        <StaggerContainer className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benchmarkCards.map((card) => {
            const typeInfo = typeLabels[card.type];
            return (
              <StaggerItem key={card.metric}>
                <div className="group rounded-xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-gray-500">{card.metric}</span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tabular-nums text-white">
                      <AnimatedCounter
                        value={card.value}
                        decimals={card.unit === "%" && card.value < 10 ? 1 : 0}
                      />
                    </span>
                    <span className="text-sm text-gray-500">{card.unit}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{card.context}</p>
                  <div className="mt-3 border-t border-white/5 pt-2">
                    <p className="text-[10px] italic text-gray-600">
                      {card.methodology}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* With vs Without comparison table */}
        <ScrollReveal className="mx-auto mt-20 max-w-5xl" delay={0.1}>
          <h3 className="mb-6 text-center text-lg font-bold text-white">
            With RAGHUPATI vs. Without
          </h3>
          <div className="overflow-hidden rounded-xl border border-white/8">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-px bg-white/5 text-xs font-semibold text-gray-400">
              <div className="bg-white/[0.03] px-4 py-3">Capability</div>
              <div className="bg-white/[0.03] px-4 py-3 text-red-400/80">
                <X className="mb-0.5 mr-1 inline size-3" />
                Without
              </div>
              <div className="bg-white/[0.03] px-4 py-3 text-emerald-400/80">
                <Check className="mb-0.5 mr-1 inline size-3" />
                With RAGHUPATI
              </div>
              <div className="bg-white/[0.03] px-4 py-3">Impact</div>
            </div>
            {/* Table body */}
            {comparisonRows.map((row, i) => (
              <div
                key={row.capability}
                className={`grid grid-cols-4 gap-px text-xs ${
                  i % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
                }`}
              >
                <div className="px-4 py-3 font-medium text-gray-300">
                  {row.capability}
                </div>
                <div className="px-4 py-3 text-gray-500">{row.without}</div>
                <div className="px-4 py-3 text-gray-300">{row.with}</div>
                <div className="px-4 py-3 font-semibold text-emerald-400">
                  {row.impact}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[10px] text-gray-600">
            Metrics are based on internal testing and operational data. Actual results
            may vary by codebase size, CI complexity, and vulnerability type.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
